const express = require('express');
const { signup, login, getMe, updateCredentials, googleAuth } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.get('/me', protect, getMe); // Protected — requires valid JWT
router.put('/update', protect, updateCredentials); // Protected — change credentials

module.exports = router;
