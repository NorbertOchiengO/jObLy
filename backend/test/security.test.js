const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-long-enough';
process.env.NODE_ENV = 'test';
const request = require('supertest');

const app = require('../app');
const { sanitize } = require('../middleware/security');
const { envProblems } = require('../config/env');

describe('security layer', () => {
  test('Mongo operator keys are stripped from input', () => {
    const req = { body: { email: { $gt: '' }, nested: { 'a.b': 1, ok: 2 } }, query: { $where: 'x', q: 'ok' }, params: {} };
    sanitize(req, {}, () => {});
    assert.deepEqual(req.body, { email: {}, nested: { ok: 2 } });
    assert.deepEqual(req.query, { q: 'ok' });
  });

  test('login with operator objects is rejected, not treated as a lookup', async () => {
    const res = await request(app).post('/api/users/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    assert.equal(res.status, 400);
  });

  test('security headers are set', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-security-policy']);
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  test('bad JSON and unknown routes give clean JSON errors', async () => {
    const bad = await request(app).post('/api/users/login').set('Content-Type', 'application/json').send('{"email":');
    assert.equal(bad.status, 400);
    assert.equal(bad.body.message, 'Invalid JSON in request body');
    const missing = await request(app).get('/api/nope');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.message, 'Not found');
  });

  test('CORS only allows the configured frontend origin', async () => {
    process.env.CLIENT_URL = 'https://jobly.example';
    const ok = await request(app).get('/api/health').set('Origin', 'https://jobly.example');
    assert.equal(ok.headers['access-control-allow-origin'], 'https://jobly.example');
    const bad = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(bad.headers['access-control-allow-origin'], undefined);
    delete process.env.CLIENT_URL;
  });

  test('server refuses to start with a missing or weak configuration', () => {
    assert.deepEqual(envProblems({ MONGO_URI: 'mongodb://x', JWT_SECRET: 'a-long-random-secret-value' }), []);
    assert.equal(envProblems({}).length, 2);
    assert.match(envProblems({ MONGO_URI: 'x', JWT_SECRET: 'change-me' })[0], /too weak/);
  });
});
