const express = require('express');
const { signup, login, getMe, updateCredentials } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe); // Protected — requires valid JWT
router.put('/update', protect, updateCredentials); // Protected — change credentials

module.exports = router;
