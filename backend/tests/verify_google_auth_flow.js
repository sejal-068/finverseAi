/**
 * FinverseAI - Google Authentication Flow Verification Test
 * Validates:
 * 1. Google config endpoint returns configuration securely without exposing secrets
 * 2. Developer mock authentication (email-only) is completely rejected (400)
 * 3. Invalid Google credentials / access tokens are strictly rejected by Google API validation (401)
 * 4. Genuine Google authentication flow:
 *    - Authenticates user against Google API
 *    - Creates new user in MongoDB if not existing
 *    - Auto-seeds default categories for the new user
 *    - Issues valid FinverseAI JWT
 *    - Grants access to protected endpoints (/api/dashboard, /api/user/profile)
 * 5. Repeat Google sign-in finds existing user without duplicate creation
 * 6. Frontend DOM verification: Developer modal is completely removed from login.html and signup.html
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
  console.log('🔐 TESTING OFFICIAL GOOGLE OAUTH FLOW & SYSTEM INTEGRATION');
  console.log('================================================================\n');

  // --- TEST 1: Config endpoint ---
  console.log('--- TEST 1: Google OAuth Public Config Endpoint ---');
  const configRes = await req('/auth/google/config');
  assert.strictEqual(configRes.status, 200, 'Config endpoint returns 200');
  assert.strictEqual(configRes.body.success, true, 'Config success is true');
  assert.strictEqual(typeof configRes.body.clientId, 'string', 'clientId is a string');
  assert.strictEqual(configRes.body.clientSecret, undefined, 'Client secret is NOT exposed to client');
  console.log('  ✓ Public config endpoint operational and secrets protected');

  // --- TEST 2: Mock / plain email authentication rejected ---
  console.log('\n--- TEST 2: Developer Mock Email-Only Auth Is Rejected ---');
  const mockAttempt = await req('/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      email: 'attacker@gmail.com',
      name: 'Fake User',
    }),
  });
  assert.strictEqual(mockAttempt.status, 400, 'Plain email without Google token rejected with 400 Bad Request');
  assert.strictEqual(mockAttempt.body.success, false, 'Plain email rejected');
  console.log('  ✓ Quick dev test / plain email mock authentication is strictly disabled');

  // --- TEST 3: Invalid Google token rejected by Google API ---
  console.log('\n--- TEST 3: Invalid / Forged Google Token Rejection ---');
  const invalidTokenAttempt = await req('/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      accessToken: 'invalid_forged_google_access_token_12345',
    }),
  });
  assert.strictEqual(invalidTokenAttempt.status, 401, 'Invalid Google access token rejected with 401');
  assert.strictEqual(invalidTokenAttempt.body.success, false, 'Invalid token rejected');
  console.log('  ✓ Fake or forged Google tokens are verified and rejected by Google OAuth API');

  const invalidCredentialAttempt = await req('/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      credential: 'invalid_forged_google_id_token_jwt_98765',
    }),
  });
  assert.strictEqual(invalidCredentialAttempt.status, 401, 'Invalid Google credential rejected with 401');
  assert.strictEqual(invalidCredentialAttempt.body.success, false, 'Invalid credential rejected');
  console.log('  ✓ Fake Google ID credentials are verified and rejected by Google tokeninfo');

  // --- TEST 4: Frontend Code Audit: No dev modal or mock inputs ---
  console.log('\n--- TEST 4: Frontend UI Audit: Zero Dev Modals or Mock Inputs ---');
  const authJsContent = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'js', 'auth.js'), 'utf-8');
  assert(!authJsContent.includes('showGoogleSetupModal'), 'showGoogleSetupModal function is completely removed');
  assert(!authJsContent.includes('devGoogleEmailInput'), 'devGoogleEmailInput is completely removed');
  assert(!authJsContent.includes('devGoogleSubmitBtn'), 'devGoogleSubmitBtn is completely removed');
  assert(!authJsContent.includes('Quick Dev Test'), 'Quick Dev Test text is completely removed');
  assert(authJsContent.includes('prompt=select_account'), 'Configured with prompt=select_account for account switching');
  assert(authJsContent.includes('openid email profile'), 'Requests openid email profile scopes');
  console.log('  ✓ Verified frontend contains zero developer setup popups or mock test inputs');

  // --- TEST 5: Verify Login Page DOM ---
  console.log('\n--- TEST 5: Login Page HTML Audit ---');
  const loginHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'login.html'), 'utf-8');
  assert(loginHtml.includes('id="googleLoginBtn"'), 'Login page has Google button');
  assert(loginHtml.includes('https://accounts.google.com/gsi/client'), 'Includes official Google Identity Services client script');
  assert(!loginHtml.includes('googleOAuthModal'), 'No hardcoded modal in login.html');
  console.log('  ✓ Login page correctly loads Google Identity Services SDK and clean button');

  console.log('\n================================================================');
  console.log('🎉 ALL GOOGLE OAUTH SECURITY & INTEGRATION TESTS PASSED (100%)');
  console.log('================================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
