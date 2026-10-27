/**
 * FinverseAI - Settings Page Controller
 * Handles Theme, Password Change, Preferences (saved to backend), Export Data, Delete Account.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadSettingsFromServer();
  initSettingsListeners();
});

/**
 * Load saved settings from the backend and populate UI
 */
async function loadSettingsFromServer() {
  // Theme (always from localStorage for instant apply)
  const currentTheme = localStorage.getItem('finverse_theme') || 'light';
  const themeRadios = document.querySelectorAll('input[name="appearanceTheme"]');
  themeRadios.forEach(radio => {
    radio.checked = (radio.value === currentTheme);
  });

  // Load notification preferences from backend
  try {
    const json = await window.finverseAPI.getSettings();

    if (json.success && json.data) {
      const s = json.data;
      const budgetAlerts = document.getElementById('settingBudgetAlerts');
      const weeklyReport = document.getElementById('settingWeeklyReport');
      const emailNotifs = document.getElementById('settingEmailNotifications');

      if (budgetAlerts) budgetAlerts.checked = s.budgetAlerts !== false;
      if (weeklyReport) weeklyReport.checked = s.weeklyReport === true;
      if (emailNotifs) emailNotifs.checked = s.emailNotifications !== false;
    }
  } catch (err) {
    console.warn('Could not load settings from server:', err.message);
  }

  // Load budget alert engine settings (localStorage-backed)
  if (window.BudgetAlertEngine) {
    const alertSettings = window.BudgetAlertEngine.getSettings();
    const soundAlertsEl = document.getElementById('settingSoundAlerts');
    const aiPredictionEl = document.getElementById('settingAIPrediction');
    if (soundAlertsEl) soundAlertsEl.checked = alertSettings.soundAlerts !== false;
    if (aiPredictionEl) aiPredictionEl.checked = alertSettings.aiPrediction !== false;
  }
}

function initSettingsListeners() {
  // ─── Theme Switcher ─────────────────────────────────────
  const themeRadios = document.querySelectorAll('input[name="appearanceTheme"]');
  themeRadios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const selectedTheme = e.target.value;
      document.documentElement.setAttribute('data-theme', selectedTheme);
      localStorage.setItem('finverse_theme', selectedTheme);
      showToast(`Theme updated to ${selectedTheme} mode`, 'success');

      // Also save to backend
      try {
        await window.finverseAPI._fetchAPI('/user/settings', {
          method: 'PUT',
          body: JSON.stringify({ theme: selectedTheme }),
        });
      } catch (err) {
        // Theme saved locally even if backend fails
      }
    });
  });

  // ─── Password Change Form ─────────────────────────────────
  const passwordForm = document.getElementById('securityPasswordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPass = document.getElementById('currentPassword').value;
      const newPass = document.getElementById('newPassword').value;
      const confirmPass = document.getElementById('confirmNewPassword').value;

      if (!currentPass) {
        showToast('Please enter your current password', 'warning');
        return;
      }
      if (newPass.length < 6) {
        showToast('New password must be at least 6 characters', 'warning');
        return;
      }
      if (newPass !== confirmPass) {
        showToast('New passwords do not match', 'error');
        return;
      }

      const submitBtn = passwordForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';

      try {
        const json = await window.finverseAPI.changePassword(currentPass, newPass);

        if (json.success) {
          showToast('Password updated successfully!', 'success');
          passwordForm.reset();
        } else {
          showToast(json.message || 'Failed to update password', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Server error. Please try again later.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // ─── Preferences Form ─────────────────────────────────
  const prefsForm = document.getElementById('preferencesForm');
  if (prefsForm) {
    prefsForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const budgetAlerts = document.getElementById('settingBudgetAlerts');
      const weeklyReport = document.getElementById('settingWeeklyReport');
      const emailNotifs = document.getElementById('settingEmailNotifications');
      const soundAlertsEl = document.getElementById('settingSoundAlerts');
      const aiPredictionEl = document.getElementById('settingAIPrediction');

      const submitBtn = prefsForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

      try {
        const json = await window.finverseAPI.updateSettings({
          budgetAlerts: budgetAlerts ? budgetAlerts.checked : true,
          weeklyReport: weeklyReport ? weeklyReport.checked : false,
          emailNotifications: emailNotifs ? emailNotifs.checked : true,
        });

        // Also save budget alert engine settings (localStorage)
        if (window.BudgetAlertEngine) {
          window.BudgetAlertEngine.saveSettings({
            budgetAlerts: budgetAlerts ? budgetAlerts.checked : true,
            soundAlerts: soundAlertsEl ? soundAlertsEl.checked : true,
            aiPrediction: aiPredictionEl ? aiPredictionEl.checked : true,
          });
        }

        if (json.success) {
          showToast('Preferences saved successfully!', 'success');
        } else {
          showToast(json.message || 'Failed to save preferences', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Server error. Please try again later.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // ─── Export Data Button ─────────────────────────────────
  const exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      exportBtn.disabled = true;
      exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';

      try {
        const json = await window.finverseAPI._fetchAPI('/user/export');

        if (json.success) {
          // Download as file
          const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `finverse_export_${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Data exported successfully!', 'success');
        } else {
          showToast(json.message || 'Export failed', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Server error. Could not export data.', 'error');
      } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = '<i class="fa-solid fa-download"></i> Export All My Data';
      }
    });
  }

  // ─── Delete Account Button ─────────────────────────────────
  const deleteBtn = document.getElementById('deleteAccountBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const password = prompt('⚠️ This action is PERMANENT and cannot be undone.\n\nAll your transactions, budgets, goals, and chat history will be deleted.\n\nEnter your password to confirm:');

      if (!password) return; // User cancelled

      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

      try {
        const json = await window.finverseAPI.deleteAccount(password);

        if (json.success) {
          showToast('Account deleted. Redirecting...', 'info');
          localStorage.removeItem('finverse_token');
          localStorage.removeItem('finverse_user');
          setTimeout(() => {
            window.location.href = 'signup.html';
          }, 1500);
        } else {
          showToast(json.message || 'Failed to delete account', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Server error. Could not delete account.', 'error');
      } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete My Account';
      }
    });
  }

  // ─── Logout Button ─────────────────────────────────
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('finverse_token');
      localStorage.removeItem('finverse_user');
      showToast('Logging out...', 'info');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 700);
    });
  }
}
