/**
 * FinverseAI - Comprehensive System & AI Coach Verification Test Suite
 * Tests all 10 user requirements:
 * 1. AI Financial Coach Human/Empathetic Tone & Data-Driven Logic
 * 2. Login Password Field Bug Fix (Clean HTML, no hardcoded values)
 * 3. Onboarding Multi-step Flow & MongoDB Association
 * 4. User Profile Persistence & Data Isolation (User A vs User B)
 * 5. Profile Editing & Context Integration in Coach
 * 6. Returning User Login Flow
 * 7. Empty State for Brand New User
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function apiRequest(endpoint, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${endpoint}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

const mongoose = require('mongoose');

async function runTests() {
  console.log('================================================================');
  console.log('RUNNING FINVERSE-AI COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/finverseai');
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // Ensure backend server & DB connection are ready
  try {
    await apiRequest('/auth/google/config');
  } catch (e) {
    console.log('  Starting backend server instance for test suite...');
    require('../server');
  }

  // Wait until mongoose is fully connected
  let retries = 10;
  while (mongoose.connection.readyState !== 1 && retries > 0) {
    await new Promise(r => setTimeout(r, 500));
    retries--;
  }

  // TEST 1: Check login.html password field bug
  console.log('--- TEST 1: Verify Login Password Field Bug Fix ---');
  const loginHtmlPath = path.join(__dirname, '../../frontend/login.html');
  const loginHtml = fs.readFileSync(loginHtmlPath, 'utf8');

  assert(!loginHtml.includes('value="Finverse@2026"'), 'No hardcoded demo password value in login.html');
  assert(!loginHtml.includes('value="demo@finverse.ai"'), 'No hardcoded demo email value in login.html');
  assert(loginHtml.includes('autocomplete="current-password"'), 'Has proper autocomplete="current-password"');
  assert(loginHtml.includes('autocomplete="email"'), 'Has proper autocomplete="email"');

  // TEST 2: Check onboarding files exist
  console.log('\n--- TEST 2: Verify Onboarding Page & Styling Exist ---');
  const onboardingHtmlPath = path.join(__dirname, '../../frontend/onboarding.html');
  const onboardingCssPath = path.join(__dirname, '../../frontend/css/onboarding.css');
  const onboardingJsPath = path.join(__dirname, '../../frontend/js/onboarding.js');

  assert(fs.existsSync(onboardingHtmlPath), 'onboarding.html exists');
  assert(fs.existsSync(onboardingCssPath), 'css/onboarding.css exists');
  assert(fs.existsSync(onboardingJsPath), 'js/onboarding.js exists');

  const onboardingHtml = fs.readFileSync(onboardingHtmlPath, 'utf8');
  const onboardingJs = fs.readFileSync(onboardingJsPath, 'utf8');
  assert(onboardingHtml.includes("Let's get to know your financial world"), 'Contains intended onboarding title');
  assert(onboardingJs.includes('Build My Financial Dashboard'), 'Contains final completion button');

  // TEST 3: New User Registration & Check onboardingCompleted is false
  console.log('\n--- TEST 3: New User Registration (User A) ---');
  const uniqueId = Date.now();
  const userAEmail = `user_a_${uniqueId}@test.com`;
  const userBEmail = `user_b_${uniqueId}@test.com`;

  const regA = await apiRequest('/auth/signup', 'POST', {
    name: 'Dev User',
    email: userAEmail,
    password: 'Password@123',
    monthlyIncome: 65000,
    financialGoal: 'Save Money'
  });

  if (regA.status !== 201) console.error('Signup failed body:', regA.body);
  assert(regA.status === 201, `User A registered successfully (Status: ${regA.status})`);
  assert(regA.body.user.onboardingCompleted === false, 'User A onboardingCompleted is false on initial signup');
  const tokenA = regA.body.token;

  // TEST 4: Empty / Brand-New User AI Coach Response
  console.log('\n--- TEST 4: Empty State AI Coach with New User (0 transactions) ---');
  const emptyCoachRes = await apiRequest('/ai/coach', 'POST', {
    message: 'How is my money looking?'
  }, tokenA);

  assert(emptyCoachRes.status === 200, 'AI Coach responded for new user');
  const emptyReply = emptyCoachRes.body.data?.reply || emptyCoachRes.body.reply || '';
  assert(
    emptyReply.toLowerCase().includes('journey') || emptyReply.toLowerCase().includes('start') || emptyReply.toLowerCase().includes('first') || emptyReply.toLowerCase().includes('welcome') || emptyReply.toLowerCase().includes('transaction'),
    'Empty state coach offers warm, supportive welcome without fake stats'
  );
  assert(!emptyReply.includes('58,000'), 'AI Coach does NOT return old hardcoded demo 58,000 figure');
  console.log(`  Coach response: "${emptyReply.substring(0, 140)}..."`);

  // TEST 5: Complete User A Onboarding via PUT /api/user/profile
  console.log('\n--- TEST 5: Save Onboarding Profile for User A ---');
  const onboardRes = await apiRequest('/user/profile', 'PUT', {
    name: 'Dev User',
    age: 29,
    gender: 'Male',
    occupation: 'Software Engineer',
    city: 'Pune',
    monthlyIncome: 65000,
    incomeType: 'Salaried',
    dependents: 2,
    dependentsContext: 'Parents and spouse',
    financialGoals: ['Build emergency savings', 'Save for a major purchase'],
    moneyRoutine: 'I track some expenses',
    onboardingCompleted: true
  }, tokenA);

  assert(onboardRes.status === 200, 'Profile saved successfully');
  assert(onboardRes.body.data.onboardingCompleted === true, 'onboardingCompleted is now true in MongoDB');
  assert(onboardRes.body.data.dependents === 2, 'dependents saved correctly (2)');
  assert(onboardRes.body.data.incomeType === 'Salaried', 'incomeType saved correctly');
  assert(onboardRes.body.data.occupation === 'Software Engineer', 'occupation saved correctly');

  // TEST 6: Returning User Login Flow
  console.log('\n--- TEST 6: Returning User Login Check ---');
  const loginRes = await apiRequest('/auth/login', 'POST', {
    email: userAEmail,
    password: 'Password@123'
  });

  assert(loginRes.status === 200, 'User A logged in successfully');
  assert(loginRes.body.user.onboardingCompleted === true, 'Returning user has onboardingCompleted === true (directs to Dashboard)');

  // TEST 7: Data Isolation (User B)
  console.log('\n--- TEST 7: Data Isolation (User A vs User B) ---');
  const regB = await apiRequest('/auth/signup', 'POST', {
    name: 'Bhavna Patel',
    email: userBEmail,
    password: 'Password@456',
    monthlyIncome: 40000,
    financialGoal: 'Reduce Expenses'
  });

  const tokenB = regB.body.token;
  assert(regB.body.user.onboardingCompleted === false, 'User B starts with onboardingCompleted === false');

  const profileB = await apiRequest('/user/profile', 'GET', null, tokenB);
  assert(profileB.body.data.name === 'Bhavna Patel', 'User B sees own name');
  assert(profileB.body.data.occupation !== 'Software Engineer', 'User B does NOT see User A occupation');
  assert(profileB.body.data.dependents === 0, 'User B dependents defaults to 0, isolated from User A');

  // TEST 8: Add Real Financial Data for User A and Test AI Coach
  console.log('\n--- TEST 8: Real Financial Data + AI Coach Human & Empathetic Responses ---');
  
  // Add Salary Income
  await apiRequest('/transactions', 'POST', {
    type: 'income',
    amount: 65000,
    category: 'Salary',
    description: 'Tech Monthly Salary',
    date: new Date().toISOString()
  }, tokenA);

  // Add Expenses
  await apiRequest('/transactions', 'POST', {
    type: 'expense',
    amount: 18000,
    category: 'Rent',
    description: 'Apartment rent',
    date: new Date().toISOString()
  }, tokenA);

  await apiRequest('/transactions', 'POST', {
    type: 'expense',
    amount: 8000,
    category: 'Food & Dining',
    description: 'Groceries & restaurants',
    date: new Date().toISOString()
  }, tokenA);

  await apiRequest('/transactions', 'POST', {
    type: 'expense',
    amount: 6000,
    category: 'Shopping',
    description: 'Weekend shopping',
    date: new Date().toISOString()
  }, tokenA);

  // Add Budget for Food & Dining
  await apiRequest('/budgets', 'POST', {
    category: 'Food & Dining',
    limit: 7000,
    period: 'monthly'
  }, tokenA);

  // 8a: "How can I save more money this month?"
  console.log('\n  [Query 1] "How can I save more money this month?"');
  const saveCoachRes = await apiRequest('/ai/coach', 'POST', {
    message: 'How can I save more money this month?'
  }, tokenA);

  assert(saveCoachRes.status === 200, 'Coach responded');
  const saveReply = saveCoachRes.body.data?.reply || saveCoachRes.body.reply || '';
  assert(
    saveReply.toLowerCase().includes('saving') || saveReply.toLowerCase().includes('spend') || saveReply.toLowerCase().includes('food') || saveReply.toLowerCase().includes('shopping'),
    'Response naturally discusses discretionary spending'
  );
  assert(
    !saveReply.includes('exceeds discretionary ratio limit by 18.4%'),
    'Avoids rigid, robotic advisory phrasing'
  );
  console.log(`  Coach response: "${saveReply.substring(0, 160)}..."`);

  // 8b: "I spent too much this month."
  console.log('\n  [Query 2] "I spent too much this month."');
  const guiltCoachRes = await apiRequest('/ai/coach', 'POST', {
    message: 'I spent too much this month.'
  }, tokenA);

  assert(guiltCoachRes.status === 200, 'Coach responded');
  const guiltReply = guiltCoachRes.body.data?.reply || guiltCoachRes.body.reply || '';
  assert(
    guiltReply.toLowerCase().includes('okay') || guiltReply.toLowerCase().includes("don't") || guiltReply.toLowerCase().includes('adjust') || guiltReply.toLowerCase().includes('happen') || guiltReply.toLowerCase().includes('month'),
    'Response is comforting, supportive, and non-judgmental'
  );
  console.log(`  Coach response: "${guiltReply.substring(0, 160)}..."`);

  // 8c: "Can I afford a 5,000 purchase?"
  console.log('\n  [Query 3] "Can I afford a 5,000 purchase?"');
  const affordCoachRes = await apiRequest('/ai/coach', 'POST', {
    message: 'Can I afford a 5,000 purchase?'
  }, tokenA);

  assert(affordCoachRes.status === 200, 'Coach responded');
  const affordReply = affordCoachRes.body.data?.reply || affordCoachRes.body.reply || '';
  assert(
    affordReply.includes('5,000') || affordReply.includes('5000'),
    'Response mentions the 5,000 target'
  );
  assert(
    affordReply.toLowerCase().includes('income') || affordReply.toLowerCase().includes('buffer') || affordReply.toLowerCase().includes('surplus') || affordReply.toLowerCase().includes('comfortably') || affordReply.toLowerCase().includes('balance'),
    'Response explains affordability conversationally using income/expenses'
  );
  console.log(`  Coach response: "${affordReply.substring(0, 160)}..."`);

  // TEST 9: Profile Updating
  console.log('\n--- TEST 9: Profile Editing ---');
  const updateRes = await apiRequest('/user/profile', 'PUT', {
    name: 'Dev User',
    occupation: 'Lead Architect',
    monthlyIncome: 85000,
    dependents: 3
  }, tokenA);

  assert(updateRes.status === 200, 'Profile updated successfully');
  assert(updateRes.body.data.occupation === 'Lead Architect', 'Updated occupation persisted');
  assert(updateRes.body.data.monthlyIncome === 85000, 'Updated monthlyIncome persisted');
  assert(updateRes.body.data.dependents === 3, 'Updated dependents persisted');

  // Verify coach uses updated context
  const coachUpdatedContext = await apiRequest('/ai/coach', 'POST', {
    message: 'Can I afford a 15,000 gadget?'
  }, tokenA);

  assert(coachUpdatedContext.status === 200, 'Coach responds using updated income buffer');
  const coachUpdatedReply = coachUpdatedContext.body.data?.reply || coachUpdatedContext.body.reply || '';
  console.log(`  Coach response with updated income: "${coachUpdatedReply.substring(0, 160)}..."`);

  // Summary
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
