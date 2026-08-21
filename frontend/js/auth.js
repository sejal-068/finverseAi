/**
 * FinverseAI - Authentication & Onboarding Scripts
 * Handles Client-side Form Validation, Password Strength, and Auth Mocking.
 */

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();
  initLoginForm();
  initSignupForm();
  initForgotPasswordForm();
});

/* ==========================================================================
   Password Visibility Toggle
   ========================================================================== */
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');

      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
      }
    });
  });
}

/* ==========================================================================
   Login Form Validation & Handling
   ========================================================================== */
function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;

    const email = document.getElementById('loginEmail');
    const password = document.getElementById('loginPassword');

    // Email validation
    if (!validateEmail(email.value.trim())) {
      showInputError(email, 'Please enter a valid email address');
      isValid = false;
    } else {
      clearInputError(email);
    }

    // Password validation
    if (!password.value || password.value.length < 6) {
      showInputError(password, 'Password must be at least 6 characters');
      isValid = false;
    } else {
      clearInputError(password);
    }

    if (isValid) {
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Signing in...';
      submitBtn.disabled = true;

      setTimeout(() => {
        showToast('Login successful! Redirecting to Dashboard...', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
      }, 700);
    }
  });

  // Google Login Demo
  const googleBtn = document.getElementById('googleLoginBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      showToast('Connecting with Google...', 'info');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    });
  }
}

/* ==========================================================================
   Signup Form Validation & Password Strength
   ========================================================================== */
function initSignupForm() {
  const signupForm = document.getElementById('signupForm');
  if (!signupForm) return;

  const passwordInput = document.getElementById('signupPassword');
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      checkPasswordStrength(passwordInput.value);
    });
  }

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let isValid = true;

    const name = document.getElementById('signupName');
    const email = document.getElementById('signupEmail');
    const password = document.getElementById('signupPassword');
    const confirmPassword = document.getElementById('signupConfirmPassword');
    const income = document.getElementById('signupIncome');
    const selectedGoal = document.querySelector('input[name="financialGoal"]:checked');

    if (!name.value.trim()) {
      showInputError(name, 'Full name is required');
      isValid = false;
    } else {
      clearInputError(name);
    }

    if (!validateEmail(email.value.trim())) {
      showInputError(email, 'Please enter a valid email address');
      isValid = false;
    } else {
      clearInputError(email);
    }

    if (!password.value || password.value.length < 8) {
      showInputError(password, 'Password must be at least 8 characters');
      isValid = false;
    } else {
      clearInputError(password);
    }

    if (password.value !== confirmPassword.value) {
      showInputError(confirmPassword, 'Passwords do not match');
      isValid = false;
    } else {
      clearInputError(confirmPassword);
    }

    if (isValid) {
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating Account...';
      submitBtn.disabled = true;

      // Update User in Local API
      if (window.finverseAPI) {
        await window.finverseAPI.updateUserProfile({
          name: name.value.trim(),
          email: email.value.trim(),
          monthlyIncome: Number(income.value) || 50000,
          primaryGoal: selectedGoal ? selectedGoal.value : 'Save Money'
        });
      }

      setTimeout(() => {
        showToast('Account created successfully! Welcome to FinverseAI.', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      }, 800);
    }
  });
}

/* ==========================================================================
   Forgot Password Form
   ========================================================================== */
function initForgotPasswordForm() {
  const forgotForm = document.getElementById('forgotPasswordForm');
  if (!forgotForm) return;

  forgotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail');

    if (!validateEmail(email.value.trim())) {
      showInputError(email, 'Please enter a valid registered email');
      return;
    }

    clearInputError(email);
    const submitBtn = forgotForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending link...';
    submitBtn.disabled = true;

    setTimeout(() => {
      showToast(`Password reset link sent to ${email.value.trim()}`, 'success');
      const container = document.querySelector('.auth-card');
      if (container) {
        container.innerHTML = `
          <div class="auth-header">
            <div class="brand-icon" style="margin: 0 auto 1.5rem; width: 50px; height: 50px; font-size: 1.5rem;">
              <i class="fa-solid fa-envelope-circle-check"></i>
            </div>
            <h1>Check Your Email</h1>
            <p>We've sent a password reset link to <strong>${email.value.trim()}</strong>. Click the link in the email to reset your password.</p>
          </div>
          <a href="login.html" class="btn btn-primary" style="width: 100%;">Return to Login</a>
        `;
      }
    }, 1000);
  });
}

/* ==========================================================================
   Helper Functions
   ========================================================================== */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function showInputError(inputEl, message) {
  const formGroup = inputEl.closest('.form-group');
  if (!formGroup) return;
  formGroup.classList.add('has-error');
  let errorEl = formGroup.querySelector('.form-error');
  if (errorEl) {
    errorEl.textContent = message;
  }
}

function clearInputError(inputEl) {
  const formGroup = inputEl.closest('.form-group');
  if (!formGroup) return;
  formGroup.classList.remove('has-error');
}

function checkPasswordStrength(password) {
  const barSegments = document.querySelectorAll('.strength-bar-segment');
  const strengthText = document.getElementById('strengthText');
  if (!barSegments.length || !strengthText) return;

  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  barSegments.forEach(seg => seg.style.backgroundColor = 'var(--border-color)');

  if (strength <= 1 && password.length > 0) {
    barSegments[0].style.backgroundColor = 'var(--danger)';
    strengthText.textContent = 'Weak';
    strengthText.style.color = 'var(--danger)';
  } else if (strength === 2 || strength === 3) {
    barSegments[0].style.backgroundColor = 'var(--warning)';
    barSegments[1].style.backgroundColor = 'var(--warning)';
    strengthText.textContent = 'Medium';
    strengthText.style.color = 'var(--warning)';
  } else if (strength >= 4) {
    barSegments.forEach(seg => seg.style.backgroundColor = 'var(--success)');
    strengthText.textContent = 'Strong';
    strengthText.style.color = 'var(--success)';
  } else {
    strengthText.textContent = 'Password strength';
    strengthText.style.color = 'var(--text-muted)';
  }
}
