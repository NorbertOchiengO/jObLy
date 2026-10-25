const mammoth = require('mammoth');

// ---------- 1. get text out of the file ----------
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('CV reading timed out')), ms))]);

async function extractText(buffer, mimetype) {
  if (mimetype === 'application/pdf') {
    const { PDFParse } = require('pdf-parse'); // v2 reads modern PDFs; the old v1 failed on many of them
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      return (await withTimeout(parser.getText(), 10000)).text || '';
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return (await withTimeout(mammoth.extractRawText({ buffer }), 10000)).value || '';
  }
  return ''; // old .doc files cannot be read automatically
}

// ---------- 2. turn text into profile fields (rule based, not AI: results are suggestions) ----------
const SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'React Native', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express', 'MongoDB', 'MySQL', 'PostgreSQL', 'SQL', 'Firebase',
  'HTML', 'CSS', 'Tailwind CSS', 'Bootstrap', 'REST APIs', 'GraphQL', 'Git', 'Docker', 'AWS', 'Azure', 'Linux', 'CI/CD', 'Python', 'Java', 'PHP', 'Laravel', 'C#', 'C++',
  'Android', 'Flutter', 'Odoo', 'WordPress', 'Testing', 'Cypress', 'Networking', 'IT Support', 'Troubleshooting', 'Cybersecurity',
  'Figma', 'Photoshop', 'Illustrator', 'CorelDRAW', 'Canva', 'InDesign', 'Premiere Pro', 'After Effects', 'Branding', 'UI/UX', 'UX Research', 'Wireframing', 'Prototyping', 'Typography',
  'SEO', 'Social Media', 'Google Ads', 'Content Writing', 'Copywriting', 'Email Marketing', 'Analytics', 'Digital Marketing',
  'Excel', 'Power BI', 'Tableau', 'Data Analysis', 'Financial Reporting', 'Accounting', 'QuickBooks', 'Tax', 'Payroll', 'Auditing', 'Budgeting', 'Microsoft Office',
  'Sales', 'B2B', 'CRM', 'Negotiation', 'Lead Generation', 'Customer Service', 'Customer Support', 'Communication', 'Leadership', 'Project Management', 'Time Management', 'Problem Solving',
  'Recruitment', 'HR', 'Employee Relations', 'Administration', 'Procurement', 'Supply Chain', 'Logistics', 'Inventory', 'Supervision',
  'Nursing', 'Patient Care', 'Pharmacy', 'Triage', 'First Aid', 'AutoCAD', 'Construction', 'Site Management', 'Surveying', 'Teaching', 'Curriculum'
];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const SKILL_RES = SKILLS.map((s) => [s, new RegExp(`(^|[^A-Za-z0-9+#])${escapeRe(s)}(?![A-Za-z0-9+#])`, 'i')]);

const SECTIONS = {
  summary: /^(professional\s+)?(summary|profile|objective|about(\s+me)?|career\s+objective|personal\s+statement)$/i,
  experience: /^((professional|relevant)\s+)?(work\s+)?(experience|employment(\s+history)?|work\s+history|career\s+history)$/i,
  education: /^(education(al)?(\s+background)?|academic(\s+qualifications|\s+background)?|qualifications|education\s+and\s+training)$/i,
  skills: /^((key|core|technical|professional|relevant)\s+)?(skills|competenc(ies|e)s|expertise|skills\s+(and|&)\s+(tools|abilities))$/i,
  other: /^(projects?|certifications?|certificates|references?|referees|languages|interests|hobbies|awards|achievements|publications|volunteering|declaration|training|courses)$/i
};
const DEGREE_RE = /\b(ph\.?d|doctorate|master'?s?|m\.?sc|msc|mba|m\.?a\.?|bachelor'?s?|b\.?sc|bsc|b\.?com|bcom|b\.?a\.?|b\.?eng|beng|degree|diploma|certificate|kcse|kcpe|a-levels?|o-levels?|hnd)\b/i;
const SCHOOL_RE = /\b(university|college|institute|school|polytechnic|academy|campus|jkuat|strathmore)\b/i;
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE_POINT = `(?:${MONTH}\\.?\\s+)?(?:19|20)\\d{2}`;
const DATE_RANGE_RE = new RegExp(`(${DATE_POINT})\\s*(?:-|–|—|to)\\s*(${DATE_POINT}|present|current|now|date|ongoing)`, 'i');
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;
const YEAR_RE = /\b(19|20)\d{2}\b/g;
const BULLET_RE = /^[\s•●▪■◦·*–—-]+\s*/;

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trim()}…` : s);
const cleanLine = (l) => l.replace(/\s+/g, ' ').trim();

function findSections(lines) {
  const out = { header: [] };
  let current = 'header';
  for (const line of lines) {
    const bare = line.replace(/[:\-–—_=*#]+$/g, '').replace(/^[#*\s]+/, '').trim();
    const match = bare.length <= 40 && Object.entries(SECTIONS).find(([, re]) => re.test(bare));
    if (match) { current = match[0]; out[current] = out[current] || []; continue; }
    (out[current] = out[current] || []).push(line);
  }
  return out;
}

function findPhone(text) {
  for (const m of text.match(PHONE_RE) || []) {
    const digits = m.replace(/\D/g, '');
    if (digits.length >= 9 && digits.length <= 15 && !/^(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}$/.test(m.trim())) return cleanLine(m);
  }
  return '';
}

function findName(headerLines) {
  for (const raw of headerLines.slice(0, 6)) {
    const line = cleanLine(raw);
    if (!line || line.length > 50 || /[@\d:/|]/.test(line)) continue;
    if (/curriculum|resume|vitae|cv$/i.test(line)) continue;
    const words = line.split(' ');
    if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Za-zÀ-ÿ'.-]+$/.test(w))) {
      return words.map((w) => (w === w.toUpperCase() ? w[0] + w.slice(1).toLowerCase() : w)).join(' ');
    }
  }
  return '';
}

function findHeadline(headerLines, name) {
  for (const raw of headerLines.slice(0, 8)) {
    const line = cleanLine(raw);
    if (!line || line.length > 80 || line.length < 4) continue;
    if (name && line.toLowerCase() === name.toLowerCase()) continue;
    if (EMAIL_RE.test(line) || /\d{5,}|https?:|www\.|linkedin|github/i.test(line)) continue;
    if (/curriculum|resume|vitae/i.test(line)) continue;
    if (line.split(' ').length > 9) continue;
    return line.replace(BULLET_RE, '');
  }
  return '';
}

function findLocation(headerLines) {
  for (const raw of headerLines.slice(0, 8)) {
    const m = cleanLine(raw).match(/(?:^|\|)\s*([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)?,\s*[A-Z][A-Za-z ]{2,})(?:\||$)/) || cleanLine(raw).match(/\b(Nairobi|Mombasa|Kisumu|Nakuru|Eldoret|Thika|Nyeri|Kampala|Dar es Salaam|Kigali|Lagos|Accra)(?:,\s*[A-Za-z ]+)?/);
    if (m && !EMAIL_RE.test(m[0])) return cleanLine(m[1] || m[0]).replace(/^\|/, '');
  }
  return '';
}

function findSkills(sections, text) {
  const found = new Map();
  const add = (s) => { const k = s.toLowerCase(); if (!found.has(k)) found.set(k, s); };

  // 1) items listed in a Skills section
  for (const raw of sections.skills || []) {
    const line = raw.replace(BULLET_RE, '').replace(/^[A-Za-z ]{3,25}:\s*/, ''); // "Languages: JS, Python" -> "JS, Python"
    for (const part of line.split(/[,;|•●▪·/]|\s{2,}/)) {
      const item = cleanLine(part).replace(/[.:]$/, '');
      if (item.length >= 2 && item.length <= 40 && item.split(' ').length <= 4 && !/\d{4}/.test(item)) {
        const known = SKILLS.find((s) => s.toLowerCase() === item.toLowerCase());
        add(known || item);
      }
    }
  }
  // 2) well-known skills mentioned anywhere
  for (const [skill, re] of SKILL_RES) if (re.test(text)) add(skill);
  const all = [...found.values()];
  // "CSS" is redundant when "Tailwind CSS" is already listed
  const result = all.filter((s) => !all.some((o) => o !== s && o.toLowerCase().endsWith(` ${s.toLowerCase()}`)));
  return result.slice(0, 30);
}

function findEducation(lines) {
  const entries = [];
  const items = lines.map((l) => cleanLine(l.replace(BULLET_RE, ''))).filter(Boolean);
  for (let i = 0; i < items.length; i += 1) {
    if (!DEGREE_RE.test(items[i])) continue;
    const near = [items[i], items[i + 1] || '', items[i - 1] || ''];
    const schoolLine = near.find((l) => SCHOOL_RE.test(l)) || '';
    // the year belongs to this entry: look on its own line first, then on its school line / the next line
    const yearSources = [items[i], schoolLine, items[i + 1] && !DEGREE_RE.test(items[i + 1]) ? items[i + 1] : ''];
    const years = yearSources.map((l) => (l || '').match(/\b(?:19|20)\d{2}\b/g) || []).find((y) => y.length) || [];
    let degree = items[i].replace(DATE_RANGE_RE, '').replace(/\b(?:19|20)\d{2}\b/g, '').replace(/[-–—|,()\s]+$/g, '').trim();
    let school = schoolLine === items[i] ? '' : schoolLine.replace(DATE_RANGE_RE, '').replace(/\b(?:19|20)\d{2}\b/g, '').replace(/[-–—|,()\s]+$/g, '').trim();
    if (!school && SCHOOL_RE.test(degree)) { // "BSc Computer Science - University of Nairobi"
      const parts = degree.split(/\s[-–—|,]\s/);
      const si = parts.findIndex((p) => SCHOOL_RE.test(p));
      if (si > -1) { school = parts[si].trim(); degree = parts.filter((_, k) => k !== si).join(', ').trim(); }
    }
    entries.push({ school: clip(school, 120), degree: clip(degree, 120), year: years.length ? years[years.length - 1] : '' });
    if (schoolLine && schoolLine === items[i + 1]) i += 1;
  }
  const seen = new Set();
  return entries.filter((e) => { const k = `${e.degree}|${e.school}`.toLowerCase(); if (seen.has(k) || (!e.degree && !e.school)) return false; seen.add(k); return true; }).slice(0, 5);
}

function findExperience(lines) {
  const items = lines.map((l) => cleanLine(l)).filter(Boolean);
  const starts = [];
  items.forEach((l, i) => { if (DATE_RANGE_RE.test(l) && !BULLET_RE.test(l.slice(0, 2) + 'x') ) starts.push(i); });
  const entries = [];

  // does an entry's heading sit on the line *before* its date line? (then that line is not part of the previous description)
  const headingAbove = starts.map((st) => {
    const rest = items[st].replace(DATE_RANGE_RE, '').replace(/[|()\u2013\u2014,-]+\s*$/g, '').replace(/^\s*[|,\-–—]+/g, '').trim();
    return !rest && st > 0;
  });

  starts.forEach((start, idx) => {
    const end = idx + 1 < starts.length ? starts[idx + 1] - (headingAbove[idx + 1] ? 1 : 0) : items.length;
    const dateLine = items[start];
    const period = (dateLine.match(DATE_RANGE_RE) || [''])[0].replace(/\s*(?:-|–|—)\s*/, ' - ');
    const rest = dateLine.replace(DATE_RANGE_RE, '').replace(/[|()\u2013\u2014,-]+\s*$/g, '').replace(/^\s*[|,\-–—]+/g, '').trim();

    // title/company can be on the date line, on the line before it, or on the next lines
    let heading = rest;
    let used = start + 1;
    if (!heading && headingAbove[idx] && (idx === 0 || start - 1 > starts[idx - 1])) heading = items[start - 1];
    if (!heading || heading.length < 3) { heading = items[start + 1] || ''; used = start + 2; }

    let title = heading; let company = '';
    const split = heading.split(/\s+(?:at|@)\s+|\s+[|–—]\s+|\s+-\s+|,\s+/i);
    if (split.length >= 2) { title = split[0]; company = split.slice(1).join(', '); }
    else if (items[used] && !BULLET_RE.test(items[used].slice(0, 1) + ' ') && items[used].length < 60 && !DATE_RANGE_RE.test(items[used])) { company = items[used]; used += 1; }

    const description = items.slice(used, end).map((l) => l.replace(BULLET_RE, '')).join(' ');
    if (title || company) entries.push({ title: clip(title.replace(BULLET_RE, ''), 100), company: clip(company, 100), period, description: clip(description, 500) });
  });
  return entries.slice(0, 6);
}

function parseCvText(rawText) {
  const text = (rawText || '').replace(/\r/g, '').replace(/\u00a0/g, ' ');
  const lines = text.split('\n').map((l) => l.replace(/\s+$/g, '')).filter((l) => l.trim());
  const sections = findSections(lines);
  const header = sections.header || [];

  const name = findName(header);
  const summaryText = (sections.summary || []).map((l) => cleanLine(l.replace(BULLET_RE, ''))).join(' ');
  return {
    name,
    email: (text.match(EMAIL_RE) || [''])[0],
    phone: findPhone(header.join('\n') || text),
    location: findLocation(header),
    headline: findHeadline(header, name),
    summary: clip(summaryText, 600),
    skills: findSkills(sections, text),
    education: findEducation(sections.education || []),
    experience: findExperience(sections.experience || [])
  };
}

module.exports = { extractText, parseCvText };
