const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const { hasValidSignature } = require('../middleware/upload');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.apply = async (req, res) => {
  const fail = (status, message) => res.status(status).json({ message });

  try {
    const { id } = req.params;
    if (!isValidId(id)) return fail(400, 'Invalid job id');

    const job = await Job.findById(id);
    if (!job) return fail(404, 'Job not found');
    if (job.status === 'closed' || (job.deadline && new Date(job.deadline) < new Date())) {
      return fail(400, 'This job is no longer accepting applications');
    }

    // "Use my saved CV": copy the CV from the applicant's profile instead of a new upload
    if (!req.file && req.body.useProfileCv === 'true') {
      const me = await User.findById(req.user.id).select('+profile.cv.data');
      const cv = me && me.profile && me.profile.cv;
      if (!cv || !cv.data || !cv.data.length) return fail(400, 'You have not uploaded a CV to your profile yet');
      req.file = { originalname: cv.originalName, mimetype: cv.mimetype, size: cv.size, buffer: Buffer.from(cv.data) };
    }

    const fullName = (req.body.fullName || '').trim();
    const email = (req.body.email || '').trim();
    if (!fullName) return fail(400, 'Full name is required');
    if (!EMAIL_RE.test(email)) return fail(400, 'A valid email is required');
    if (!req.file) return fail(400, 'Please attach your resume (PDF or Word)');
    if (!hasValidSignature(req.file)) return fail(400, 'That file does not look like a valid PDF or Word document');

    if (await Application.exists({ job: job._id, applicant: req.user.id })) {
      return fail(409, 'You have already applied for this job');
    }

    const application = await Application.create({
      job: job._id,
      applicant: req.user.id,
      employer: job.employer,
      fullName,
      email,
      phone: (req.body.phone || '').trim(),
      coverLetter: req.body.coverLetter || '',
      resume: {
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        data: req.file.buffer
      }
    });

    res.status(201).json({ _id: application._id, status: application.status, job: job._id });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You have already applied for this job' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    console.error('apply error:', error.message);
    res.status(500).json({ message: 'Could not submit your application' });
  }
};

// The logged-in applicant's own applications (optionally for one job)
exports.getMine = async (req, res) => {
  try {
    const filter = { applicant: req.user.id };
    if (req.query.jobId) {
      if (!isValidId(req.query.jobId)) return res.status(400).json({ message: 'Invalid job id' });
      filter.job = req.query.jobId;
    }
    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .populate('job', 'title company location type status deadline')
      .lean();
    res.json({ applications });
  } catch (error) {
    res.status(500).json({ message: 'Could not load your applications' });
  }
};

// Every application received across all of the employer's jobs (optional ?status= and ?jobId=)
exports.getReceived = async (req, res) => {
  try {
    const filter = { employer: req.user.id };
    if (Application.STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.jobId) {
      if (!isValidId(req.query.jobId)) return res.status(400).json({ message: 'Invalid job id' });
      filter.job = req.query.jobId;
    }
    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .populate('job', 'title company status')
      .populate('applicant', 'profile.headline profile.skills')
      .lean();
    res.json({ applications });
  } catch (error) {
    res.status(500).json({ message: 'Could not load applicants' });
  }
};

// Applicants for one of the employer's jobs
exports.getForJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid job id' });

    const job = await Job.findById(id).lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (String(job.employer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only view applicants for your own jobs' });
    }

    const applications = await Application.find({ job: id }).sort({ createdAt: -1 }).lean();
    res.json({ job: { _id: job._id, title: job.title }, applications });
  } catch (error) {
    res.status(500).json({ message: 'Could not load applicants' });
  }
};

async function loadForEmployer(req, res) {
  if (!isValidId(req.params.id)) { res.status(400).json({ message: 'Invalid application id' }); return null; }
  const application = await Application.findById(req.params.id);
  if (!application) { res.status(404).json({ message: 'Application not found' }); return null; }
  if (String(application.employer) !== String(req.user.id)) {
    res.status(403).json({ message: 'You can only manage applications for your own jobs' });
    return null;
  }
  return application;
}

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!Application.STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${Application.STATUSES.join(', ')}` });
    }
    const application = await loadForEmployer(req, res);
    if (!application) return;
    application.status = status;
    await application.save();
    res.json({ _id: application._id, status: application.status });
  } catch (error) {
    res.status(500).json({ message: 'Could not update the application' });
  }
};

// Only the applicant or the employer who owns the job can download the resume
exports.downloadResume = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid application id' });
    const application = await Application.findById(req.params.id).select('+resume.data');
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const uid = String(req.user.id);
    if (uid !== String(application.employer) && uid !== String(application.applicant)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const file = application.resume && application.resume.data;
    if (!file || !file.length) return res.status(404).json({ message: 'No resume on file' });

    res.set('Content-Type', application.resume.mimetype || 'application/octet-stream');
    res.set('X-Content-Type-Options', 'nosniff');
    res.attachment(application.resume.originalName || 'resume');
    res.send(Buffer.from(file));
  } catch (error) {
    res.status(500).json({ message: 'Could not download the resume' });
  }
};
