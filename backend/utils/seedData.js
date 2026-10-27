const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Budget = require('../models/Budget');

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: 'fa-utensils', type: 'expense', color: '#D97706', bg: '#FEF3C7' },
  { name: 'Shopping', icon: 'fa-bag-shopping', type: 'expense', color: '#DB2777', bg: '#FCE7F3' },
  { name: 'Transport', icon: 'fa-car', type: 'expense', color: '#4F46E5', bg: '#E0E7FF' },
  { name: 'Bills & Utilities', icon: 'fa-file-invoice-dollar', type: 'expense', color: '#DC2626', bg: '#FEE2E2' },
  { name: 'Entertainment', icon: 'fa-film', type: 'expense', color: '#7C3AED', bg: '#EDE9FE' },
  { name: 'Health & Wellness', icon: 'fa-heart-pulse', type: 'expense', color: '#0D9488', bg: '#CCFBF1' },
  { name: 'Education', icon: 'fa-graduation-cap', type: 'expense', color: '#0284C7', bg: '#E0F2FE' },
  { name: 'Travel', icon: 'fa-plane', type: 'expense', color: '#EA580C', bg: '#FFEDD5' },
  { name: 'Salary', icon: 'fa-money-bill-wave', type: 'income', color: '#059669', bg: '#D1FAE5' },
  { name: 'Freelance & Bonus', icon: 'fa-laptop-code', type: 'income', color: '#0891B2', bg: '#CFFAFE' },
  { name: 'Other', icon: 'fa-shapes', type: 'expense', color: '#64748B', bg: '#F1F5F9' },
];

const seedDatabase = async () => {
  try {
    console.log('[Seeder] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seeder] Clearing old records...');
    await User.deleteMany({ email: 'demo@finverse.ai' });
    await Category.deleteMany({ userId: null });

    console.log('[Seeder] Creating default categories...');
    await Category.insertMany(
      DEFAULT_CATEGORIES.map((c) => ({
        userId: null,
        ...c,
        isCustom: false,
      }))
    );

    console.log('[Seeder] Creating demo user: Demo User (demo@finverse.ai)...');
    const demoUser = await User.create({
      name: 'Demo User',
      email: 'demo@finverse.ai',
      password: 'Finverse@2026', // Will be hashed by pre-save hook
      monthlyIncome: 50000,
      financialGoal: 'Save Money',
      currency: 'INR',
      symbol: '₹',
      goals: [
        { title: 'Emergency Fund', target: 150000, current: 85000, deadline: new Date('2026-12-31') },
        { title: 'Index Fund Investment', target: 100000, current: 45000, deadline: new Date('2026-10-31') },
        { title: 'Tech Upgrade Fund', target: 40000, current: 28000, deadline: new Date('2026-09-30') },
      ],
    });

    // Clean old user transactions and budgets
    await Transaction.deleteMany({ userId: demoUser._id });
    await Budget.deleteMany({ userId: demoUser._id });

    console.log('[Seeder] Seeding INR transactions for demo user...');
    const transactionsData = [
      {
        userId: demoUser._id,
        description: 'Monthly Corporate Salary',
        category: 'Salary',
        type: 'income',
        amount: 50000,
        date: new Date('2026-08-01'),
        paymentMethod: 'Bank Transfer',
        notes: 'August 2026 salary credit from tech employer',
      },
      {
        userId: demoUser._id,
        description: 'Apartment Monthly Rent',
        category: 'Bills & Utilities',
        type: 'expense',
        amount: 12000,
        date: new Date('2026-08-02'),
        paymentMethod: 'UPI',
        notes: 'Landlord rent transfer for August',
      },
      {
        userId: demoUser._id,
        description: 'UI/UX Freelance Consulting',
        category: 'Freelance & Bonus',
        type: 'income',
        amount: 8000,
        date: new Date('2026-08-05'),
        paymentMethod: 'Bank Transfer',
        notes: 'Mobile app design sprint milestone payment',
      },
      {
        userId: demoUser._id,
        description: 'Organic Supermarket Groceries',
        category: 'Food & Dining',
        type: 'expense',
        amount: 4200,
        date: new Date('2026-08-07'),
        paymentMethod: 'Credit Card',
        notes: 'Monthly staples, veggies & dairy',
      },
      {
        userId: demoUser._id,
        description: 'Weekend Dining & Cafe Bistro',
        category: 'Food & Dining',
        type: 'expense',
        amount: 2500,
        date: new Date('2026-08-10'),
        paymentMethod: 'UPI',
        notes: 'Dinner with college friends',
      },
      {
        userId: demoUser._id,
        description: 'Smart Noise-Canceling Earbuds',
        category: 'Shopping',
        type: 'expense',
        amount: 3500,
        date: new Date('2026-08-12'),
        paymentMethod: 'Credit Card',
        notes: 'Amazon Great Freedom Sale',
      },
      {
        userId: demoUser._id,
        description: 'Monthly Metro Pass & Fuel',
        category: 'Transport',
        type: 'expense',
        amount: 1800,
        date: new Date('2026-08-14'),
        paymentMethod: 'UPI',
        notes: 'Commute and scooter fuel reload',
      },
      {
        userId: demoUser._id,
        description: 'Cinema Tickets & OTT Subscriptions',
        category: 'Entertainment',
        type: 'expense',
        amount: 1200,
        date: new Date('2026-08-15'),
        paymentMethod: 'Debit Card',
        notes: 'Netflix, Spotify and IMAX Movie',
      },
      {
        userId: demoUser._id,
        description: 'Electricity & High-Speed Fiber Internet',
        category: 'Bills & Utilities',
        type: 'expense',
        amount: 1500,
        date: new Date('2026-08-16'),
        paymentMethod: 'Net Banking',
        notes: 'Tata Power & Airtel Fiber broadband bill',
      },
      {
        userId: demoUser._id,
        description: 'Health Insurance Annual Premium Instalment',
        category: 'Health & Wellness',
        type: 'expense',
        amount: 1200,
        date: new Date('2026-08-17'),
        paymentMethod: 'Auto Debit',
        notes: 'HDFC Ergo health cover',
      },
      {
        userId: demoUser._id,
        description: 'Fullstack AI Development Masterclass',
        category: 'Education',
        type: 'expense',
        amount: 900,
        date: new Date('2026-08-18'),
        paymentMethod: 'UPI',
        notes: 'Online learning platform subscription',
      },
      {
        userId: demoUser._id,
        description: 'Weekend Outstation Cab Ride',
        category: 'Travel',
        type: 'expense',
        amount: 1400,
        date: new Date('2026-08-19'),
        paymentMethod: 'UPI',
        notes: 'Cab ride for weekend getaway',
      },
    ];
    await Transaction.insertMany(transactionsData);

    console.log('[Seeder] Seeding budgets for demo user...');
    const budgetsData = [
      { userId: demoUser._id, category: 'Food & Dining', limit: 8000, period: 'monthly', warningThreshold: 80 },
      { userId: demoUser._id, category: 'Shopping', limit: 6000, period: 'monthly', warningThreshold: 80 },
      { userId: demoUser._id, category: 'Transport', limit: 3000, period: 'monthly', warningThreshold: 80 },
      { userId: demoUser._id, category: 'Bills & Utilities', limit: 15000, period: 'monthly', warningThreshold: 85 },
      { userId: demoUser._id, category: 'Entertainment', limit: 2500, period: 'monthly', warningThreshold: 80 },
      { userId: demoUser._id, category: 'Health & Wellness', limit: 3000, period: 'monthly', warningThreshold: 80 },
    ];
    await Budget.insertMany(budgetsData);

    console.log('----------------------------------------------------');
    console.log('✅ [Seeder] Database successfully seeded with demo data!');
    console.log(`Demo User Email   : demo@finverse.ai`);
    console.log(`Demo User Password: Finverse@2026`);
    console.log(`Transactions Seeded: ${transactionsData.length}`);
    console.log(`Budgets Seeded     : ${budgetsData.length}`);
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error(`❌ [Seeder Error] Failed to seed database: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
