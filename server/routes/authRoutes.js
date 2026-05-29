const express = require('express');
const { signup, login, getMe, updateCredentials, googleAuth } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', protect, getMe); // Protected — requires valid JWT
router.put('/update', protect, updateCredentials); // Protected — change credentials

module.exports = router;
