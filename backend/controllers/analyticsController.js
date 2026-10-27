const Transaction = require('../models/Transaction');

/**
 * @desc    Get detailed financial analytics across time ranges
 * @route   GET /api/analytics
 * @access  Private
 */
const getAnalytics = async (req, res, next) => {
  try {
    const range = req.query.range || '30d';

    const now = new Date();
    let startDate = new Date();
    let daysCount = 30;

    if (range === '7d') {
      startDate.setDate(now.getDate() - 7);
      daysCount = 7;
    } else if (range === '3m') {
      startDate.setMonth(now.getMonth() - 3);
      daysCount = 90;
    } else if (range === '6m') {
      startDate.setMonth(now.getMonth() - 6);
      daysCount = 180;
    } else if (range === '1y') {
      startDate.setFullYear(now.getFullYear() - 1);
      daysCount = 365;
    } else {
      // Default 30d
      startDate.setDate(now.getDate() - 30);
      daysCount = 30;
    }

    // Fetch transactions within date range for this user
    const transactions = await Transaction.find({
      userId: req.user.id,
      date: { $gte: startDate, $lte: now },
    }).sort({ date: 1 });

    let income = 0;
    let expense = 0;
    const categoryMap = {};
    const dailyMap = {};

    transactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      const dayKey = t.date.toISOString().split('T')[0];

      if (t.type === 'income') {
        income += amt;
      } else if (t.type === 'expense') {
        expense += amt;
        categoryMap[t.category] = (categoryMap[t.category] || 0) + amt;
        dailyMap[dayKey] = (dailyMap[dayKey] || 0) + amt;
      }
    });

    const savings = income - expense;
    const savingsRate = income > 0 ? Number(((savings / income) * 100).toFixed(1)) : 0;
    const avgDailySpend = Math.round(expense / (daysCount || 30));

    // Find highest spending category
    let highestCategory = 'None';
    let maxSpent = 0;
    Object.entries(categoryMap).forEach(([cat, amt]) => {
      if (amt > maxSpent) {
        maxSpent = amt;
        highestCategory = cat;
      }
    });

    // Category Distribution list
    const categoryDistribution = Object.entries(categoryMap).map(([name, spent]) => ({
      name,
      spent,
      percentage: expense > 0 ? Number(((spent / expense) * 100).toFixed(1)) : 0,
    }));

    // Fetch all user transactions to compute multi-month cash flow trajectory
    const allTransactions = await Transaction.find({ userId: req.user.id }).sort({ date: 1 });
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = {};

    allTransactions.forEach((t) => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0 };
      const amt = Number(t.amount || 0);
      if (t.type === 'income') monthlyMap[key].income += amt;
      else if (t.type === 'expense') monthlyMap[key].expenses += amt;
    });

    const cashFlowTrend = Object.keys(monthlyMap).sort().slice(-6).map((key) => {
      const [y, m] = key.split('-');
      const inc = monthlyMap[key].income;
      const exp = monthlyMap[key].expenses;
      return {
        month: `${monthNames[parseInt(m) - 1]} ${y.slice(-2)}`,
        income: inc,
        expenses: exp,
        savings: inc - exp,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        range,
        monthlyIncome: income,
        monthlyExpenses: expense,
        savings,
        savingsRate,
        avgDailySpend,
        highestCategory,
        cashFlowTrend,
        categoryDistribution,
        dailySpending: dailyMap,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
};
