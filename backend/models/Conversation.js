const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const ConversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'Financial Coaching Session',
    trim: true,
  },
  messages: [MessageSchema],
  lastActivity: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Fast query for user conversation
ConversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
