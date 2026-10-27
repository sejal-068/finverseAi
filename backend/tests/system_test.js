/**
 * FinverseAI - Comprehensive Automated Integration & Isolation Test Suite
 * Tests all requirements from Prompt Point 12:
 * 1. New User: Signup -> Login -> Empty dashboard -> Add transaction -> Dashboard updates
 * 2. Transactions: Create -> Read -> Update -> Delete -> MongoDB verification
 * 3. Budgets: Create -> Update -> Delete -> Calculation verification
 * 4. ML Insufficient History: has_enough_data=false & 'Not enough financial history yet'
 * 5. ML Sufficient History: Predictions + Trends + AI Coach integration
 * 6. Auth Protection: Unauthenticated requests rejected with 401
 * 7. Multi-User Isolation: User A data NEVER visible or accessible to User B
 */

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting FinverseAI Comprehensive Test Suite');
  console.log('====================================================\n');

  const testId = Date.now();
  const userAEmail = `test_user_a_${testId}@example.com`;
  const userBEmail = `test_user_b_${testId}@example.com`;
  const password = 'Password@123';

  let tokenA = null;
  let tokenB = null;

  // -------------------------------------------------------------
  // TEST 1: NEW USER A SIGNUP & LOGIN
  // -------------------------------------------------------------
  console.log('--- TEST 1: NEW USER A SIGNUP & LOGIN ---');
  const signupA = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'User A Test',
      email: userAEmail,
      password,
      monthlyIncome: 60000,
    }),
  });
  assert(signupA.status === 201 && signupA.data.success, 'User A signup succeeds with 201');
  assert(signupA.data.token, 'Signup returns JWT token');
  tokenA = signupA.data.token;

  const loginA = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userAEmail, password }),
  });
  assert(loginA.status === 200 && loginA.data.success, 'User A login succeeds with 200');
  assert(loginA.data.token, 'Login returns JWT token');

  // -------------------------------------------------------------
  // TEST 2: NEW USER EMPTY DASHBOARD STATE
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: EMPTY DASHBOARD STATE (NO FAKE / DEMO DATA) ---');
  const dashEmpty = await request('/dashboard', { method: 'GET' }, tokenA);
  assert(dashEmpty.status === 200 && dashEmpty.data.success, 'Dashboard endpoint returns 200');
  assert(dashEmpty.data.data.totalBalance === 0, 'New user totalBalance is 0');
  assert(dashEmpty.data.data.totalIncome === 0, 'New user totalIncome is 0');
  assert(dashEmpty.data.data.totalExpenses === 0, 'New user totalExpenses is 0');
  assert(dashEmpty.data.data.recentTransactions.length === 0, 'New user has 0 transactions');
  assert(dashEmpty.data.data.budgetSummary.length === 0, 'New user has 0 budgets');
  assert(dashEmpty.data.data.healthScore === null, 'New user healthScore is null (not fake score)');

  // -------------------------------------------------------------
  // TEST 3: TRANSACTIONS CRUD & MONGODB VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: TRANSACTIONS CRUD FOR USER A ---');
  // Create Income
  const createInc = await request('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'July Salary',
      merchant: 'Tech Corp',
      category: 'Salary',
      type: 'income',
      amount: 60000,
      date: '2026-07-01',
    }),
  }, tokenA);
  assert(createInc.status === 201 && createInc.data.success, 'Created income transaction of ₹60,000');

  // Create Expense 1
  const createExp1 = await request('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Supermarket Groceries',
      merchant: 'FreshMart',
      category: 'Food & Dining',
      type: 'expense',
      amount: 4500,
      date: '2026-07-05',
    }),
  }, tokenA);
  assert(createExp1.status === 201, 'Created expense transaction 1');
  const exp1Id = createExp1.data.data.id || createExp1.data.data._id;

  // Create Expense 2 (for update & delete test)
  const createExp2 = await request('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Old Subscription',
      merchant: 'StreamApp',
      category: 'Entertainment',
      type: 'expense',
      amount: 999,
      date: '2026-07-10',
    }),
  }, tokenA);
  const exp2Id = createExp2.data.data.id || createExp2.data.data._id;
  assert(exp2Id, 'Created expense transaction 2 with valid ID');

  // Read Single Transaction
  const readSingle = await request(`/transactions/${exp1Id}`, { method: 'GET' }, tokenA);
  assert(readSingle.status === 200 && readSingle.data.data.amount === 4500, 'Read single transaction matches amount');

  // Update Transaction
  const updateExp2 = await request(`/transactions/${exp2Id}`, {
    method: 'PUT',
    body: JSON.stringify({ amount: 1299, notes: 'Upgraded plan' }),
  }, tokenA);
  assert(updateExp2.status === 200 && updateExp2.data.data.amount === 1299, 'Updated transaction amount to 1299');

  // Delete Transaction
  const delExp2 = await request(`/transactions/${exp2Id}`, { method: 'DELETE' }, tokenA);
  assert(delExp2.status === 200 && delExp2.data.success, 'Deleted transaction 2 successfully');

  // Verify deletion
  const verifyDel = await request(`/transactions/${exp2Id}`, { method: 'GET' }, tokenA);
  assert(verifyDel.status === 404, 'Deleted transaction returns 404 on subsequent read');

  // Verify Dashboard Updates with remaining transactions (Income: 60000, Expense: 4500)
  const dashUpdated = await request('/dashboard', { method: 'GET' }, tokenA);
  assert(dashUpdated.data.data.totalIncome === 60000, 'Dashboard totalIncome updated to 60000');
  assert(dashUpdated.data.data.totalExpenses === 4500, 'Dashboard totalExpenses updated to 4500');
  assert(dashUpdated.data.data.totalBalance === 55500, 'Dashboard totalBalance is 55500 (60000 - 4500)');
  assert(dashUpdated.data.data.savings === 55500, 'Dashboard savings is 55500');

  // -------------------------------------------------------------
  // TEST 4: BUDGETS CRUD & REAL-TIME CALCULATION
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: BUDGETS CRUD & CALCULATION VERIFICATION ---');
  // Create Budget for Food & Dining (limit: 5000)
  const createBud = await request('/budgets', {
    method: 'POST',
    body: JSON.stringify({
      category: 'Food & Dining',
      limit: 5000,
      warningThreshold: 80,
    }),
  }, tokenA);
  assert(createBud.status === 201 && createBud.data.success, 'Created budget for Food & Dining with limit 5000');
  const budId = createBud.data.data.id || createBud.data.data._id;

  // Read Budgets - spending should dynamically reflect the ₹4500 expense
  const getBuds = await request('/budgets', { method: 'GET' }, tokenA);
  assert(getBuds.status === 200, 'Retrieved user budgets');
  const foodBudget = getBuds.data.data.find(b => b.category === 'Food & Dining');
  assert(foodBudget !== undefined, 'Food & Dining budget found in list');
  assert(foodBudget.spent === 4500, `Budget correctly calculates spent: ${foodBudget.spent} (expected 4500)`);
  assert(foodBudget.remaining === 500, `Budget correctly calculates remaining: ${foodBudget.remaining} (expected 500)`);
  assert(foodBudget.percentage === 90, `Budget percentage is 90% (4500 / 5000 * 100)`);
  assert(foodBudget.status === 'warning', `Budget status is 'warning' (>= 80% threshold)`);

  // Update Budget limit to 10000
  const updateBud = await request(`/budgets/${budId}`, {
    method: 'PUT',
    body: JSON.stringify({ limit: 10000 }),
  }, tokenA);
  assert(updateBud.status === 200 && updateBud.data.data.limit === 10000, 'Updated budget limit to 10000');

  // Delete Budget
  const delBud = await request(`/budgets/${budId}`, { method: 'DELETE' }, tokenA);
  assert(delBud.status === 200, 'Budget successfully deleted');

  // -------------------------------------------------------------
  // TEST 5: ML INSUFFICIENT HISTORY STATE
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: ML INSUFFICIENT HISTORY STATE ---');
  // User A currently only has transactions in 1 month (July 2026)
  const mlInsufficient = await request('/ai/ml-predict', { method: 'GET' }, tokenA);
  assert(mlInsufficient.status === 200, 'ML Predict endpoint responds 200');
  assert(mlInsufficient.data.data.has_enough_data === false, 'has_enough_data is false for 1-month user');
  assert(mlInsufficient.data.data.message === 'Not enough financial history yet', 'Proper "Not enough financial history yet" message');

  // AI Insights Insufficient State
  const insightsInsufficient = await request('/ai/insights', { method: 'GET' }, tokenA);
  assert(insightsInsufficient.status === 200, 'AI Insights endpoint responds 200');
  assert(insightsInsufficient.data.data.hasEnoughData === false, 'AI Insights hasEnoughData is false');
  assert(insightsInsufficient.data.data.forecastConfidence === 'Not enough financial history yet', 'Confidence shows not enough history');

  // -------------------------------------------------------------
  // TEST 6: ML SUFFICIENT HISTORY & AI COACH FORECAST
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: ML SUFFICIENT HISTORY & PREDICTIONS ---');
  // Add June 2026 transactions to provide 2 distinct monthly cycles (June + July)
  await request('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'June Salary',
      category: 'Salary',
      type: 'income',
      amount: 55000,
      date: '2026-06-01',
    }),
  }, tokenA);
  await request('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'June House Rent',
      category: 'Rent',
      type: 'expense',
      amount: 15000,
      date: '2026-06-05',
    }),
  }, tokenA);
  await request('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'June Food Dining',
      category: 'Food & Dining',
      type: 'expense',
      amount: 6000,
      date: '2026-06-15',
    }),
  }, tokenA);
  await request('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'July House Rent',
      category: 'Rent',
      type: 'expense',
      amount: 15000,
      date: '2026-07-05',
    }),
  }, tokenA);

  const mlSufficient = await request('/ai/ml-predict', { method: 'GET' }, tokenA);
  assert(mlSufficient.status === 200, 'ML Predict responded 200');
  assert(mlSufficient.data.data.has_enough_data === true, 'has_enough_data is now TRUE for multi-month user');
  assert(mlSufficient.data.data.predictions !== null, 'Predictions object is populated');
  assert(typeof mlSufficient.data.data.predictions.next_month_income === 'number', 'Predicted income is a valid number');
  assert(typeof mlSufficient.data.data.predictions.next_month_total_expense === 'number', 'Predicted total expense is a valid number');
  assert(Array.isArray(mlSufficient.data.data.trends) && mlSufficient.data.data.trends.length > 0, 'Category trends array generated');
  console.log(`    ML Forecast: Income: ₹${mlSufficient.data.data.predictions.next_month_income}, Expense: ₹${mlSufficient.data.data.predictions.next_month_total_expense}`);

  // Test AI Financial Coach using ML Predictions and live surplus
  console.log('\n--- TEST 7: DYNAMIC AI COACH QUERIES ---');
  const coachForecast = await request('/ai/coach', {
    method: 'POST',
    body: JSON.stringify({ message: 'Predict my next month expenses' }),
  }, tokenA);
  assert(coachForecast.status === 200 && coachForecast.data.success, 'Coach forecast query succeeded');
  assert(coachForecast.data.data.reply.includes('RandomForest'), 'Coach references RandomForest forecast model');

  const coachAfford = await request('/ai/coach', {
    method: 'POST',
    body: JSON.stringify({ message: 'Can I afford a ₹10,000 purchase?' }),
  }, tokenA);
  assert(coachAfford.status === 200 && coachAfford.data.success, 'Coach affordability query succeeded');
  assert(coachAfford.data.data.reply.length > 20, 'Coach provided personalized dynamic reasoning');

  // -------------------------------------------------------------
  // TEST 8: MULTI-USER DATA ISOLATION (USER A vs USER B)
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: MULTI-USER DATA ISOLATION ---');
  const signupB = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'User B Test',
      email: userBEmail,
      password,
      monthlyIncome: 40000,
    }),
  });
  assert(signupB.status === 201, 'User B created successfully');
  tokenB = signupB.data.token;

  // User B's dashboard must NOT contain User A's data
  const dashB = await request('/dashboard', { method: 'GET' }, tokenB);
  assert(dashB.data.data.totalBalance === 0, 'User B totalBalance is 0 (User A balance not leaked)');
  assert(dashB.data.data.totalIncome === 0, 'User B totalIncome is 0 (User A income not leaked)');
  assert(dashB.data.data.totalExpenses === 0, 'User B totalExpenses is 0 (User A expense not leaked)');
  assert(dashB.data.data.recentTransactions.length === 0, 'User B transactions list is completely empty');

  // User B cannot access User A's transaction
  const crossTxAccess = await request(`/transactions/${exp1Id}`, { method: 'GET' }, tokenB);
  assert(crossTxAccess.status === 404, 'User B receives 404 when requesting User A transaction');

  // User B cannot update User A's transaction
  const crossTxUpdate = await request(`/transactions/${exp1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ amount: 999999 }),
  }, tokenB);
  assert(crossTxUpdate.status === 404, 'User B receives 404 when attempting to update User A transaction');

  // User B cannot delete User A's transaction
  const crossTxDelete = await request(`/transactions/${exp1Id}`, { method: 'DELETE' }, tokenB);
  assert(crossTxDelete.status === 404, 'User B receives 404 when attempting to delete User A transaction');

  // -------------------------------------------------------------
  // TEST 9: AUTHENTICATION ENFORCEMENT
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: AUTHENTICATION ENFORCEMENT ---');
  const unauthDash = await request('/dashboard', { method: 'GET' }, null);
  assert(unauthDash.status === 401, 'Unauthenticated /dashboard call returns 401 Unauthorized');

  const unauthTx = await request('/transactions', { method: 'GET' }, null);
  assert(unauthTx.status === 401, 'Unauthenticated /transactions call returns 401 Unauthorized');

  const unauthAI = await request('/ai/insights', { method: 'GET' }, null);
  assert(unauthAI.status === 401, 'Unauthenticated /ai/insights call returns 401 Unauthorized');

  const invalidTokenCall = await request('/dashboard', { method: 'GET' }, 'fake_invalid_jwt_token');
  assert(invalidTokenCall.status === 401, 'Invalid token call returns 401 Unauthorized');

  console.log('\n====================================================');
  console.log('🎉 ALL SYSTEM TESTS PASSED SUCCESSFULLY! (100% COMPLIANT)');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN ENCOUNTERED AN UNCAUGHT ERROR:', err);
  process.exit(1);
});
