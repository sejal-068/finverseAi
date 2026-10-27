const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

/**
 * @desc    Get all budgets for user with real-time spending & threshold calculation
 * @route   GET /api/budgets
 * @access  Private
 */
const getBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.find({ userId: req.user.id }).sort({ createdAt: -1 });

    // Fetch user transactions to dynamically compute current spent amounts
    const userTransactions = await Transaction.find({
      userId: req.user.id,
      type: 'expense',
    });

    const result = budgets.map((b) => {
      // Sum all matching expense transactions for this budget's category
      const spent = userTransactions
        .filter((t) => t.category.toLowerCase().trim() === b.category.toLowerCase().trim())
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const limit = Number(b.limit || 0);
      const remainingAmount = limit - spent;
      const remaining = Math.max(0, remainingAmount);
      const exceeded = Math.max(0, spent - limit);
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status = 'normal';
      if (percentage >= 100) {
        status = 'danger'; // Over budget
      } else if (percentage >= 80) {
        status = 'critical'; // 80% Critical warning
      } else if (percentage >= 70) {
        status = 'warning'; // 70% Warning
      }

      return {
        id: b._id,
        _id: b._id,
        category: b.category,
        limit,
        spent,
        remaining,
        remainingAmount,
        exceeded,
        percentage,
        status,
        period: b.period || 'monthly',
        warningThreshold: b.warningThreshold || 70,
        month: b.month,
        year: b.year,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
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
 * @desc    Create a new budget limit
 * @route   POST /api/budgets
 * @access  Private
 */
const createBudget = async (req, res, next) => {
  try {
    const { category, limit, period, warningThreshold, month, year } = req.body;

    if (!category || limit === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category and budget limit amount',
      });
    }

    const budget = await Budget.create({
      userId: req.user.id,
      category: category.trim(),
      limit: Number(limit),
      period: period || 'monthly',
      warningThreshold: Number(warningThreshold) || 80,
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear(),
    });

    res.status(201).json({
      success: true,
      data: {
        id: budget._id,
        _id: budget._id,
        category: budget.category,
        limit: budget.limit,
        spent: 0,
        remaining: budget.limit,
        percentage: 0,
        status: 'normal',
        period: budget.period,
        warningThreshold: budget.warningThreshold,
        month: budget.month,
        year: budget.year,
        createdAt: budget.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing budget
 * @route   PUT /api/budgets/:id
 * @access  Private
 */
const updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found or unauthorized',
      });
    }

    const { category, limit, period, warningThreshold, month, year } = req.body;

    if (category !== undefined) budget.category = category.trim();
    if (limit !== undefined) budget.limit = Number(limit);
    if (period !== undefined) budget.period = period;
    if (warningThreshold !== undefined) budget.warningThreshold = Number(warningThreshold);
    if (month !== undefined) budget.month = Number(month);
    if (year !== undefined) budget.year = Number(year);

    const updated = await budget.save();

    res.status(200).json({
      success: true,
      data: {
        id: updated._id,
        _id: updated._id,
        category: updated.category,
        limit: updated.limit,
        period: updated.period,
        warningThreshold: updated.warningThreshold,
        month: updated.month,
        year: updated.year,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a budget
 * @route   DELETE /api/budgets/:id
 * @access  Private
 */
const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found or unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Budget successfully deleted',
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
};
