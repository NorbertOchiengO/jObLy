const express = require('express');
const passport = require('passport');
require('../services/passport');

const router = express.Router();
const CLIENT_URL = () => process.env.CLIENT_URL || 'http://localhost:5173';

const callback = (provider) => [
  passport.authenticate(provider, { session: false, failureRedirect: `${CLIENT_URL()}/login?error=oauth` }),
  (req, res) => {
    const token = req.user.generateAuthToken();
    res.redirect(`${CLIENT_URL()}/oauth/callback?token=${token}&role=${req.user.role}`);
  }
];

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', ...callback('google'));

router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/github/callback', ...callback('github'));

router.get('/linkedin', passport.authenticate('linkedin', { session: false }));
router.get('/linkedin/callback', ...callback('linkedin'));

module.exports = router;
