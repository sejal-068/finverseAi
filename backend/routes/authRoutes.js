const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getMe,
  forgotPassword,
  validateResetToken,
  resetPassword,
  googleAuth,
  getGoogleConfig,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);

// Google Sign-In endpoints
router.post('/google', googleAuth);
router.get('/google/config', getGoogleConfig);

// Password recovery endpoints
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token', validateResetToken);
router.put('/reset-password/:token', resetPassword);

module.exports = router;
