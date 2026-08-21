/**
 * FinverseAI - User Profile & Financial Goals Controller
 * Handles Personal Details, Monthly Income Settings, and Financial Goal Trackers.
 */

let currentUserProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  initProfileForms();
  await loadUserProfile();
});

function initProfileForms() {
  const profileForm = document.getElementById('editProfileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileUpdate);
  }

  const addGoalForm = document.getElementById('addGoalForm');
  if (addGoalForm) {
    addGoalForm.addEventListener('submit', handleAddGoalSubmit);
  }
}

async function loadUserProfile() {
  if (!window.finverseAPI) return;

  try {
    currentUserProfile = await window.finverseAPI.getUserProfile();

    // Populate Fields
    document.getElementById('profileDisplayName').textContent = currentUserProfile.name;
    document.getElementById('profileDisplayEmail').textContent = currentUserProfile.email;
    document.getElementById('profileDisplayGoal').textContent = currentUserProfile.primaryGoal;

    document.getElementById('profileNameInput').value = currentUserProfile.name;
    document.getElementById('profileEmailInput').value = currentUserProfile.email;
    document.getElementById('profileIncomeInput').value = currentUserProfile.monthlyIncome;
    document.getElementById('profileGoalSelect').value = currentUserProfile.primaryGoal;

    // Render Goals
    renderGoalsList(currentUserProfile.goals || []);

  } catch (err) {
    console.error('Error loading profile:', err);
    showToast('Failed to load profile details', 'error');
  }
}

function renderGoalsList(goals) {
  const container = document.getElementById('profileGoalsList');
  if (!container) return;

  if (goals.length === 0) {
    container.innerHTML = `<p class="text-muted">No specific financial targets set yet.</p>`;
    return;
  }

  container.innerHTML = goals.map(g => {
    const percent = Math.min(100, Math.round((g.current / g.target) * 100));
    return `
      <div class="card" style="padding: 1.25rem; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
          <div>
            <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">${g.title}</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-regular fa-calendar"></i> Target: ${formatDate(g.deadline)}</span>
          </div>
          <span class="badge badge-success font-bold">${percent}%</span>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem;">
          <span>${formatINR(g.current)}</span>
          <span style="color: var(--text-muted);">${formatINR(g.target)}</span>
        </div>

        <div class="progress-bar-bg" style="height: 8px;">
          <div class="progress-bar-fill" style="width: ${percent}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

async function handleProfileUpdate(e) {
  e.preventDefault();

  const name = document.getElementById('profileNameInput').value.trim();
  const email = document.getElementById('profileEmailInput').value.trim();
  const monthlyIncome = Number(document.getElementById('profileIncomeInput').value);
  const primaryGoal = document.getElementById('profileGoalSelect').value;

  if (!name || !email) {
    showToast('Name and email are required', 'warning');
    return;
  }

  try {
    const updated = await window.finverseAPI.updateUserProfile({
      name,
      email,
      monthlyIncome,
      primaryGoal
    });

    currentUserProfile = updated;
    document.getElementById('profileDisplayName').textContent = updated.name;
    document.getElementById('profileDisplayEmail').textContent = updated.email;
    document.getElementById('profileDisplayGoal').textContent = updated.primaryGoal;

    showToast('Profile updated successfully', 'success');
  } catch (err) {
    console.error('Error updating profile:', err);
    showToast('Failed to update profile', 'error');
  }
}

async function handleAddGoalSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('goalTitleInput').value.trim();
  const target = Number(document.getElementById('goalTargetInput').value);
  const current = Number(document.getElementById('goalCurrentInput').value) || 0;
  const deadline = document.getElementById('goalDeadlineInput').value;

  if (!title || !target) {
    showToast('Please fill in goal title and target amount', 'warning');
    return;
  }

  const newGoal = {
    id: 'g_' + Date.now(),
    title,
    target,
    current,
    deadline: deadline || '2026-12-31'
  };

  const updatedGoals = [...(currentUserProfile.goals || []), newGoal];

  try {
    await window.finverseAPI.updateUserProfile({ goals: updatedGoals });
    showToast('Financial goal added', 'success');
    closeModal('addGoalModal');
    document.getElementById('addGoalForm').reset();
    await loadUserProfile();
  } catch (err) {
    console.error('Error adding goal:', err);
    showToast('Failed to add goal', 'error');
  }
}

window.openAddGoalModal = () => openModal('addGoalModal');
