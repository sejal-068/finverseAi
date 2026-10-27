const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Transaction must belong to a user'],
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide a transaction description'],
    trim: true,
  },
  merchant: {
    type: String,
    trim: true,
    default: '',
  },
  category: {
    type: String,
    required: [true, 'Please specify a category'],
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'Transaction type must be either income or expense'],
    enum: ['income', 'expense'],
  },
  amount: {
    type: Number,
    required: [true, 'Please enter a valid amount'],
    min: [0.01, 'Amount must be greater than 0'],
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  paymentMethod: {
    type: String,
    default: 'UPI',
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

// Composite index for fast querying by user and date
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, type: 1 });
TransactionSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
