const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Budget must belong to a user'],
    index: true,
  },
  category: {
    type: String,
    required: [true, 'Please specify a budget category'],
    trim: true,
  },
  limit: {
    type: Number,
    required: [true, 'Please specify a budget limit amount'],
    min: [1, 'Budget limit must be greater than 0'],
  },
  spent: {
    type: Number,
    default: 0,
    min: [0, 'Spent amount cannot be negative'],
  },
  period: {
    type: String,
    enum: ['monthly', 'weekly', 'yearly'],
    default: 'monthly',
  },
  warningThreshold: {
    type: Number,
    default: 80,
    min: [1, 'Threshold must be at least 1%'],
    max: [100, 'Threshold cannot exceed 100%'],
  },
  month: {
    type: Number,
    default: () => new Date().getMonth() + 1,
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear(),
  },
}, {
  timestamps: true,
});

// Composite index to prevent duplicate budgets for same category, user, month, and year
BudgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: false });

module.exports = mongoose.model('Budget', BudgetSchema);
