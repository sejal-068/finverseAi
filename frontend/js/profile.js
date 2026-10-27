/**
 * FinverseAI - User Profile & Financial Goals Controller
 * Handles Personal Details, Monthly Base Income, Dynamic Avatar, and Interactive Goal Trackers.
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

  const depositGoalForm = document.getElementById('depositGoalForm');
  if (depositGoalForm) {
    depositGoalForm.addEventListener('submit', handleDepositGoalSubmit);
  }

  const editGoalForm = document.getElementById('editGoalForm');
  if (editGoalForm) {
    editGoalForm.addEventListener('submit', handleEditGoalSubmit);
  }
}

async function loadUserProfile() {
  if (!window.finverseAPI) return;

  try {
    currentUserProfile = await window.finverseAPI.getUserProfile();

    const name = currentUserProfile.name || 'User';
    const email = currentUserProfile.email || '';
    const monthlyIncome = currentUserProfile.monthlyIncome || 50000;
    const goal = currentUserProfile.primaryGoal || currentUserProfile.financialGoal || 'Save Money';

    // Calculate Initials (e.g. "Sejal Shambharkar" -> "SS")
    const nameParts = name.trim().split(' ').filter(Boolean);
    let initials = nameParts[0] ? nameParts[0][0].toUpperCase() : 'U';
    if (nameParts.length > 1) {
      initials += nameParts[nameParts.length - 1][0].toUpperCase();
    }

    // Update Large Overview Avatar & Details
    const avatarLarge = document.getElementById('profileAvatarLarge');
    if (avatarLarge) {
      if (currentUserProfile.avatarUrl) {
        avatarLarge.innerHTML = `<img src="${currentUserProfile.avatarUrl}" alt="${name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.textContent='${initials}';">`;
      } else {
        avatarLarge.textContent = initials;
      }
    }

    document.getElementById('profileDisplayName').textContent = name;
    document.getElementById('profileDisplayEmail').textContent = email;
    document.getElementById('profileDisplayGoal').textContent = goal;

    // Populate Form Inputs
    document.getElementById('profileNameInput').value = name;
    document.getElementById('profileEmailInput').value = email;
    document.getElementById('profileIncomeInput').value = monthlyIncome;
    document.getElementById('profileGoalSelect').value = goal;

    if (document.getElementById('profileIncomeTypeSelect') && currentUserProfile.incomeType) {
      document.getElementById('profileIncomeTypeSelect').value = currentUserProfile.incomeType;
    }
    if (document.getElementById('profileOccupationInput') && currentUserProfile.occupation) {
      document.getElementById('profileOccupationInput').value = currentUserProfile.occupation;
    }
    if (document.getElementById('profileDependentsInput') && currentUserProfile.dependents !== undefined) {
      document.getElementById('profileDependentsInput').value = currentUserProfile.dependents;
    }
    if (document.getElementById('profileMoneyRoutineSelect') && currentUserProfile.moneyRoutine) {
      document.getElementById('profileMoneyRoutineSelect').value = currentUserProfile.moneyRoutine;
    }
    if (document.getElementById('profileAgeInput') && currentUserProfile.age) {
      document.getElementById('profileAgeInput').value = currentUserProfile.age;
    }
    if (document.getElementById('profileGenderSelect') && currentUserProfile.gender) {
      document.getElementById('profileGenderSelect').value = currentUserProfile.gender;
    }
    if (document.getElementById('profileCityInput') && currentUserProfile.city) {
      document.getElementById('profileCityInput').value = currentUserProfile.city;
    }

    // Render Goals
    renderGoalsList(currentUserProfile.goals || []);

    // Sync Header Avatar & Profile Pill
    if (typeof initGlobalUserProfile === 'function') {
      initGlobalUserProfile();
    }
  } catch (err) {
    console.error('Error loading profile:', err);
    showToast('Failed to load profile details', 'error');
  }
}

function renderGoalsList(goals) {
  const container = document.getElementById('profileGoalsList');
  if (!container) return;

  if (goals.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
        <i class="fa-solid fa-bullseye" style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.5;"></i>
        <p style="font-weight: 600;">No financial targets set yet.</p>
        <p style="font-size: 0.85rem; margin-bottom: 1rem;">Click "+ New Target" to create your first financial milestone!</p>
        <button class="btn btn-primary btn-sm" onclick="openAddGoalModal()">
          <i class="fa-solid fa-plus"></i> Create Milestone
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = goals.map((g, index) => {
    const goalId = g._id || g.id || `g_${index}`;
    const current = Number(g.current || 0);
    const target = Number(g.target || 1);
    const percent = Math.min(100, Math.round((current / target) * 100));
    const deadlineFormatted = g.deadline ? formatDate(g.deadline) : 'No Date';

    return `
      <div class="card" style="padding: 1.25rem; margin-bottom: 1rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
          <div>
            <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.2rem;">${g.title}</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">
              <i class="fa-regular fa-calendar"></i> Target: ${deadlineFormatted}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge ${percent >= 100 ? 'badge-success' : 'badge-primary'} font-bold">${percent}%</span>
            <button class="btn btn-icon btn-sm" title="Edit Milestone" onclick="openEditGoalModal('${goalId}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; background: var(--bg-surface); border: 1px solid var(--border-color);">
              <i class="fa-solid fa-pen text-muted"></i>
            </button>
            <button class="btn btn-icon btn-sm" title="Delete Milestone" onclick="deleteGoal('${goalId}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; background: var(--bg-surface); border: 1px solid var(--border-color);">
              <i class="fa-solid fa-trash text-danger"></i>
            </button>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 700; margin-bottom: 0.4rem;">
          <span style="color: var(--primary);">${formatINR(current)}</span>
          <span style="color: var(--text-muted); font-weight: 500;">Target: ${formatINR(target)}</span>
        </div>

        <div class="progress-bar-bg" style="height: 10px; border-radius: 999px; margin-bottom: 0.75rem; background: var(--bg-secondary);">
          <div class="progress-bar-fill" style="width: ${percent}%; border-radius: 999px; background: linear-gradient(90deg, var(--primary), var(--secondary));"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            ${current >= target ? '<i class="fa-solid fa-circle-check text-success"></i> Milestone Completed!' : `Remaining: ${formatINR(Math.max(0, target - current))}`}
          </span>
          <button class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.3rem 0.75rem;" onclick="openDepositGoalModal('${goalId}')">
            <i class="fa-solid fa-plus"></i> Add Savings
          </button>
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
  const incomeType = document.getElementById('profileIncomeTypeSelect') ? document.getElementById('profileIncomeTypeSelect').value : undefined;
  const occupation = document.getElementById('profileOccupationInput') ? document.getElementById('profileOccupationInput').value.trim() : undefined;
  const dependents = document.getElementById('profileDependentsInput') ? Number(document.getElementById('profileDependentsInput').value) : 0;
  const moneyRoutine = document.getElementById('profileMoneyRoutineSelect') ? document.getElementById('profileMoneyRoutineSelect').value : undefined;
  const age = document.getElementById('profileAgeInput') && document.getElementById('profileAgeInput').value ? Number(document.getElementById('profileAgeInput').value) : undefined;
  const gender = document.getElementById('profileGenderSelect') ? document.getElementById('profileGenderSelect').value : undefined;
  const city = document.getElementById('profileCityInput') ? document.getElementById('profileCityInput').value.trim() : undefined;

  if (!name || !email) {
    showToast('Name and email are required', 'warning');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const origText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
  submitBtn.disabled = true;

  try {
    const updated = await window.finverseAPI.updateUserProfile({
      name,
      email,
      monthlyIncome,
      primaryGoal,
      financialGoal: primaryGoal,
      incomeType,
      occupation,
      dependents,
      moneyRoutine,
      age,
      gender,
      city,
    });

    currentUserProfile = updated;
    localStorage.setItem('finverse_user', JSON.stringify(updated));

    document.getElementById('profileDisplayName').textContent = updated.name;
    document.getElementById('profileDisplayEmail').textContent = updated.email;
    document.getElementById('profileDisplayGoal').textContent = updated.primaryGoal || updated.financialGoal;

    // Update Large Avatar Initials
    const nameParts = updated.name.trim().split(' ').filter(Boolean);
    let initials = nameParts[0] ? nameParts[0][0].toUpperCase() : 'U';
    if (nameParts.length > 1) {
      initials += nameParts[nameParts.length - 1][0].toUpperCase();
    }
    const avatarLarge = document.getElementById('profileAvatarLarge');
    if (avatarLarge) avatarLarge.textContent = initials;

    // Synchronize Top Header Across all pages
    if (typeof initGlobalUserProfile === 'function') {
      initGlobalUserProfile();
    }

    showToast('Profile information updated successfully!', 'success');
  } catch (err) {
    console.error('Error updating profile:', err);
    showToast(err.message || 'Failed to update profile', 'error');
  } finally {
    submitBtn.innerHTML = origText;
    submitBtn.disabled = false;
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
    title,
    target,
    current,
    deadline: deadline || '2026-12-31',
  };

  const updatedGoals = [...(currentUserProfile?.goals || []), newGoal];

  try {
    const updated = await window.finverseAPI.updateUserProfile({ goals: updatedGoals });
    currentUserProfile = updated;
    localStorage.setItem('finverse_user', JSON.stringify(updated));

    showToast(`Financial milestone "${title}" created!`, 'success');
    closeModal('addGoalModal');
    document.getElementById('addGoalForm').reset();
    renderGoalsList(currentUserProfile.goals || []);
  } catch (err) {
    console.error('Error adding goal:', err);
    showToast('Failed to add goal milestone', 'error');
  }
}

// Deposit / Add Savings to Goal
window.openDepositGoalModal = (goalId) => {
  const goal = (currentUserProfile?.goals || []).find((g) => (g._id || g.id) === goalId);
  if (!goal) return;

  document.getElementById('depositGoalId').value = goalId;
  document.getElementById('depositGoalModalTitle').textContent = `Add Savings to "${goal.title}"`;
  document.getElementById('depositGoalTargetInfo').textContent = `Current: ${formatINR(goal.current || 0)} / Target: ${formatINR(goal.target)}`;
  document.getElementById('depositAmountInput').value = '';

  openModal('depositGoalModal');
};

async function handleDepositGoalSubmit(e) {
  e.preventDefault();

  const goalId = document.getElementById('depositGoalId').value;
  const depositAmt = Number(document.getElementById('depositAmountInput').value);

  if (!depositAmt || depositAmt <= 0) {
    showToast('Please enter a valid deposit amount', 'warning');
    return;
  }

  const goals = [...(currentUserProfile?.goals || [])];
  const idx = goals.findIndex((g) => (g._id || g.id) === goalId);

  if (idx === -1) return;

  goals[idx].current = (Number(goals[idx].current) || 0) + depositAmt;

  try {
    const updated = await window.finverseAPI.updateUserProfile({ goals });
    currentUserProfile = updated;
    localStorage.setItem('finverse_user', JSON.stringify(updated));

    showToast(`Successfully deposited ${formatINR(depositAmt)} into "${goals[idx].title}"!`, 'success');
    closeModal('depositGoalModal');
    renderGoalsList(currentUserProfile.goals || []);
  } catch (err) {
    console.error('Error depositing to goal:', err);
    showToast('Failed to update savings balance', 'error');
  }
}

// Edit Goal
window.openEditGoalModal = (goalId) => {
  const goal = (currentUserProfile?.goals || []).find((g) => (g._id || g.id) === goalId);
  if (!goal) return;

  document.getElementById('editGoalId').value = goalId;
  document.getElementById('editGoalTitleInput').value = goal.title;
  document.getElementById('editGoalTargetInput').value = goal.target;
  document.getElementById('editGoalCurrentInput').value = goal.current || 0;
  
  if (goal.deadline) {
    const d = new Date(goal.deadline);
    document.getElementById('editGoalDeadlineInput').value = d.toISOString().split('T')[0];
  } else {
    document.getElementById('editGoalDeadlineInput').value = '2026-12-31';
  }

  openModal('editGoalModal');
};

async function handleEditGoalSubmit(e) {
  e.preventDefault();

  const goalId = document.getElementById('editGoalId').value;
  const title = document.getElementById('editGoalTitleInput').value.trim();
  const target = Number(document.getElementById('editGoalTargetInput').value);
  const current = Number(document.getElementById('editGoalCurrentInput').value) || 0;
  const deadline = document.getElementById('editGoalDeadlineInput').value;

  if (!title || !target) {
    showToast('Please provide milestone title and target', 'warning');
    return;
  }

  const goals = [...(currentUserProfile?.goals || [])];
  const idx = goals.findIndex((g) => (g._id || g.id) === goalId);

  if (idx === -1) return;

  goals[idx] = {
    ...goals[idx],
    title,
    target,
    current,
    deadline: deadline || goals[idx].deadline,
  };

  try {
    const updated = await window.finverseAPI.updateUserProfile({ goals });
    currentUserProfile = updated;
    localStorage.setItem('finverse_user', JSON.stringify(updated));

    showToast(`Milestone "${title}" updated!`, 'success');
    closeModal('editGoalModal');
    renderGoalsList(currentUserProfile.goals || []);
  } catch (err) {
    console.error('Error editing goal:', err);
    showToast('Failed to update goal', 'error');
  }
}

// Delete Goal
window.deleteGoal = async (goalId) => {
  const goal = (currentUserProfile?.goals || []).find((g) => (g._id || g.id) === goalId);
  if (!goal) return;

  if (!confirm(`Are you sure you want to delete milestone "${goal.title}"?`)) {
    return;
  }

  const goals = (currentUserProfile?.goals || []).filter((g) => (g._id || g.id) !== goalId);

  try {
    const updated = await window.finverseAPI.updateUserProfile({ goals });
    currentUserProfile = updated;
    localStorage.setItem('finverse_user', JSON.stringify(updated));

    showToast(`Milestone "${goal.title}" deleted`, 'info');
    renderGoalsList(currentUserProfile.goals || []);
  } catch (err) {
    console.error('Error deleting goal:', err);
    showToast('Failed to delete goal', 'error');
  }
};

window.openAddGoalModal = () => openModal('addGoalModal');
