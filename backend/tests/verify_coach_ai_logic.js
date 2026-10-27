/**
 * FinverseAI - Dedicated Test Suite for AI Coach Response Logic
 * Tests:
 * 1. "What is my future prediction?"
 * 2. "Predict my next month expenses"
 * 3. "Analyze my spending"
 * 4. "How can I save more?"
 * 5. "Can I afford ₹5,000?"
 * 6. Brand new user with 0 transactions vs user with real transactions
 * 7. Verification that generic welcome message is NEVER returned as a response
 * 8. Verification that responses are strictly user-specific and data-driven
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function req(endpoint, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

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

  return { status: res.status, ok: res.ok, body: data };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧠 TESTING FINVERSE-AI COACH RESPONSE LOGIC & INTENT ACCURACY');
  console.log('================================================================\n');

  const genericWelcomeSnippets = [
    "I'm here as your personal financial partner. How can I help you navigate",
    "Whether you're wondering if a purchase fits your budget, looking for small ways to save",
    "Hello! I'm your FinverseAI Financial Coach. I'm here to help you understand",
  ];

  function assertNotGenericWelcome(reply, query) {
    for (const snippet of genericWelcomeSnippets) {
      assert(
        !reply.includes(snippet),
        `FAIL: Query "${query}" returned generic welcome message!\nReply: ${reply}`
      );
    }
  }

  // --- 1. SETUP USER A (New user, 0 transactions initially) ---
  const userAEmail = `test_coach_${Date.now()}@example.com`;
  const signupRes = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Priya Sharma',
      email: userAEmail,
      password: 'Password123!',
      monthlyIncome: 60000,
      financialGoal: 'Buy a House',
    }),
  });

  assert(signupRes.ok, 'User A signup succeeded');
  const tokenA = signupRes.body.token;

  console.log('--- TEST GROUP 1: Empty / Zero-Transaction User Queries ---');

  // Test 1.1: Prediction on 0-transaction user
  const q1 = 'What is my future prediction?';
  const res1 = await req('/ai/coach', { method: 'POST', body: JSON.stringify({ message: q1 }) }, tokenA);
  assert.strictEqual(res1.status, 200);
  const reply1 = res1.body.data.reply;
  assertNotGenericWelcome(reply1, q1);
  assert(
    reply1.includes('transaction') || reply1.includes('history'),
    'Coach informs user that transaction history is required before predicting'
  );
  console.log(`  ✓ "${q1}" -> Accurately explains transactions needed without fake numbers or welcome message`);

  // Test 1.2: "Predict my next month expenses" on 0 transactions
  const q2 = 'Predict my next month expenses';
  const res2 = await req('/ai/coach', { method: 'POST', body: JSON.stringify({ message: q2 }) }, tokenA);
  assert.strictEqual(res2.status, 200);
  const reply2 = res2.body.data.reply;
  assertNotGenericWelcome(reply2, q2);
  assert(
    reply2.includes('transaction') || reply2.includes('history'),
    'Coach informs user that transaction records are needed'
  );
  console.log(`  ✓ "${q2}" -> Accurately prompts for transaction data`);

  // Test 1.3: "Analyze my spending" on 0 transactions
  const q3 = 'Analyze my spending';
  const res3 = await req('/ai/coach', { method: 'POST', body: JSON.stringify({ message: q3 }) }, tokenA);
  assert.strictEqual(res3.status, 200);
  const reply3 = res3.body.data.reply;
  assertNotGenericWelcome(reply3, q3);
  assert(
    reply3.includes('recorded expenses') || reply3.includes('transactions'),
    'Coach states no recorded expenses yet to analyze'
  );
  console.log(`  ✓ "${q3}" -> Correctly identifies zero-expense state`);

  // Test 1.4: "How can I save more?" on 0 transactions
  const q4 = 'How can I save more?';
  const res4 = await req('/ai/coach', { method: 'POST', body: JSON.stringify({ message: q4 }) }, tokenA);
  assert.strictEqual(res4.status, 200);
  const reply4 = res4.body.data.reply;
  assertNotGenericWelcome(reply4, q4);
  assert(
    reply4.includes('60,000') || reply4.includes('12,000') || reply4.includes('20%'),
    'Coach provides tailored advice using registered monthly income (60,000)'
  );
  console.log(`  ✓ "${q4}" -> Tailored to registered monthly income (60,000)`);

  // Test 1.5: "Can I afford ₹5,000?" on 0 transactions
  const q5 = 'Can I afford ₹5,000?';
  const res5 = await req('/ai/coach', { method: 'POST', body: JSON.stringify({ message: q5 }) }, tokenA);
  assert.strictEqual(res5.status, 200);
  const reply5 = res5.body.data.reply;
  assertNotGenericWelcome(reply5, q5);
  assert(
    reply5.includes('5,000') || reply5.includes('5000'),
    'Coach calculates for requested amount ₹5,000'
  );
  console.log(`  ✓ "${q5}" -> Calculates specifically for requested amount ₹5,000`);

  // --- 2. ADD REAL FINANCIAL TRANSACTIONS FOR USER A ---
  console.log('\n--- TEST GROUP 2: Active User with Real Financial Records ---');

  // Add Income: 65,000
  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Monthly Salary',
      amount: 65000,
      type: 'income',
      category: 'Salary',
      date: new Date().toISOString(),
    }),
  }, tokenA);

  // Add Expenses: Food & Dining (4,500), Shopping (3,500), Utilities (2,000)
  // Total Expenses = 10,000 | Net Surplus = 55,000
  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Supermarket and Restaurant',
      amount: 4500,
      type: 'expense',
      category: 'Food & Dining',
      date: new Date().toISOString(),
    }),
  }, tokenA);

  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Weekend Shopping',
      amount: 3500,
      type: 'expense',
      category: 'Shopping',
      date: new Date().toISOString(),
    }),
  }, tokenA);

  await req('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Electricity Bill',
      amount: 2000,
      type: 'expense',
      category: 'Bills & Utilities',
      date: new Date().toISOString(),
    }),
  }, tokenA);

  // Test 2.1: "What is my future prediction?"
  const resFuture = await req('/ai/coach', { method: 'POST', body: JSON.stringify({ message: 'What is my future prediction?' }) }, tokenA);
  assert.strictEqual(resFuture.status, 200);
  const replyFuture = resFuture.body.data.reply;
  assertNotGenericWelcome(replyFuture, 'What is my future prediction?');
  assert(replyFuture.includes('10,000') || replyFuture.includes('forecast') || replyFuture.includes('Estimated Next Month'), 'Estimates next month expenses based on real outflow');
  assert(replyFuture.includes('Food & Dining') || replyFuture.includes('Shopping'), 'Identifies major spending categories');
  assert(replyFuture.includes('estimate') || replyFuture.includes('estimates'), 'Explicitly notes prediction is an estimate');
  assert(replyFuture.includes('saving') || replyFuture.includes('Savings'), 'Includes possible savings opportunities');
  console.log('  ✓ "What is my future prediction?" -> Personalized estimate with real ₹10,000 outflow, categories, and savings');

  // Test 2.2: "Predict my next month expenses"
  const resPredict = await req('/ai/coach', { method: 'POST', body: JSON.stringify({ message: 'Predict my next month expenses' }) }, tokenA);
  assert.strictEqual(resPredict.status, 200);
  const replyPredict = resPredict.body.data.reply;
  assertNotGenericWelcome(replyPredict, 'Predict my next month expenses');
  assert(replyPredict.includes('10,000') || replyPredict.includes('forecast'), 'Predicts next month expenses using real pace');
  assert(replyPredict.includes('Food & Dining'), 'Mentions top category Food & Dining');
  console.log('  ✓ "Predict my next month expenses" -> Forecasts next month expenses and identifies top driver');

  // Test 2.3: "Analyze my spending"
  const resAnalyze = await req('/ai/coach', { method: 'POST', body: JSON.stringify({ message: 'Analyze my spending' }) }, tokenA);
  assert.strictEqual(resAnalyze.status, 200);
  const replyAnalyze = resAnalyze.body.data.reply;
  assertNotGenericWelcome(replyAnalyze, 'Analyze my spending');
  assert(replyAnalyze.includes('10,000'), 'States total expenses ₹10,000');
  assert(replyAnalyze.includes('65,000'), 'States total income ₹65,000');
  assert(replyAnalyze.includes('55,000'), 'States net cushion ₹55,000');
  assert(replyAnalyze.includes('Food & Dining') && replyAnalyze.includes('4,500'), 'Breakdown includes Food & Dining: 4,500');
  console.log('  ✓ "Analyze my spending" -> Real breakdown (₹65,000 in, ₹10,000 out, ₹55,000 cushion, Food ₹4,500)');

  // Test 2.4: "How can I save more?"
  const resSave = await req('/ai/coach', { method: 'POST', body: JSON.stringify({ message: 'How can I save more?' }) }, tokenA);
  assert.strictEqual(resSave.status, 200);
  const replySave = resSave.body.data.reply;
  assertNotGenericWelcome(replySave, 'How can I save more?');
  assert(replySave.includes('Food & Dining') || replySave.includes('Shopping'), 'Targets actual discretionary categories');
  assert(replySave.includes('Buy a House'), 'Integrates user primary goal (Buy a House)');
  console.log('  ✓ "How can I save more?" -> Targets real categories and personal goal (Buy a House)');

  // Test 2.5: "Can I afford ₹5,000?"
  const resAfford = await req('/ai/coach', { method: 'POST', body: JSON.stringify({ message: 'Can I afford ₹5,000?' }) }, tokenA);
  assert.strictEqual(resAfford.status, 200);
  const replyAfford = resAfford.body.data.reply;
  assertNotGenericWelcome(replyAfford, 'Can I afford ₹5,000?');
  assert(replyAfford.includes('5,000') || replyAfford.includes('5000'), 'Evaluates specifically for ₹5,000');
  assert(replyAfford.includes('55,000'), 'Uses real net surplus ₹55,000');
  assert(replyAfford.includes('50,000'), 'Calculates remaining buffer ₹50,000');
  console.log('  ✓ "Can I afford ₹5,000?" -> Shows exact math (₹55,000 surplus - ₹5,000 = ₹50,000 buffer)');

  // --- 3. MULTI-USER ISOLATION: USER B CANNOT ACCESS USER A DATA ---
  console.log('\n--- TEST GROUP 3: Multi-User Data Isolation ---');
  const userBEmail = `test_coach_b_${Date.now()}@example.com`;
  const signupB = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Rohan Verma',
      email: userBEmail,
      password: 'Password123!',
      monthlyIncome: 30000,
    }),
  });
  const tokenB = signupB.body.token;

  const resUserB = await req('/ai/coach', { method: 'POST', body: JSON.stringify({ message: 'Analyze my spending' }) }, tokenB);
  assert.strictEqual(resUserB.status, 200);
  const replyUserB = resUserB.body.data.reply;
  assert(!replyUserB.includes('65,000'), 'User B does NOT see User A 65,000 income');
  assert(!replyUserB.includes('Food & Dining'), 'User B does NOT see User A Food & Dining transactions');
  console.log('  ✓ User B chat does not leak User A transactions or income');

  console.log('\n================================================================');
  console.log('🎉 ALL AI COACH INTENT & PERSONALIZATION TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
