const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const GoalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
  },
  target: {
    type: Number,
    required: [true, 'Target amount is required'],
    min: [0, 'Target amount must be positive'],
  },
  current: {
    type: Number,
    default: 0,
    min: [0, 'Current savings must be positive'],
  },
  deadline: {
    type: Date,
  },
}, { _id: true });

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your full name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide your email address'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  password: {
    type: String,
    required: function () {
      return this.authProvider === 'local' && !this.googleId;
    },
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false, // Do not return password by default in queries
  },
  monthlyIncome: {
    type: Number,
    default: 50000,
    min: [0, 'Monthly income cannot be negative'],
  },
  financialGoal: {
    type: String,
    default: 'Save Money',
    trim: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  symbol: {
    type: String,
    default: '₹',
  },
  avatarUrl: {
    type: String,
    default: '',
  },
  // Extended Financial Profile & Onboarding Fields
  age: {
    type: Number,
    min: [0, 'Age cannot be negative'],
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other', ''],
    default: '',
  },
  occupation: {
    type: String,
    trim: true,
    default: '',
  },
  city: {
    type: String,
    trim: true,
    default: '',
  },
  incomeType: {
    type: String,
    enum: ['Salaried', 'Self-employed', 'Business', 'Freelance', 'Student', 'Irregular', 'Other'],
    default: 'Salaried',
  },
  dependents: {
    type: Number,
    default: 0,
    min: [0, 'Dependents cannot be negative'],
  },
  dependentsContext: {
    type: String,
    trim: true,
    default: '',
  },
  financialGoals: {
    type: [String],
    default: [],
  },
  moneyRoutine: {
    type: String,
    default: 'I track some expenses',
  },
  onboardingCompleted: {
    type: Boolean,
    default: false,
  },
  goals: [GoalSchema],
  settings: {
    theme: { type: String, default: 'light', enum: ['light', 'dark'] },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    budgetAlerts: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  googleId: {
    type: String,
    sparse: true,
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  resetPasswordToken: {
    type: String,
    select: false,
  },
  resetPasswordExpire: {
    type: Date,
    select: false,
  },
});

// Pre-save hook to automatically hash password when modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token (15-minute validity)
UserSchema.methods.getResetPasswordToken = function () {
  // Generate random 32-byte token (hex string)
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token with SHA-256 and store in document
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expiration to 15 minutes from now
  this.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);

  return resetToken;
};

module.exports = mongoose.model('User', UserSchema);
