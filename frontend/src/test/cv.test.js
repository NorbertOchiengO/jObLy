import { describe, test, expect } from 'vitest';
import { applyParsed, completeness, mergeSkills } from '../utils/cv';

const EMPTY = { name: 'Jane', headline: '', phone: '', location: '', summary: '', skills: [], education: [], experience: [] };
const PARSED = {
  headline: 'Designer', phone: '0700', location: 'Nairobi', summary: 'About', skills: ['Figma', 'React'],
  education: [{ school: 'UoN', degree: 'BSc', year: '2020' }], experience: [{ title: 'Dev', company: 'Acme', period: '2020 - 2022', description: '' }],
};

describe('CV helpers', () => {
  test('fills only the empty fields by default', () => {
    const form = { ...EMPTY, headline: 'My own headline', skills: ['Excel'] };
    const { form: out, filled } = applyParsed(form, PARSED);
    expect(out.headline).toBe('My own headline');
    expect(out.phone).toBe('0700');
    expect(out.skills).toEqual(['Excel', 'Figma', 'React']);
    expect(out.education).toHaveLength(1);
    expect(filled).toEqual(expect.arrayContaining(['phone', 'location', 'summary', 'skills', 'education', 'experience']));
    expect(filled).not.toContain('headline');
  });

  test('keeps existing education and experience instead of mixing in guesses', () => {
    const form = { ...EMPTY, education: [{ school: 'X', degree: 'Y', year: '1' }], experience: [{ title: 'T', company: 'C', period: '', description: '' }] };
    const { form: out } = applyParsed(form, PARSED);
    expect(out.education).toEqual(form.education);
    expect(out.experience).toEqual(form.experience);
  });

  test('overwrite mode uses the CV values', () => {
    const form = { ...EMPTY, headline: 'Old', skills: ['Excel'] };
    const { form: out } = applyParsed(form, PARSED, { overwrite: true });
    expect(out.headline).toBe('Designer');
    expect(out.skills).toEqual(['Figma', 'React']);
  });

  test('missing suggestions change nothing', () => {
    expect(applyParsed(EMPTY, null)).toEqual({ form: EMPTY, filled: [] });
    expect(applyParsed(EMPTY, { headline: '', skills: [], education: [], experience: [] }).filled).toEqual([]);
  });

  test('skills are merged without case-insensitive duplicates and capped at 30', () => {
    expect(mergeSkills(['React'], ['react', 'Node.js', ' '])).toEqual(['React', 'Node.js']);
    expect(mergeSkills([], Array.from({ length: 50 }, (_, i) => `s${i}`))).toHaveLength(30);
  });

  test('completeness counts what is filled and lists what is missing', () => {
    expect(completeness(EMPTY, false)).toMatchObject({ percent: 0 });
    const full = { ...EMPTY, ...PARSED, skills: ['a', 'b', 'c'] };
    expect(completeness(full, true)).toEqual({ percent: 100, missing: [] });
    const half = completeness({ ...full, summary: '', experience: [] }, false);
    expect(half.percent).toBe(63); // 5 of 8 items
    expect(half.missing).toEqual(['a short summary', 'your work experience', 'your CV']);
  });
});
