// Generates 100 deterministic demo jobs across the demo companies (same output on every run).
const companies = require('./companies');
const roles = require('./roles');

const TOTAL = 100;
const DAY = 24 * 60 * 60 * 1000;

// small seeded random generator so re-seeding gives the same data
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RESP = {
  default: ['Deliver high-quality work and meet agreed deadlines.', 'Collaborate with colleagues across teams.', 'Report progress clearly to your manager.', 'Suggest and apply improvements to how we work.', 'Represent the company professionally with clients and partners.'],
  Technology: ['Design, build and maintain reliable features.', 'Write clean, tested, well-documented code.', 'Review code and share knowledge with the team.', 'Investigate and fix production issues.', 'Work with product and design to ship on time.'],
  Design: ['Turn briefs into clear, polished visuals.', 'Present concepts and apply feedback quickly.', 'Keep work consistent with brand guidelines.', 'Prepare files for print and digital delivery.', 'Collaborate with marketing and developers.'],
  Marketing: ['Plan and run campaigns across digital channels.', 'Create content that fits our brand voice.', 'Track results and report what is working.', 'Grow our audience and engagement.', 'Coordinate with design and sales teams.'],
  Sales: ['Find and win new customers.', 'Build lasting relationships with existing accounts.', 'Hit monthly and quarterly targets.', 'Keep the CRM accurate and up to date.', 'Give feedback from the market to the team.'],
  Finance: ['Prepare accurate financial records and reports.', 'Reconcile accounts and resolve differences.', 'Support audits and statutory filings.', 'Follow company policy and regulations.', 'Advise managers using clear numbers.'],
  Healthcare: ['Provide safe, respectful care to patients and customers.', 'Follow clinical and regulatory guidelines.', 'Keep accurate records and stock.', 'Work closely with the rest of the care team.', 'Take part in ongoing training.']
};
const QUAL = {
  default: ['Relevant experience or training for the role.', 'Strong communication and problem-solving skills.', 'Ability to work independently and in a team.', 'Good time management and attention to detail.', 'References or a portfolio are an advantage.'],
  Technology: ['Hands-on experience with the tools listed above.', 'A degree or diploma in Computer Science or equivalent experience.', 'Comfortable with Git and code review.', 'Good written communication.', 'Links to projects or GitHub are a plus.'],
  Healthcare: ['Relevant diploma or degree from a recognised institution.', 'Valid practising licence where required.', 'Compassion and a calm approach under pressure.', 'Good communication in English and Kiswahili.', 'Willingness to work shifts.']
};

const pick = (obj, key) => obj[key] || obj.default;
const round5k = (n) => Math.round(n / 5000) * 5000;

module.exports = (() => {
  const rand = rng(20261014);
  const used = new Set();
  const jobs = [];
  const now = Date.now();

  for (let i = 0; i < TOTAL; i += 1) {
    const company = companies[i % companies.length];
    const round = Math.floor(i / companies.length);

    // find a role this company has not already posted
    let industry; let role;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      industry = company.industries[(round + attempt) % company.industries.length];
      const pool = roles[industry];
      role = pool[(i * 7 + round + attempt * 3) % pool.length];
      if (!used.has(`${company.name}|${role[0]}`)) break;
    }
    used.add(`${company.name}|${role[0]}`);

    const [title, tags, minBase, maxBase, forcedType] = role;
    const spread = 0.9 + rand() * 0.25;
    const salaryMin = round5k(minBase * spread);
    const salaryMax = Math.max(round5k(maxBase * spread), salaryMin + 5000);

    const remoteFriendly = industry === 'Technology' || industry === 'Design' || industry === 'Marketing';
    const r = rand();
    const workMode = remoteFriendly ? (r < 0.3 ? 'Remote' : r < 0.65 ? 'Hybrid' : 'On-site') : (r < 0.08 ? 'Hybrid' : 'On-site');
    let type = forcedType || 'Full-Time';
    if (!forcedType) {
      const t = rand();
      if (t > 0.9) type = 'Contract';
      else if (t > 0.83) type = 'Part-Time';
      else if (t > 0.8 && remoteFriendly) type = 'Freelance';
    }

    const ageDays = Math.floor(rand() * 45);
    const closed = i % 17 === 5; // a handful of closed jobs
    jobs.push({
      title,
      company: company.name,
      companyKey: company.name, // used by the seed script to attach the employer account
      industry,
      location: workMode === 'Remote' ? 'Remote' : `${company.city}, Kenya`,
      type,
      workMode,
      categories: tags,
      salaryMin,
      salaryMax,
      salaryCurrency: 'KES',
      featured: !closed && i % 8 === 0,
      status: closed ? 'closed' : 'open',
      description: `${company.name} (${company.tagline.toLowerCase()}) is hiring a ${title}. ${company.about} You will join a friendly team in ${company.city} and have room to grow.`,
      responsibilities: pick(RESP, industry).join('\n'),
      qualifications: pick(QUAL, industry).join('\n'),
      deadline: new Date(now + (14 + Math.floor(rand() * 46)) * DAY),
      createdAt: new Date(now - ageDays * DAY - Math.floor(rand() * DAY)),
    });
  }
  return jobs;
})();
