const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const User = require('../models/User');

const callback = (path) => `${process.env.BACKEND_URL || ''}${path}`;

// Find by provider id, then by email (link accounts), else create a new individual
async function findOrCreate(idField, profile, done) {
  try {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
    let user = await User.findOne({ [idField]: profile.id });

    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        user[idField] = profile.id;
        await user.save();
      }
    }

    if (!user) {
      if (!email) return done(new Error('Provider did not return an email address'));
      user = await User.create({
        name: profile.displayName || profile.username || email.split('@')[0],
        email,
        role: 'individual',
        [idField]: profile.id
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}

// Only register a strategy when its credentials exist, so the server boots without all three
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callback('/auth/google/callback')
  }, (accessToken, refreshToken, profile, done) => findOrCreate('googleId', profile, done)));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: callback('/auth/github/callback'),
    scope: ['user:email']
  }, (accessToken, refreshToken, profile, done) => findOrCreate('githubId', profile, done)));
}

if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: callback('/auth/linkedin/callback'),
    scope: ['r_emailaddress', 'r_liteprofile'] // LinkedIn deprecated these; migrate to OpenID later
  }, (accessToken, refreshToken, profile, done) => findOrCreate('linkedinId', profile, done)));
}

module.exports = passport;
