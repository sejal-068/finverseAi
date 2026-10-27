const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - Verifies JWT Bearer token and attaches user to request
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'finverseai_jwt_production_secret_key_2026_sejal');

    // Attach user to req.user (excluding password)
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(`[Auth Middleware Error] ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }
};

/**
 * Helper to check if a user qualifies as an administrator
 */
const isAdminUser = (user, req = null) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const adminEmail = (process.env.ADMIN_EMAIL || 'sejalshambharkar068@gmail.com').toLowerCase().trim();
  if (user.email && user.email.toLowerCase().trim() === adminEmail) return true;
  return false;
};

/**
 * Restrict access to administrators only
 */
const requireAdmin = (req, res, next) => {
  if (!isAdminUser(req.user, req)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required to access User Data Management.',
    });
  }
  next();
};

module.exports = { protect, requireAdmin, isAdminUser };
