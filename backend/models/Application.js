const mongoose = require('mongoose');

const STATUSES = ['submitted', 'under_review', 'shortlisted', 'rejected'];

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true, default: '' },
  coverLetter: { type: String, default: '', maxlength: 5000 },
  resume: {
    originalName: String,
    mimetype: String,
    size: Number,
    data: { type: Buffer, select: false } // the file itself; only loaded for downloads
  },
  status: { type: String, enum: STATUSES, default: 'submitted' }
}, { timestamps: true });

// One application per person per job
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ employer: 1, createdAt: -1 });

const Application = mongoose.model('Application', applicationSchema);
Application.STATUSES = STATUSES;

module.exports = Application;
