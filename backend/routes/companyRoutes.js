const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { uploadLimiter } = require('../middleware/security');
const { uploadLogo } = require('../middleware/upload');
const c = require('../controllers/companyController');

const router = express.Router();

// Public
router.get('/', c.getCompanies);

// The logged-in company's own profile (declared before '/:id' so "me" isn't treated as an id)
router.get('/me', auth, requireRole('company'), c.getOwnProfile);
router.put('/me', auth, requireRole('company'), c.updateOwnProfile);
router.post('/me/logo', auth, requireRole('company'), uploadLimiter, uploadLogo, c.uploadLogo);
router.delete('/me/logo', auth, requireRole('company'), c.deleteLogo);

router.get('/:id', c.getCompany);
router.get('/:id/logo', c.getLogo);

module.exports = router;
