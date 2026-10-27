const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Middleware imports
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for frontend clients (Live Server, Localhost, etc.)
app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Root Health Route
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'FinverseAI Backend API Server',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date(),
    endpoints: {
      auth: '/api/auth',
      user: '/api/user',
      transactions: '/api/transactions',
      categories: '/api/categories',
      budgets: '/api/budgets',
      dashboard: '/api/dashboard',
      analytics: '/api/analytics',
      ai: '/api/ai',
      admin: '/api/admin',
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 [Server] FinverseAI Server running on port ${PORT}`);
      console.log(`🌐 [URL] http://localhost:${PORT}`);
      console.log(`🛠️  [Environment] ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });

    return server;
  } catch (error) {
    console.error(`[Server Start Failed] ${error.message}`);
    // Start HTTP server anyway so user can see health / helpful error response if DB is temporarily offline
    app.listen(PORT, () => {
      console.log(`⚠️ [Server] FinverseAI Server started on port ${PORT} (Database pending connection)`);
    });
  }
};

startServer();

module.exports = app;
