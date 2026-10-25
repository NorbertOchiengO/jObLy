const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const COMPANY_SIZES = ['', '1-10', '11-50', '51-200', '201-500', '500+'];

// A stored upload (CV). The file itself is kept in `data` and is only loaded when explicitly requested.
const fileMeta = {
  originalName: String,
  mimetype: String,
  size: Number,
  uploadedAt: Date,
  data: { type: Buffer, select: false }
};

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Not required: users who sign in with Google/GitHub/LinkedIn have no password
  password: { type: String },
  role: { type: String, enum: ['individual', 'company'], default: 'individual' },

  // ---- company account / public company profile ----
  companyName: {
    type: String,
    trim: true,
    required: [function () { return this.role === 'company'; }, 'Company name is required for company accounts']
  },
  tagline: { type: String, trim: true, maxlength: 120, default: '' },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  website: { type: String, trim: true, default: '' },
  companySize: { type: String, enum: COMPANY_SIZES, default: '' },
  foundedYear: { type: Number, min: 1800 },
  logo: { mimetype: String, size: Number, updatedAt: Date, data: { type: Buffer, select: false } },
  position: String,
  type: String,
  address: String, // private: never shown publicly
  location: String,
  city: String,
  industry: String,

  // ---- job seeker profile ----
  profile: {
    headline: { type: String, trim: true, maxlength: 120, default: '' },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    location: { type: String, trim: true, maxlength: 120, default: '' },
    summary: { type: String, trim: true, maxlength: 2000, default: '' },
    skills: { type: [String], default: [] },
    education: { type: [{ _id: false, school: String, degree: String, year: String }], default: [] },
    experience: { type: [{ _id: false, title: String, company: String, period: String, description: String }], default: [] },
    cv: fileMeta
  },

  googleId: String,
  githubId: String,
  linkedinId: String
}, { timestamps: true });

// Unique only when a companyName exists (individuals have none)
userSchema.index(
  { companyName: 1 },
  { unique: true, partialFilterExpression: { companyName: { $type: 'string' } } }
);

// The ONLY place passwords are hashed
userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const User = mongoose.model('User', userSchema);
User.COMPANY_SIZES = COMPANY_SIZES;

module.exports = User;
