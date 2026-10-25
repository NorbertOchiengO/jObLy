const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-long-enough';
process.env.NODE_ENV = 'test';
const jwt = require('jsonwebtoken');
const request = require('supertest');

const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const app = require('../app');

const SEEKER = '64b000000000000000000010';
const SEEKER2 = '64b000000000000000000011';
const BOSS = '64b000000000000000000001';
const OTHER_BOSS = '64b000000000000000000002';
const JOB_ID = '64b0000000000000000000aa';
const APP_ID = '64b0000000000000000000bb';
const token = (id, role) => `Bearer ${jwt.sign({ id, role }, process.env.JWT_SECRET)}`;
const PDF = Buffer.from('%PDF-1.4 test');

const openJob = (extra = {}) => ({ _id: JOB_ID, employer: BOSS, status: 'open', ...extra });

const send = (t = token(SEEKER, 'individual'), fields = { fullName: 'Jane Doe', email: 'jane@example.com' }, file = { buf: PDF, name: 'cv.pdf', type: 'application/pdf' }) => {
  let r = request(app).post(`/api/jobs/${JOB_ID}/apply`).set('Authorization', t);
  Object.entries(fields).forEach(([k, v]) => { r = r.field(k, v); });
  if (file) r = r.attach('resume', file.buf, { filename: file.name, contentType: file.type });
  return r;
};

describe('POST /api/jobs/:id/apply', () => {
  let created;
  beforeEach(() => {
    created = null;
    Job.findById = async () => openJob();
    Application.exists = async () => null;
    Application.create = async (data) => { created = data; return { _id: APP_ID, status: 'submitted', ...data }; };
  });

  test('needs login and the individual role', async () => {
    assert.equal((await request(app).post(`/api/jobs/${JOB_ID}/apply`)).status, 401);
    assert.equal((await send(token(BOSS, 'company'))).status, 403);
  });

  test('accepts a valid application and keeps the resume inside the database record', async () => {
    const res = await send();
    assert.equal(res.status, 201);
    assert.equal(created.applicant, SEEKER);
    assert.equal(created.employer, BOSS); // comes from the job, not the request
    assert.equal(created.resume.originalName, 'cv.pdf');
    assert.ok(Buffer.isBuffer(created.resume.data));
    assert.equal(created.resume.data.toString(), PDF.toString());
  });

  test('rejects a duplicate application', async () => {
    Application.exists = async () => ({ _id: APP_ID });
    assert.equal((await send()).status, 409);
  });

  test('rejects closed and expired jobs', async () => {
    Job.findById = async () => openJob({ status: 'closed' });
    assert.equal((await send()).status, 400);
    Job.findById = async () => openJob({ deadline: new Date(Date.now() - 86400000) });
    const res = await send();
    assert.equal(res.status, 400);
    assert.match(res.body.message, /no longer accepting/);
  });

  test('validates fields and requires a resume', async () => {
    assert.equal((await send(undefined, { fullName: '', email: 'jane@example.com' })).status, 400);
    assert.equal((await send(undefined, { fullName: 'J', email: 'nope' })).status, 400);
    const noFile = await send(undefined, undefined, null);
    assert.equal(noFile.status, 400);
    assert.match(noFile.body.message, /resume/i);
  });

  test('rejects wrong file types, disguised files and oversized files', async () => {
    const exe = await send(undefined, undefined, { buf: Buffer.from('MZ'), name: 'virus.exe', type: 'application/x-msdownload' });
    assert.equal(exe.status, 400);
    const disguised = await send(undefined, undefined, { buf: Buffer.from('MZ not a pdf'), name: 'cv.pdf', type: 'application/pdf' });
    assert.equal(disguised.status, 400);
    const big = await send(undefined, undefined, { buf: Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]), name: 'big.pdf', type: 'application/pdf' });
    assert.equal(big.status, 400);
    assert.match(big.body.message, /5 MB/);
    assert.equal(created, null);
  });

  test('404 for a missing job, 400 for a bad id', async () => {
    Job.findById = async () => null;
    assert.equal((await send()).status, 404);
    const bad = await request(app).post('/api/jobs/xyz/apply').set('Authorization', token(SEEKER, 'individual'));
    assert.equal(bad.status, 400);
  });

  test('"use my saved CV" copies the CV from the profile', async () => {
    User.findById = () => ({ select: async () => ({ profile: { cv: { originalName: 'mycv.pdf', mimetype: 'application/pdf', size: 13, data: PDF } } }) });
    const res = await send(undefined, { fullName: 'Jane', email: 'jane@example.com', useProfileCv: 'true' }, null);
    assert.equal(res.status, 201);
    assert.equal(created.resume.originalName, 'mycv.pdf');
    assert.equal(created.resume.data.toString(), PDF.toString());
  });

  test('"use my saved CV" fails clearly when there is none', async () => {
    User.findById = () => ({ select: async () => ({ profile: {} }) });
    const res = await send(undefined, { fullName: 'Jane', email: 'jane@example.com', useProfileCv: 'true' }, null);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /CV/);
  });
});

describe('employer and applicant views', () => {
  test('applicants list is owner-only', async () => {
    Job.findById = () => ({ lean: async () => openJob() });
    Application.find = () => ({ sort: () => ({ lean: async () => [{ _id: APP_ID }] }) });
    const wrong = await request(app).get(`/api/jobs/${JOB_ID}/applications`).set('Authorization', token(OTHER_BOSS, 'company'));
    assert.equal(wrong.status, 403);
    const ok = await request(app).get(`/api/jobs/${JOB_ID}/applications`).set('Authorization', token(BOSS, 'company'));
    assert.equal(ok.status, 200);
    assert.equal(ok.body.applications.length, 1);
    assert.equal((await request(app).get(`/api/jobs/${JOB_ID}/applications`).set('Authorization', token(SEEKER, 'individual'))).status, 403);
  });

  test('received applications are employer-only, filterable, and include a safe applicant summary', async () => {
    let filter; const populated = [];
    Application.find = (f) => {
      filter = f;
      const c = { sort: () => c, populate: (path, fields) => { populated.push([path, fields]); return c; }, lean: async () => [{ _id: APP_ID }] };
      return c;
    };
    assert.equal((await request(app).get('/api/applications/received').set('Authorization', token(SEEKER, 'individual'))).status, 403);
    const res = await request(app).get(`/api/applications/received?status=shortlisted&jobId=${JOB_ID}&junk=1`).set('Authorization', token(BOSS, 'company'));
    assert.equal(res.status, 200);
    assert.deepEqual(filter, { employer: BOSS, status: 'shortlisted', job: JOB_ID });
    const applicant = populated.find(([p]) => p === 'applicant');
    assert.equal(applicant[1], 'profile.headline profile.skills'); // never email, phone or CV bytes
  });

  test('status updates are validated and owner-only', async () => {
    const doc = { employer: BOSS, status: 'submitted', async save() { return this; } };
    Application.findById = async () => doc;
    const patch = (t, status) => request(app).patch(`/api/applications/${APP_ID}/status`).set('Authorization', t).send({ status });
    assert.equal((await patch(token(BOSS, 'company'), 'hired-lol')).status, 400);
    assert.equal((await patch(token(OTHER_BOSS, 'company'), 'shortlisted')).status, 403);
    assert.equal((await patch(token(SEEKER, 'individual'), 'shortlisted')).status, 403);
    const ok = await patch(token(BOSS, 'company'), 'shortlisted');
    assert.equal(ok.status, 200);
    assert.equal(doc.status, 'shortlisted');
  });

  test('my applications is individual-only and filters by job', async () => {
    let filter;
    Application.find = (f) => { filter = f; return { sort: () => ({ populate: () => ({ lean: async () => [] }) }) }; };
    assert.equal((await request(app).get('/api/applications/mine').set('Authorization', token(BOSS, 'company'))).status, 403);
    const res = await request(app).get(`/api/applications/mine?jobId=${JOB_ID}`).set('Authorization', token(SEEKER, 'individual'));
    assert.equal(res.status, 200);
    assert.deepEqual(filter, { applicant: SEEKER, job: JOB_ID });
  });

  test('resume download: applicant and employer yes, strangers no', async () => {
    Application.findById = () => ({
      select: async () => ({ employer: BOSS, applicant: SEEKER, resume: { data: PDF, originalName: 'cv.pdf', mimetype: 'application/pdf' } })
    });
    const get = (t) => request(app).get(`/api/applications/${APP_ID}/resume`).set('Authorization', t);
    assert.equal((await get(token(SEEKER2, 'individual'))).status, 403);
    assert.equal((await get(token(OTHER_BOSS, 'company'))).status, 403);
    const owner = await get(token(BOSS, 'company'));
    assert.equal(owner.status, 200);
    assert.match(owner.headers['content-disposition'], /cv\.pdf/);
    assert.equal(owner.headers['x-content-type-options'], 'nosniff');
    assert.equal(owner.body.toString(), PDF.toString());
    assert.equal((await get(token(SEEKER, 'individual'))).status, 200);
  });
});
