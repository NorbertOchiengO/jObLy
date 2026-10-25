const express = require('express');
const auth = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/security');
const { registerUser, loginUser, getMe } = require('../controllers/userController');

const router = express.Router();

router.post('/register', registerLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.get('/me', auth, getMe);

module.exports = router;
