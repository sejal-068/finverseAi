/**
 * FinverseAI - Settings Page Controller
 * Handles Appearance (Dark/Light mode), Currency, Notification Alerts, Security, and Demo Reset.
 */

document.addEventListener('DOMContentLoaded', () => {
  initSettingsValues();
  initSettingsListeners();
});

function initSettingsValues() {
  const currentTheme = localStorage.getItem('finverse_theme') || 'light';
  const themeRadios = document.querySelectorAll('input[name="appearanceTheme"]');
  themeRadios.forEach(radio => {
    if (radio.value === currentTheme) {
      radio.checked = true;
    }
  });
}

function initSettingsListeners() {
  // Appearance Switcher
  const themeRadios = document.querySelectorAll('input[name="appearanceTheme"]');
  themeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const selectedTheme = e.target.value;
      document.documentElement.setAttribute('data-theme', selectedTheme);
      localStorage.setItem('finverse_theme', selectedTheme);
      showToast(`Theme updated to ${selectedTheme} mode`, 'success');
    });
  });

  // Password Update Form
  const passwordForm = document.getElementById('securityPasswordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentPass = document.getElementById('currentPassword').value;
      const newPass = document.getElementById('newPassword').value;
      const confirmPass = document.getElementById('confirmNewPassword').value;

      if (!currentPass) {
        showToast('Please enter your current password', 'warning');
        return;
      }
      if (newPass.length < 8) {
        showToast('New password must be at least 8 characters', 'warning');
        return;
      }
      if (newPass !== confirmPass) {
        showToast('New passwords do not match', 'error');
        return;
      }

      showToast('Password updated successfully', 'success');
      passwordForm.reset();
    });
  }

  // Preferences Form
  const prefsForm = document.getElementById('preferencesForm');
  if (prefsForm) {
    prefsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Preferences saved successfully', 'success');
    });
  }

  // Reset Demo Data Button
  const resetBtn = document.getElementById('resetDemoDataBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset all transactions and budgets back to default demo data?')) {
        await window.finverseAPI.resetAllDemoData();
        showToast('Demo data reset to factory defaults! Reloading...', 'info');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    });
  }

  // Logout Button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showToast('Logging out...', 'info');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 700);
    });
  }
}
