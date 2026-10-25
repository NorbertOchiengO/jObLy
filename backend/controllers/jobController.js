const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'salary-high': { salaryMax: -1, createdAt: -1 }
};

// Fields an employer is allowed to set. `employer` and `status` rules are handled separately.
const WRITABLE = [
  'title', 'company', 'description', 'responsibilities', 'qualifications', 'location',
  'type', 'workMode', 'industry', 'categories', 'salaryMin', 'salaryMax', 'salaryCurrency',
  'deadline', 'status'
]; // `featured` is deliberately not here: only the platform decides what is featured
const NULLABLE = ['deadline', 'salaryMin', 'salaryMax'];

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const contains = (value) => new RegExp(escapeRegex(value.trim()), 'i');
const str = (v) => (typeof v === 'string' ? v.trim() : '');

// Turns query-string params into a Mongo filter (pure function, easy to test)
function buildFilter(query = {}) {
  const filter = {};
  const status = str(query.status);
  filter.status = ['open', 'closed'].includes(status) ? status : 'open';

  const q = str(query.q);
  if (q) {
    const re = contains(q);
    filter.$or = [{ title: re }, { company: re }, { categories: re }, { industry: re }];
  }
  if (str(query.location)) filter.location = contains(query.location);
  if (str(query.company)) filter.company = contains(query.company);
  if (str(query.industry)) filter.industry = contains(query.industry);
  if (Job.JOB_TYPES.includes(str(query.type))) filter.type = query.type;
  if (Job.WORK_MODES.includes(str(query.workMode))) filter.workMode = query.workMode;
  if (query.featured === 'true') filter.featured = true;

  return filter;
}

function parsePaging(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return { page, limit };
}

function pick(body) {
  const data = {};
  WRITABLE.forEach((key) => { if (body[key] !== undefined) data[key] = body[key]; });
  // empty form fields clear the value instead of failing validation
  NULLABLE.forEach((k) => { if (data[k] === '' || data[k] === null) data[k] = undefined; });
  if (typeof data.categories === 'string') {
    data.categories = data.categories.split(',').map((c) => c.trim()).filter(Boolean);
  }
  return data;
}

const salaryProblem = (j) =>
  j.salaryMin != null && j.salaryMax != null && Number(j.salaryMin) > Number(j.salaryMax)
    ? 'Minimum salary cannot be higher than maximum salary'
    : null;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.buildFilter = buildFilter;
exports.parsePaging = parsePaging;

exports.getJobs = async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const { page, limit } = parsePaging(req.query);
    const sort = SORTS[req.query.sort] || SORTS.newest;

    const [total, jobs] = await Promise.all([
      Job.countDocuments(filter),
      Job.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean()
    ]);

    res.json({ jobs, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
  } catch (error) {
    console.error('getJobs error:', error.message);
    res.status(500).json({ message: 'Could not load jobs' });
  }
};

// Options for the filter dropdowns
exports.getMeta = async (req, res) => {
  try {
    const [industries, locations, counts] = await Promise.all([
      Job.distinct('industry', { status: 'open' }),
      Job.distinct('location', { status: 'open' }),
      Job.aggregate([
        { $match: { status: 'open', industry: { $nin: ['', null] } } },
        { $group: { _id: '$industry', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } }
      ])
    ]);
    res.json({
      types: Job.JOB_TYPES,
      workModes: Job.WORK_MODES,
      industries: industries.filter(Boolean).sort(),
      locations: locations.filter(Boolean).sort(),
      industryCounts: counts.map((c) => ({ name: c._id, count: c.count }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not load filter options' });
  }
};

exports.getJob = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid job id' });
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Could not load job' });
  }
};

exports.getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user.id }).sort({ createdAt: -1 }).lean();
    const counts = await Application.aggregate([
      { $match: { job: { $in: jobs.map((j) => j._id) } } },
      { $group: { _id: '$job', count: { $sum: 1 } } }
    ]);
    const byJob = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json({ jobs: jobs.map((j) => ({ ...j, applicationCount: byJob.get(String(j._id)) || 0 })) });
  } catch (error) {
    res.status(500).json({ message: 'Could not load your jobs' });
  }
};

exports.createJob = async (req, res) => {
  try {
    const data = pick(req.body);
    if (salaryProblem(data)) return res.status(400).json({ message: salaryProblem(data) });
    if (!data.company) {
      const user = await User.findById(req.user.id).select('companyName');
      data.company = user && user.companyName;
    }
    const job = await Job.create({ ...data, employer: req.user.id });
    res.status(201).json(job);
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    console.error('createJob error:', error.message);
    res.status(500).json({ message: 'Could not create job' });
  }
};

// Loads the job and makes sure the logged-in employer owns it
async function loadOwnedJob(req, res) {
  if (!isValidId(req.params.id)) {
    res.status(400).json({ message: 'Invalid job id' });
    return null;
  }
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return null;
  }
  if (String(job.employer) !== String(req.user.id)) {
    res.status(403).json({ message: 'You can only change your own jobs' });
    return null;
  }
  return job;
}

exports.updateJob = async (req, res) => {
  try {
    const job = await loadOwnedJob(req, res);
    if (!job) return;
    job.set(pick(req.body));
    if (salaryProblem(job)) return res.status(400).json({ message: salaryProblem(job) });
    await job.save();
    res.json(job);
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Could not update job' });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await loadOwnedJob(req, res);
    if (!job) return;
    // Remove the job's applications (resumes are stored inside them)
    await Application.deleteMany({ job: job._id });
    await job.deleteOne();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete job' });
  }
};
