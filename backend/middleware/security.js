const rateLimit = require('express-rate-limit');

// Strips Mongo operator keys ($gt, $ne, ...) and dotted keys from user input, so
// {"email": {"$gt": ""}} cannot be used to bypass a lookup (NoSQL injection)
function strip(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) delete obj[key];
    else strip(obj[key]);
  }
  return obj;
}

const sanitize = (req, res, next) => {
  strip(req.body);
  strip(req.query);
  strip(req.params);
  next();
};

const createLimiter = (options) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test', // keeps the test suite fast and deterministic
    message: { message: 'Too many requests. Please wait a while and try again.' },
    ...options
  });

module.exports = {
  sanitize,
  createLimiter,
  // 20 failed logins per 15 minutes per IP (successful logins are not counted)
  loginLimiter: createLimiter({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true }),
  // 10 new accounts per hour per IP
  registerLimiter: createLimiter({ windowMs: 60 * 60 * 1000, limit: 10 }),
  // 30 applications per hour per IP
  applyLimiter: createLimiter({ windowMs: 60 * 60 * 1000, limit: 30 }),
  // 30 CV / logo uploads per hour per IP
  uploadLimiter: createLimiter({ windowMs: 60 * 60 * 1000, limit: 30 }),
  // generous ceiling for everything else under /api
  apiLimiter: createLimiter({ windowMs: 15 * 60 * 1000, limit: 600 })
};
