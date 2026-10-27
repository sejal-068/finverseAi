const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getSettings,
  updateSettings,
  exportData,
  deleteAccount,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All user profile routes are protected

router.route('/profile')
  .get(getUserProfile)
  .put(updateUserProfile);

router.put('/onboarding', updateUserProfile);

router.put('/password', changePassword);

router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

router.get('/export', exportData);

router.delete('/account', deleteAccount);

module.exports = router;
