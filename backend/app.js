const express = require('express');
const helmet = require('helmet');
const passport = require('passport');
const cors = require('cors');
const { sanitize, apiLimiter } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Behind Render/Railway/Heroku the real client IP comes from the proxy (needed for rate limiting)
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// CLIENT_URL may hold several comma-separated origins, e.g. "https://jobly.app,https://www.jobly.app"
const allowedOrigins = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);

// logos are served to the frontend on another origin, so images must be allowed cross-origin
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins().includes(origin)) }));
app.use(express.json({ limit: '100kb' }));
app.use(sanitize);
app.use(passport.initialize());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', apiLimiter);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/protected', require('./routes/protectedRoutes'));
app.use('/auth', require('./routes/authRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
