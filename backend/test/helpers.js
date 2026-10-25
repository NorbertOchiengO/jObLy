// Shared helpers for tests that need real CV files and fake user documents
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun } = require('docx');

const SAMPLE_CV = [
  'WANJIRU KAMAU',
  'Full-Stack Developer',
  'Nairobi, Kenya | +254 712 345 678 | wanjiru.kamau@example.com',
  '',
  'PROFESSIONAL SUMMARY',
  'Developer with 4 years of experience building web apps with React and Node.js.',
  '',
  'SKILLS',
  'JavaScript, React, Node.js, MongoDB, Tailwind CSS, Git',
  'Communication, Problem Solving',
  '',
  'WORK EXPERIENCE',
  'Frontend Developer at Savannah Labs   Jan 2022 - Present',
  '- Built dashboards with React and Tailwind CSS',
  '- Improved page speed by 40%',
  'Junior Web Developer, Duka Digital',
  '2019 - 2021',
  'Maintained the company website and fixed bugs.',
  '',
  'EDUCATION',
  'BSc Computer Science - University of Nairobi, 2018',
  'Diploma in ICT',
  'Kenyatta University 2015',
  '',
  'REFERENCES',
  'Available on request'
];

const makePdf = (lines) => new Promise((resolve) => {
  const doc = new PDFDocument();
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  lines.forEach((l) => doc.fontSize(12).text(l || ' '));
  doc.end();
});

const makeDocx = (lines) => Packer.toBuffer(new Document({
  sections: [{ children: lines.map((l) => new Paragraph({ children: [new TextRun(l)] })) }]
}));

// a minimal fake mongoose document: supports set('a.b', v), save() and plain property access
function fakeUser(fields = {}) {
  const u = { saved: 0, ...fields };
  u.set = (path, value) => {
    if (typeof path === 'object') { Object.assign(u, path); return u; }
    const parts = path.split('.');
    let o = u;
    parts.slice(0, -1).forEach((k) => { o[k] = o[k] || {}; o = o[k]; });
    o[parts[parts.length - 1]] = value;
    return u;
  };
  u.save = async () => { u.saved += 1; return u; };
  return u;
}

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

module.exports = { SAMPLE_CV, makePdf, makeDocx, fakeUser, PNG };
