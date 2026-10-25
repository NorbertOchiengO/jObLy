// Helpers for turning CV suggestions (from the server) into profile form values.

const TEXT_FIELDS = ['headline', 'phone', 'location', 'summary'];
const key = (s) => String(s || '').trim().toLowerCase();

export function mergeSkills(current, suggested) {
  const seen = new Set(current.map(key));
  const out = [...current];
  for (const raw of suggested || []) {
    const s = String(raw || '').trim();
    if (s && !seen.has(key(s))) { seen.add(key(s)); out.push(s); }
  }
  return out.slice(0, 30);
}

// overwrite=false: only fill what is empty. overwrite=true: use the CV's values wherever it found something.
export function applyParsed(form, parsed, { overwrite = false } = {}) {
  if (!parsed) return { form, filled: [] };
  const next = { ...form };
  const filled = [];

  for (const f of TEXT_FIELDS) {
    if (parsed[f] && (overwrite || !String(form[f] || '').trim())) {
      if (next[f] !== parsed[f]) filled.push(f);
      next[f] = parsed[f];
    }
  }

  const skills = overwrite ? mergeSkills([], parsed.skills) : mergeSkills(form.skills, parsed.skills);
  if (skills.length && skills.join('|') !== form.skills.join('|')) { next.skills = skills; filled.push('skills'); }

  for (const f of ['education', 'experience']) {
    if (parsed[f]?.length && (overwrite || form[f].length === 0)) { next[f] = parsed[f]; filled.push(f); }
  }
  return { form: next, filled };
}

const LABELS = { headline: 'headline', phone: 'phone', location: 'location', summary: 'summary', skills: 'skills', education: 'education', experience: 'experience' };
export const describeFilled = (filled) => filled.map((f) => LABELS[f]).join(', ');

// How complete a profile is (0-100), plus what is missing
export function completeness(form, hasCv) {
  const checks = [
    ['a headline', !!form.headline.trim()],
    ['a phone number', !!form.phone.trim()],
    ['your location', !!form.location.trim()],
    ['a short summary', !!form.summary.trim()],
    ['at least 3 skills', form.skills.length >= 3],
    ['your education', form.education.length > 0],
    ['your work experience', form.experience.length > 0],
    ['your CV', !!hasCv]
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([label]) => label) };
}
