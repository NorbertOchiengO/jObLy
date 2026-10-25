const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-long-enough';
const request = require('supertest');

const Job = require('../models/Job');
const User = require('../models/User');
const app = require('../app');

const C1 = '64b000000000000000000001';

describe('companies API', () => {
  test('lists only companies with open jobs, with public fields and job counts', async () => {
    let userFilter; let selected;
    Job.aggregate = async () => [{ _id: C1, openJobs: 3 }];
    User.countDocuments = async () => 1;
    User.find = (f) => {
      userFilter = f;
      const c = { select: (s) => { selected = s; return c; }, sort: () => c, skip: () => c, limit: () => c, lean: async () => [{ _id: C1, companyName: 'Acme' }] };
      return c;
    };
    const res = await request(app).get('/api/companies?q=ac+me&location=nairobi');
    assert.equal(res.status, 200);
    assert.equal(res.body.companies[0].openJobs, 3);
    assert.equal(userFilter.role, 'company');
    assert.deepEqual(userFilter._id.$in, [C1]);
    assert.ok(userFilter.companyName.test('AC ME ltd'));
    assert.equal(userFilter.$or.length, 2);
    for (const secret of ['email', 'password', 'address', 'logo.data', 'profile']) {
      assert.ok(!selected.split(' ').includes(secret), `must not select ${secret}`);
    }
    assert.equal(res.body.companies[0].hasLogo, false);
  });

  test('regex characters in the search are escaped', async () => {
    let userFilter;
    Job.aggregate = async () => [];
    User.countDocuments = async () => 0;
    User.find = (f) => { userFilter = f; const c = { select: () => c, sort: () => c, skip: () => c, limit: () => c, lean: async () => [] }; return c; };
    await request(app).get('/api/companies?q=.*');
    assert.equal(userFilter.companyName.test('anything'), false);
  });

  test('company page: bad id 400, unknown 404, ok returns open jobs', async () => {
    assert.equal((await request(app).get('/api/companies/xyz')).status, 400);
    User.findOne = () => ({ select: () => ({ lean: async () => null }) });
    assert.equal((await request(app).get(`/api/companies/${C1}`)).status, 404);
    User.findOne = (f) => { assert.equal(f.role, 'company'); return { select: () => ({ lean: async () => ({ _id: C1, companyName: 'Acme' }) }) }; };
    Job.find = (f) => { assert.equal(f.status, 'open'); return { sort: () => ({ limit: () => ({ lean: async () => [{ _id: 'j1', title: 'Dev' }] }) }) }; };
    const res = await request(app).get(`/api/companies/${C1}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.company.companyName, 'Acme');
    assert.equal(res.body.jobs.length, 1);
  });
});
