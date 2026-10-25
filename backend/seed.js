// Usage: npm run seed   -> demo companies (with profiles) + 100 jobs. Safe to re-run.
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Job = require('./models/Job');
const Application = require('./models/Application');
const companies = require('./data/companies');
const seedJobs = require('./data/seedJobs');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const demoEmail = (company) => `demo-${slug(company)}@joblisting.local`;

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    const password = process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url');

    // wipe the jobs (and their applications) of every demo employer
    const demoUsers = await User.find({ email: /^demo-.*@joblisting\.local$/ }).select('_id');
    const demoIds = demoUsers.map((u) => u._id);
    const oldJobs = await Job.find({ employer: { $in: demoIds } }).select('_id');
    await Application.deleteMany({ job: { $in: oldJobs.map((j) => j._id) } });
    const removed = await Job.deleteMany({ employer: { $in: demoIds } });

    const employerIds = {};
    let created = 0;
    for (const c of companies) {
      const profile = {
        companyName: c.name, role: 'company', tagline: c.tagline, description: c.about,
        website: `https://${slug(c.name)}.example`, industry: c.industries[0], companySize: c.size,
        foundedYear: c.founded, location: `${c.city}, Kenya`, city: c.city, type: 'Private company'
      };
      let employer = await User.findOne({ email: demoEmail(c.name) });
      if (!employer) {
        employer = await User.create({ name: `${c.name} HR`, email: demoEmail(c.name), password, ...profile });
        created += 1;
      } else {
        employer.set(profile);
        await employer.save();
      }
      employerIds[c.name] = employer._id;
    }

    const jobs = seedJobs.map(({ companyKey, ...job }) => ({ ...job, employer: employerIds[companyKey] }));
    await Job.insertMany(jobs, { timestamps: false });

    console.log(`Removed ${removed.deletedCount} old demo jobs; inserted ${jobs.length} jobs for ${companies.length} companies.`);
    if (created) console.log(`Demo employer logins (shared password): ${password}\n  e.g. ${demoEmail(companies[0].name)}`);
    else console.log('Demo employers already existed; their passwords are unchanged.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
