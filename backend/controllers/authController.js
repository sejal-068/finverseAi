const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendPasswordResetEmail, isEmailConfigured } = require('../services/emailService');

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'finverseai_jwt_production_secret_key_2026_sejal', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

/**
 * Format user object for API response (single source of truth)
 */
const formatUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  monthlyIncome: user.monthlyIncome,
  financialGoal: user.financialGoal,
  currency: user.currency,
  symbol: user.symbol,
  avatarUrl: user.avatarUrl,
  authProvider: user.authProvider || 'local',
  age: user.age,
  gender: user.gender,
  occupation: user.occupation || '',
  city: user.city || '',
  incomeType: user.incomeType || 'Salaried',
  dependents: user.dependents !== undefined ? user.dependents : 0,
  dependentsContext: user.dependentsContext || '',
  financialGoals: user.financialGoals || [],
  moneyRoutine: user.moneyRoutine || 'I track some expenses',
  onboardingCompleted: !!user.onboardingCompleted,
  goals: user.goals || [],
  settings: user.settings,
  createdAt: user.createdAt,
});

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = async (req, res, next) => {
  try {
    const { name, email, password, monthlyIncome, financialGoal } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists',
      });
    }

    // Create user with empty goals (new user starts fresh)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      monthlyIncome: Number(monthlyIncome) || 0,
      financialGoal: financialGoal || 'Save Money',
      goals: [],
    });

    // Auto-create default categories for this user
    try {
      const Category = require('../models/Category');
      const defaultCategories = [
        { name: 'Food & Dining', icon: 'fa-utensils', type: 'expense', color: '#D97706', bg: '#FEF3C7' },
        { name: 'Shopping', icon: 'fa-bag-shopping', type: 'expense', color: '#DB2777', bg: '#FCE7F3' },
        { name: 'Transport', icon: 'fa-car', type: 'expense', color: '#4F46E5', bg: '#E0E7FF' },
        { name: 'Bills & Utilities', icon: 'fa-file-invoice-dollar', type: 'expense', color: '#DC2626', bg: '#FEE2E2' },
        { name: 'Entertainment', icon: 'fa-film', type: 'expense', color: '#7C3AED', bg: '#EDE9FE' },
        { name: 'Health & Wellness', icon: 'fa-heart-pulse', type: 'expense', color: '#059669', bg: '#D1FAE5' },
        { name: 'Education', icon: 'fa-graduation-cap', type: 'expense', color: '#0284C7', bg: '#E0F2FE' },
        { name: 'Salary', icon: 'fa-money-bill-wave', type: 'income', color: '#16A34A', bg: '#DCFCE7' },
        { name: 'Freelance', icon: 'fa-laptop-code', type: 'income', color: '#7C3AED', bg: '#EDE9FE' },
        { name: 'Investment Returns', icon: 'fa-chart-line', type: 'income', color: '#0891B2', bg: '#CFFAFE' },
      ];
      await Category.insertMany(
        defaultCategories.map(c => ({ ...c, userId: user._id, isCustom: false }))
      );
    } catch (catErr) {
      console.warn('Warning: Could not create default categories:', catErr.message);
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    // Check for user and include password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently logged in user info
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      data: formatUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request Password Reset Link (Sends secure token via email)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address format',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email service is configured
    if (!isEmailConfigured()) {
      console.error('❌ [ForgotPassword] Email service is not configured.');
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured. Please set RESEND_API_KEY or SMTP credentials in .env.',
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address. Please check your email address or sign up.',
      });
    }

    // Generate secure 32-byte reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Construct client reset URL dynamically based on request referer or clientUrl
    const referer = req.get('referer');
    let resetUrl;
    if (referer) {
      try {
        const refUrl = new URL(referer);
        const basePath = refUrl.pathname.substring(0, refUrl.pathname.lastIndexOf('/') + 1);
        resetUrl = `${refUrl.origin}${basePath}reset-password.html?token=${resetToken}`;
      } catch (e) {
        const clientUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
        resetUrl = `${clientUrl}/reset-password.html?token=${resetToken}`;
      }
    } else {
      const clientUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
      resetUrl = `${clientUrl}/reset-password.html?token=${resetToken}`;
    }

    console.log(`🔗 [ForgotPassword] Generated Reset URL for ${user.email}: ${resetUrl}`);

    try {
      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });

      res.status(200).json({
        success: true,
        message: `Password reset email sent successfully to ${user.email}. Please check your inbox and spam folder.`,
        provider: emailResult?.provider || 'configured',
      });
    } catch (err) {
      console.error('❌ [ForgotPassword] Email delivery failed:', err.message);

      // In development mode, if email provider errors (e.g. Resend free tier email sandbox),
      // keep the token active and provide clear guidance so testing is not blocked
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚠️ [ForgotPassword-Dev] Retaining reset token for dev testing: ${resetUrl}`);
        return res.status(200).json({
          success: true,
          message: `Password reset token generated. [Dev Notice: Email delivery error: ${err.message}. Link logged to server terminal.]`,
          resetUrl: resetUrl,
          provider: 'dev-fallback',
        });
      }

      // In production, invalidate token if email dispatch failed
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: `Email service error: Unable to deliver password reset email (${err.message}).`,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate Password Reset Token
 * @route   GET /api/auth/reset-password/:token
 * @access  Public
 */
const validateResetToken = async (req, res, next) => {
  try {
    const rawToken = req.params.token;

    if (!rawToken) {
      return res.status(400).json({
        success: false,
        message: 'Missing password reset token',
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset token is valid',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password using secure token
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const rawToken = req.params.token;
    const { password } = req.body;

    if (!rawToken) {
      return res.status(400).json({
        success: false,
        message: 'Missing password reset token',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired',
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false }); // pre('save') hashes password

    // Auto-authenticate user with fresh token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully! You can now log in.',
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Google Sign-In / Sign-Up
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleAuth = async (req, res, next) => {
  try {
    const { credential, accessToken, code, redirectUri } = req.body || {};

    let targetEmail = '';
    let targetName = '';
    let targetAvatar = '';
    let targetGoogleId = '';

    // 1. Google Identity Services ID Token (credential) verification
    if (credential) {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (!verifyRes.ok) {
          return res.status(401).json({
            success: false,
            message: 'Invalid or expired Google credential ID token',
          });
        }
        const payload = await verifyRes.json();

        // Verify audience if GOOGLE_CLIENT_ID is configured
        if (process.env.GOOGLE_CLIENT_ID && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
          return res.status(401).json({
            success: false,
            message: 'Google token client ID mismatch',
          });
        }

        // Verify email status
        if (payload.email_verified !== true && payload.email_verified !== 'true') {
          return res.status(401).json({
            success: false,
            message: 'Google email address is not verified',
          });
        }

        targetEmail = payload.email;
        targetName = payload.name;
        targetAvatar = payload.picture || '';
        targetGoogleId = payload.sub || '';
      } catch (verifyErr) {
        console.error('Google token verification error:', verifyErr.message);
        return res.status(401).json({
          success: false,
          message: 'Unable to verify Google credentials at this time',
        });
      }
    } 
    // 2. Google OAuth2 Access Token verification
    else if (accessToken) {
      try {
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userinfoRes.ok) {
          return res.status(401).json({
            success: false,
            message: 'Invalid or expired Google access token',
          });
        }
        const payload = await userinfoRes.json();

        if (payload.email_verified !== true && payload.email_verified !== 'true') {
          return res.status(401).json({
            success: false,
            message: 'Google email address is not verified',
          });
        }

        targetEmail = payload.email;
        targetName = payload.name;
        targetAvatar = payload.picture || '';
        targetGoogleId = payload.sub || '';
      } catch (verifyErr) {
        console.error('Google userinfo verification error:', verifyErr.message);
        return res.status(401).json({
          success: false,
          message: 'Unable to verify Google user info at this time',
        });
      }
    } 
    // 3. Google OAuth2 Authorization Code exchange
    else if (code) {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({
          success: false,
          message: 'Google OAuth client secret is not configured on the server',
        });
      }
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri || `${process.env.CLIENT_URL || 'http://localhost:5000'}/login.html`,
            grant_type: 'authorization_code',
          }),
        });
        if (!tokenRes.ok) {
          const errData = await tokenRes.text();
          console.error('Google code exchange failed:', errData);
          return res.status(401).json({
            success: false,
            message: 'Unable to exchange Google authorization code',
          });
        }
        const tokenData = await tokenRes.json();
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (!userinfoRes.ok) {
          return res.status(401).json({
            success: false,
            message: 'Invalid Google access token from code exchange',
          });
        }
        const payload = await userinfoRes.json();
        targetEmail = payload.email;
        targetName = payload.name;
        targetAvatar = payload.picture || '';
        targetGoogleId = payload.sub || '';
      } catch (codeErr) {
        console.error('Google code exchange exception:', codeErr.message);
        return res.status(401).json({
          success: false,
          message: 'Unable to complete Google authorization code exchange',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Valid Google authentication credential, access token, or authorization code is required',
      });
    }

    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid email is required for Google sign-in',
      });
    }

    const cleanEmail = targetEmail.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const derivedName = (targetName && targetName.trim()) 
        ? targetName.trim() 
        : cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      // Create user with a secure random password hash
      const randomPassword = crypto.randomBytes(32).toString('hex') + 'A1!';

      user = await User.create({
        name: derivedName,
        email: cleanEmail,
        password: randomPassword,
        avatarUrl: targetAvatar || '',
        googleId: targetGoogleId || '',
        authProvider: 'google',
        monthlyIncome: 50000,
        financialGoal: 'Save Money',
        onboardingCompleted: false,
        goals: [],
      });

      // Auto-create default categories for Google user
      try {
        const Category = require('../models/Category');
        const defaultCategories = [
          { name: 'Food & Dining', icon: 'fa-utensils', type: 'expense', color: '#D97706', bg: '#FEF3C7' },
          { name: 'Shopping', icon: 'fa-bag-shopping', type: 'expense', color: '#DB2777', bg: '#FCE7F3' },
          { name: 'Transport', icon: 'fa-car', type: 'expense', color: '#4F46E5', bg: '#E0E7FF' },
          { name: 'Bills & Utilities', icon: 'fa-file-invoice-dollar', type: 'expense', color: '#DC2626', bg: '#FEE2E2' },
          { name: 'Entertainment', icon: 'fa-film', type: 'expense', color: '#7C3AED', bg: '#EDE9FE' },
          { name: 'Health & Wellness', icon: 'fa-heart-pulse', type: 'expense', color: '#059669', bg: '#D1FAE5' },
          { name: 'Education', icon: 'fa-graduation-cap', type: 'expense', color: '#0284C7', bg: '#E0F2FE' },
          { name: 'Salary', icon: 'fa-money-bill-wave', type: 'income', color: '#16A34A', bg: '#DCFCE7' },
          { name: 'Freelance', icon: 'fa-laptop-code', type: 'income', color: '#7C3AED', bg: '#EDE9FE' },
          { name: 'Investment Returns', icon: 'fa-chart-line', type: 'income', color: '#0891B2', bg: '#CFFAFE' },
        ];
        await Category.insertMany(
          defaultCategories.map(c => ({ ...c, userId: user._id, isCustom: false }))
        );
      } catch (catErr) {
        console.warn('Default category creation skipped for Google user:', catErr.message);
      }
    } else {
      // Existing user: Link Google details if not already set
      let needsSave = false;
      if (targetGoogleId && !user.googleId) {
        user.googleId = targetGoogleId;
        needsSave = true;
      }
      if (targetAvatar && !user.avatarUrl) {
        user.avatarUrl = targetAvatar;
        needsSave = true;
      }
      if (user.authProvider !== 'google' && !user.googleId) {
        user.authProvider = 'google';
        needsSave = true;
      }
      if (needsSave) {
        await user.save({ validateBeforeSave: false });
      }
    }

    const token = generateToken(user._id);

    console.log(`✅ [GoogleAuth] User authenticated via Google: ${user.email} (${isNewUser ? 'New User' : 'Existing User'})`);

    res.status(200).json({
      success: true,
      token,
      isNewUser,
      user: formatUserResponse(user),
      message: isNewUser 
        ? 'Account successfully created with Google!' 
        : 'Welcome back! Signed in with Google.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Google OAuth Public Config
 * @route   GET /api/auth/google/config
 * @access  Public
 */
const getGoogleConfig = (req, res) => {
  // Dynamically re-read .env so any changes made by the user in .env take effect immediately
  try {
    const fs = require('fs');
    const path = require('path');
    const envPaths = [
      path.join(__dirname, '..', '.env'),
      path.join(__dirname, '..', '..', '.env'),
    ];
    for (const ep of envPaths) {
      if (fs.existsSync(ep)) {
        const content = fs.readFileSync(ep, 'utf-8');
        const matchId = content.match(/^GOOGLE_CLIENT_ID=(.*)$/m);
        if (matchId !== null) {
          process.env.GOOGLE_CLIENT_ID = matchId[1].trim();
        }
        const matchSec = content.match(/^GOOGLE_CLIENT_SECRET=(.*)$/m);
        if (matchSec !== null) {
          process.env.GOOGLE_CLIENT_SECRET = matchSec[1].trim();
        }
      }
    }
  } catch (e) {}

  res.status(200).json({
    success: true,
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  });
};

module.exports = {
  signup,
  login,
  getMe,
  forgotPassword,
  validateResetToken,
  resetPassword,
  googleAuth,
  getGoogleConfig,
};

