const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Conversation = require('../models/Conversation');
const { isAdminUser } = require('../middleware/authMiddleware');

/**
 * @desc    Verify if authenticated session has administrative permissions
 * @route   GET /api/admin/check-access
 * @access  Private (JWT)
 */
const checkAccess = async (req, res) => {
  try {
    const isAdmin = isAdminUser(req.user, req);
    res.status(200).json({
      success: true,
      isAdmin,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role || (isAdmin ? 'admin' : 'user'),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Excel-style summary of all registered users
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
const getAllUsersSummary = async (req, res, next) => {
  try {
    // 1. Fetch all registered users from User collection
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    // 2. Perform aggregation on Transaction collection to calculate per-user totals
    // Keeps collections completely separate and avoids duplicating user data
    const txAgg = await Transaction.aggregate([
      {
        $group: {
          _id: { userId: '$userId', type: '$type' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Build lookup map: userId -> { incomeTotal, expenseTotal, txCount, incomeCount, expenseCount }
    const aggMap = {};
    txAgg.forEach((item) => {
      const uId = item._id.userId ? item._id.userId.toString() : null;
      if (!uId) return;

      if (!aggMap[uId]) {
        aggMap[uId] = {
          totalIncome: 0,
          totalExpenses: 0,
          txCount: 0,
          incomeCount: 0,
          expenseCount: 0,
        };
      }

      if (item._id.type === 'income') {
        aggMap[uId].totalIncome += item.totalAmount;
        aggMap[uId].incomeCount += item.count;
      } else if (item._id.type === 'expense') {
        aggMap[uId].totalExpenses += item.totalAmount;
        aggMap[uId].expenseCount += item.count;
      }
      aggMap[uId].txCount += item.count;
    });

    // 3. Combine into summary table rows
    const summaryList = users.map((u) => {
      const uIdStr = u._id.toString();
      const userAgg = aggMap[uIdStr] || {
        totalIncome: 0,
        totalExpenses: 0,
        txCount: 0,
        incomeCount: 0,
        expenseCount: 0,
      };

      const netSavings = Math.max(0, userAgg.totalIncome - userAgg.totalExpenses);
      const savingsRate = userAgg.totalIncome > 0
        ? Number(((netSavings / userAgg.totalIncome) * 100).toFixed(1))
        : 0;

      return {
        id: u._id,
        name: u.name,
        email: u.email,
        txCount: userAgg.txCount,
        totalIncome: userAgg.totalIncome,
        totalExpenses: userAgg.totalExpenses,
        netSavings,
        savingsRate,
        monthlyIncome: u.monthlyIncome || 0,
        financialGoal: u.financialGoal || 'Save Money',
        occupation: u.occupation || '',
        authProvider: u.authProvider || 'local',
        role: u.role || 'user',
        createdAt: u.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      count: summaryList.length,
      data: summaryList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed financial and profile data for a specific user by userId
 * @route   GET /api/admin/users/:userId
 * @access  Private (Admin only)
 */
const getUserDetail = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid User ID format',
      });
    }

    // Separate collection lookups for specific user
    const [targetUser, transactions, budgets, categories, conversations] = await Promise.all([
      User.findById(userId).select('-password'),
      Transaction.find({ userId }).sort({ date: -1 }),
      Budget.find({ userId }),
      Category.find({ $or: [{ userId }, { userId: null }] }),
      Conversation.find({ userId }).sort({ updatedAt: -1 }),
    ]);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found in system',
      });
    }

    // Calculate real live user metrics
    let totalIncome = 0;
    let totalExpenses = 0;
    let incomeTxCount = 0;
    let expenseTxCount = 0;
    const catMap = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'income') {
        totalIncome += amt;
        incomeTxCount++;
      } else if (tx.type === 'expense') {
        totalExpenses += amt;
        expenseTxCount++;
        catMap[tx.category] = (catMap[tx.category] || 0) + amt;
      }
    });

    const netSavings = Math.max(0, totalIncome - totalExpenses);
    const savingsRate = totalIncome > 0
      ? Number(((netSavings / totalIncome) * 100).toFixed(1))
      : 0;

    // Category-wise spending breakdown
    const categorySpending = Object.entries(catMap)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalExpenses > 0 ? Number(((amt / totalExpenses) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Enriched budgets
    const enrichedBudgets = budgets.map((b) => {
      const spent = catMap[b.category] || b.spent || 0;
      const limit = Number(b.limit || 0);
      const remaining = Math.max(0, limit - spent);
      const percentage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
      return {
        id: b._id,
        category: b.category,
        limit,
        spent,
        remaining,
        percentage,
        period: b.period || 'monthly',
      };
    });

    // Formatted conversations
    const formattedConversations = (conversations || []).map((c) => ({
      id: c._id,
      title: c.title || 'Financial Coaching Session',
      lastActivity: c.lastActivity || c.updatedAt,
      createdAt: c.createdAt,
      messagesCount: Array.isArray(c.messages) ? c.messages.length : 0,
      messages: (c.messages || []).map((m) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    }));

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          monthlyIncome: targetUser.monthlyIncome,
          financialGoal: targetUser.financialGoal,
          occupation: targetUser.occupation || '',
          city: targetUser.city || '',
          incomeType: targetUser.incomeType || 'Salaried',
          dependents: targetUser.dependents || 0,
          moneyRoutine: targetUser.moneyRoutine || '',
          authProvider: targetUser.authProvider || 'local',
          onboardingCompleted: !!targetUser.onboardingCompleted,
          createdAt: targetUser.createdAt,
          updatedAt: targetUser.updatedAt,
        },
        financialSummary: {
          totalIncome,
          totalExpenses,
          netSavings,
          savingsRate,
          txCount: transactions.length,
          incomeTxCount,
          expenseTxCount,
        },
        categorySpending,
        budgets: enrichedBudgets,
        conversations: formattedConversations,
        transactions: transactions.map((t) => ({
          id: t._id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category,
          date: t.date,
          paymentMethod: t.paymentMethod || 'UPI',
          notes: t.notes || '',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export specific user's complete data to Excel-compatible CSV file
 * @route   GET /api/admin/users/:userId/export
 * @access  Private (Admin only)
 */
const exportUserExcel = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send('Invalid User ID');
    }

    const [targetUser, transactions, budgets, conversations] = await Promise.all([
      User.findById(userId).select('-password'),
      Transaction.find({ userId }).sort({ date: -1 }),
      Budget.find({ userId }),
      Conversation.find({ userId }).sort({ updatedAt: -1 }),
    ]);

    if (!targetUser) {
      return res.status(404).send('User not found');
    }

    let totalIncome = 0;
    let totalExpenses = 0;
    const catMap = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'income') totalIncome += amt;
      else if (tx.type === 'expense') {
        totalExpenses += amt;
        catMap[tx.category] = (catMap[tx.category] || 0) + amt;
      }
    });

    const netSavings = Math.max(0, totalIncome - totalExpenses);
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0';

    // Build structured Excel CSV with BOM for universal Excel character encoding
    let csv = '\uFEFF'; // UTF-8 BOM

    // SECTION 1: HEADER & USER PROFILE
    csv += 'FINVERSE-AI USER FINANCIAL PROFILE EXPORT\n';
    csv += `Export Generated,${new Date().toLocaleString('en-IN')}\n\n`;
    csv += 'USER INFORMATION\n';
    csv += `User ID,${targetUser._id}\n`;
    csv += `Full Name,"${(targetUser.name || '').replace(/"/g, '""')}"\n`;
    csv += `Email Address,${targetUser.email}\n`;
    csv += `Monthly Income,"₹${Number(targetUser.monthlyIncome || 0).toLocaleString('en-IN')}"\n`;
    csv += `Primary Goal,"${targetUser.financialGoal || 'Save Money'}"\n`;
    csv += `Occupation,"${targetUser.occupation || 'Not Specified'}"\n`;
    csv += `Dependents,${targetUser.dependents || 0}\n`;
    csv += `Member Since,${new Date(targetUser.createdAt).toLocaleDateString('en-IN')}\n\n`;

    // SECTION 2: FINANCIAL SUMMARY KPIS
    csv += 'FINANCIAL SUMMARY\n';
    csv += 'Metric,Amount (INR),Notes\n';
    csv += `Total Recorded Income,"₹${totalIncome.toLocaleString('en-IN')}",Inflow across transactions\n`;
    csv += `Total Recorded Expenses,"₹${totalExpenses.toLocaleString('en-IN')}",Outflow across transactions\n`;
    csv += `Net Savings,"₹${netSavings.toLocaleString('en-IN')}",Current unallocated cushion\n`;
    csv += `Savings Rate,${savingsRate}%,Percentage of total income retained\n`;
    csv += `Total Transactions,${transactions.length},All records logged\n\n`;

    // SECTION 3: CATEGORY-WISE SPENDING
    csv += 'CATEGORY-WISE SPENDING BREAKDOWN\n';
    csv += 'Category,Total Spent (INR),Percentage of Expenses\n';
    Object.entries(catMap).sort((a, b) => b[1] - a[1]).forEach(([c, a]) => {
      const pct = totalExpenses > 0 ? ((a / totalExpenses) * 100).toFixed(1) : 0;
      csv += `"${c.replace(/"/g, '""')}","₹${a.toLocaleString('en-IN')}",${pct}%\n`;
    });
    if (Object.keys(catMap).length === 0) {
      csv += 'No expenses recorded yet,₹0,0%\n';
    }
    csv += '\n';

    // SECTION 4: BUDGETS
    csv += 'BUDGET ALLOCATIONS & PERFORMANCE\n';
    csv += 'Category,Monthly Limit (INR),Spent (INR),Remaining (INR),Utilization %\n';
    budgets.forEach((b) => {
      const spent = catMap[b.category] || b.spent || 0;
      const limit = Number(b.limit || 0);
      const remaining = Math.max(0, limit - spent);
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      csv += `"${b.category.replace(/"/g, '""')}","₹${limit.toLocaleString('en-IN')}","₹${spent.toLocaleString('en-IN')}","₹${remaining.toLocaleString('en-IN')}",${pct}%\n`;
    });
    if (budgets.length === 0) {
      csv += 'No budgets configured for this user,₹0,₹0,₹0,0%\n';
    }
    csv += '\n';

    // SECTION 5: TRANSACTIONS LEDGER
    csv += 'TRANSACTIONS LEDGER\n';
    csv += 'Date,Type,Description,Category,Amount (INR),Payment Method,Notes\n';
    transactions.forEach((t) => {
      const d = new Date(t.date).toLocaleDateString('en-IN');
      const desc = (t.description || '').replace(/"/g, '""');
      const cat = (t.category || '').replace(/"/g, '""');
      const type = t.type ? t.type.toUpperCase() : 'EXPENSE';
      const amt = Number(t.amount || 0);
      const pm = (t.paymentMethod || 'UPI').replace(/"/g, '""');
      const notes = (t.notes || '').replace(/"/g, '""');
      csv += `${d},${type},"${desc}","${cat}","₹${amt.toLocaleString('en-IN')}","${pm}","${notes}"\n`;
    });
    if (transactions.length === 0) {
      csv += 'N/A,N/A,No transactions recorded,N/A,₹0,N/A,N/A\n';
    }
    csv += '\n';

    // SECTION 6: AI COACH CONVERSATIONS
    csv += 'AI COACH CONVERSATIONS & CHAT HISTORY\n';
    csv += 'Session Title,Timestamp,Role,Message Content\n';
    let hasChatMessages = false;
    (conversations || []).forEach((c) => {
      const sessionTitle = (c.title || 'Coaching Session').replace(/"/g, '""');
      (c.messages || []).forEach((m) => {
        hasChatMessages = true;
        const msgDate = m.timestamp ? new Date(m.timestamp).toLocaleString('en-IN') : '—';
        const role = (m.role || 'user').toUpperCase();
        const content = (m.content || '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
        csv += `"${sessionTitle}",${msgDate},${role},"${content}"\n`;
      });
    });
    if (!hasChatMessages) {
      csv += 'No AI Coach conversation history logged for this user,N/A,N/A,N/A\n';
    }

    const cleanName = (targetUser.name || 'User').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `FinverseAI_${cleanName}_Data_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkAccess,
  getAllUsersSummary,
  getUserDetail,
  exportUserExcel,
};
