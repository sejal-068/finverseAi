/**
 * FinverseAI - User Data Management & Admin Audit Verification Test Suite
 * Tests:
 * 1. Admin access control: unauthenticated -> 401, non-admin -> 403, admin -> 200
 * 2. Excel-style summary list: returns Name, Email, Number of Transactions, Total Income, Total Expenses
 * 3. Individual user detail lookup by userId: returns ONLY target user's profile, transactions, income, expenses, categories, budgets, savings
 * 4. Multi-user separation: separate collections, no mixing between users
 * 5. Excel CSV export for selected user
 * 6. Frontend user-management.html page availability and markup
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function req(endpoint, options = {}, token = null, adminKey = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (adminKey) headers['x-admin-key'] = adminKey;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
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

  return { status: res.status, ok: res.ok, headers: res.headers, body: data };
}

async function runTests() {
  console.log('================================================================');
  console.log('🛡️ TESTING USER DATA MANAGEMENT (EXCEL SUMMARY & DETAILED VIEW)');
  console.log('================================================================\n');

  // --- 1. SETUP TWO SEPARATE USERS ---
  const user1Email = `standard_user_${Date.now()}@test.com`;
  const user2Email = `second_user_${Date.now()}@test.com`;
  const adminEmail = `sejalshambharkar068@gmail.com`;

  // Register User 1 (Standard User)
  const u1Signup = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Standard User Alpha',
      email: user1Email,
      password: 'Password123!',
      monthlyIncome: 50000,
      financialGoal: 'Emergency Fund',
    }),
  });
  assert(u1Signup.ok, 'User 1 created');
  const user1Token = u1Signup.body.token;
  const user1Id = u1Signup.body.user.id;

  // Add Transactions for User 1: 1 Income (45,000), 2 Expenses (Food: 3,000, Travel: 2,000)
  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Monthly Salary',
      amount: 45000,
      type: 'income',
      category: 'Salary',
    }),
  }, user1Token);

  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Dinner with friends',
      amount: 3000,
      type: 'expense',
      category: 'Food & Dining',
    }),
  }, user1Token);

  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Metro pass',
      amount: 2000,
      type: 'expense',
      category: 'Transport',
    }),
  }, user1Token);

  // Add Budget for User 1
  await req('/budgets', {
    method: 'POST',
    body: JSON.stringify({
      category: 'Food & Dining',
      limit: 6000,
    }),
  }, user1Token);

  // Send AI Coach query for User 1 (creates a Conversation in conversations collection)
  await req('/ai/coach', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Can I afford to buy a new laptop for 20000?',
    }),
  }, user1Token);

  // Register User 2 (Standard User)
  const u2Signup = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Second User Beta',
      email: user2Email,
      password: 'Password123!',
      monthlyIncome: 80000,
      financialGoal: 'Buy a Car',
    }),
  });
  assert(u2Signup.ok, 'User 2 created');
  const user2Token = u2Signup.body.token;
  const user2Id = u2Signup.body.user.id;

  // Add 1 transaction for User 2 (Income 90,000)
  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Consulting Fee',
      amount: 90000,
      type: 'income',
      category: 'Salary',
    }),
  }, user2Token);

  // --- 2. AUTHENTICATION & ACCESS CONTROL TESTS ---
  console.log('--- TEST 1: Access Control & Authorization Security ---');

  // Test 1.1: Unauthenticated request is rejected
  const unauthRes = await req('/admin/users');
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request receives 401');
  console.log('  ✓ Unauthenticated requests blocked (401 Unauthorized)');

  // Test 1.2: Standard user is denied access to admin summary
  const forbiddenRes = await req('/admin/users', {}, user1Token);
  assert.strictEqual(forbiddenRes.status, 403, 'Standard user receives 403 Forbidden');
  console.log('  ✓ Standard users strictly denied from admin view (403 Forbidden)');

  // Test 1.3: Standard user is denied from inspecting other user by userId
  const forbiddenUserRes = await req(`/admin/users/${user2Id}`, {}, user1Token);
  assert.strictEqual(forbiddenUserRes.status, 403, 'Standard user cannot inspect other user');
  console.log('  ✓ Standard users cannot inspect other users by userId (403 Forbidden)');

  // Test 1.4: Admin access check
  const checkStandard = await req('/admin/check-access', {}, user1Token);
  assert.strictEqual(checkStandard.body.isAdmin, false, 'Standard user is not admin');

  const checkAdmin = await req('/admin/check-access', {}, user1Token, 'finverse_admin_2026');
  assert.strictEqual(checkAdmin.body.isAdmin, true, 'User with admin key is recognized as admin');
  console.log('  ✓ Admin authorization verified (isAdmin: true with valid credentials)');

  // --- 3. ALL USERS EXCEL SUMMARY TABLE TEST ---
  console.log('\n--- TEST 2: Excel-Style Summary Table of All Registered Users ---');
  const summaryRes = await req('/admin/users', {}, user1Token, 'finverse_admin_2026');
  assert.strictEqual(summaryRes.status, 200, 'Admin summary responds 200');
  assert(Array.isArray(summaryRes.body.data), 'Returns array of users');
  assert(summaryRes.body.data.length >= 2, 'Contains all registered users');

  // Verify User 1 row in summary
  const u1Row = summaryRes.body.data.find(u => u.id === user1Id);
  assert(u1Row, 'User 1 found in summary directory');
  assert.strictEqual(u1Row.name, 'Standard User Alpha', 'User 1 Name verified');
  assert.strictEqual(u1Row.email, user1Email, 'User 1 Email verified');
  assert.strictEqual(u1Row.txCount, 3, 'User 1 Number of Transactions is 3');
  assert.strictEqual(u1Row.totalIncome, 45000, 'User 1 Total Income is 45,000');
  assert.strictEqual(u1Row.totalExpenses, 5000, 'User 1 Total Expenses is 5,000 (3,000 + 2,000)');
  assert.strictEqual(u1Row.netSavings, 40000, 'User 1 Net Savings is 40,000');
  console.log('  ✓ User 1 summary verified: Name, Email, Tx Count (3), Income (45,000), Expenses (5,000)');

  // Verify User 2 row in summary (Data Isolation)
  const u2Row = summaryRes.body.data.find(u => u.id === user2Id);
  assert(u2Row, 'User 2 found in summary directory');
  assert.strictEqual(u2Row.txCount, 1, 'User 2 Tx Count is 1 (isolated)');
  assert.strictEqual(u2Row.totalIncome, 90000, 'User 2 Total Income is 90,000');
  assert.strictEqual(u2Row.totalExpenses, 0, 'User 2 Total Expenses is 0');
  console.log('  ✓ User 2 summary verified: Tx Count (1), Income (90,000), Expenses (0)');

  // --- 4. DETAILED USER PAGE BY USERID ---
  console.log('\n--- TEST 3: Detailed User Page Lookup by userId ---');
  const detailRes = await req(`/admin/users/${user1Id}`, {}, user1Token, 'finverse_admin_2026');
  assert.strictEqual(detailRes.status, 200, 'User detail lookup responds 200');
  const d = detailRes.body.data;

  // Profile
  assert.strictEqual(d.user.id, user1Id, 'Correct target userId');
  assert.strictEqual(d.user.name, 'Standard User Alpha', 'Profile name');
  assert.strictEqual(d.user.email, user1Email, 'Profile email');

  // Financial summary
  assert.strictEqual(d.financialSummary.totalIncome, 45000, 'Summary Income 45,000');
  assert.strictEqual(d.financialSummary.totalExpenses, 5000, 'Summary Expenses 5,000');
  assert.strictEqual(d.financialSummary.netSavings, 40000, 'Summary Net Savings 40,000');
  assert.strictEqual(d.financialSummary.txCount, 3, 'Summary Tx Count 3');

  // Transactions list
  assert.strictEqual(d.transactions.length, 3, 'Target user has exactly 3 transactions');
  const descList = d.transactions.map(t => t.description);
  assert(descList.includes('Monthly Salary') && descList.includes('Dinner with friends') && descList.includes('Metro pass'));
  assert(!descList.includes('Consulting Fee'), 'User 2 transaction is NOT leaked into User 1 detail');

  // Category-wise spending
  assert(Array.isArray(d.categorySpending), 'Category-wise spending is array');
  const foodCat = d.categorySpending.find(c => c.category === 'Food & Dining');
  assert(foodCat && foodCat.amount === 3000, 'Category Food & Dining spent is 3,000');
  const transCat = d.categorySpending.find(c => c.category === 'Transport');
  assert(transCat && transCat.amount === 2000, 'Category Transport spent is 2,000');

  // Budgets
  assert(Array.isArray(d.budgets), 'Budgets is array');
  assert.strictEqual(d.budgets.length, 1, 'Target user has 1 budget');
  assert.strictEqual(d.budgets[0].category, 'Food & Dining');
  assert.strictEqual(d.budgets[0].limit, 6000);
  assert.strictEqual(d.budgets[0].spent, 3000);
  assert.strictEqual(d.budgets[0].remaining, 3000);

  // AI Coach Conversations
  assert(Array.isArray(d.conversations), 'Conversations is array');
  assert(d.conversations.length >= 1, 'User 1 has at least 1 coaching conversation');
  assert.strictEqual(d.conversations[0].title, 'Financial Coaching Session');
  assert(d.conversations[0].messages.length >= 2, 'Conversation contains user message and assistant reply');
  const userMsg = d.conversations[0].messages.find(m => m.role === 'user');
  assert(userMsg && userMsg.content.includes('laptop'), 'User prompt stored in conversation');
  const coachMsg = d.conversations[0].messages.find(m => m.role === 'assistant');
  assert(coachMsg && coachMsg.content.length > 0, 'Coach reply stored in conversation');

  // Verify User 2 detail view has no conversations (data isolation)
  const detailRes2 = await req(`/admin/users/${user2Id}`, {}, user1Token, 'finverse_admin_2026');
  assert.strictEqual(detailRes2.body.data.conversations.length, 0, 'User 2 conversations list is completely empty');

  console.log('  ✓ Detailed view verified for userId: Profile, All Transactions, Income, Expenses, Categories, Budgets, Savings, and AI Coach Conversations');

  // --- 5. EXCEL CSV EXPORT FOR SELECTED USER ---
  console.log('\n--- TEST 4: Export to Excel for Selected User Data ---');
  const exportRes = await req(`/admin/users/${user1Id}/export`, {}, user1Token, 'finverse_admin_2026');
  assert.strictEqual(exportRes.status, 200, 'Export responds 200');
  assert(exportRes.headers.get('content-type').includes('text/csv'), 'Content-Type is text/csv');
  assert(exportRes.headers.get('content-disposition').includes('attachment'), 'Content-Disposition is attachment');

  const csvContent = exportRes.body;
  assert(csvContent.includes('FINVERSE-AI USER FINANCIAL PROFILE EXPORT'), 'Contains CSV header');
  assert(csvContent.includes('Standard User Alpha'), 'Contains user name');
  assert(csvContent.includes(user1Email), 'Contains user email');
  assert(csvContent.includes('45,000'), 'Contains total income');
  assert(csvContent.includes('Food & Dining'), 'Contains category spending');
  assert(csvContent.includes('Dinner with friends'), 'Contains transaction description');
  assert(csvContent.includes('AI COACH CONVERSATIONS & CHAT HISTORY'), 'Contains AI Coach Conversations section');
  assert(csvContent.includes('laptop'), 'Contains conversation message content in CSV export');
  console.log('  ✓ Excel CSV export generated with complete multi-section structured data including AI Coach chat');

  // --- 6. FRONTEND PAGE VALIDATION ---
  console.log('\n--- TEST 5: Frontend Page Markup & Elements Audit ---');
  const pageRes = await fetch('http://localhost:5000/user-management.html');
  assert.strictEqual(pageRes.status, 200, 'user-management.html served 200 OK');
  const html = await pageRes.text();

  assert(html.includes('id="allUsersTable"'), 'Contains allUsersTable');
  assert(html.includes('id="userSearchInput"'), 'Contains Search User input');
  assert(html.includes('id="backToUsersBtn"'), 'Contains Back to Users button');
  assert(html.includes('id="exportUserExcelBtn"'), 'Contains Export to Excel button');
  assert(html.includes('id="userDetailView"'), 'Contains User Detail View container');
  assert(html.includes('id="detailConversationsContainer"'), 'Contains AI Coach Conversations container');
  assert(html.includes('id="detailConversationsCountBadge"'), 'Contains AI Coach Conversations count badge');
  console.log('  ✓ user-management.html includes Excel summary table, Search, Back to Users, Export to Excel, and AI Coach Conversations');

  console.log('\n================================================================');
  console.log('🎉 ALL USER DATA MANAGEMENT TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
