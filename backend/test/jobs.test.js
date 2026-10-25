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
const { buildFilter, parsePaging } = require('../controllers/jobController');

const OWNER = '64b000000000000000000001';
const OTHER = '64b000000000000000000002';
const JOB_ID = '64b0000000000000000000aa';
const token = (id, role) => `Bearer ${jwt.sign({ id, role }, process.env.JWT_SECRET)}`;

// chainable stand-in for Job.find(...).sort().skip().limit().lean()
const chain = (result) => {
  const c = { sort: () => c, skip: () => c, limit: () => c, lean: async () => result };
  return c;
};

describe('buildFilter / parsePaging', () => {
  test('defaults to open jobs only', () => {
    assert.equal(buildFilter({}).status, 'open');
  });
  test('escapes regex characters in search text', () => {
    const f = buildFilter({ q: 'c++ (dev)' });
    assert.ok(f.$or[0].title.test('Senior C++ (Dev)'));
    assert.equal(f.$or[0].title.test('cdev'), false);
  });
  test('ignores unknown job types and bad status', () => {
    const f = buildFilter({ type: 'Hacker', status: 'nope' });
    assert.equal(f.type, undefined);
    assert.equal(f.status, 'open');
  });
  test('accepts valid type, workMode, featured', () => {
    const f = buildFilter({ type: 'Contract', workMode: 'Remote', featured: 'true' });
    assert.deepEqual([f.type, f.workMode, f.featured], ['Contract', 'Remote', true]);
  });
  test('paging is clamped', () => {
    assert.deepEqual(parsePaging({ page: '-4', limit: '9999' }), { page: 1, limit: 50 });
    assert.deepEqual(parsePaging({}), { page: 1, limit: 12 });
  });
});

describe('jobs API', () => {
  beforeEach(() => {
    Job.countDocuments = async () => 25;
    Job.find = () => chain([{ _id: JOB_ID, title: 'Dev' }]);
    Job.findById = async () => null;
  });

  test('GET /api/jobs returns paginated shape', async () => {
    const res = await request(app).get('/api/jobs?limit=10&page=2');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 25);
    assert.equal(res.body.page, 2);
    assert.equal(res.body.pages, 3);
    assert.equal(res.body.jobs.length, 1);
  });

  test('GET /api/jobs/:id rejects a bad id and 404s a missing one', async () => {
    assert.equal((await request(app).get('/api/jobs/not-an-id')).status, 400);
    Job.findById = () => ({ lean: async () => null });
    assert.equal((await request(app).get(`/api/jobs/${JOB_ID}`)).status, 404);
  });

  test('POST requires a token and the company role', async () => {
    assert.equal((await request(app).post('/api/jobs').send({})).status, 401);
    const res = await request(app).post('/api/jobs').set('Authorization', token(OWNER, 'individual')).send({});
    assert.equal(res.status, 403);
  });

  test('POST as company creates the job for the token user (not the body)', async () => {
    let saved;
    Job.create = async (data) => { saved = data; return data; };
    User.findById = () => ({ select: async () => ({ companyName: 'Acme' }) });
    const res = await request(app).post('/api/jobs').set('Authorization', token(OWNER, 'company'))
      .send({ title: 'T', description: 'D', location: 'L', employer: OTHER, hack: 'x' });
    assert.equal(res.status, 201);
    assert.equal(saved.employer, OWNER);
    assert.equal(saved.company, 'Acme');
    assert.equal(saved.hack, undefined);
  });

  test('GET /api/jobs/mine is not swallowed by /:id', async () => {
    Application.aggregate = async () => [{ _id: JOB_ID, count: 3 }];
    const res = await request(app).get('/api/jobs/mine').set('Authorization', token(OWNER, 'company'));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.jobs));
    assert.equal(res.body.jobs[0].applicationCount, 3);
  });

  test('employers cannot make their own job featured, and blank salary/deadline are cleared', async () => {
    let saved;
    Job.create = async (data) => { saved = data; return data; };
    const res = await request(app).post('/api/jobs').set('Authorization', token(OWNER, 'company'))
      .send({ title: 'T', company: 'C', description: 'D', location: 'L', featured: true, deadline: '', salaryMin: '' });
    assert.equal(res.status, 201);
    assert.equal(saved.featured, undefined);
    assert.equal(saved.deadline, undefined);
    assert.equal(saved.salaryMin, undefined);
  });

  test('rejects min salary above max salary', async () => {
    const res = await request(app).post('/api/jobs').set('Authorization', token(OWNER, 'company'))
      .send({ title: 'T', company: 'C', description: 'D', location: 'L', salaryMin: 200, salaryMax: 100 });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Minimum salary/);
  });

  test('filter options include open-job counts per industry', async () => {
    Job.distinct = async () => ['Design', 'Technology'];
    Job.aggregate = async () => [{ _id: 'Technology', count: 17 }, { _id: 'Design', count: 9 }];
    const res = await request(app).get('/api/jobs/meta');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.industryCounts, [{ name: 'Technology', count: 17 }, { name: 'Design', count: 9 }]);
    assert.ok(res.body.types.includes('Full-Time'));
  });

  test('deleting a job also deletes its applications', async () => {
    let wiped = false;
    const doc = { _id: JOB_ID, employer: OWNER, async deleteOne() {} };
    Job.findById = async () => doc;
        Application.deleteMany = async (f) => { wiped = String(f.job) === JOB_ID; };
    const res = await request(app).delete(`/api/jobs/${JOB_ID}`).set('Authorization', token(OWNER, 'company'));
    assert.equal(res.status, 200);
    assert.equal(wiped, true);
  });

  test('PUT/DELETE are owner-only', async () => {
    Application.find = () => ({ select: async () => [] });
    Application.deleteMany = async () => {};
    const doc = { employer: OWNER, set() {}, async save() { return this; }, async deleteOne() {} };
    Job.findById = async () => doc;
    const other = token(OTHER, 'company');
    const owner = token(OWNER, 'company');
    assert.equal((await request(app).put(`/api/jobs/${JOB_ID}`).set('Authorization', other).send({ title: 'x' })).status, 403);
    assert.equal((await request(app).delete(`/api/jobs/${JOB_ID}`).set('Authorization', other)).status, 403);
    assert.equal((await request(app).put(`/api/jobs/${JOB_ID}`).set('Authorization', owner).send({ title: 'x' })).status, 200);
    assert.equal((await request(app).delete(`/api/jobs/${JOB_ID}`).set('Authorization', owner)).status, 200);
  });
});
