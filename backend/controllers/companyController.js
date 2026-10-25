const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const PUBLIC_FIELDS = 'companyName tagline description website industry companySize foundedYear location city type logo.updatedAt'; // never expose name, email or address
const OWN_FIELDS = `${PUBLIC_FIELDS} address`;

// adds hasLogo / logoVersion and drops the raw logo object
const withLogo = ({ logo, ...rest }) => ({
  ...rest,
  hasLogo: !!(logo && logo.updatedAt),
  logoVersion: logo && logo.updatedAt ? new Date(logo.updatedAt).getTime() : null
});

// Companies that currently have at least one open job
exports.getCompanies = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);

    const counts = await Job.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$employer', openJobs: { $sum: 1 } } }
    ]);
    const openJobs = new Map(counts.map((c) => [String(c._id), c.openJobs]));

    const filter = { role: 'company', _id: { $in: counts.map((c) => c._id) } };
    const q = text(req.query.q, 100);
    const loc = text(req.query.location, 100);
    const industry = text(req.query.industry, 100);
    if (q) filter.companyName = new RegExp(escapeRegex(q), 'i');
    if (industry) filter.industry = new RegExp(escapeRegex(industry), 'i');
    if (loc) filter.$or = [{ location: new RegExp(escapeRegex(loc), 'i') }, { city: new RegExp(escapeRegex(loc), 'i') }];

    const [total, companies] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).select(PUBLIC_FIELDS).sort({ companyName: 1 }).skip((page - 1) * limit).limit(limit).lean()
    ]);

    res.json({
      companies: companies.map((c) => ({ ...withLogo(c), openJobs: openJobs.get(String(c._id)) || 0 })),
      total,
      page,
      pages: Math.max(Math.ceil(total / limit), 1)
    });
  } catch (error) {
    console.error('getCompanies error:', error.message);
    res.status(500).json({ message: 'Could not load companies' });
  }
};

exports.getCompany = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid company id' });
  try {
    const company = await User.findOne({ _id: req.params.id, role: 'company' }).select(PUBLIC_FIELDS).lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });
    // newest first, so visitors see the latest postings at the top
    const jobs = await Job.find({ employer: company._id, status: 'open' }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ company: withLogo(company), jobs });
  } catch (error) {
    res.status(500).json({ message: 'Could not load company' });
  }
};

// Public: the company logo image
exports.getLogo = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid company id' });
  try {
    const company = await User.findOne({ _id: req.params.id, role: 'company' }).select('+logo.data logo.mimetype');
    const logo = company && company.logo;
    if (!logo || !logo.data || !logo.data.length) return res.status(404).json({ message: 'No logo' });
    res.set({ 'Content-Type': logo.mimetype, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=300' });
    res.send(Buffer.from(logo.data));
  } catch (error) {
    res.status(500).json({ message: 'Could not load logo' });
  }
};

// ---------- the logged-in company manages its own profile ----------
exports.getOwnProfile = async (req, res) => {
  try {
    const company = await User.findById(req.user.id).select(OWN_FIELDS).lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(withLogo(company));
  } catch (error) {
    res.status(500).json({ message: 'Could not load your company profile' });
  }
};

function normalizeUrl(value) {
  let v = text(value, 200);
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) return null;
    return u.toString().replace(/\/$/, '');
  } catch (e) {
    return null;
  }
}

exports.updateOwnProfile = async (req, res) => {
  try {
    const b = req.body || {};
    const company = await User.findById(req.user.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    if (b.companyName !== undefined) {
      const name = text(b.companyName, 100);
      if (!name) return res.status(400).json({ message: 'Company name is required' });
      if (name !== company.companyName) {
        if (await User.findOne({ companyName: name, _id: { $ne: company._id } })) {
          return res.status(409).json({ message: 'Another company is already using that name' });
        }
        company.companyName = name;
      }
    }
    if (b.tagline !== undefined) company.tagline = text(b.tagline, 120);
    if (b.description !== undefined) company.description = text(b.description, 3000);
    if (b.website !== undefined) {
      const url = normalizeUrl(b.website);
      if (url === null) return res.status(400).json({ message: 'Please enter a valid website address, e.g. https://example.com' });
      company.website = url;
    }
    if (b.companySize !== undefined) {
      if (!User.COMPANY_SIZES.includes(b.companySize)) return res.status(400).json({ message: 'Invalid company size' });
      company.companySize = b.companySize;
    }
    if (b.foundedYear !== undefined) {
      if (b.foundedYear === '' || b.foundedYear === null) company.foundedYear = undefined;
      else {
        const y = Number(b.foundedYear);
        if (!Number.isInteger(y) || y < 1800 || y > new Date().getFullYear()) return res.status(400).json({ message: 'Please enter a valid founding year' });
        company.foundedYear = y;
      }
    }
    ['industry', 'location', 'city', 'type', 'address'].forEach((f) => { if (b[f] !== undefined) company[f] = text(b[f], 150); });
    await company.save();

    // job postings keep a copy of the company name, so keep them in step
    await Job.updateMany({ employer: company._id }, { company: company.companyName });

    const fresh = await User.findById(company._id).select(OWN_FIELDS).lean();
    res.json(withLogo(fresh));
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    console.error('updateOwnProfile error:', error.message);
    res.status(500).json({ message: 'Could not save your company profile' });
  }
};

exports.uploadLogo = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please choose a logo image' });
  try {
    const company = await User.findById(req.user.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    company.set('logo', { mimetype: req.file.mimetype, size: req.file.size, updatedAt: new Date(), data: req.file.buffer });
    await company.save();
    res.json({ hasLogo: true, logoVersion: company.logo.updatedAt.getTime() });
  } catch (error) {
    res.status(500).json({ message: 'Could not save the logo' });
  }
};

exports.deleteLogo = async (req, res) => {
  try {
    const company = await User.findById(req.user.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    company.set('logo', undefined);
    await company.save();
    res.json({ hasLogo: false, logoVersion: null });
  } catch (error) {
    res.status(500).json({ message: 'Could not remove the logo' });
  }
};
