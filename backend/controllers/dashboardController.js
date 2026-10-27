const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const User = require('../models/User');

/**
 * @desc    Get aggregated dashboard summary data calculated from MongoDB
 * @route   GET /api/dashboard
 * @access  Private
 */
const getDashboardData = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Fetch all user transactions
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });

    let totalIncome = 0;
    let totalExpenses = 0;
    const categorySpending = {};

    transactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === 'income') {
        totalIncome += amt;
      } else if (t.type === 'expense') {
        totalExpenses += amt;
        categorySpending[t.category] = (categorySpending[t.category] || 0) + amt;
      }
    });

    const totalBalance = totalIncome - totalExpenses;
    const savings = Math.max(0, totalBalance);
    const savingsRate = totalIncome > 0 ? Number(((savings / totalIncome) * 100).toFixed(1)) : 0;

    // Recent 5 transactions
    const recentTransactions = transactions.slice(0, 5).map(t => ({
      id: t._id,
      _id: t._id,
      description: t.description,
      merchant: t.merchant,
      category: t.category,
      type: t.type,
      amount: t.amount,
      date: t.date.toISOString().split('T')[0],
      paymentMethod: t.paymentMethod,
      notes: t.notes,
    }));

    // Fetch active budgets and compute status
    const budgets = await Budget.find({ userId: req.user.id });
    const budgetSummary = budgets.map((b) => {
      const spent = categorySpending[b.category] || 0;
      const limit = Number(b.limit || 0);
      const remaining = Math.max(0, limit - spent);
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status = 'normal';
      if (percentage >= 100) status = 'danger';
      else if (percentage >= (b.warningThreshold || 80)) status = 'warning';

      return {
        id: b._id,
        _id: b._id,
        category: b.category,
        limit,
        spent,
        remaining,
        percentage,
        status,
      };
    });

    // Top Category Summary
    const categorySummary = Object.entries(categorySpending)
      .map(([name, spent]) => ({
        name,
        spent,
        percentage: totalExpenses > 0 ? Number(((spent / totalExpenses) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.spent - a.spent);


    // --- Monthly Cash Flow Trend (last 5 months) ---
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyMap = {};
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthYear = prevMonthDate.getFullYear();
    const prevMonthNum = prevMonthDate.getMonth();

    const weeklyExpenses = [0, 0, 0, 0, 0];
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    let prevMonthIncome = 0;
    let prevMonthExpense = 0;
    const activeIncomeSources = new Set();

    transactions.forEach(t => {
      const d = new Date(t.date);
      const amt = Number(t.amount || 0);
      const isCur = d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      const isPrev = d.getFullYear() === prevMonthYear && d.getMonth() === prevMonthNum;

      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0 };
      if (t.type === 'income') {
        monthlyMap[key].income += amt;
        if (isCur) {
          currentMonthIncome += amt;
          activeIncomeSources.add(t.category || t.description || 'Income');
        }
        if (isPrev) prevMonthIncome += amt;
      } else if (t.type === 'expense') {
        monthlyMap[key].expenses += amt;
        if (isCur) {
          currentMonthExpense += amt;
          const weekIdx = Math.min(4, Math.floor((d.getDate() - 1) / 7));
          weeklyExpenses[weekIdx] += amt;
        }
        if (isPrev) prevMonthExpense += amt;
      }
    });

    const cashFlowTrend = Object.keys(monthlyMap).sort().slice(-6).map(key => {
      const [y, m] = key.split('-');
      return {
        month: `${monthNames[parseInt(m)-1]} ${y.slice(-2)}`,
        income: monthlyMap[key].income,
        expenses: monthlyMap[key].expenses,
      };
    });

    const incomeGrowth = prevMonthIncome > 0
      ? Number((((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100).toFixed(1))
      : null;
    const expenseGrowth = prevMonthExpense > 0
      ? Number((((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100).toFixed(1))
      : null;

    // Financial health score
    let healthScore = null;
    if (transactions.length > 0) {
      let calculatedScore = 70;
      if (savingsRate >= 40) calculatedScore += 15;
      else if (savingsRate >= 20) calculatedScore += 10;
      else if (savingsRate < 10) calculatedScore -= 10;
      if (totalBalance > 20000) calculatedScore += 10;
      if (totalExpenses < totalIncome) calculatedScore += 5;
      healthScore = Math.min(100, Math.max(30, calculatedScore));
    }

    // --- Dynamic AI Recommendation ---
    let aiRecommendation = null;
    if (totalExpenses > 0 && categorySummary.length > 0) {
      const topCat = categorySummary[0];
      if (savingsRate < 20) {
        aiRecommendation = {
          title: 'Savings Alert',
          message: `Your savings rate is ${savingsRate}%. Consider reducing ${topCat.name} spending (${topCat.percentage}% of total expenses) to improve your financial cushion.`,
        };
      } else {
        aiRecommendation = {
          title: 'AI Insight',
          message: `Your top spending category is ${topCat.name} at ${formatINRServer(topCat.spent)} (${topCat.percentage}% of total expenses). Your savings rate is a healthy ${savingsRate}%.`,
        };
      }
    } else if (totalIncome === 0 && totalExpenses === 0) {
      aiRecommendation = {
        title: 'Welcome',
        message: 'Start by adding your income and expenses to receive personalized AI recommendations!',
      };
    } else {
      aiRecommendation = {
        title: 'Tracking Active',
        message: `You have recorded ${formatINRServer(totalIncome)} in income with zero recorded expenses so far. Great start!`,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          monthlyIncome: user.monthlyIncome,
          financialGoal: user.financialGoal,
          currency: user.currency,
          symbol: user.symbol,
          avatarUrl: user.avatarUrl,
          goals: user.goals,
        },
        totalBalance,
        totalIncome,
        totalExpenses,
        savings,
        savingsRate,
        recentTransactions,
        categorySummary,
        budgetSummary,
        cashFlowTrend,
        weeklyExpenses,
        incomeGrowth,
        expenseGrowth,
        activeIncomeSourcesCount: activeIncomeSources.size,
        healthScore,
        aiRecommendation,
      },
    });
  } catch (error) {
    next(error);
  }
};

function formatINRServer(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

module.exports = {
  getDashboardData,
};
