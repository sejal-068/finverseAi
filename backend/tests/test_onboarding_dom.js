/**
 * Test Onboarding Continue Button, Error Handling, and Step Progression
 */

const fs = require('fs');
const path = require('path');

// 1. Check code content of main.js, auth.js, and onboarding.js for clearInputError and showInputError
console.log('====================================================');
console.log('🧪 VERIFYING ONBOARDING JS & VALIDATION FUNCTIONS');
console.log('====================================================\n');

const onboardingJsPath = path.join(__dirname, '../../frontend/js/onboarding.js');
const mainJsPath = path.join(__dirname, '../../frontend/js/main.js');
const onboardingHtmlPath = path.join(__dirname, '../../frontend/onboarding.html');

const onboardingJs = fs.readFileSync(onboardingJsPath, 'utf8');
const mainJs = fs.readFileSync(mainJsPath, 'utf8');
const onboardingHtml = fs.readFileSync(onboardingHtmlPath, 'utf8');

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

// Check function definitions
assert(onboardingJs.includes('function clearInputError('), 'onboarding.js defines clearInputError');
assert(onboardingJs.includes('function showInputError('), 'onboarding.js defines showInputError');
assert(onboardingJs.includes('function escapeHtml('), 'onboarding.js defines escapeHtml');
assert(mainJs.includes('function clearInputError('), 'main.js defines clearInputError globally');
assert(mainJs.includes('function showInputError('), 'main.js defines showInputError globally');

// Check script includes in onboarding.html
assert(onboardingHtml.includes('js/api.js'), 'onboarding.html includes api.js');
assert(onboardingHtml.includes('js/main.js'), 'onboarding.html includes main.js');
assert(onboardingHtml.includes('js/onboarding.js'), 'onboarding.html includes onboarding.js');

// 2. Behavioral Simulation of DOM & Event Handlers
console.log('\n--- SIMULATING ONBOARDING INTERACTION ---');

// Mock localStorage
const storage = {
  finverse_token: 'valid_test_token',
  finverse_user: JSON.stringify({ name: '', onboardingCompleted: false })
};

const localStorageMock = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

// Mock DOM elements
function createMockElement(id, classes = [], tagName = 'div', value = '') {
  const classListSet = new Set(classes);
  const listeners = {};
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    value,
    textContent: '',
    innerHTML: '',
    style: {},
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
    getAttribute: (attr) => el[attr] || null,
    setAttribute: (attr, val) => { el[attr] = val; },
    scrollIntoView: () => {},
    addEventListener: (evt, handler) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(handler);
    },
    trigger: async (evt) => {
      if (listeners[evt]) {
        for (const fn of listeners[evt]) {
          await fn({ preventDefault: () => {} });
        }
      }
    },
    closest: (selector) => {
      if (selector === '.form-group') return el.parentGroup;
      return null;
    },
    querySelector: (selector) => {
      if (selector === '.form-error') return el.errorSpan;
      return null;
    }
  };
  return el;
}

// Build Step 1 Elements
const nameGroup = createMockElement('nameGroup', ['form-group']);
const nameInput = createMockElement('obFullName', ['form-control'], 'input', '');
const nameErrorSpan = createMockElement('nameError', ['form-error'], 'span', '');
nameGroup.errorSpan = nameErrorSpan;
nameInput.parentGroup = nameGroup;

const occGroup = createMockElement('occGroup', ['form-group']);
const occInput = createMockElement('obOccupation', ['form-control'], 'input', '');
const occErrorSpan = createMockElement('occError', ['form-error'], 'span', '');
occGroup.errorSpan = occErrorSpan;
occInput.parentGroup = occGroup;

const incomeGroup = createMockElement('incomeGroup', ['form-group']);
const incomeInput = createMockElement('obMonthlyIncome', ['form-control'], 'input', '60000');
const incomeErrorSpan = createMockElement('incomeError', ['form-error'], 'span', '');
incomeGroup.errorSpan = incomeErrorSpan;
incomeInput.parentGroup = incomeGroup;

const btnNext = createMockElement('btnNextStep', ['btn-next'], 'button');
const btnBack = createMockElement('btnBackStep', ['btn-back'], 'button');
const progressBar = createMockElement('onboardingProgressBar');
const stepNumEl = createMockElement('currentStepNum');
const stepTitleEl = createMockElement('currentStepTitle');

const step1El = createMockElement('step1', ['onboarding-step', 'active']);
step1El.setAttribute('data-step', '1');
const step2El = createMockElement('step2', ['onboarding-step']);
step2El.setAttribute('data-step', '2');
const step3El = createMockElement('step3', ['onboarding-step']);
step3El.setAttribute('data-step', '3');
const step4El = createMockElement('step4', ['onboarding-step']);
step4El.setAttribute('data-step', '4');
const step5El = createMockElement('step5', ['onboarding-step']);
step5El.setAttribute('data-step', '5');
const step6El = createMockElement('step6', ['onboarding-step']);
step6El.setAttribute('data-step', '6');

const allSteps = [step1El, step2El, step3El, step4El, step5El, step6El];

const elementsById = {
  obFullName: nameInput,
  obOccupation: occInput,
  obMonthlyIncome: incomeInput,
  btnNextStep: btnNext,
  btnBackStep: btnBack,
  onboardingProgressBar: progressBar,
  currentStepNum: stepNumEl,
  currentStepTitle: stepTitleEl,
  onboardingForm: createMockElement('onboardingForm'),
};

const documentMock = {
  addEventListener: (evt, fn) => { if (evt === 'DOMContentLoaded') fn(); },
  getElementById: (id) => elementsById[id] || null,
  querySelectorAll: (selector) => {
    if (selector === '.onboarding-step') return allSteps;
    if (selector === '#incomeTypeChipGrid .chip-btn') return [];
    if (selector === '#dependentsSelectorRow .dep-btn') return [];
    if (selector === '#goalsGrid .goal-card') return [];
    if (selector === '#routineCardsList .routine-card') return [];
    if (selector === '#goalsGrid .goal-card.selected') return [];
    return [];
  },
  querySelector: (selector) => {
    if (selector === '.onboarding-card') return createMockElement('card');
    return null;
  }
};

// Sandbox execution of onboarding.js
const vm = require('vm');
const sandbox = {
  document: documentMock,
  window: { location: { href: '' } },
  localStorage: localStorageMock,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }),
  showToast: (msg, type) => { console.log(`    [Toast:${type}] ${msg}`); }
};

vm.createContext(sandbox);

// Execute onboarding.js in sandbox
try {
  vm.runInContext(onboardingJs, sandbox);
  assert(true, 'onboarding.js executed and initialized without reference errors');
} catch (e) {
  assert(false, `onboarding.js evaluation threw error: ${e.message}`);
}

// Subtest A: Click Continue with EMPTY Step 1 fields
console.log('\n--- Subtest A: Click Continue with Empty Fields ---');
async function testEmptyValidation() {
  nameInput.value = '';
  occInput.value = '';

  let errorCaught = false;
  try {
    await btnNext.trigger('click');
  } catch (err) {
    errorCaught = true;
    console.error('Error during Continue click:', err);
  }

  assert(!errorCaught, 'Continue click does NOT throw ReferenceError or any error');
  assert(nameGroup.classList.contains('has-error'), 'Full name group flagged with .has-error');
  assert(nameErrorSpan.textContent === 'Please provide your full name', 'Full name shows error message');
  assert(occGroup.classList.contains('has-error'), 'Occupation group flagged with .has-error');
  assert(occErrorSpan.textContent === 'Please enter your occupation or profession', 'Occupation shows error message');
  assert(stepNumEl.textContent !== '2', 'Wizard did NOT advance to step 2 while invalid');
}

// Subtest B: Live clear on typing
console.log('\n--- Subtest B: Real-time Error Clearing on User Input ---');
async function testInputClearing() {
  nameInput.value = 'Test User';
  await nameInput.trigger('input');
  assert(!nameGroup.classList.contains('has-error'), 'Name .has-error cleared immediately upon user typing');

  occInput.value = 'Software Engineer';
  await occInput.trigger('input');
  assert(!occGroup.classList.contains('has-error'), 'Occupation .has-error cleared immediately upon user typing');
}

// Subtest C: Click Continue with VALID fields -> Advances to Step 2
console.log('\n--- Subtest C: Click Continue with Valid Data ---');
async function testValidAdvancement() {
  nameInput.value = 'Test User';
  occInput.value = 'Software Engineer';

  let advanceError = false;
  try {
    await btnNext.trigger('click');
  } catch (err) {
    advanceError = true;
    console.error('Error advancing to step 2:', err);
  }

  assert(!advanceError, 'Continue click with valid data does NOT throw errors');
  assert(String(stepNumEl.textContent) === '2', 'Wizard successfully advanced to Step 2');
  assert(stepTitleEl.textContent === 'Your Income', 'Step title updated to "Your Income"');
  assert(step2El.classList.contains('active'), 'Step 2 element is now .active');
  assert(!step1El.classList.contains('active'), 'Step 1 element is no longer .active');
}

(async () => {
  await testEmptyValidation();
  await testInputClearing();
  await testValidAdvancement();

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
})().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
