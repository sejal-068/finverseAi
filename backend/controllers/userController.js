const User = require('../models/User');

/**
 * @desc    Get user profile
 * @route   GET /api/user/profile
 * @access  Private
 */
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        monthlyIncome: user.monthlyIncome,
        financialGoal: user.financialGoal,
        currency: user.currency,
        symbol: user.symbol,
        avatarUrl: user.avatarUrl,
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile & financial onboarding details
 * @route   PUT /api/user/profile
 * @access  Private
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    const {
      name,
      email,
      monthlyIncome,
      financialGoal,
      currency,
      goals,
      avatarUrl,
      age,
      gender,
      occupation,
      city,
      incomeType,
      dependents,
      dependentsContext,
      financialGoals,
      moneyRoutine,
      onboardingCompleted,
    } = req.body;

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) {
      const lowerEmail = email.toLowerCase().trim();
      if (lowerEmail !== user.email) {
        const existing = await User.findOne({ email: lowerEmail });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Email address is already in use by another account',
          });
        }
        user.email = lowerEmail;
      }
    }
    if (monthlyIncome !== undefined) user.monthlyIncome = Number(monthlyIncome);
    if (financialGoal !== undefined) user.financialGoal = financialGoal;
    if (currency !== undefined) user.currency = currency;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (goals !== undefined && Array.isArray(goals)) user.goals = goals;

    // Financial Profile & Onboarding fields
    if (age !== undefined) user.age = Number(age);
    if (gender !== undefined) user.gender = gender;
    if (occupation !== undefined) user.occupation = occupation.trim();
    if (city !== undefined) user.city = city.trim();
    if (incomeType !== undefined) user.incomeType = incomeType;
    if (dependents !== undefined) user.dependents = Number(dependents);
    if (dependentsContext !== undefined) user.dependentsContext = dependentsContext.trim();
    if (financialGoals !== undefined && Array.isArray(financialGoals)) user.financialGoals = financialGoals;
    if (moneyRoutine !== undefined) user.moneyRoutine = moneyRoutine;
    if (onboardingCompleted !== undefined) user.onboardingCompleted = Boolean(onboardingCompleted);

    user.updatedAt = new Date();
    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        monthlyIncome: updatedUser.monthlyIncome,
        financialGoal: updatedUser.financialGoal,
        currency: updatedUser.currency,
        symbol: updatedUser.symbol,
        avatarUrl: updatedUser.avatarUrl,
        age: updatedUser.age,
        gender: updatedUser.gender,
        occupation: updatedUser.occupation,
        city: updatedUser.city,
        incomeType: updatedUser.incomeType,
        dependents: updatedUser.dependents,
        dependentsContext: updatedUser.dependentsContext,
        financialGoals: updatedUser.financialGoals,
        moneyRoutine: updatedUser.moneyRoutine,
        onboardingCompleted: !!updatedUser.onboardingCompleted,
        goals: updatedUser.goals,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Change password
 * @route   PUT /api/user/password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user settings
 * @route   GET /api/user/settings
 * @access  Private
 */
const getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user.settings || {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user settings
 * @route   PUT /api/user/settings
 * @access  Private
 */
const updateSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const allowedFields = [
      'theme', 'emailNotifications', 'pushNotifications',
      'budgetAlerts', 'weeklyReport', 'language', 'dateFormat',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user.settings[field] = req.body[field];
      }
    });

    user.markModified('settings');
    await user.save();

    res.status(200).json({
      success: true,
      data: user.settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export all user data as JSON
 * @route   GET /api/user/export
 * @access  Private
 */
const exportData = async (req, res, next) => {
  try {
    const Transaction = require('../models/Transaction');
    const Category = require('../models/Category');
    const Budget = require('../models/Budget');

    const [user, transactions, categories, budgets] = await Promise.all([
      User.findById(req.user.id),
      Transaction.find({ userId: req.user.id }).sort({ date: -1 }),
      Category.find({ $or: [{ userId: req.user.id }, { userId: null }] }),
      Budget.find({ userId: req.user.id }),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: {
        name: user.name,
        email: user.email,
        monthlyIncome: user.monthlyIncome,
        financialGoal: user.financialGoal,
        currency: user.currency,
        goals: user.goals,
        settings: user.settings,
        memberSince: user.createdAt,
      },
      transactions: transactions.map(t => ({
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: t.date,
        paymentMethod: t.paymentMethod,
      })),
      categories: categories.map(c => ({
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
      })),
      budgets: budgets.map(b => ({
        category: b.category,
        limit: b.limit,
        period: b.period,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=finverse_export_${Date.now()}.json`);
    res.status(200).json({
      success: true,
      data: exportPayload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account and all associated data
 * @route   DELETE /api/user/account
 * @access  Private
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your password to confirm account deletion',
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect. Account deletion cancelled.',
      });
    }

    const Transaction = require('../models/Transaction');
    const Category = require('../models/Category');
    const Budget = require('../models/Budget');

    // Delete all user data
    await Promise.all([
      Transaction.deleteMany({ userId: req.user.id }),
      Category.deleteMany({ userId: req.user.id }),
      Budget.deleteMany({ userId: req.user.id }),
    ]);

    // Try to delete conversations if the model exists
    try {
      const Conversation = require('../models/Conversation');
      await Conversation.deleteMany({ userId: req.user.id });
    } catch (e) {
      // Conversation model might not exist yet, ignore
    }

    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Account and all associated data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getSettings,
  updateSettings,
  exportData,
  deleteAccount,
};
