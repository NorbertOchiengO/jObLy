const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-long-enough';
process.env.NODE_ENV = 'test';
const jwt = require('jsonwebtoken');
const request = require('supertest');

const User = require('../models/User');
const app = require('../app');
const { SAMPLE_CV, makePdf, makeDocx, fakeUser } = require('./helpers');

const SEEKER = '64b000000000000000000010';
const BOSS = '64b000000000000000000001';
const seeker = `Bearer ${jwt.sign({ id: SEEKER, role: 'individual' }, process.env.JWT_SECRET)}`;
const boss = `Bearer ${jwt.sign({ id: BOSS, role: 'company' }, process.env.JWT_SECRET)}`;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('job seeker profile API', () => {
  let user;
  beforeEach(() => {
    user = fakeUser({ name: 'Jane Doe', email: 'jane@example.com', role: 'individual', profile: { headline: 'Designer', skills: ['Figma'], cv: undefined } });
    User.findById = (id) => {
      const q = Promise.resolve(user);
      q.select = async () => user;
      return q;
    };
  });

  test('is for job seekers only', async () => {
    assert.equal((await request(app).get('/api/profile')).status, 401);
    assert.equal((await request(app).get('/api/profile').set('Authorization', boss)).status, 403);
  });

  test('GET returns the profile and never the CV bytes', async () => {
    user.profile.cv = { originalName: 'cv.pdf', size: 10, mimetype: 'application/pdf', uploadedAt: new Date(), data: Buffer.from('secret-bytes') };
    const res = await request(app).get('/api/profile').set('Authorization', seeker);
    assert.equal(res.status, 200);
    assert.equal(res.body.profile.headline, 'Designer');
    assert.equal(res.body.profile.cv.originalName, 'cv.pdf');
    assert.ok(!JSON.stringify(res.body).includes('secret-bytes'));
    assert.equal(res.body.profile.cv.data, undefined);
  });

  test('PUT cleans and saves the profile; role and email cannot be changed', async () => {
    const res = await request(app).put('/api/profile').set('Authorization', seeker).send({
      name: '  Jane Q Doe ', headline: 'Product Designer', phone: '0700 000 000', summary: 'Hi',
      skills: 'Figma, figma, Prototyping , ,UX Research',
      education: [{ school: ' UoN ', degree: 'BSc', year: '2020' }, { school: '', degree: '' }],
      experience: [{ title: 'Designer', company: 'Pixel', period: '2021 - Now', description: 'x' }, { title: '', company: '' }],
      role: 'company', email: 'evil@example.com'
    });
    assert.equal(res.status, 200);
    assert.equal(user.name, 'Jane Q Doe');
    assert.deepEqual(user.profile.skills, ['Figma', 'Prototyping', 'UX Research']);
    assert.deepEqual(user.profile.education, [{ school: 'UoN', degree: 'BSc', year: '2020' }]);
    assert.equal(user.profile.experience.length, 1);
    assert.equal(user.role, 'individual');
    assert.equal(user.email, 'jane@example.com');
    assert.equal(user.saved, 1);
  });

  test('PUT caps list sizes and rejects an empty name', async () => {
    const many = Array.from({ length: 80 }, (_, i) => `skill${i}`);
    await request(app).put('/api/profile').set('Authorization', seeker).send({ skills: many });
    assert.equal(user.profile.skills.length, 30);
    const res = await request(app).put('/api/profile').set('Authorization', seeker).send({ name: '   ' });
    assert.equal(res.status, 400);
  });

  test('CV upload (.docx) is saved and parsed into suggestions, without changing the profile', async () => {
    const res = await request(app).post('/api/profile/cv').set('Authorization', seeker)
      .attach('cv', await makeDocx(SAMPLE_CV), { filename: 'my cv.docx', contentType: DOCX_MIME });
    assert.equal(res.status, 200);
    assert.equal(res.body.cv.originalName, 'my cv.docx');
    assert.equal(res.body.parsed.email, 'wanjiru.kamau@example.com');
    assert.ok(res.body.parsed.skills.includes('React'));
    assert.equal(res.body.parsed.education.length, 2);
    assert.ok(Buffer.isBuffer(user.profile.cv.data));
    assert.equal(user.profile.headline, 'Designer'); // suggestions are not applied automatically
    assert.ok(!JSON.stringify(res.body).includes('"data"'));
  });

  test('CV upload (.pdf) works too', async () => {
    const res = await request(app).post('/api/profile/cv').set('Authorization', seeker)
      .attach('cv', await makePdf(SAMPLE_CV), { filename: 'cv.pdf', contentType: 'application/pdf' });
    assert.equal(res.status, 200);
    assert.equal(res.body.parsed.name, 'Wanjiru Kamau');
  });

  test('an old .doc is stored with a friendly note, and an unreadable PDF does not fail the upload', async () => {
    const doc = await request(app).post('/api/profile/cv').set('Authorization', seeker)
      .attach('cv', Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), Buffer.alloc(40)]), { filename: 'old.doc', contentType: 'application/msword' });
    assert.equal(doc.status, 200);
    assert.equal(doc.body.parsed, null);
    assert.match(doc.body.note, /\.doc/);

    const empty = await request(app).post('/api/profile/cv').set('Authorization', seeker)
      .attach('cv', Buffer.from('%PDF-1.4 this is not a real pdf'), { filename: 'broken.pdf', contentType: 'application/pdf' });
    assert.equal(empty.status, 200);
    assert.equal(empty.body.parsed, null);
    assert.ok(empty.body.note);
  });

  test('CV upload rejects missing, wrong-type and disguised files', async () => {
    assert.equal((await request(app).post('/api/profile/cv').set('Authorization', seeker)).status, 400);
    const png = await request(app).post('/api/profile/cv').set('Authorization', seeker).attach('cv', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' });
    assert.equal(png.status, 400);
    const fake = await request(app).post('/api/profile/cv').set('Authorization', seeker).attach('cv', Buffer.from('MZ not pdf'), { filename: 'a.pdf', contentType: 'application/pdf' });
    assert.equal(fake.status, 400);
    assert.equal(user.profile.cv, undefined);
  });

  test('download and delete the CV', async () => {
    assert.equal((await request(app).get('/api/profile/cv').set('Authorization', seeker)).status, 404);
    user.profile.cv = { originalName: 'cv.pdf', mimetype: 'application/pdf', size: 4, uploadedAt: new Date(), data: Buffer.from('%PDF') };
    const dl = await request(app).get('/api/profile/cv').set('Authorization', seeker);
    assert.equal(dl.status, 200);
    assert.match(dl.headers['content-disposition'], /cv\.pdf/);
    assert.equal((await request(app).delete('/api/profile/cv').set('Authorization', seeker)).status, 200);
    assert.equal(user.profile.cv, undefined);
  });
});
