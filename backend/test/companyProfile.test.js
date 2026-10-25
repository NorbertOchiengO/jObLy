const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-long-enough';
process.env.NODE_ENV = 'test';
const jwt = require('jsonwebtoken');
const request = require('supertest');

const User = require('../models/User');
const Job = require('../models/Job');
const app = require('../app');
const { fakeUser, PNG } = require('./helpers');

const BOSS = '64b000000000000000000001';
const SEEKER = '64b000000000000000000010';
const boss = `Bearer ${jwt.sign({ id: BOSS, role: 'company' }, process.env.JWT_SECRET)}`;
const seeker = `Bearer ${jwt.sign({ id: SEEKER, role: 'individual' }, process.env.JWT_SECRET)}`;

describe('company profile API', () => {
  let company; let renamedJobsTo;
  beforeEach(() => {
    renamedJobsTo = null;
    company = fakeUser({ _id: BOSS, companyName: 'Acme', role: 'company', address: 'Secret St 1', industry: 'Tech' });
    User.findById = (id) => {
      const q = Promise.resolve(company);
      q.select = () => ({ lean: async () => ({ ...company, logo: company.logo && { updatedAt: company.logo.updatedAt } }) });
      return q;
    };
    User.findOne = async () => null;
    Job.updateMany = async (f, change) => { renamedJobsTo = change.company; };
  });

  test('own profile is for companies only and includes private address', async () => {
    assert.equal((await request(app).get('/api/companies/me')).status, 401);
    assert.equal((await request(app).get('/api/companies/me').set('Authorization', seeker)).status, 403);
    const res = await request(app).get('/api/companies/me').set('Authorization', boss);
    assert.equal(res.status, 200);
    assert.equal(res.body.companyName, 'Acme');
    assert.equal(res.body.address, 'Secret St 1');
    assert.equal(res.body.hasLogo, false);
  });

  test('saves profile fields, normalises the website, and ignores role/email', async () => {
    const res = await request(app).put('/api/companies/me').set('Authorization', boss).send({
      tagline: ' We build things ', description: 'About us', website: 'acme.co.ke/about', companySize: '51-200',
      foundedYear: '2012', city: 'Nairobi', role: 'individual', email: 'x@y.z'
    });
    assert.equal(res.status, 200);
    assert.equal(company.tagline, 'We build things');
    assert.equal(company.website, 'https://acme.co.ke/about');
    assert.equal(company.companySize, '51-200');
    assert.equal(company.foundedYear, 2012);
    assert.equal(company.role, 'company');
    assert.equal(company.email, undefined);
  });

  test('validates website, size and founding year', async () => {
    const put = (body) => request(app).put('/api/companies/me').set('Authorization', boss).send(body);
    assert.equal((await put({ website: 'javascript:alert(1)' })).status, 400);
    assert.equal((await put({ website: 'not a url' })).status, 400);
    assert.equal((await put({ companySize: 'huge' })).status, 400);
    assert.equal((await put({ foundedYear: '1700' })).status, 400);
    assert.equal((await put({ foundedYear: String(new Date().getFullYear() + 5) })).status, 400);
    assert.equal((await put({ companyName: '   ' })).status, 400);
    assert.equal((await put({ website: '' })).status, 200);
  });

  test('renaming the company updates its job postings and refuses a taken name', async () => {
    const ok = await request(app).put('/api/companies/me').set('Authorization', boss).send({ companyName: 'Acme Africa' });
    assert.equal(ok.status, 200);
    assert.equal(renamedJobsTo, 'Acme Africa');
    User.findOne = async () => ({ _id: 'someone-else' });
    const taken = await request(app).put('/api/companies/me').set('Authorization', boss).send({ companyName: 'Other Co' });
    assert.equal(taken.status, 409);
  });

  test('logo upload accepts real images only', async () => {
    const up = (buf, name, type) => request(app).post('/api/companies/me/logo').set('Authorization', boss).attach('logo', buf, { filename: name, contentType: type });
    const ok = await up(PNG, 'logo.png', 'image/png');
    assert.equal(ok.status, 200);
    assert.equal(ok.body.hasLogo, true);
    assert.ok(Buffer.isBuffer(company.logo.data));
    assert.equal((await up(Buffer.from('<svg onload=alert(1)>'), 'x.svg', 'image/svg+xml')).status, 400);
    assert.equal((await up(Buffer.from('MZ not a png'), 'x.png', 'image/png')).status, 400);
    const big = await up(Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]), 'big.png', 'image/png');
    assert.equal(big.status, 400);
    assert.match(big.body.message, /2 MB/);
    assert.equal((await request(app).post('/api/companies/me/logo').set('Authorization', boss)).status, 400);
    assert.equal((await request(app).post('/api/companies/me/logo').set('Authorization', seeker).attach('logo', PNG, { filename: 'a.png', contentType: 'image/png' })).status, 403);
  });

  test('logo can be removed', async () => {
    company.logo = { updatedAt: new Date(), data: PNG };
    const res = await request(app).delete('/api/companies/me/logo').set('Authorization', boss);
    assert.equal(res.status, 200);
    assert.equal(company.logo, undefined);
  });

  test('public logo endpoint serves the image safely, and 404s when there is none', async () => {
    User.findOne = () => ({ select: async () => ({ logo: { data: PNG, mimetype: 'image/png' } }) });
    const res = await request(app).get(`/api/companies/${BOSS}/logo`);
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'image/png');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['cross-origin-resource-policy'], 'cross-origin'); // lets the frontend on another origin show it
    User.findOne = () => ({ select: async () => ({}) });
    assert.equal((await request(app).get(`/api/companies/${BOSS}/logo`)).status, 404);
    assert.equal((await request(app).get('/api/companies/xyz/logo')).status, 400);
  });

  test('public company page exposes the profile but not private fields', async () => {
    User.findOne = () => ({ select: (fields) => {
      assert.ok(!fields.split(' ').includes('address'));
      return { lean: async () => ({ _id: BOSS, companyName: 'Acme', tagline: 'T', logo: { updatedAt: new Date('2026-01-01') } }) };
    } });
    Job.find = () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) });
    const res = await request(app).get(`/api/companies/${BOSS}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.company.hasLogo, true);
    assert.equal(typeof res.body.company.logoVersion, 'number');
    assert.equal(res.body.company.logo, undefined);
  });
});
