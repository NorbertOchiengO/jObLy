const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { applyLimiter } = require('../middleware/security');
const { uploadResume } = require('../middleware/upload');
const { apply, getForJob } = require('../controllers/applicationController');
const { createJob, getJobs, getJob, getMeta, getMyJobs, updateJob, deleteJob } = require('../controllers/jobController');

const router = express.Router();

// Public
router.get('/', getJobs);
router.get('/meta', getMeta);

// Employer only (declared before '/:id' so "mine" isn't treated as an id)
router.get('/mine', auth, requireRole('company'), getMyJobs);
router.post('/', auth, requireRole('company'), createJob);

router.get('/:id', getJob);
router.post('/:id/apply', auth, requireRole('individual'), applyLimiter, uploadResume, apply);
router.get('/:id/applications', auth, requireRole('company'), getForJob);
router.put('/:id', auth, requireRole('company'), updateJob);
router.delete('/:id', auth, requireRole('company'), deleteJob);

module.exports = router;
