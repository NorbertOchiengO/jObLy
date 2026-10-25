const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { extractText, parseCvText } = require('../services/cvParser');
const { SAMPLE_CV, makePdf, makeDocx } = require('./helpers');

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('CV text extraction', () => {
  test('reads text from a real PDF', async () => {
    const text = await extractText(await makePdf(SAMPLE_CV), PDF_MIME);
    assert.match(text, /WANJIRU KAMAU/);
    assert.match(text, /wanjiru\.kamau@example\.com/);
  });

  test('reads text from a real .docx', async () => {
    const text = await extractText(await makeDocx(SAMPLE_CV), DOCX_MIME);
    assert.match(text, /Savannah Labs/);
  });

  test('old .doc files give no text (handled with a friendly note by the API)', async () => {
    assert.equal(await extractText(Buffer.from('whatever'), 'application/msword'), '');
  });
});

describe('CV parsing', () => {
  const parsed = parseCvText(SAMPLE_CV.join('\n'));

  test('contact details', () => {
    assert.equal(parsed.name, 'Wanjiru Kamau');
    assert.equal(parsed.email, 'wanjiru.kamau@example.com');
    assert.equal(parsed.phone, '+254 712 345 678');
    assert.equal(parsed.location, 'Nairobi, Kenya');
    assert.equal(parsed.headline, 'Full-Stack Developer');
  });

  test('summary and skills (listed + recognised, no duplicates or fragments)', () => {
    assert.match(parsed.summary, /4 years of experience/);
    for (const s of ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Tailwind CSS', 'Git', 'Communication', 'Problem Solving']) {
      assert.ok(parsed.skills.includes(s), `missing skill ${s}`);
    }
    assert.ok(!parsed.skills.includes('CSS'), 'CSS is redundant next to Tailwind CSS');
    assert.equal(new Set(parsed.skills.map((s) => s.toLowerCase())).size, parsed.skills.length);
  });

  test('education with the right year for each entry', () => {
    assert.deepEqual(parsed.education, [
      { school: 'University of Nairobi', degree: 'BSc Computer Science', year: '2018' },
      { school: 'Kenyatta University', degree: 'Diploma in ICT', year: '2015' }
    ]);
  });

  test('experience entries do not bleed into each other', () => {
    assert.equal(parsed.experience.length, 2);
    assert.deepEqual(
      [parsed.experience[0].title, parsed.experience[0].company, parsed.experience[0].period],
      ['Frontend Developer', 'Savannah Labs', 'Jan 2022 - Present']
    );
    assert.doesNotMatch(parsed.experience[0].description, /Junior Web Developer/);
    assert.deepEqual([parsed.experience[1].title, parsed.experience[1].company, parsed.experience[1].period], ['Junior Web Developer', 'Duka Digital', '2019 - 2021']);
  });

  test('survives a CV with no headings and returns what it can', () => {
    const r = parseCvText('Brian Otieno\nbrian@example.com\n0712 345 678\nI know React and Figma and I love sales.');
    assert.equal(r.name, 'Brian Otieno');
    assert.equal(r.email, 'brian@example.com');
    assert.ok(r.skills.includes('React') && r.skills.includes('Figma'));
    assert.deepEqual(r.education, []);
    assert.deepEqual(r.experience, []);
  });

  test('garbage and empty input never throw', () => {
    for (const input of ['', '   \n\n', '%%%%%%\n@@@@', null, undefined]) {
      const r = parseCvText(input);
      assert.equal(r.name, '');
      assert.deepEqual(r.skills, []);
    }
  });
});
