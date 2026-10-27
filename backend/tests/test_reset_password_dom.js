/**
 * Test Reset Password DOM interaction, Validation, Token checks, and Submit button
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('====================================================');
console.log('🧪 TESTING RESET PASSWORD DOM & FORM SUBMISSION');
console.log('====================================================\n');

const authJsPath = path.join(__dirname, '../../frontend/js/auth.js');
const resetHtmlPath = path.join(__dirname, '../../frontend/reset-password.html');

const authJs = fs.readFileSync(authJsPath, 'utf8');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

// Helper to flush promises
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 50));

// 1. Mock DOM helper
function createMockElement(id, classes = [], tagName = 'div', value = '') {
  const classListSet = new Set(classes);
  const listeners = {};
  const attributes = {};

  const el = {
    id,
    tagName: tagName.toUpperCase(),
    value,
    textContent: '',
    innerHTML: '',
    style: { display: '' },
    disabled: false,
    classList: {
      add: (c) => classListSet.add(c),
      remove: (c) => classListSet.delete(c),
      contains: (c) => classListSet.has(c),
      toggle: (c) => {
        if (classListSet.has(c)) classListSet.delete(c);
        else classListSet.add(c);
      }
    },
    getAttribute: (attr) => attributes[attr] || null,
    setAttribute: (attr, val) => { attributes[attr] = val; },
    addEventListener: (evt, handler) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(handler);
    },
    trigger: async (evt, e = {}) => {
      if (listeners[evt]) {
        for (const fn of listeners[evt]) {
          await fn({ preventDefault: () => {}, ...e });
        }
      }
    },
    closest: (selector) => {
      if (selector === '.form-group') return el.parentGroup;
      return null;
    },
    querySelector: (selector) => {
      if (selector === '.form-error') return el.errorSpan;
      if (selector === 'i') return el.iconEl || createMockElement('', [], 'i');
      return null;
    }
  };
  return el;
}

// Build elements for reset-password page
function setupDOM(searchQuery = '?token=valid_test_token_123') {
  const resetForm = createMockElement('resetPasswordForm', ['auth-form'], 'form');
  const spinnerEl = createMockElement('tokenCheckingSpinner');
  const invalidEl = createMockElement('tokenInvalidState');
  const invalidTitle = createMockElement('tokenInvalidTitle');
  const invalidMsg = createMockElement('tokenInvalidMsg');
  const formContainer = createMockElement('resetFormContainer');
  const cardEl = createMockElement('resetPasswordCard');

  const passwordInput = createMockElement('resetPassword', ['form-control'], 'input');
  const passwordGroup = createMockElement('passwordGroup', ['form-group']);
  const passwordErrorSpan = createMockElement('passwordError', ['form-error'], 'span');
  passwordGroup.errorSpan = passwordErrorSpan;
  passwordInput.parentGroup = passwordGroup;

  const confirmPasswordInput = createMockElement('resetConfirmPassword', ['form-control'], 'input');
  const confirmGroup = createMockElement('confirmGroup', ['form-group']);
  const confirmErrorSpan = createMockElement('confirmError', ['form-error'], 'span');
  confirmGroup.errorSpan = confirmErrorSpan;
  confirmPasswordInput.parentGroup = confirmGroup;

  const submitBtn = createMockElement('btnSubmitReset', ['btn', 'btn-primary'], 'button');

  const elementsById = {
    resetPasswordForm: resetForm,
    tokenCheckingSpinner: spinnerEl,
    tokenInvalidState: invalidEl,
    tokenInvalidTitle: invalidTitle,
    tokenInvalidMsg: invalidMsg,
    resetFormContainer: formContainer,
    resetPasswordCard: cardEl,
    resetPassword: passwordInput,
    resetConfirmPassword: confirmPasswordInput,
    btnSubmitReset: submitBtn,
  };

  const documentListeners = {};

  const documentMock = {
    addEventListener: (evt, fn) => {
      if (!documentListeners[evt]) documentListeners[evt] = [];
      documentListeners[evt].push(fn);
    },
    getElementById: (id) => elementsById[id] || null,
    querySelectorAll: (selector) => [],
    querySelector: (selector) => {
      if (selector === '.auth-card') return cardEl;
      if (selector === '.toast-container') return createMockElement('toastContainer');
      return null;
    },
    triggerDOMContentLoaded: async () => {
      if (documentListeners['DOMContentLoaded']) {
        for (const fn of documentListeners['DOMContentLoaded']) {
          await fn();
        }
      }
      await flushPromises();
    }
  };

  let tokenValidateCalledWith = null;
  let resetPasswordCalledWith = null;
  let validateShouldFail = false;
  let resetShouldFail = false;

  const mockFinverseAPI = {
    validateResetToken: async (tok) => {
      tokenValidateCalledWith = tok;
      if (validateShouldFail) throw new Error('Token expired or invalid');
      return { success: true, message: 'Valid token' };
    },
    resetPassword: async (tok, pass) => {
      resetPasswordCalledWith = { tok, pass };
      if (resetShouldFail) throw new Error('Password reset failed');
      return { success: true, message: 'Password reset' };
    }
  };

  const storage = {};
  const localStorageMock = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
  };

  const sandbox = {
    document: documentMock,
    URLSearchParams: URLSearchParams,
    window: {
      location: {
        search: searchQuery,
        href: ''
      },
      finverseAPI: mockFinverseAPI
    },
    localStorage: localStorageMock,
    console: console,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: clearTimeout,
    showToast: (msg, type) => { console.log(`    [Toast:${type}] ${msg}`); }
  };

  vm.createContext(sandbox);
  vm.runInContext(authJs, sandbox);

  return {
    documentMock,
    sandbox,
    resetForm,
    spinnerEl,
    invalidEl,
    invalidTitle,
    invalidMsg,
    formContainer,
    passwordInput,
    confirmPasswordInput,
    submitBtn,
    passwordGroup,
    confirmGroup,
    setValidateFail: (val) => { validateShouldFail = val; },
    setResetFail: (val) => { resetShouldFail = val; },
    getCalls: () => ({ tokenValidateCalledWith, resetPasswordCalledWith })
  };
}

// RUN TESTS
(async () => {
  // Test A: Valid Token Flow
  console.log('--- Subtest A: Valid Token Flow & Form Submission ---');
  const testA = setupDOM('?token=valid_secret_token_123');
  await testA.documentMock.triggerDOMContentLoaded();

  assert(testA.getCalls().tokenValidateCalledWith === 'valid_secret_token_123', 'Calls validateResetToken with query token');
  assert(testA.spinnerEl.style.display === 'none', 'Spinner hidden after token validation');
  assert(testA.formContainer.style.display === 'block', 'Reset form container displayed');

  // Fill in matching valid passwords
  testA.passwordInput.value = 'NewPass123!';
  testA.confirmPasswordInput.value = 'NewPass123!';

  // Submit form
  await testA.resetForm.trigger('submit');
  await flushPromises();

  assert(testA.getCalls().resetPasswordCalledWith !== null, 'resetPassword API called');
  assert(testA.getCalls().resetPasswordCalledWith?.tok === 'valid_secret_token_123', 'resetPassword called with correct token');
  assert(testA.getCalls().resetPasswordCalledWith?.pass === 'NewPass123!', 'resetPassword called with correct new password');

  // Test B: Password Mismatch Validation
  console.log('\n--- Subtest B: Password Mismatch Validation ---');
  const testB = setupDOM('?token=valid_secret_token_123');
  await testB.documentMock.triggerDOMContentLoaded();

  testB.passwordInput.value = 'NewPass123!';
  testB.confirmPasswordInput.value = 'DifferentPass123!';

  await testB.resetForm.trigger('submit');
  await flushPromises();

  assert(testB.confirmGroup.classList.contains('has-error'), 'Confirm password flagged with .has-error when passwords do not match');
  assert(testB.getCalls().resetPasswordCalledWith === null, 'resetPassword API NOT called when passwords mismatch');

  // Test C: Missing Token Handling
  console.log('\n--- Subtest C: Missing Token Handling ---');
  const testC = setupDOM(''); // No token in query string
  await testC.documentMock.triggerDOMContentLoaded();

  assert(testC.spinnerEl.style.display === 'none', 'Spinner hidden when token is missing');
  assert(testC.invalidEl.style.display === 'block', 'Invalid token container displayed');
  assert(testC.invalidTitle.textContent === 'Missing Reset Token', 'Title shows "Missing Reset Token"');

  // Test D: Invalid / Expired Token Handling
  console.log('\n--- Subtest D: Invalid / Expired Token Handling ---');
  const testD = setupDOM('?token=expired_token_999');
  testD.setValidateFail(true);
  await testD.documentMock.triggerDOMContentLoaded();

  assert(testD.spinnerEl.style.display === 'none', 'Spinner hidden when token is expired');
  assert(testD.invalidEl.style.display === 'block', 'Invalid token container displayed for expired token');
  assert(testD.invalidTitle.textContent === 'Link Expired or Invalid', 'Title shows "Link Expired or Invalid"');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
})().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
