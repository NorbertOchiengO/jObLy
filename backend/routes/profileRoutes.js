const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { uploadLimiter } = require('../middleware/security');
const { uploadCv } = require('../middleware/upload');
const { getProfile, updateProfile, uploadCv: saveCv, downloadCv, deleteCv } = require('../controllers/profileController');

const router = express.Router();
router.use(auth, requireRole('individual'));

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/cv', uploadLimiter, uploadCv, saveCv);
router.get('/cv', downloadCv);
router.delete('/cv', deleteCv);

module.exports = router;
