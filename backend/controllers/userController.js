const User = require('../models/User');

const MIN_PASSWORD = 8;
const isText = (v) => typeof v === 'string';
const COMPANY_FIELDS = ['companyName', 'position', 'type', 'address', 'location', 'city', 'industry'];

exports.registerUser = async (req, res) => {
  const { name, email, password, role = 'individual' } = req.body;

  if (![name, email, password, role].every(isText) || !name.trim() || !email.trim() || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });
  }
  if (!['individual', 'company'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const data = { name, email, password, role };
    if (role === 'company') {
      if (!isText(req.body.companyName) || !req.body.companyName.trim()) {
        return res.status(400).json({ message: 'Company name is required' });
      }
      if (await User.findOne({ companyName: req.body.companyName })) {
        return res.status(400).json({ message: 'Company already registered' });
      }
      COMPANY_FIELDS.forEach((f) => { data[f] = isText(req.body[f]) ? req.body[f].trim() : ''; });
    }

    const user = await User.create(data); // password hashed by the model hook
    res.status(201).json({ token: user.generateAuthToken(), role: user.role });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Error registering user' });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!isText(email) || !isText(password) || !email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    res.status(200).json({ token: user.generateAuthToken(), role: user.role });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Error logging in' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user' });
  }
};
