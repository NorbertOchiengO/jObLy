const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { getMine, getReceived, updateStatus, downloadResume } = require('../controllers/applicationController');

const router = express.Router();

router.get('/mine', auth, requireRole('individual'), getMine);
router.get('/received', auth, requireRole('company'), getReceived);
router.patch('/:id/status', auth, requireRole('company'), updateStatus);
router.get('/:id/resume', auth, downloadResume);

module.exports = router;
