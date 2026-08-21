/**
 * FinverseAI - Central API & Mock REST Service Layer
 * 
 * NOTE FOR FUTURE BACKEND INTEGRATION:
 * When connecting to Node.js / Express backend with MongoDB and Python ML service,
 * replace the localStorage calls inside these async functions with standard fetch() requests.
 * 
 * Example:
 * async getTransactions(filters) {
 *   const response = await fetch(`/api/transactions?${new URLSearchParams(filters)}`);
 *   return await response.json();
 * }
 */

const STORAGE_KEYS = {
  USER: 'finverse_user',
  TRANSACTIONS: 'finverse_transactions',
  BUDGETS: 'finverse_budgets',
  CATEGORIES: 'finverse_categories',
  SETTINGS: 'finverse_settings',
  NOTIFICATIONS: 'finverse_notifications'
};

// Initial Seed Data (in INR ₹)
const DEFAULT_USER = {
  id: 'usr_001',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@finverse.ai',
  monthlyIncome: 50000,
  currency: 'INR',
  symbol: '₹',
  avatarUrl: '',
  primaryGoal: 'Save Money',
  goals: [
    { id: 'g1', title: 'Emergency Fund', target: 150000, current: 85000, deadline: '2026-12-31' },
    { id: 'g2', title: 'Index Fund Investment', target: 100000, current: 45000, deadline: '2026-10-31' },
    { id: 'g3', title: 'Tech Upgrade Fund', target: 40000, current: 28000, deadline: '2026-09-30' }
  ]
};

const DEFAULT_CATEGORIES = [
  { id: 'cat_food', name: 'Food & Dining', icon: 'fa-utensils', type: 'expense', color: '#D97706', bg: '#FEF3C7' },
  { id: 'cat_shopping', name: 'Shopping', icon: 'fa-bag-shopping', type: 'expense', color: '#DB2777', bg: '#FCE7F3' },
  { id: 'cat_transport', name: 'Transport', icon: 'fa-car', type: 'expense', color: '#4F46E5', bg: '#E0E7FF' },
  { id: 'cat_bills', name: 'Bills & Utilities', icon: 'fa-file-invoice-dollar', type: 'expense', color: '#DC2626', bg: '#FEE2E2' },
  { id: 'cat_entertainment', name: 'Entertainment', icon: 'fa-film', type: 'expense', color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'cat_health', name: 'Health & Wellness', icon: 'fa-heart-pulse', type: 'expense', color: '#0D9488', bg: '#CCFBF1' },
  { id: 'cat_education', name: 'Education', icon: 'fa-graduation-cap', type: 'expense', color: '#0284C7', bg: '#E0F2FE' },
  { id: 'cat_travel', name: 'Travel', icon: 'fa-plane', type: 'expense', color: '#EA580C', bg: '#FFEDD5' },
  { id: 'cat_salary', name: 'Salary', icon: 'fa-money-bill-wave', type: 'income', color: '#059669', bg: '#D1FAE5' },
  { id: 'cat_freelance', name: 'Freelance & Bonus', icon: 'fa-laptop-code', type: 'income', color: '#0891B2', bg: '#CFFAFE' },
  { id: 'cat_other', name: 'Other', icon: 'fa-shapes', type: 'expense', color: '#64748B', bg: '#F1F5F9' }
];

const DEFAULT_TRANSACTIONS = [
  {
    id: 'tx_101',
    description: 'Monthly Corporate Salary',
    category: 'Salary',
    type: 'income',
    amount: 50000,
    date: '2026-08-01',
    paymentMethod: 'Bank Transfer',
    notes: 'August 2026 salary credit from tech employer'
  },
  {
    id: 'tx_102',
    description: 'Apartment Monthly Rent',
    category: 'Bills & Utilities',
    type: 'expense',
    amount: 12000,
    date: '2026-08-02',
    paymentMethod: 'UPI',
    notes: 'Landlord rent transfer for August'
  },
  {
    id: 'tx_103',
    description: 'UI/UX Freelance Consulting',
    category: 'Freelance & Bonus',
    type: 'income',
    amount: 8000,
    date: '2026-08-05',
    paymentMethod: 'Bank Transfer',
    notes: 'Mobile app design sprint milestone payment'
  },
  {
    id: 'tx_104',
    description: 'Organic Supermarket Groceries',
    category: 'Food & Dining',
    type: 'expense',
    amount: 4200,
    date: '2026-08-07',
    paymentMethod: 'Credit Card',
    notes: 'Monthly staples, veggies & dairy'
  },
  {
    id: 'tx_105',
    description: 'Weekend Dining & Cafe Bistro',
    category: 'Food & Dining',
    type: 'expense',
    amount: 2500,
    date: '2026-08-10',
    paymentMethod: 'UPI',
    notes: 'Dinner with college friends'
  },
  {
    id: 'tx_106',
    description: 'Smart Noise-Canceling Earbuds',
    category: 'Shopping',
    type: 'expense',
    amount: 3500,
    date: '2026-08-12',
    paymentMethod: 'Credit Card',
    notes: 'Amazon Great Freedom Sale'
  },
  {
    id: 'tx_107',
    description: 'Monthly Metro Pass & Fuel',
    category: 'Transport',
    type: 'expense',
    amount: 1800,
    date: '2026-08-14',
    paymentMethod: 'UPI',
    notes: 'Commute and scooter fuel reload'
  },
  {
    id: 'tx_108',
    description: 'Cinema Tickets & OTT Subscriptions',
    category: 'Entertainment',
    type: 'expense',
    amount: 1200,
    date: '2026-08-15',
    paymentMethod: 'Debit Card',
    notes: 'Netflix, Spotify and IMAX Movie'
  },
  {
    id: 'tx_109',
    description: 'Electricity & High-Speed Fiber Internet',
    category: 'Bills & Utilities',
    type: 'expense',
    amount: 1500,
    date: '2026-08-16',
    paymentMethod: 'Net Banking',
    notes: 'Tata Power & Airtel Fiber broadband bill'
  },
  {
    id: 'tx_110',
    description: 'Health Insurance Annual Premium Instalment',
    category: 'Health & Wellness',
    type: 'expense',
    amount: 1200,
    date: '2026-08-17',
    paymentMethod: 'Auto Debit',
    notes: 'HDFC Ergo health cover'
  },
  {
    id: 'tx_111',
    description: 'Fullstack AI Development Masterclass',
    category: 'Education',
    type: 'expense',
    amount: 900,
    date: '2026-08-18',
    paymentMethod: 'UPI',
    notes: 'Online learning platform subscription'
  },
  {
    id: 'tx_112',
    description: 'Weekend Outstation Cab Ride',
    category: 'Travel',
    type: 'expense',
    amount: 1400,
    date: '2026-08-19',
    paymentMethod: 'UPI',
    notes: 'Cab ride for weekend getaway'
  }
];

const DEFAULT_BUDGETS = [
  { id: 'b_food', category: 'Food & Dining', limit: 8000, period: 'monthly', warningThreshold: 80 },
  { id: 'b_shopping', category: 'Shopping', limit: 6000, period: 'monthly', warningThreshold: 80 },
  { id: 'b_transport', category: 'Transport', limit: 3000, period: 'monthly', warningThreshold: 80 },
  { id: 'b_bills', category: 'Bills & Utilities', limit: 15000, period: 'monthly', warningThreshold: 85 },
  { id: 'b_ent', category: 'Entertainment', limit: 2500, period: 'monthly', warningThreshold: 80 },
  { id: 'b_health', category: 'Health & Wellness', limit: 3000, period: 'monthly', warningThreshold: 80 }
];

const DEFAULT_SETTINGS = {
  theme: 'light',
  currency: 'INR',
  currencySymbol: '₹',
  emailAlerts: true,
  overbudgetNotifications: true,
  aiWeeklyDigest: true,
  privacyMode: false
};

// Helper: Simulate network latency for realistic async feel
const delay = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms));

class FinverseAPIService {
  constructor() {
    this._initStorage();
  }

  _initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_USER));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(DEFAULT_TRANSACTIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BUDGETS)) {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(DEFAULT_BUDGETS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  // ==========================================
  // USER & PROFILE ENDPOINTS
  // Future Endpoint: GET /api/user/profile
  // ==========================================
  async getUserProfile() {
    await delay();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || DEFAULT_USER;
  }

  // Future Endpoint: PUT /api/user/profile
  async updateUserProfile(userData) {
    await delay();
    const current = await this.getUserProfile();
    const updated = { ...current, ...userData };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    return updated;
  }

  // ==========================================
  // DASHBOARD ENDPOINTS
  // Future Endpoint: GET /api/dashboard
  // ==========================================
  async getDashboardData() {
    await delay();
    const txs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    const budgets = await this.getBudgets();
    const user = await this.getUserProfile();

    let totalIncome = 0;
    let totalExpenses = 0;

    txs.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') totalIncome += amt;
      if (t.type === 'expense') totalExpenses += amt;
    });

    const totalBalance = totalIncome - totalExpenses;
    const savings = totalBalance;
    const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

    return {
      user,
      totalBalance,
      totalIncome,
      totalExpenses,
      savings,
      savingsRate,
      recentTransactions: txs.slice(0, 5),
      healthScore: 82,
      aiRecommendation: {
        title: "AI Budget Recommendation",
        message: "Your food expenses increased by 18% this month. Reducing restaurant spending could help you save approximately ₹2,000.",
        potentialSavings: 2000,
        category: "Food & Dining"
      }
    };
  }

  // ==========================================
  // TRANSACTIONS ENDPOINTS
  // Future Endpoint: GET /api/transactions
  // ==========================================
  async getTransactions(filters = {}) {
    await delay();
    let txs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      txs = txs.filter(t => 
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    if (filters.category && filters.category !== 'all') {
      txs = txs.filter(t => t.category === filters.category);
    }

    if (filters.type && filters.type !== 'all') {
      txs = txs.filter(t => t.type === filters.type);
    }

    if (filters.startDate) {
      txs = txs.filter(t => t.date >= filters.startDate);
    }

    if (filters.endDate) {
      txs = txs.filter(t => t.date <= filters.endDate);
    }

    if (filters.sortBy) {
      txs.sort((a, b) => {
        if (filters.sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (filters.sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (filters.sortBy === 'amount-desc') return Number(b.amount) - Number(a.amount);
        if (filters.sortBy === 'amount-asc') return Number(a.amount) - Number(b.amount);
        return 0;
      });
    } else {
      // Default: Most recent first
      txs.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return txs;
  }

  // Future Endpoint: POST /api/transactions
  async createTransaction(txData) {
    await delay();
    const txs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    const newTx = {
      id: 'tx_' + Date.now(),
      amount: Number(txData.amount),
      description: txData.description,
      category: txData.category,
      date: txData.date || new Date().toISOString().split('T')[0],
      type: txData.type || 'expense',
      paymentMethod: txData.paymentMethod || 'UPI',
      notes: txData.notes || ''
    };
    txs.unshift(newTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    return newTx;
  }

  // Future Endpoint: PUT /api/transactions/:id
  async updateTransaction(id, updatedData) {
    await delay();
    let txs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    const index = txs.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Transaction not found');

    txs[index] = {
      ...txs[index],
      ...updatedData,
      amount: Number(updatedData.amount || txs[index].amount)
    };

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    return txs[index];
  }

  // Future Endpoint: DELETE /api/transactions/:id
  async deleteTransaction(id) {
    await delay();
    let txs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    txs = txs.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    return { success: true, id };
  }

  // ==========================================
  // CATEGORIES ENDPOINTS
  // Future Endpoint: GET /api/categories
  // ==========================================
  async getCategories() {
    await delay();
    const categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || DEFAULT_CATEGORIES;
    const txs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];

    // Calculate dynamic spent per category
    let totalExpenseSum = 0;
    const spendingMap = {};
    const countMap = {};

    txs.forEach(t => {
      if (t.type === 'expense') {
        const amt = Number(t.amount) || 0;
        totalExpenseSum += amt;
        spendingMap[t.category] = (spendingMap[t.category] || 0) + amt;
        countMap[t.category] = (countMap[t.category] || 0) + 1;
      }
    });

    return categories.map(cat => {
      const spent = spendingMap[cat.name] || 0;
      const count = countMap[cat.name] || 0;
      const percentage = totalExpenseSum > 0 ? ((spent / totalExpenseSum) * 100).toFixed(1) : 0;
      return {
        ...cat,
        spent,
        count,
        percentage: Number(percentage)
      };
    });
  }

  // Future Endpoint: POST /api/categories
  async createCategory(catData) {
    await delay();
    const categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || DEFAULT_CATEGORIES;
    const newCat = {
      id: 'cat_' + Date.now(),
      name: catData.name,
      icon: catData.icon || 'fa-tag',
      type: catData.type || 'expense',
      color: catData.color || '#4F46E5',
      bg: catData.bg || '#EEF2FF'
    };
    categories.push(newCat);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    return newCat;
  }

  // Future Endpoint: DELETE /api/categories/:id
  async deleteCategory(id) {
    await delay();
    let categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || DEFAULT_CATEGORIES;
    categories = categories.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    return { success: true, id };
  }

  // ==========================================
  // BUDGETS ENDPOINTS
  // Future Endpoint: GET /api/budgets
  // ==========================================
  async getBudgets() {
    await delay();
    const budgets = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS)) || DEFAULT_BUDGETS;
    const txs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];

    // Calculate real-time spent for each budget
    return budgets.map(b => {
      const spent = txs
        .filter(t => t.type === 'expense' && t.category === b.category)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const limit = Number(b.limit);
      const remaining = Math.max(0, limit - spent);
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status = 'normal';
      if (percentage >= 100) {
        status = 'danger'; // Over budget
      } else if (percentage >= (b.warningThreshold || 80)) {
        status = 'warning'; // Near limit
      }

      return {
        ...b,
        spent,
        remaining,
        percentage,
        status
      };
    });
  }

  // Future Endpoint: POST /api/budgets
  async createBudget(bData) {
    await delay();
    const budgets = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS)) || DEFAULT_BUDGETS;
    const newBudget = {
      id: 'b_' + Date.now(),
      category: bData.category,
      limit: Number(bData.limit),
      period: bData.period || 'monthly',
      warningThreshold: Number(bData.warningThreshold) || 80
    };
    budgets.push(newBudget);
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    return newBudget;
  }

  // Future Endpoint: PUT /api/budgets/:id
  async updateBudget(id, bData) {
    await delay();
    let budgets = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS)) || DEFAULT_BUDGETS;
    const idx = budgets.findIndex(b => b.id === id);
    if (idx === -1) throw new Error('Budget not found');

    budgets[idx] = { ...budgets[idx], ...bData, limit: Number(bData.limit) };
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    return budgets[idx];
  }

  // Future Endpoint: DELETE /api/budgets/:id
  async deleteBudget(id) {
    await delay();
    let budgets = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS)) || DEFAULT_BUDGETS;
    budgets = budgets.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    return { success: true, id };
  }

  // ==========================================
  // ANALYTICS ENDPOINTS
  // Future Endpoint: GET /api/analytics
  // ==========================================
  async getAnalytics(range = '30d') {
    await delay();
    const txs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    let income = 0;
    let expense = 0;

    txs.forEach(t => {
      if (t.type === 'income') income += Number(t.amount);
      if (t.type === 'expense') expense += Number(t.amount);
    });

    const savings = income - expense;
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;
    const avgDailySpend = Math.round(expense / 30);

    return {
      range,
      monthlyIncome: income,
      monthlyExpenses: expense,
      savings,
      savingsRate: Number(savingsRate),
      avgDailySpend,
      highestCategory: 'Bills & Utilities',
      expenseGrowth: '+4.2% vs last month',
      cashFlowTrend: [
        { month: 'Apr', income: 45000, expenses: 22000, savings: 23000 },
        { month: 'May', income: 48000, expenses: 24000, savings: 24000 },
        { month: 'Jun', income: 50000, expenses: 26500, savings: 23500 },
        { month: 'Jul', income: 52000, expenses: 24800, savings: 27200 },
        { month: 'Aug (Current)', income, expenses: expense, savings }
      ]
    };
  }

  // ==========================================
  // AI INSIGHTS & ML PREDICTION ENDPOINTS
  // Future Endpoint: GET /api/ai/insights
  // ==========================================
  async getAIInsights() {
    await delay();
    return {
      predictedNextMonthExpenses: 27800,
      forecastConfidence: '91%',
      anomalyDetected: {
        title: 'High Shopping Anomaly',
        message: 'Shopping expenses are 42% higher than your normal 3-month baseline.',
        category: 'Shopping',
        excessAmount: 1500
      },
      weekendBehavior: {
        title: 'Weekend Surge Pattern',
        message: 'You spend 64% of your food budget on Friday, Saturday, and Sunday.',
        impact: 'High discretionary leakage'
      },
      savingsPotential: {
        title: 'Optimized Savings Target',
        potentialMonthlyAddition: 3200,
        recommendation: 'Cutting restaurant food by 20% and switching utility plans unlocks ₹3,200/mo.'
      },
      insightsList: [
        {
          id: 'ins_1',
          type: 'warning',
          icon: 'fa-arrow-trend-up',
          title: 'Food spending increased by 18%',
          explanation: 'Your dining and grocery expenses rose from ₹5,600 to ₹6,700 over the past 30 days.',
          impact: 'Reduces monthly savings by ₹1,100',
          recommendation: 'Plan weekly home-cooked meals to keep dining within the ₹5,000 threshold.'
        },
        {
          id: 'ins_2',
          type: 'info',
          icon: 'fa-calendar-week',
          title: 'You spend 64% more on weekends',
          explanation: 'Analysis indicates frequent food delivery and entertainment debits on Saturdays and Sundays.',
          impact: 'Discretionary weekend spending',
          recommendation: 'Set a dedicated ₹1,500 weekend cash envelope to avoid spontaneous UPI payments.'
        },
        {
          id: 'ins_3',
          type: 'positive',
          icon: 'fa-piggy-bank',
          title: 'Your savings rate improved by 7%',
          explanation: 'Increased freelance revenue (+₹8,000) allowed you to maintain a healthy 49% savings margin.',
          impact: 'Accelerates emergency fund timeline by 1.5 months',
          recommendation: 'Move the surplus ₹8,000 into your High-Yield Recurring Deposit or Index Fund.'
        },
        {
          id: 'ins_4',
          type: 'risk',
          icon: 'fa-triangle-exclamation',
          title: 'Shopping is currently your highest discretionary expense',
          explanation: 'Recent electronics purchases contributed to ₹3,500 in shopping out of your ₹6,000 limit.',
          impact: '58% of monthly limit consumed in 12 days',
          recommendation: 'Apply the 48-hour rule before any non-essential purchase above ₹1,000.'
        }
      ]
    };
  }

  // ==========================================
  // FINANCIAL HEALTH SCORE ENDPOINT
  // Future Endpoint: GET /api/ai/health-score
  // ==========================================
  async getFinancialHealth() {
    await delay();
    return {
      score: 82,
      maxScore: 100,
      status: 'Strong Financial Health',
      description: 'Your cash flow is stable with strong savings rate and timely bill payments.',
      positiveFactors: [
        'Savings rate is above recommended 30% threshold (currently 49%)',
        'No credit card debt carryover / low debt-to-income ratio',
        'Consistent multiple income streams (Salary + Freelance)'
      ],
      improvementAreas: [
        'Discretionary food & weekend dining is up 18%',
        'Emergency fund is currently at 56% of 6-month target'
      ]
    };
  }

  // ==========================================
  // FINANCIAL COACH BOT ENDPOINT
  // Future Endpoint: POST /api/ai/coach
  // ==========================================
  async getCoachResponse(userMessage) {
    await delay(400); // realistic typing wait
    const q = userMessage.toLowerCase();
    const txs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    const budgets = await this.getBudgets();

    let totalExpense = txs
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);

    if (q.includes('save') || q.includes('save more')) {
      return {
        reply: "Based on your spending analysis, **Food & Dining (₹6,700)** and **Shopping (₹3,500)** are your largest discretionary categories. Trimming restaurant dining and non-essential gadgets by just 10–15% could easily boost your monthly savings by approximately **₹2,000 to ₹3,200**!"
      };
    }

    if (q.includes('afford') || q.includes('5000') || q.includes('purchase')) {
      return {
        reply: "You currently have a positive monthly surplus of **₹30,200**. A ₹5,000 purchase is completely affordable without going into debt, but keep in mind it will temporarily reduce your planned monthly savings rate from 49% to ~40%."
      };
    }

    if (q.includes('spending') || q.includes('analyze')) {
      return {
        reply: `You've recorded total expenses of **₹${totalExpense.toLocaleString('en-IN')}** this month. Your primary fixed cost is Rent & Utilities (₹13,500), while your main discretionary expense is Food & Weekend leisure. You are currently well within your overall income!`
      };
    }

    if (q.includes('budget plan') || q.includes('budget')) {
      return {
        reply: "I recommend following the **50/30/20 Finverse Rule** tailored for your ₹58,000 monthly inflow:\n\n• **Needs (50%)**: ₹29,000 (Rent, Utilities, Groceries)\n• **Wants (30%)**: ₹17,400 (Dining, Shopping, Travel)\n• **Savings & Investments (20%)**: ₹11,600 (Index Funds, Emergency Fund)"
      };
    }

    if (q.includes('predict') || q.includes('next month')) {
      return {
        reply: "Our AI forecasting model predicts your next month's total expenses will be approximately **₹27,800** (±₹1,200 confidence range), based on your recurring bills, upcoming utility cycles, and typical weekend habits."
      };
    }

    // Default Fallback
    return {
      reply: `I'm your FinverseAI Financial Coach! I continuously monitor your income, transactions, and budgets. Feel free to ask: *"Can I afford a ₹5,000 purchase?"*, *"How can I save more?"*, or *"Give me a budget plan"*.`
    };
  }

  // ==========================================
  // RESET DEMO DATA
  // ==========================================
  async resetAllDemoData() {
    await delay();
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_USER));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(DEFAULT_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(DEFAULT_BUDGETS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return { success: true };
  }
}

// Global Singleton Instance
window.finverseAPI = new FinverseAPIService();
