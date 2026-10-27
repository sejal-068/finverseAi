/**
 * FinverseAI - Production Authentication Controller
 * Handles Login, Signup, Password Reset with token validation, and Google OAuth 2.0 Integration.
 */

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();
  initLoginForm();
  initSignupForm();
  initForgotPasswordForm();
  initResetPasswordForm();
  initGoogleAuth();
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
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fa-solid fa-eye-slash';
      } else {
        input.type = 'password';
        if (icon) icon.className = 'fa-solid fa-eye';
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

  // Handle ?reset=success redirect banner
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('reset') === 'success') {
    const authCard = loginForm.closest('.auth-card');
    const authHeader = authCard ? authCard.querySelector('.auth-header') : null;
    if (authHeader) {
      const banner = document.createElement('div');
      banner.id = 'resetSuccessBanner';
      banner.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        padding: 0.85rem 1rem;
        border-radius: var(--radius-md, 8px);
        background: var(--success-light);
        border: 1px solid var(--success-border);
        color: var(--success-text);
        font-size: 0.875rem;
        text-align: left;
      `;
      banner.innerHTML = `
        <i class="fa-solid fa-circle-check" style="font-size: 1.2rem; color: var(--success); flex-shrink: 0;"></i>
        <div>
          <strong>Password updated successfully!</strong>
          <div style="font-size: 0.8rem; color: var(--success-text); margin-top: 0.15rem;">Please sign in with your new credentials below.</div>
        </div>
      `;
      authHeader.appendChild(banner);
    }
    showToast('Password reset successful! Please log in with your new password.', 'success');

    // Clean up query param from URL without page reload
    if (window.history && window.history.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  // Clear input errors on typing
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  if (emailInput) emailInput.addEventListener('input', () => clearInputError(emailInput));
  if (passwordInput) passwordInput.addEventListener('input', () => clearInputError(passwordInput));

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let isValid = true;
    const email = document.getElementById('loginEmail');
    const password = document.getElementById('loginPassword');

    // Email validation
    if (!email || !validateEmail(email.value.trim())) {
      showInputError(email, 'Please enter a valid email address');
      isValid = false;
    } else {
      clearInputError(email);
    }

    // Password validation
    if (!password || !password.value || password.value.length < 6) {
      showInputError(password, 'Password must be at least 6 characters');
      isValid = false;
    } else {
      clearInputError(password);
    }

    if (!isValid) return;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Sign In';
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Signing in...';
      submitBtn.disabled = true;
    }

    try {
      const data = await window.finverseAPI.login(email.value.trim(), password.value);

      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      const needsOnboarding = data.user && data.user.onboardingCompleted === false;

      showToast(
        needsOnboarding
          ? 'Login successful! Setting up your financial profile...'
          : 'Login successful! Redirecting to Dashboard...',
        'success'
      );

      setTimeout(() => {
        window.location.href = needsOnboarding ? 'onboarding.html' : 'dashboard.html';
      }, 700);

    } catch (error) {
      console.error('Login Error:', error);
      showToast(error.message || 'Unable to login. Please try again.', 'error');
      if (submitBtn) {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    }
  });
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
      clearInputError(passwordInput);
      checkPasswordStrength(passwordInput.value);
    });
  }

  const nameInput = document.getElementById('signupName');
  const emailInput = document.getElementById('signupEmail');
  const confirmPasswordInput = document.getElementById('signupConfirmPassword');
  if (nameInput) nameInput.addEventListener('input', () => clearInputError(nameInput));
  if (emailInput) emailInput.addEventListener('input', () => clearInputError(emailInput));
  if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', () => clearInputError(confirmPasswordInput));

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let isValid = true;
    const name = document.getElementById('signupName');
    const email = document.getElementById('signupEmail');
    const password = document.getElementById('signupPassword');
    const confirmPassword = document.getElementById('signupConfirmPassword');
    const income = document.getElementById('signupIncome');
    const selectedGoal = document.querySelector('input[name="financialGoal"]:checked');

    // Name validation
    if (!name || !name.value.trim()) {
      showInputError(name, 'Full name is required');
      isValid = false;
    } else {
      clearInputError(name);
    }

    // Email validation
    if (!email || !validateEmail(email.value.trim())) {
      showInputError(email, 'Please enter a valid email address');
      isValid = false;
    } else {
      clearInputError(email);
    }

    // Password validation
    if (!password || !password.value || password.value.length < 8) {
      showInputError(password, 'Password must be at least 8 characters');
      isValid = false;
    } else {
      clearInputError(password);
    }

    // Confirm password
    if (!confirmPassword || password.value !== confirmPassword.value) {
      showInputError(confirmPassword, 'Passwords do not match');
      isValid = false;
    } else {
      clearInputError(confirmPassword);
    }

    if (!isValid) return;

    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Create Account';
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating Account...';
      submitBtn.disabled = true;
    }

    try {
      const data = await window.finverseAPI.signup({
        name: name.value.trim(),
        email: email.value.trim(),
        password: password.value,
        monthlyIncome: Number(income ? income.value : 0) || 50000,
        financialGoal: selectedGoal ? selectedGoal.value : 'Save Money',
      });

      if (!data.success) {
        throw new Error(data.message || 'Account creation failed');
      }

      showToast("Account created successfully! Let's personalize your financial world.", 'success');

      setTimeout(() => {
        window.location.href = 'onboarding.html';
      }, 800);

    } catch (error) {
      console.error('Signup Error:', error);
      showToast(error.message || 'Unable to create account. Please try again.', 'error');
      if (submitBtn) {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    }
  });
}

/* ==========================================================================
   Forgot Password Form (Real API Integration)
   ========================================================================== */
function initForgotPasswordForm() {
  const forgotForm = document.getElementById('forgotPasswordForm');
  if (!forgotForm) return;

  const emailInput = document.getElementById('forgotEmail');
  if (emailInput) emailInput.addEventListener('input', () => clearInputError(emailInput));

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail');

    if (!email || !validateEmail(email.value.trim())) {
      showInputError(email, 'Please enter a valid email address');
      return;
    }

    clearInputError(email);
    const submitBtn = forgotForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Send Link';
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending link...';
      submitBtn.disabled = true;
    }

    try {
      const data = await window.finverseAPI.forgotPassword(email.value.trim());

      showToast(data.message || 'Password reset link sent!', 'success');

      const container = document.querySelector('.auth-card');
      if (container) {
        container.innerHTML = `
          <div class="auth-header">
            <div class="brand-icon" style="margin: 0 auto 1.5rem; width: 56px; height: 56px; font-size: 1.65rem; background: rgba(16, 185, 129, 0.15); color: var(--primary);">
              <i class="fa-solid fa-envelope-circle-check"></i>
            </div>
            <h1>Check Your Email</h1>
            <p>We have sent password reset instructions to <strong>${escapeHtml(email.value.trim())}</strong>.</p>
            <p class="text-muted" style="font-size: 0.85rem; margin-top: 0.75rem; line-height: 1.5;">
              <i class="fa-solid fa-circle-info" style="color: var(--primary);"></i> If you don't see the email within a minute, please check your <strong>Spam / Junk</strong> folder.
            </p>
          </div>
          <div style="margin-top: 1.5rem;">
            <a href="login.html" class="btn btn-primary" style="width: 100%;">Return to Login</a>
          </div>
        `;
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      showToast(error.message || 'Unable to send reset email. Please try again.', 'error');
      if (submitBtn) {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    }
  });
}

/* ==========================================================================
   Reset Password Form (Token Validation & New Password Submission)
   ========================================================================== */
async function initResetPasswordForm() {
  const resetForm = document.getElementById('resetPasswordForm');
  if (!resetForm) return;

  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  const hiddenTokenInput = document.getElementById('resetTokenValue');

  const spinnerEl = document.getElementById('tokenCheckingSpinner');
  const invalidEl = document.getElementById('tokenInvalidState');
  const invalidTitle = document.getElementById('tokenInvalidTitle');
  const invalidMsg = document.getElementById('tokenInvalidMsg');
  const formContainer = document.getElementById('resetFormContainer');
  const passwordInput = document.getElementById('resetPassword');
  const confirmPasswordInput = document.getElementById('resetConfirmPassword');
  const submitBtn = document.getElementById('btnSubmitReset');

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      clearInputError(passwordInput);
      checkPasswordStrength(passwordInput.value);
    });
  }
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
      clearInputError(confirmPasswordInput);
    });
  }

  const token = (tokenFromUrl || (hiddenTokenInput ? hiddenTokenInput.value : '') || '').trim();

  // 1. Missing Token Check
  if (!token) {
    if (spinnerEl) spinnerEl.style.display = 'none';
    if (invalidTitle) invalidTitle.textContent = 'Missing Reset Token';
    if (invalidMsg) invalidMsg.textContent = 'No password reset token was provided in the URL link. Please request a new link.';
    if (invalidEl) invalidEl.style.display = 'block';
    if (formContainer) formContainer.style.display = 'none';
    return;
  }

  if (hiddenTokenInput) {
    hiddenTokenInput.value = token;
  }

  // 2. Validate Token with Backend
  try {
    const data = await window.finverseAPI.validateResetToken(token);
    if (!data.success) {
      throw new Error(data.message || 'Token is invalid');
    }

    // Token is valid! Show form, hide spinner & error screen
    if (spinnerEl) spinnerEl.style.display = 'none';
    if (invalidEl) invalidEl.style.display = 'none';
    if (formContainer) formContainer.style.display = 'block';

  } catch (err) {
    console.error('Token validation error:', err);
    if (spinnerEl) spinnerEl.style.display = 'none';
    if (formContainer) formContainer.style.display = 'none';
    if (invalidTitle) invalidTitle.textContent = 'Link Expired or Invalid';
    if (invalidMsg) invalidMsg.textContent = err.message || 'This password reset link is invalid, already used, or has expired after 15 minutes.';
    if (invalidEl) invalidEl.style.display = 'block';
    return;
  }

  // 3. Form Submission Handler
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let isValid = true;
    const newPassword = passwordInput ? passwordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

    if (!newPassword || newPassword.length < 6) {
      showInputError(passwordInput, 'Password must be at least 6 characters');
      isValid = false;
    } else {
      clearInputError(passwordInput);
    }

    if (!confirmPassword) {
      showInputError(confirmPasswordInput, 'Please confirm your new password');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      showInputError(confirmPasswordInput, 'Passwords do not match');
      isValid = false;
    } else {
      clearInputError(confirmPasswordInput);
    }

    if (!isValid) return;

    const originalBtnContent = submitBtn ? submitBtn.innerHTML : '<i class="fa-solid fa-shield-check"></i> Set New Password';
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Updating password...';
      submitBtn.disabled = true;
    }

    try {
      const activeToken = (hiddenTokenInput && hiddenTokenInput.value) ? hiddenTokenInput.value : token;
      const data = await window.finverseAPI.resetPassword(activeToken, newPassword);

      showToast('Password reset successfully! Redirecting to login...', 'success');

      // Clear cached credentials so fresh authentication with new password is required
      localStorage.removeItem('finverse_token');
      localStorage.removeItem('finverse_user');

      const card = document.getElementById('resetPasswordCard');
      if (card) {
        card.innerHTML = `
          <div class="auth-header" style="text-align: center;">
            <div class="brand-icon" style="margin: 0 auto 1.5rem; width: 56px; height: 56px; font-size: 1.75rem; background: rgba(16, 185, 129, 0.15); color: var(--primary);">
              <i class="fa-solid fa-circle-check"></i>
            </div>
            <h1>Password Updated!</h1>
            <p>Your password has been changed successfully. You can now sign in with your new credentials.</p>
          </div>
          <div style="margin-top: 1.5rem;">
            <a href="login.html?reset=success" class="btn btn-primary" style="width: 100%;">Sign In Now</a>
          </div>
        `;
      }

      setTimeout(() => {
        window.location.href = 'login.html?reset=success';
      }, 1400);

    } catch (err) {
      console.error('Password reset error:', err);
      showToast(err.message || 'Failed to update password', 'error');
      if (submitBtn) {
        submitBtn.innerHTML = originalBtnContent;
        submitBtn.disabled = false;
      }
    }
  });
}

/* ==========================================================================
   Google OAuth 2.0 Official Authentication Flow
   ========================================================================== */
let googleTokenClientInstance = null;
let configuredGoogleClientId = '';

/**
 * Wait for Google Identity Services script to finish loading if needed
 */
function waitForGoogleGIS(timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (window.google && window.google.accounts) {
      return resolve(true);
    }
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (window.google && window.google.accounts) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 100);
  });
}

async function initGoogleAuth() {
  // 1. Check for incoming OAuth redirect tokens in URL hash (standard OAuth redirect)
  if (window.location.hash && window.location.hash.includes('access_token')) {
    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        // Clean URL hash without reloading page
        history.replaceState(null, '', window.location.pathname + window.location.search);
        setGoogleButtonsLoading();
        await handleGoogleAuthSuccess({ accessToken });
        return;
      }
    } catch (e) {
      console.error('Error parsing OAuth hash token:', e);
    }
  }

  // Check for incoming auth code in query parameters
  if (window.location.search && window.location.search.includes('code=')) {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      if (code) {
        history.replaceState(null, '', window.location.pathname);
        setGoogleButtonsLoading();
        await handleGoogleAuthSuccess({ code, redirectUri: window.location.origin + window.location.pathname });
        return;
      }
    } catch (e) {
      console.error('Error parsing OAuth code:', e);
    }
  }

  const googleButtons = [
    document.getElementById('googleLoginBtn'),
    document.getElementById('googleSignupBtn')
  ].filter(Boolean);

  if (!googleButtons.length) return;

  // Bind click listener to all Google buttons immediately
  googleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleGoogleButtonClick(btn);
    });
  });

  // Fetch configured Client ID from backend
  try {
    const config = await window.finverseAPI.getGoogleConfig();
    configuredGoogleClientId = (config?.clientId || '').trim();

    if (configuredGoogleClientId) {
      // Ensure Google Identity Services library is loaded
      const gisLoaded = await waitForGoogleGIS();
      if (gisLoaded && window.google?.accounts?.oauth2) {
        // Initialize Google OAuth 2.0 Token Client (Popup flow for custom styled buttons)
        googleTokenClientInstance = window.google.accounts.oauth2.initTokenClient({
          client_id: configuredGoogleClientId,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              console.error('Google OAuth token error:', tokenResponse);
              resetGoogleButtons();
              if (tokenResponse.error !== 'popup_closed_by_user') {
                showToast('Google Sign-In was cancelled or encountered an error.', 'warning');
              }
              return;
            }

            if (tokenResponse.access_token) {
              await handleGoogleAuthSuccess({ accessToken: tokenResponse.access_token });
            } else {
              resetGoogleButtons();
            }
          },
          error_callback: (err) => {
            console.error('Google OAuth error:', err);
            resetGoogleButtons();
            if (err?.type !== 'popup_closed') {
              showToast('Google Sign-In was cancelled or closed.', 'info');
            }
          }
        });

        // Also initialize Google ID Token One Tap if available
        if (window.google.accounts.id) {
          window.google.accounts.id.initialize({
            client_id: configuredGoogleClientId,
            callback: async (res) => {
              if (res.credential) {
                await handleGoogleAuthSuccess({ credential: res.credential });
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Google auth configuration could not be loaded:', err.message);
  }
}

function setGoogleButtonsLoading() {
  const googleButtons = [
    document.getElementById('googleLoginBtn'),
    document.getElementById('googleSignupBtn')
  ].filter(Boolean);

  googleButtons.forEach(btn => {
    if (!btn.getAttribute('data-original-html')) {
      btn.setAttribute('data-original-html', btn.innerHTML);
    }
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-danger"></i> <span>Connecting to Google...</span>';
    btn.disabled = true;
  });
}

function resetGoogleButtons() {
  const googleButtons = [
    document.getElementById('googleLoginBtn'),
    document.getElementById('googleSignupBtn')
  ].filter(Boolean);

  googleButtons.forEach(btn => {
    const orig = btn.getAttribute('data-original-html');
    if (orig) btn.innerHTML = orig;
    else {
      btn.innerHTML = '<i class="fa-brands fa-google text-danger"></i> <span>Continue with Google</span>';
    }
    btn.disabled = false;
  });
}

async function handleGoogleButtonClick(buttonEl) {
  // If not yet fetched, try fetching client ID dynamically
  if (!configuredGoogleClientId) {
    try {
      const config = await window.finverseAPI.getGoogleConfig();
      configuredGoogleClientId = (config?.clientId || '').trim();
    } catch (e) {
      console.warn('Failed to fetch Google client ID:', e.message);
    }
  }

  // If Client ID is not configured in .env:
  if (!configuredGoogleClientId) {
    resetGoogleButtons();
    showToast('Google Sign-In is not configured yet. Please set GOOGLE_CLIENT_ID in your backend .env file, or log in with your email and password.', 'warning');
    return;
  }

  setGoogleButtonsLoading();

  // Ensure GIS token client instance is initialized
  if (!googleTokenClientInstance) {
    const gisLoaded = await waitForGoogleGIS(2000);
    if (gisLoaded && window.google?.accounts?.oauth2) {
      googleTokenClientInstance = window.google.accounts.oauth2.initTokenClient({
        client_id: configuredGoogleClientId,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Google OAuth token error:', tokenResponse);
            resetGoogleButtons();
            if (tokenResponse.error !== 'popup_closed_by_user') {
              showToast('Google Sign-In was cancelled or encountered an error.', 'warning');
            }
            return;
          }

          if (tokenResponse.access_token) {
            await handleGoogleAuthSuccess({ accessToken: tokenResponse.access_token });
          } else {
            resetGoogleButtons();
          }
        },
        error_callback: (err) => {
          console.error('Google OAuth error:', err);
          resetGoogleButtons();
          if (err?.type !== 'popup_closed') {
            showToast('Google Sign-In was cancelled or closed.', 'info');
          }
        }
      });
    }
  }

  // 1. Try launching Google's official popup via Google Identity Services
  if (googleTokenClientInstance) {
    try {
      googleTokenClientInstance.requestAccessToken({ prompt: 'select_account' });
      return;
    } catch (err) {
      console.warn('GIS popup trigger failed, falling back to full-page OAuth redirect:', err);
    }
  }

  // 2. Full-page redirect fallback directly to Google's official OAuth 2.0 endpoint
  // Works across all browsers, mobile devices, and popup-blocker environments
  const redirectUri = window.location.origin + window.location.pathname;
  const googleOAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${encodeURIComponent(configuredGoogleClientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&prompt=select_account`;

  window.location.href = googleOAuthUrl;
}

async function handleGoogleAuthSuccess(authPayload) {
  setGoogleButtonsLoading();
  try {
    const data = await window.finverseAPI.googleAuth(authPayload);

    if (!data.success || !data.token) {
      throw new Error(data.message || 'Google authentication failed');
    }

    const needsOnboarding = data.user && data.user.onboardingCompleted === false;

    showToast(
      data.message || (needsOnboarding
        ? 'Google authentication successful! Setting up your profile...'
        : 'Welcome back! Signed in with Google.'),
      'success'
    );

    setTimeout(() => {
      window.location.href = needsOnboarding ? 'onboarding.html' : 'dashboard.html';
    }, 750);

  } catch (err) {
    console.error('Google Auth backend exchange failed:', err);
    resetGoogleButtons();
    showToast(err.message || 'Google authentication failed. Please try again.', 'error');
  }
}

/* ==========================================================================
   Helper Functions
   ========================================================================== */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function showInputError(inputEl, message) {
  if (!inputEl) return;
  const formGroup = inputEl.closest('.form-group');
  if (!formGroup) return;
  formGroup.classList.add('has-error');
  let errorEl = formGroup.querySelector('.form-error');
  if (errorEl) {
    errorEl.textContent = message;
  }
}

function clearInputError(inputEl) {
  if (!inputEl) return;
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
