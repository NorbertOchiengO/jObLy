const mongoose = require('mongoose');

const JOB_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'];
const WORK_MODES = ['On-site', 'Remote', 'Hybrid'];

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  responsibilities: { type: String, default: '' },
  qualifications: { type: String, default: '' },
  location: { type: String, required: true, trim: true },
  type: { type: String, enum: JOB_TYPES, default: 'Full-Time' },
  workMode: { type: String, enum: WORK_MODES, default: 'On-site' },
  industry: { type: String, trim: true, default: '' },
  categories: { type: [String], default: [] },
  salaryMin: { type: Number, min: 0 },
  salaryMax: { type: Number, min: 0 },
  salaryCurrency: { type: String, default: 'KES' },
  deadline: { type: Date },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  featured: { type: Boolean, default: false },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ employer: 1, createdAt: -1 });

const Job = mongoose.model('Job', jobSchema);

Job.JOB_TYPES = JOB_TYPES;
Job.WORK_MODES = WORK_MODES;

module.exports = Job;
