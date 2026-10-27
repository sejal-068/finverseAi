const Category = require('../models/Category');
const Transaction = require('../models/Transaction');

// Default global categories list if none found in DB
const SYSTEM_DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: 'fa-utensils', type: 'expense', color: '#D97706', bg: '#FEF3C7' },
  { name: 'Shopping', icon: 'fa-bag-shopping', type: 'expense', color: '#DB2777', bg: '#FCE7F3' },
  { name: 'Transport', icon: 'fa-car', type: 'expense', color: '#4F46E5', bg: '#E0E7FF' },
  { name: 'Bills & Utilities', icon: 'fa-file-invoice-dollar', type: 'expense', color: '#DC2626', bg: '#FEE2E2' },
  { name: 'Entertainment', icon: 'fa-film', type: 'expense', color: '#7C3AED', bg: '#EDE9FE' },
  { name: 'Health & Wellness', icon: 'fa-heart-pulse', type: 'expense', color: '#0D9488', bg: '#CCFBF1' },
  { name: 'Education', icon: 'fa-graduation-cap', type: 'expense', color: '#0284C7', bg: '#E0F2FE' },
  { name: 'Travel', icon: 'fa-plane', type: 'expense', color: '#EA580C', bg: '#FFEDD5' },
  { name: 'Salary', icon: 'fa-money-bill-wave', type: 'income', color: '#059669', bg: '#D1FAE5' },
  { name: 'Freelance & Bonus', icon: 'fa-laptop-code', type: 'income', color: '#0891B2', bg: '#CFFAFE' },
  { name: 'Other', icon: 'fa-shapes', type: 'expense', color: '#64748B', bg: '#F1F5F9' },
];

/**
 * @desc    Get all categories with dynamic user spending aggregation
 * @route   GET /api/categories
 * @access  Private
 */
const getCategories = async (req, res, next) => {
  try {
    // Fetch global system categories OR user-created custom categories
    let categories = await Category.find({
      $or: [{ userId: null }, { userId: req.user.id }],
    }).sort({ createdAt: 1 });

    // If no categories in DB yet, return the defaults
    if (categories.length === 0) {
      categories = SYSTEM_DEFAULT_CATEGORIES.map((c, idx) => ({
        _id: 'cat_sys_' + idx,
        id: 'cat_sys_' + idx,
        ...c,
        isCustom: false,
      }));
    }

    // Aggregate user transactions to calculate total expense and per-category spending
    const userTransactions = await Transaction.find({ userId: req.user.id });

    let totalExpenseSum = 0;
    const spendingMap = {};
    const countMap = {};

    userTransactions.forEach((t) => {
      if (t.type === 'expense') {
        const amt = Number(t.amount) || 0;
        totalExpenseSum += amt;
        spendingMap[t.category] = (spendingMap[t.category] || 0) + amt;
        countMap[t.category] = (countMap[t.category] || 0) + 1;
      }
    });

    const result = categories.map((cat) => {
      const catName = cat.name;
      const spent = spendingMap[catName] || 0;
      const count = countMap[catName] || 0;
      const percentage = totalExpenseSum > 0 ? Number(((spent / totalExpenseSum) * 100).toFixed(1)) : 0;

      return {
        id: cat._id || cat.id,
        _id: cat._id || cat.id,
        name: cat.name,
        icon: cat.icon || 'fa-tag',
        color: cat.color || '#4F46E5',
        bg: cat.bg || '#EEF2FF',
        type: cat.type || 'expense',
        isCustom: !!cat.isCustom,
        spent,
        count,
        percentage,
      };
    });

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a custom category
 * @route   POST /api/categories
 * @access  Private
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, icon, color, bg, type } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a category name',
      });
    }

    const category = await Category.create({
      userId: req.user.id,
      name: name.trim(),
      icon: icon || 'fa-tag',
      color: color || '#10B981',
      bg: bg || (color ? color + '20' : '#D1FAE5'),
      type: type || 'expense',
      isCustom: true,
    });

    res.status(201).json({
      success: true,
      data: {
        id: category._id,
        _id: category._id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        bg: category.bg,
        type: category.type,
        isCustom: true,
        spent: 0,
        count: 0,
        percentage: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a custom category
 * @route   PUT /api/categories/:id
 * @access  Private
 */
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or unauthorized to edit system categories',
      });
    }

    const { name, icon, color, bg, type } = req.body;

    if (name !== undefined) category.name = name.trim();
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (bg !== undefined) category.bg = bg;
    if (type !== undefined) category.type = type;

    const updated = await category.save();

    res.status(200).json({
      success: true,
      data: {
        id: updated._id,
        _id: updated._id,
        name: updated.name,
        icon: updated.icon,
        color: updated.color,
        bg: updated.bg,
        type: updated.type,
        isCustom: updated.isCustom,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a custom category
 * @route   DELETE /api/categories/:id
 * @access  Private
 */
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or unauthorized to delete system categories',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
