// Usage: npm run seed:seekers -> 25 demo job seekers with profiles, plus sample applications to open jobs.
// Run `npm run seed` first if you want applications created. Safe to re-run.
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Job = require('./models/Job');
const Application = require('./models/Application');
const seekers = require('./data/seekers');

// tiny deterministic random generator
const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const STATUS_ODDS = [['submitted', 0.4], ['under_review', 0.7], ['shortlisted', 0.85], ['rejected', 1]];
const statusFor = (r) => STATUS_ODDS.find(([, p]) => r <= p)[0];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    const password = process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url');
    const rand = rng(42);

    let created = 0;
    const users = [];
    for (const s of seekers) {
      const profile = { headline: s.headline, phone: s.phone, location: s.location, summary: s.summary, skills: s.skills, education: s.education, experience: s.experience };
      let user = await User.findOne({ email: s.email });
      if (!user) {
        user = await User.create({ name: s.name, email: s.email, password, role: 'individual', profile });
        created += 1;
      } else {
        user.set({ name: s.name, profile });
        await user.save();
      }
      users.push(user);
    }

    // sample applications (without resume files), 2-4 per seeker
    const openJobs = await Job.find({ status: 'open' }).select('_id employer title').lean();
    let applications = 0;
    if (openJobs.length) {
      await Application.deleteMany({ applicant: { $in: users.map((u) => u._id) }, 'resume.data': { $exists: false } });
      const docs = [];
      for (const user of users) {
        const picks = new Set();
        const wanted = 2 + Math.floor(rand() * 3);
        while (picks.size < Math.min(wanted, openJobs.length)) picks.add(Math.floor(rand() * openJobs.length));
        for (const idx of picks) {
          const job = openJobs[idx];
          docs.push({
            job: job._id, applicant: user._id, employer: job.employer,
            fullName: user.name, email: user.email, phone: user.profile.phone,
            coverLetter: `Hello, I would like to apply for the ${job.title} role. ${user.profile.summary}`,
            status: statusFor(rand()),
            createdAt: new Date(Date.now() - Math.floor(rand() * 20) * 86400000)
          });
        }
      }
      await Application.insertMany(docs, { timestamps: false, ordered: false }).catch(() => {});
      applications = await Application.countDocuments({ applicant: { $in: users.map((u) => u._id) } });
    }

    console.log(`Job seekers: ${users.length} (${created} new). Applications: ${applications}${openJobs.length ? '' : ' (no jobs found - run `npm run seed` first to add applications)'}.`);
    if (created) console.log(`Seeker logins (shared password): ${password}\n  e.g. ${seekers[0].email}`);
    else console.log('Seekers already existed; passwords unchanged.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
