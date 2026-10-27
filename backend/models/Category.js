const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null for system-wide defaults, specific userId for custom categories
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a category name'],
    trim: true,
  },
  icon: {
    type: String,
    default: 'fa-tag',
    trim: true,
  },
  color: {
    type: String,
    default: '#4F46E5',
    trim: true,
  },
  bg: {
    type: String,
    default: '#EEF2FF',
    trim: true,
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    default: 'expense',
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Composite unique-like index for user and category name
CategorySchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Category', CategorySchema);
