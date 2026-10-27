const express = require('express');
const router = express.Router();
const {
  checkAccess,
  getAllUsersSummary,
  getUserDetail,
  exportUserExcel,
} = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

// Check admin status (available to any authenticated user)
router.get('/check-access', protect, checkAccess);

// Administrative User Management Endpoints (Strictly restricted to authorized admins)
router.get('/users', protect, requireAdmin, getAllUsersSummary);
router.get('/users/:userId', protect, requireAdmin, getUserDetail);
router.get('/users/:userId/export', protect, requireAdmin, exportUserExcel);

module.exports = router;
