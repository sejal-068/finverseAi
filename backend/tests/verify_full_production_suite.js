/**
 * FinverseAI - Master Production Audit & Full Suite Verification Script
 * Validates all 12 dimensions requested by the user.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

async function req(url, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.startsWith('http') ? url : `${API_URL}${url}`, {
    ...options,
    headers,
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, body: data };
}

async function runProductionAudit() {
  console.log('================================================================');
  console.log('🚀 FINVERSE-AI: MASTER PRODUCTION-LEVEL AUDIT SUITE');
  console.log('================================================================\n');

  let passed = 0;
  function check(condition, desc) {
    if (!condition) {
      console.error(`❌ FAIL: ${desc}`);
      throw new Error(`Audit Failure: ${desc}`);
    }
    console.log(`✅ PASS: ${desc}`);
    passed++;
  }

  // =========================================================================
  // 1. STATIC PAGES ACCESSIBILITY & HTTP 200 SERVING
  // =========================================================================
  console.log('\n--- 1. STATIC ASSETS & HTML PAGES CHECK ---');
  const pages = [
    'index.html',
    'login.html',
    'signup.html',
    'forgot-password.html',
    'reset-password.html',
    'onboarding.html',
    'dashboard.html',
    'transactions.html',
    'budgets.html',
    'categories.html',
    'reports.html',
    'analytics.html',
    'ai-insights.html',
    'financial-coach.html',
    'profile.html',
    'settings.html',
  ];

  for (const p of pages) {
    const res = await req(`${BASE_URL}/${p}`);
    check(res.status === 200, `Page served successfully: /${p} (Status: 200)`);
    check(typeof res.body === 'string' && res.body.includes('<!DOCTYPE html>'), `Page /${p} contains valid HTML markup`);
  }

  // =========================================================================
  // 2. AUTHENTICATION & MULTI-USER WORKFLOW
  // =========================================================================
  console.log('\n--- 2. AUTHENTICATION (EMAIL/PASSWORD, GOOGLE OAUTH, SESSIONS) ---');
  const uid = Date.now();
  const user1Email = `audit_user_1_${uid}@finverse.ai`;
  const user2Email = `audit_user_2_${uid}@finverse.ai`;
  const defaultPass = 'Secret123!';

  // Signup User 1
  const signup1 = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Aditi Rao',
      email: user1Email,
      password: defaultPass,
      monthlyIncome: 75000,
      financialGoal: 'Buy a Home',
    }),
  });
  if (signup1.status !== 201) {
    console.error('Signup error response:', signup1.status, signup1.body);
  }
  check(signup1.status === 201, 'User 1 registered with 201 Created');
  check(!!signup1.body.token, 'Signup returns valid JWT token');
  check(signup1.body.user.name === 'Aditi Rao', 'User name persisted accurately');
  check(signup1.body.user.monthlyIncome === 75000, 'User monthly income persisted accurately');
  const token1 = signup1.body.token;

  // Duplicate prevention
  const dupSignup = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Aditi Rao Duplicate',
      email: user1Email,
      password: defaultPass,
    }),
  });
  check(dupSignup.status === 400, 'Duplicate signup rejected with 400 Bad Request');

  // Login User 1
  const login1 = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: user1Email, password: defaultPass }),
  });
  check(login1.status === 200, 'User 1 login successful with 200 OK');
  check(!!login1.body.token, 'Login returns JWT');

  // Session /auth/me
  const meRes = await req('/auth/me', {}, token1);
  check(meRes.status === 200, 'Session verification /auth/me returns 200 OK');
  check(meRes.body.data.email === user1Email, '/auth/me returns user data scoped to session');

  // Google OAuth Config & Dev/Mock Test
  const gConfig = await req('/auth/google/config');
  check(gConfig.status === 200, 'Google OAuth config endpoint returns 200 OK');

  const gAuthMockRejected = await req('/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      email: `google_user_${uid}@finverse.ai`,
      name: 'Dev Google User',
    }),
  });
  check(gAuthMockRejected.status === 400, 'Mock / unverified Google sign-in is strictly rejected with 400');

  const gAuthInvalidToken = await req('/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      accessToken: 'invalid_token_test_abc',
    }),
  });
  check(gAuthInvalidToken.status === 401, 'Forged Google access token is rejected by Google API validation with 401');

  // =========================================================================
  // 3. ZERO-DATA / EMPTY STATE INTEGRITY
  // =========================================================================
  console.log('\n--- 3. ZERO-DATA & EMPTY STATE USER INTEGRITY ---');
  const emptyDash = await req('/dashboard', {}, token1);
  check(emptyDash.status === 200, 'Dashboard responds 200 OK');
  check(emptyDash.body.data.totalBalance === 0, 'New user totalBalance is 0');
  check(emptyDash.body.data.totalIncome === 0, 'New user totalIncome is 0');
  check(emptyDash.body.data.totalExpenses === 0, 'New user totalExpenses is 0');
  check(emptyDash.body.data.recentTransactions.length === 0, 'New user recent transactions list is empty');

  // ML Insufficient history handling
  const mlEmpty = await req('/ai/ml-predict', {}, token1);
  check(mlEmpty.status === 200, 'ML Predict responds 200 OK for new user');
  check(mlEmpty.body.data.has_enough_data === false, 'ML correctly flags has_enough_data: false');
  check(mlEmpty.body.data.message.includes('Not enough financial history yet'), 'ML informs user about history requirement');

  // =========================================================================
  // 4. TRANSACTIONS CRUD ENGINE
  // =========================================================================
  console.log('\n--- 4. FULL TRANSACTIONS CRUD OPERATIONS ---');
  // Create Income
  const txIncome = await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      type: 'income',
      amount: 75000,
      category: 'Salary',
      date: new Date().toISOString(),
      description: 'Monthly Architect Salary',
    }),
  }, token1);
  check(txIncome.status === 201, 'Income transaction created with 201 Created');
  const incId = txIncome.body.data.id || txIncome.body.data._id;

  // Create Expenses
  const txExpense1 = await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      type: 'expense',
      amount: 4200,
      category: 'Food & Dining',
      date: new Date().toISOString(),
      description: 'Family Dinner at Bistro',
    }),
  }, token1);
  check(txExpense1.status === 201, 'Expense 1 created (Food & Dining: 4200)');
  const expId1 = txExpense1.body.data.id || txExpense1.body.data._id;

  const txExpense2 = await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      type: 'expense',
      amount: 2800,
      category: 'Shopping',
      date: new Date().toISOString(),
      description: 'Casual Apparel',
    }),
  }, token1);
  check(txExpense2.status === 201, 'Expense 2 created (Shopping: 2800)');
  const expId2 = txExpense2.body.data.id || txExpense2.body.data._id;

  // Read transactions
  const txList = await req('/transactions', {}, token1);
  check(txList.status === 200, 'Fetched transactions list with 200 OK');
  check(txList.body.data.length === 3, 'User 1 has exactly 3 transactions');

  // Update transaction
  const txUpdate = await req(`/transactions/${expId2}`, {
    method: 'PUT',
    body: JSON.stringify({
      amount: 3200,
      description: 'Casual Apparel + Accessories',
    }),
  }, token1);
  check(txUpdate.status === 200, 'Transaction updated with 200 OK');
  check(txUpdate.body.data.amount === 3200, 'Updated transaction amount verified (3200)');

  // Verify dashboard aggregation matches real numbers
  const dashAfterTx = await req('/dashboard', {}, token1);
  check(dashAfterTx.body.data.totalIncome === 75000, 'Dashboard totalIncome is 75,000');
  check(dashAfterTx.body.data.totalExpenses === 7400, 'Dashboard totalExpenses is 7,400 (4200 + 3200)');
  check(dashAfterTx.body.data.totalBalance === 67600, 'Dashboard totalBalance is 67,600 (75000 - 7400)');

  // =========================================================================
  // 5. BUDGETS CRUD ENGINE & UTILIZATION METRICS
  // =========================================================================
  console.log('\n--- 5. BUDGETS CRUD & LIVE UTILIZATION METRICS ---');
  const createBudget = await req('/budgets', {
    method: 'POST',
    body: JSON.stringify({
      category: 'Food & Dining',
      limit: 6000,
      period: 'monthly',
    }),
  }, token1);
  check(createBudget.status === 201, 'Budget created for Food & Dining with limit 6,000');
  const bId = createBudget.body.data.id || createBudget.body.data._id;

  const budgetList = await req('/budgets', {}, token1);
  check(budgetList.status === 200, 'Fetched budgets list');
  const foodBudget = budgetList.body.data.find(b => b.category === 'Food & Dining');
  check(!!foodBudget, 'Food & Dining budget found');
  check(foodBudget.spent === 4200, 'Budget spent calculated correctly (4,200)');
  check(foodBudget.remaining === 1800, 'Budget remaining calculated correctly (1,800)');
  check(foodBudget.percentage === 70, 'Budget percentage calculated correctly (70%)');

  // Update budget
  const updateBudget = await req(`/budgets/${bId}`, {
    method: 'PUT',
    body: JSON.stringify({ limit: 5000 }),
  }, token1);
  check(updateBudget.status === 200, 'Budget limit updated to 5,000');
  const updatedBList = await req('/budgets', {}, token1);
  const updatedFoodB = updatedBList.body.data.find(b => b.category === 'Food & Dining');
  check(updatedFoodB.percentage === 84, 'Updated budget percentage is 84% (4200/5000)');
  check(updatedFoodB.status === 'warning', 'Budget threshold status escalated to "warning"');

  // =========================================================================
  // 6. CATEGORIES ENGINE & DYNAMIC DRILL-DOWN
  // =========================================================================
  console.log('\n--- 6. CATEGORIES ENGINE ---');
  const catRes = await req('/categories', {}, token1);
  check(catRes.status === 200, 'Fetched categories list');
  const foodCat = catRes.body.data.find(c => c.name === 'Food & Dining');
  check(!!foodCat, 'Default category Food & Dining present');
  check(foodCat.spent === 4200, 'Category spent matches transactions (4,200)');

  // Create custom category
  const createCustomCat = await req('/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Pets & Supplies',
      icon: 'fa-paw',
      type: 'expense',
      color: '#EC4899',
    }),
  }, token1);
  check(createCustomCat.status === 201, 'Custom category Pets & Supplies created');
  const customCatId = createCustomCat.body.data.id || createCustomCat.body.data._id;

  // Delete custom category
  const delCat = await req(`/categories/${customCatId}`, { method: 'DELETE' }, token1);
  check(delCat.status === 200, 'Custom category successfully deleted');

  // =========================================================================
  // 7. PROFILE, FINANCIAL GOALS & ONBOARDING PERSISTENCE
  // =========================================================================
  console.log('\n--- 7. PROFILE, GOALS & SETTINGS ENGINE ---');
  const profileUpdate = await req('/user/profile', {
    method: 'PUT',
    body: JSON.stringify({
      occupation: 'Senior Staff Engineer',
      city: 'Pune',
      incomeType: 'Salaried',
      dependents: 2,
      financialGoals: ['Buy a Home', 'Emergency Fund'],
      goals: [
        {
          title: 'Emergency Fund',
          target: 200000,
          current: 50000,
          category: 'savings',
          deadline: '2026-12-31',
        },
      ],
    }),
  }, token1);
  check(profileUpdate.status === 200, 'Profile updated successfully');
  check(profileUpdate.body.data.occupation === 'Senior Staff Engineer', 'Occupation persisted in MongoDB');
  check(profileUpdate.body.data.dependents === 2, 'Dependents count persisted in MongoDB');
  check(profileUpdate.body.data.goals.length === 1, 'Milestone goal persisted in MongoDB');

  // Update Settings
  const settingsUpdate = await req('/user/settings', {
    method: 'PUT',
    body: JSON.stringify({
      theme: 'dark',
      budgetAlerts: true,
      weeklyReport: true,
    }),
  }, token1);
  check(settingsUpdate.status === 200, 'User settings updated successfully');

  // =========================================================================
  // 8. EMPATHETIC AI COACH & ML FORECASTING (2-3 MONTHS SIMULATION)
  // =========================================================================
  console.log('\n--- 8. AI ENGINE: EMPATHETIC COACH & MULTI-MONTH ML FORECAST ---');
  // Seed past 2 months so Python RandomForest has sufficient history (>= 2 distinct monthly cycles)
  const now = new Date();
  const dMonth1 = new Date(now.getFullYear(), now.getMonth() - 2, 10);
  const dMonth2 = new Date(now.getFullYear(), now.getMonth() - 1, 10);

  // Month -2 transactions
  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({ type: 'income', amount: 75000, category: 'Salary', date: dMonth1.toISOString(), description: 'M-2 Salary' }),
  }, token1);
  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({ type: 'expense', amount: 15000, category: 'Food & Dining', date: dMonth1.toISOString(), description: 'M-2 Food' }),
  }, token1);
  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({ type: 'expense', amount: 12000, category: 'Shopping', date: dMonth1.toISOString(), description: 'M-2 Shopping' }),
  }, token1);

  // Month -1 transactions
  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({ type: 'income', amount: 75000, category: 'Salary', date: dMonth2.toISOString(), description: 'M-1 Salary' }),
  }, token1);
  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({ type: 'expense', amount: 14000, category: 'Food & Dining', date: dMonth2.toISOString(), description: 'M-1 Food' }),
  }, token1);
  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({ type: 'expense', amount: 9500, category: 'Shopping', date: dMonth2.toISOString(), description: 'M-1 Shopping' }),
  }, token1);

  // ML Predict with sufficient history
  const mlSufficient = await req('/ai/ml-predict', {}, token1);
  check(mlSufficient.status === 200, 'ML Predict responded 200 OK with multi-month data');
  check(mlSufficient.body.data.has_enough_data === true, 'ML successfully recognized sufficient history (has_enough_data: true)');
  check(typeof mlSufficient.body.data.predictions.next_month_income === 'number', 'Predicted income is a valid float');
  check(typeof mlSufficient.body.data.predictions.next_month_total_expense === 'number', 'Predicted total expense is a valid float');
  console.log(`  📊 RandomForest Output -> Next Month Income: ₹${mlSufficient.body.data.predictions.next_month_income.toFixed(2)}, Expenses: ₹${mlSufficient.body.data.predictions.next_month_total_expense.toFixed(2)}`);

  // AI Insights
  const aiInsights = await req('/ai/insights', {}, token1);
  check(aiInsights.status === 200, 'AI Insights generated with 200 OK');
  check(aiInsights.body.data.hasEnoughData === true, 'AI Insights reports sufficient ML data');
  check(aiInsights.body.data.insightsList.length > 0, 'Personalized dynamic insight cards generated');

  // Conversational AI Coach - Stress / Overspending
  const coachStress = await req('/ai/coach', {
    method: 'POST',
    body: JSON.stringify({ message: 'I spent too much this month and feel stressed.' }),
  }, token1);
  check(coachStress.status === 200, 'Coach query 1 succeeded');
  const stressReply = coachStress.body.data.reply;
  check(stressReply.includes("That's okay") || stressReply.includes("doesn't mean you've failed"), 'Coach responds with empathy and emotional reassurance');

  // Conversational AI Coach - Affordability with dependent awareness
  const coachAfford = await req('/ai/coach', {
    method: 'POST',
    body: JSON.stringify({ message: 'Can I afford a 10000 gadget?' }),
  }, token1);
  check(coachAfford.status === 200, 'Coach query 2 (affordability) succeeded');
  const affordReply = coachAfford.body.data.reply;
  check(affordReply.includes('10,000') || affordReply.includes('10000'), 'Coach calculates specifically for ₹10,000');
  check(affordReply.includes('depend'), 'Coach dynamically incorporates user dependents context');

  // Conversational AI Coach - Forecast prediction query
  const coachForecast = await req('/ai/coach', {
    method: 'POST',
    body: JSON.stringify({ message: 'What is my predicted next month spending?' }),
  }, token1);
  check(coachForecast.status === 200, 'Coach query 3 (forecast) succeeded');
  const forecastReply = coachForecast.body.data.reply;
  check(forecastReply.includes('RandomForest') || forecastReply.includes('predict'), 'Coach leverages RandomForest ML model forecast');

  // Chat History Persistence
  const chatHist = await req('/ai/chat-history', {}, token1);
  check(chatHist.status === 200, 'Chat history retrieved with 200 OK');
  check(chatHist.body.data.messages.length >= 6, 'All user and assistant conversation turns are persisted');

  // =========================================================================
  // 9. STRICT MULTI-USER ISOLATION AUDIT
  // =========================================================================
  console.log('\n--- 9. STRICT MULTI-USER DATA ISOLATION VERIFICATION ---');
  // Signup User 2
  const signup2 = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Rohan Mehta',
      email: user2Email,
      password: defaultPass,
      monthlyIncome: 45000,
    }),
  });
  check(signup2.status === 201, 'User 2 created successfully');
  const token2 = signup2.body.token;

  // Verify User 2 cannot see User 1's financial dashboard
  const user2Dash = await req('/dashboard', {}, token2);
  check(user2Dash.body.data.totalIncome === 0, 'User 2 totalIncome is 0 (User 1 income NOT leaked)');
  check(user2Dash.body.data.totalExpenses === 0, 'User 2 totalExpenses is 0 (User 1 expenses NOT leaked)');
  check(user2Dash.body.data.totalBalance === 0, 'User 2 totalBalance is 0 (User 1 balance NOT leaked)');

  // Verify User 2 cannot access or mutate User 1's transactions
  const user2Tx = await req('/transactions', {}, token2);
  check(user2Tx.body.data.length === 0, 'User 2 transactions array is strictly empty');

  const crossReadTx = await req(`/transactions/${expId1}`, {}, token2);
  check(crossReadTx.status === 404, 'User 2 cross-read of User 1 transaction blocked (404 Not Found)');

  const crossUpdateTx = await req(`/transactions/${expId1}`, {
    method: 'PUT',
    body: JSON.stringify({ amount: 99999 }),
  }, token2);
  check(crossUpdateTx.status === 404, 'User 2 cross-update of User 1 transaction blocked (404 Not Found)');

  const crossDeleteTx = await req(`/transactions/${expId1}`, { method: 'DELETE' }, token2);
  check(crossDeleteTx.status === 404, 'User 2 cross-delete of User 1 transaction blocked (404 Not Found)');

  // Verify User 2 cannot access User 1's budget
  const user2Budgets = await req('/budgets', {}, token2);
  check(user2Budgets.body.data.length === 0, 'User 2 budgets array is strictly empty');
  const crossDeleteBudget = await req(`/budgets/${bId}`, { method: 'DELETE' }, token2);
  check(crossDeleteBudget.status === 404, 'User 2 cross-delete of User 1 budget blocked (404 Not Found)');

  // Verify User 2 chat history is isolated
  const user2Chat = await req('/ai/chat-history', {}, token2);
  check(user2Chat.body.data.messages.length === 0, 'User 2 chat history is completely empty (User 1 chat NOT leaked)');

  // Clean deletion of User 1 transaction
  const delTx = await req(`/transactions/${expId1}`, { method: 'DELETE' }, token1);
  check(delTx.status === 200, 'User 1 deleted own transaction with 200 OK');

  console.log('\n================================================================');
  console.log(`🎉 MASTER AUDIT PASSED: ${passed} OF ${passed} CHECKS VERIFIED (100%)`);
  console.log('================================================================\n');

  process.exit(0);
}

runProductionAudit().catch(err => {
  console.error('\n❌ MASTER AUDIT FAILED WITH UNHANDLED ERROR:', err);
  process.exit(1);
});
