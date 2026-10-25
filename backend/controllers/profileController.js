const User = require('../models/User');
const { extractText, parseCvText } = require('../services/cvParser');

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const cvMeta = (cv) => (cv && cv.uploadedAt ? { originalName: cv.originalName, size: cv.size, mimetype: cv.mimetype, uploadedAt: cv.uploadedAt } : null);

// What the client may see: never the file bytes
const toPublic = (user) => {
  const p = user.profile || {};
  return {
    name: user.name,
    email: user.email,
    profile: {
      headline: p.headline || '',
      phone: p.phone || '',
      location: p.location || '',
      summary: p.summary || '',
      skills: p.skills || [],
      education: p.education || [],
      experience: p.experience || [],
      cv: cvMeta(p.cv)
    }
  };
};

function cleanSkills(input) {
  const list = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const s = text(raw, 40);
    if (s && !seen.has(s.toLowerCase())) { seen.add(s.toLowerCase()); out.push(s); }
  }
  return out.slice(0, 30);
}

const cleanEducation = (list) => (Array.isArray(list) ? list : []).slice(0, 10)
  .map((e) => ({ school: text(e && e.school, 120), degree: text(e && e.degree, 120), year: text(e && e.year, 10) }))
  .filter((e) => e.school || e.degree);

const cleanExperience = (list) => (Array.isArray(list) ? list : []).slice(0, 10)
  .map((e) => ({ title: text(e && e.title, 100), company: text(e && e.company, 100), period: text(e && e.period, 40), description: text(e && e.description, 1000) }))
  .filter((e) => e.title || e.company);

exports.getProfile = async (req, res) => {
  try {
    // list the sub-fields explicitly so the CV bytes are never loaded for a plain profile view
    const user = await User.findById(req.user.id).select('name email profile.headline profile.phone profile.location profile.summary profile.skills profile.education profile.experience profile.cv.originalName profile.cv.mimetype profile.cv.size profile.cv.uploadedAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(toPublic(user));
  } catch (error) {
    res.status(500).json({ message: 'Could not load your profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const b = req.body || {};
    const name = text(b.name, 100);
    if (b.name !== undefined && !name) return res.status(400).json({ message: 'Name cannot be empty' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (b.headline !== undefined) user.set('profile.headline', text(b.headline, 120));
    if (b.phone !== undefined) user.set('profile.phone', text(b.phone, 30));
    if (b.location !== undefined) user.set('profile.location', text(b.location, 120));
    if (b.summary !== undefined) user.set('profile.summary', text(b.summary, 2000));
    if (b.skills !== undefined) user.set('profile.skills', cleanSkills(b.skills));
    if (b.education !== undefined) user.set('profile.education', cleanEducation(b.education));
    if (b.experience !== undefined) user.set('profile.experience', cleanExperience(b.experience));
    await user.save();

    res.json(toPublic(user));
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    console.error('updateProfile error:', error.message);
    res.status(500).json({ message: 'Could not save your profile' });
  }
};

// Saves the CV on the profile and reads it to suggest profile details. Suggestions are NOT saved: the user reviews them first.
exports.uploadCv = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please attach your CV (PDF or Word)' });
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.set('profile.cv', {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
      data: req.file.buffer
    });
    await user.save();

    let parsed = null;
    let note = '';
    try {
      const raw = await extractText(req.file.buffer, req.file.mimetype);
      if (raw && raw.trim().length > 30) parsed = parseCvText(raw);
      else if (req.file.mimetype === 'application/msword') note = "Older .doc files can't be read automatically. Save your CV as PDF or .docx to auto-fill your profile.";
      else note = "We saved your CV but couldn't find readable text in it (it may be a scanned image).";
    } catch (e) {
      note = "We saved your CV but couldn't read it automatically. You can fill in your profile by hand.";
    }

    res.json({ cv: cvMeta(user.profile.cv), parsed, note });
  } catch (error) {
    console.error('uploadCv error:', error.message);
    res.status(500).json({ message: 'Could not save your CV' });
  }
};

exports.downloadCv = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+profile.cv.data');
    const cv = user && user.profile && user.profile.cv;
    if (!cv || !cv.data || !cv.data.length) return res.status(404).json({ message: 'No CV on file' });
    res.set('Content-Type', cv.mimetype || 'application/octet-stream');
    res.set('X-Content-Type-Options', 'nosniff');
    res.attachment(cv.originalName || 'cv');
    res.send(Buffer.from(cv.data));
  } catch (error) {
    res.status(500).json({ message: 'Could not download your CV' });
  }
};

exports.deleteCv = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.set('profile.cv', undefined);
    await user.save();
    res.json({ message: 'CV removed' });
  } catch (error) {
    res.status(500).json({ message: 'Could not remove your CV' });
  }
};

exports.cleanSkills = cleanSkills;
