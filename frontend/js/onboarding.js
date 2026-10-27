/**
 * FinverseAI - Personal Financial Profile Onboarding Controller
 * Multi-step interactive flow to capture user context and configure personalization.
 */

document.addEventListener('DOMContentLoaded', () => {
  initOnboardingWizard();
});

function initOnboardingWizard() {
  const token = localStorage.getItem('finverse_token');
  if (!token) {
    // If user somehow accesses onboarding without logging in, redirect to login
    window.location.href = 'login.html';
    return;
  }

  let storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem('finverse_user'));
  } catch (e) {
    storedUser = null;
  }

  // Pre-fill fields if available
  if (storedUser) {
    const nameInput = document.getElementById('obFullName');
    const incomeInput = document.getElementById('obMonthlyIncome');
    if (nameInput && storedUser.name) nameInput.value = storedUser.name;
    if (incomeInput && storedUser.monthlyIncome) incomeInput.value = storedUser.monthlyIncome;
  }

  let currentStep = 1;
  const totalSteps = 6;

  const stepTitles = [
    'About You',
    'Your Income',
    'Your Responsibilities',
    'Your Financial Goals',
    'Your Money Habits',
    'Review Snapshot',
  ];

  const form = document.getElementById('onboardingForm');
  const btnNext = document.getElementById('btnNextStep');
  const btnBack = document.getElementById('btnBackStep');
  const progressBar = document.getElementById('onboardingProgressBar');
  const stepNumEl = document.getElementById('currentStepNum');
  const stepTitleEl = document.getElementById('currentStepTitle');

  // Interactive Chip Selectors
  initChipSelectors();

  // Clear validation errors on user input
  ['obFullName', 'obOccupation', 'obMonthlyIncome'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => clearInputError(input));
    }
  });

  // Navigation Click Handlers
  if (btnNext) {
    btnNext.addEventListener('click', async () => {
      if (!validateCurrentStep(currentStep)) return;

      if (currentStep < totalSteps) {
        currentStep++;
        updateWizardUI();
      } else {
        // Step 6: Submit Profile
        await submitFinancialProfile();
      }
    });
  }

  if (btnBack) {
    btnBack.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        updateWizardUI();
      }
    });
  }

  function updateWizardUI() {
    // Hide all steps, show active step
    document.querySelectorAll('.onboarding-step').forEach(stepEl => {
      const stepIndex = Number(stepEl.getAttribute('data-step'));
      if (stepIndex === currentStep) {
        stepEl.classList.add('active');
      } else {
        stepEl.classList.remove('active');
      }
    });

    // Update Progress Bar & Text
    if (stepNumEl) stepNumEl.textContent = currentStep;
    if (stepTitleEl) stepTitleEl.textContent = stepTitles[currentStep - 1];
    if (progressBar) {
      const pct = Math.round((currentStep / totalSteps) * 100);
      progressBar.style.width = `${pct}%`;
    }

    // Toggle Back button visibility
    if (btnBack) {
      btnBack.style.display = currentStep > 1 ? 'inline-flex' : 'none';
    }

    // Update Next button label
    if (btnNext) {
      if (currentStep === totalSteps) {
        populateSnapshotPreview();
        btnNext.innerHTML = `<span>Build My Financial Dashboard</span> <i class="fa-solid fa-wand-magic-sparkles"></i>`;
      } else {
        btnNext.innerHTML = `<span>Continue</span> <i class="fa-solid fa-arrow-right"></i>`;
      }
    }

    // Scroll to top of card smoothly
    const card = document.querySelector('.onboarding-card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function validateCurrentStep(step) {
    let valid = true;

    if (step === 1) {
      const name = document.getElementById('obFullName');
      const occ = document.getElementById('obOccupation');

      if (!name || !name.value.trim()) {
        showInputError(name, 'Please provide your full name');
        valid = false;
      } else {
        clearInputError(name);
      }

      if (!occ || !occ.value.trim()) {
        showInputError(occ, 'Please enter your occupation or profession');
        valid = false;
      } else {
        clearInputError(occ);
      }
    } else if (step === 2) {
      const income = document.getElementById('obMonthlyIncome');
      const incomeVal = Number(income?.value);

      if (!income || isNaN(incomeVal) || incomeVal <= 0) {
        showInputError(income, 'Please enter a valid monthly income greater than 0');
        valid = false;
      } else {
        clearInputError(income);
      }
    } else if (step === 4) {
      const selectedGoals = document.querySelectorAll('#goalsGrid .goal-card.selected');
      if (selectedGoals.length === 0) {
        showToast('Please select at least one goal to help us personalize your insights', 'warning');
        valid = false;
      }
    }

    return valid;
  }

  function initChipSelectors() {
    // 1. Income Type Chips
    const incomeChips = document.querySelectorAll('#incomeTypeChipGrid .chip-btn');
    const incomeHidden = document.getElementById('obIncomeType');
    incomeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        incomeChips.forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        if (incomeHidden) incomeHidden.value = chip.getAttribute('data-value');
      });
    });

    // 2. Dependents Buttons
    const depBtns = document.querySelectorAll('#dependentsSelectorRow .dep-btn');
    const depHidden = document.getElementById('obDependents');
    depBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        depBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (depHidden) depHidden.value = btn.getAttribute('data-value');
      });
    });

    // 3. Goal Cards (Multi-Select)
    const goalCards = document.querySelectorAll('#goalsGrid .goal-card');
    goalCards.forEach(card => {
      card.addEventListener('click', () => {
        card.classList.toggle('selected');
      });
    });

    // 4. Money Routine Cards (Single Select)
    const routineCards = document.querySelectorAll('#routineCardsList .routine-card');
    const routineHidden = document.getElementById('obMoneyRoutine');
    routineCards.forEach(card => {
      card.addEventListener('click', () => {
        routineCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (routineHidden) routineHidden.value = card.getAttribute('data-value');
      });
    });
  }

  function populateSnapshotPreview() {
    let fallbackName = 'User';
    try {
      const u = JSON.parse(localStorage.getItem('finverse_user'));
      if (u && u.name) fallbackName = u.name;
    } catch (e) {}
    const name = document.getElementById('obFullName')?.value.trim() || fallbackName;
    const occ = document.getElementById('obOccupation')?.value.trim() || 'Professional';
    const city = document.getElementById('obCity')?.value.trim() || '';
    const income = Number(document.getElementById('obMonthlyIncome')?.value) || 0;
    const incomeType = document.getElementById('obIncomeType')?.value || 'Salaried';
    const dependents = document.getElementById('obDependents')?.value || '0';
    const depContext = document.getElementById('obDependentsContext')?.value.trim() || '';
    const routine = document.getElementById('obMoneyRoutine')?.value || 'I usually plan my spending';

    // Selected goals
    const selectedGoalEls = document.querySelectorAll('#goalsGrid .goal-card.selected');
    const selectedGoals = Array.from(selectedGoalEls).map(el => el.getAttribute('data-goal'));

    const snapName = document.getElementById('snapName');
    const snapOccCity = document.getElementById('snapOccupationCity');
    const snapIncome = document.getElementById('snapIncome');
    const snapIncomeType = document.getElementById('snapIncomeType');
    const snapDeps = document.getElementById('snapDependents');
    const snapDepCtx = document.getElementById('snapDepContext');
    const snapGoalsList = document.getElementById('snapGoalsList');
    const snapRoutine = document.getElementById('snapRoutine');

    if (snapName) snapName.textContent = name;
    if (snapOccCity) snapOccCity.textContent = city ? `${occ} • ${city}` : occ;
    if (snapIncome) snapIncome.textContent = '₹' + income.toLocaleString('en-IN');
    if (snapIncomeType) snapIncomeType.textContent = incomeType;

    if (snapDeps) {
      snapDeps.textContent = dependents === '0' ? '0 (Just me)' : `${dependents} Dependent${dependents === '1' ? '' : 's'}`;
    }
    if (snapDepCtx) {
      snapDepCtx.textContent = depContext ? depContext : (dependents === '0' ? 'Self-reliant buffer' : 'Family reliance');
    }

    if (snapGoalsList) {
      if (selectedGoals.length > 0) {
        snapGoalsList.innerHTML = selectedGoals.map(g => `
          <span class="goal-tag"><i class="fa-solid fa-check"></i> ${escapeHtml(g)}</span>
        `).join('');
      } else {
        snapGoalsList.innerHTML = `<span class="goal-tag"><i class="fa-solid fa-check"></i> Build consistent savings</span>`;
      }
    }

    if (snapRoutine) snapRoutine.textContent = routine;
  }

  async function submitFinancialProfile() {
    const fullName = document.getElementById('obFullName')?.value.trim();
    const age = document.getElementById('obAge')?.value;
    const gender = document.getElementById('obGender')?.value;
    const occupation = document.getElementById('obOccupation')?.value.trim();
    const city = document.getElementById('obCity')?.value.trim();
    const monthlyIncome = Number(document.getElementById('obMonthlyIncome')?.value) || 0;
    const incomeType = document.getElementById('obIncomeType')?.value || 'Salaried';
    const dependents = Number(document.getElementById('obDependents')?.value) || 0;
    const dependentsContext = document.getElementById('obDependentsContext')?.value.trim() || '';
    const recurringResponsibilities = document.getElementById('obRecurringResponsibilities')?.value.trim() || '';
    const moneyRoutine = document.getElementById('obMoneyRoutine')?.value || 'I usually plan my spending';

    const selectedGoalEls = document.querySelectorAll('#goalsGrid .goal-card.selected');
    const financialGoals = Array.from(selectedGoalEls).map(el => el.getAttribute('data-goal'));

    const payload = {
      name: fullName,
      age: age ? Number(age) : undefined,
      gender: gender || undefined,
      occupation,
      city: city || undefined,
      monthlyIncome,
      incomeType,
      dependents,
      dependentsContext: dependentsContext || recurringResponsibilities || undefined,
      financialGoals: financialGoals.length > 0 ? financialGoals : ['Build emergency savings'],
      moneyRoutine,
      onboardingCompleted: true,
    };

    if (btnNext) {
      btnNext.disabled = true;
      btnNext.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Setting up your dashboard...`;
    }

    try {
      const updatedUser = await window.finverseAPI.updateUserProfile(payload);

      showToast('Profile created successfully! Loading your personal dashboard...', 'success');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 900);

    } catch (err) {
      console.error('Error saving onboarding profile:', err);
      showToast(err.message || 'Could not save profile. Please try again.', 'error');
      if (btnNext) {
        btnNext.disabled = false;
        btnNext.innerHTML = `<span>Build My Financial Dashboard</span> <i class="fa-solid fa-wand-magic-sparkles"></i>`;
      }
    }
  }
}

/* ==========================================================================
   Form Input Error & Sanitization Helpers
   ========================================================================== */
function showInputError(inputEl, message) {
  if (!inputEl) return;
  const formGroup = inputEl.closest('.form-group');
  if (!formGroup) return;
  formGroup.classList.add('has-error');
  let errorEl = formGroup.querySelector('.form-error');
  if (errorEl && message) {
    errorEl.textContent = message;
  }
}

function clearInputError(inputEl) {
  if (!inputEl) return;
  const formGroup = inputEl.closest('.form-group');
  if (!formGroup) return;
  formGroup.classList.remove('has-error');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
