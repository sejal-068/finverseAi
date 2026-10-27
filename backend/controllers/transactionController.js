const Transaction = require('../models/Transaction');

/**
 * @desc    Get all transactions for authenticated user with filters & sorting
 * @route   GET /api/transactions
 * @access  Private
 */
const getTransactions = async (req, res, next) => {
  try {
    const { search, category, type, startDate, endDate, sortBy, limit } = req.query;

    // Base query scoped to current user
    const query = { userId: req.user.id };

    // Search query (case-insensitive regex on description, merchant, category, notes)
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { description: regex },
        { category: regex },
        { merchant: regex },
        { notes: regex },
      ];
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Type filter (income / expense)
    if (type && type !== 'all') {
      query.type = type;
    }

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        // End of the day for endDate
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Sorting
    let sortOption = { date: -1, createdAt: -1 }; // Default: Newest first
    if (sortBy === 'date-asc') {
      sortOption = { date: 1, createdAt: 1 };
    } else if (sortBy === 'amount-desc') {
      sortOption = { amount: -1, date: -1 };
    } else if (sortBy === 'amount-asc') {
      sortOption = { amount: 1, date: -1 };
    }

    let txQuery = Transaction.find(query).sort(sortOption);

    if (limit && Number(limit) > 0) {
      txQuery = txQuery.limit(Number(limit));
    }

    const transactions = await txQuery.exec();

    // Compute summary totals for the filtered set
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((t) => {
      if (t.type === 'income') totalIncome += Number(t.amount);
      if (t.type === 'expense') totalExpenses += Number(t.amount);
    });

    res.status(200).json({
      success: true,
      count: transactions.length,
      totalIncome,
      totalExpenses,
      data: transactions.map(t => ({
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
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single transaction by ID
 * @route   GET /api/transactions/:id
 * @access  Private
 */
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: transaction._id,
        _id: transaction._id,
        description: transaction.description,
        merchant: transaction.merchant,
        category: transaction.category,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date.toISOString().split('T')[0],
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new transaction
 * @route   POST /api/transactions
 * @access  Private
 */
const createTransaction = async (req, res, next) => {
  try {
    const { description, merchant, category, type, amount, date, paymentMethod, notes } = req.body;

    if (!description || !category || !type || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide description, category, type (income/expense), and amount',
      });
    }

    const transaction = await Transaction.create({
      userId: req.user.id,
      description: description.trim(),
      merchant: merchant ? merchant.trim() : '',
      category: category.trim(),
      type,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      paymentMethod: paymentMethod || 'UPI',
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      data: {
        id: transaction._id,
        _id: transaction._id,
        description: transaction.description,
        merchant: transaction.merchant,
        category: transaction.category,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date.toISOString().split('T')[0],
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update existing transaction
 * @route   PUT /api/transactions/:id
 * @access  Private
 */
const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized',
      });
    }

    const { description, merchant, category, type, amount, date, paymentMethod, notes } = req.body;

    if (description !== undefined) transaction.description = description.trim();
    if (merchant !== undefined) transaction.merchant = merchant.trim();
    if (category !== undefined) transaction.category = category.trim();
    if (type !== undefined) transaction.type = type;
    if (amount !== undefined) transaction.amount = Number(amount);
    if (date !== undefined) transaction.date = new Date(date);
    if (paymentMethod !== undefined) transaction.paymentMethod = paymentMethod;
    if (notes !== undefined) transaction.notes = notes.trim();

    const updated = await transaction.save();

    res.status(200).json({
      success: true,
      data: {
        id: updated._id,
        _id: updated._id,
        description: updated.description,
        merchant: updated.merchant,
        category: updated.category,
        type: updated.type,
        amount: updated.amount,
        date: updated.date.toISOString().split('T')[0],
        paymentMethod: updated.paymentMethod,
        notes: updated.notes,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a transaction
 * @route   DELETE /api/transactions/:id
 * @access  Private
 */
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction successfully deleted',
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
