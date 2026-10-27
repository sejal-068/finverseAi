/**
 * FinverseAI - Budgets Page Controller
 * Handles Budget Limits, Real-time Utilization Meters, Warning States, and Budget Modals.
 */

let allBudgets = [];
let currentBudgetEditId = null;
let currentBudgetDeleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  await loadBudgets();
  renderAlertHistory();

  // Run budget alert checks on page load (delayed to allow page to settle)
  if (window.BudgetAlertEngine) {
    setTimeout(() => window.BudgetAlertEngine.check(), 800);
  }
});


function initEventListeners() {
  const budgetForm = document.getElementById('budgetForm');
  if (budgetForm) {
    budgetForm.addEventListener('submit', handleBudgetFormSubmit);
  }

  const confirmDeleteBtn = document.getElementById('confirmBudgetDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmBudgetDelete);
  }
}

async function loadBudgets() {
  if (!window.finverseAPI) return;

  try {
    allBudgets = await window.finverseAPI.getBudgets();
    renderBudgetsOverview(allBudgets);
    renderBudgetsGrid(allBudgets);
  } catch (err) {
    console.error('Error loading budgets:', err);
    showToast('Failed to load budgets', 'error');
  }
}

function renderBudgetsOverview(budgets) {
  let totalLimit = 0;
  let totalSpent = 0;

  budgets.forEach(b => {
    totalLimit += Number(b.limit);
    totalSpent += Number(b.spent);
  });

  const totalRemaining = Math.max(0, totalLimit - totalSpent);
  const overallPercentage = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  document.getElementById('totalBudgetLimitVal').textContent = formatINR(totalLimit);
  document.getElementById('totalBudgetSpentVal').textContent = formatINR(totalSpent);
  document.getElementById('totalBudgetRemainingVal').textContent = formatINR(totalRemaining);
  document.getElementById('totalBudgetPercentVal').textContent = overallPercentage + '%';

  const overallProgressBar = document.getElementById('overallBudgetProgress');
  if (overallProgressBar) {
    overallProgressBar.style.width = Math.min(100, overallPercentage) + '%';
    if (overallPercentage >= 100) {
      overallProgressBar.className = 'progress-bar-fill danger';
    } else if (overallPercentage >= 80) {
      overallProgressBar.className = 'progress-bar-fill warning';
    } else {
      overallProgressBar.className = 'progress-bar-fill';
    }
  }
}

function renderBudgetsGrid(budgets) {
  const container = document.getElementById('budgetsGridContainer');
  if (!container) return;

  if (budgets.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
      <div class="empty-state-icon"><i class="fa-solid fa-calculator"></i></div>
      <h3>No Budgets Created</h3>
      <p>Set a monthly budget to keep track of spending thresholds and receive AI alerts.</p>
      <button class="btn btn-primary" onclick="openCreateBudgetModal()"><i class="fa-solid fa-plus"></i> Create Budget</button>
    </div>`;
    return;
  }

  const categoryIcons = {
    'Food & Dining': 'fa-utensils',
    'Shopping': 'fa-bag-shopping',
    'Transport': 'fa-car',
    'Bills & Utilities': 'fa-file-invoice-dollar',
    'Entertainment': 'fa-film',
    'Health & Wellness': 'fa-heart-pulse',
    'Education': 'fa-graduation-cap',
    'Travel': 'fa-plane'
  };

  container.innerHTML = budgets.map(b => {
    const icon = categoryIcons[b.category] || 'fa-chart-pie';
    let statusLabel = 'Normal';
    let statusClass = 'status-normal';

    if (b.status === 'danger') {
      statusLabel = 'Over Budget';
      statusClass = 'status-danger';
    } else if (b.status === 'critical') {
      statusLabel = '80% Used';
      statusClass = 'status-critical';
    } else if (b.status === 'warning') {
      statusLabel = 'Near Limit';
      statusClass = 'status-warning';
    }

    return `
      <div class="budget-card ${statusClass}">
        <div>
          <div class="budget-card-top">
            <div class="budget-cat-info">
              <div class="budget-cat-icon">
                <i class="fa-solid ${icon}"></i>
              </div>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 700;">${b.category}</h3>
                <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: capitalize;">${b.period || 'monthly'} limit</span>
              </div>
            </div>
            <div class="dropdown">
              <span class="budget-status-tag ${b.status}">
                <i class="fa-solid ${b.status === 'danger' ? 'fa-triangle-exclamation' : b.status === 'critical' ? 'fa-circle-exclamation' : b.status === 'warning' ? 'fa-exclamation-circle' : 'fa-circle-check'}"></i>
                ${statusLabel}
              </span>
            </div>
          </div>

          <div class="budget-amounts-wrap">
            <div class="budget-spent-current">${formatINR(b.spent)}</div>
            <div class="budget-limit-total">of ${formatINR(b.limit)} planned budget</div>
          </div>

          <div class="progress-bar-bg" style="height: 10px;">
            <div class="progress-bar-fill ${b.status}" style="width: ${Math.min(100, b.percentage)}%;"></div>
          </div>
        </div>

        <div class="budget-footer-meta">
          <span>${b.percentage}% used</span>
          <span><strong>${formatINR(b.remaining)}</strong> left</span>
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn-table-action" onclick="openEditBudgetModal('${b.id}')" title="Edit Budget">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="btn-table-action delete" onclick="openDeleteBudgetModal('${b.id}')" title="Delete Budget">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   Create / Edit Budget Modal Handlers
   ========================================================================== */
function openCreateBudgetModal() {
  currentBudgetEditId = null;
  const form = document.getElementById('budgetForm');
  if (form) form.reset();

  const titleEl = document.getElementById('budgetModalTitle');
  if (titleEl) titleEl.textContent = 'Create Budget';

  openModal('budgetModal');
}

function openEditBudgetModal(budgetId) {
  const b = allBudgets.find(item => item.id === budgetId);
  if (!b) return;

  currentBudgetEditId = budgetId;
  const titleEl = document.getElementById('budgetModalTitle');
  if (titleEl) titleEl.textContent = 'Edit Budget';

  document.getElementById('budgetCategory').value = b.category;
  document.getElementById('budgetLimit').value = b.limit;
  document.getElementById('budgetPeriod').value = b.period || 'monthly';
  document.getElementById('budgetThreshold').value = b.warningThreshold || 80;

  openModal('budgetModal');
}

async function handleBudgetFormSubmit(e) {
  e.preventDefault();

  const category = document.getElementById('budgetCategory').value;
  const limit = Number(document.getElementById('budgetLimit').value);
  const period = document.getElementById('budgetPeriod').value;
  const warningThreshold = Number(document.getElementById('budgetThreshold').value) || 80;

  if (!limit || limit <= 0) {
    showToast('Please enter a valid budget limit', 'warning');
    return;
  }

  const payload = { category, limit, period, warningThreshold };

  try {
    if (currentBudgetEditId) {
      await window.finverseAPI.updateBudget(currentBudgetEditId, payload);
      showToast('Budget updated successfully', 'success');
    } else {
      await window.finverseAPI.createBudget(payload);
      showToast('Budget created successfully', 'success');
    }

    closeModal('budgetModal');
    await loadBudgets();

    // Re-check alerts after budget changes
    if (window.BudgetAlertEngine) {
      setTimeout(() => window.BudgetAlertEngine.check(category), 600);
    }
  } catch (err) {
    console.error('Error saving budget:', err);
    showToast('Failed to save budget', 'error');
  }
}

function openDeleteBudgetModal(budgetId) {
  currentBudgetDeleteId = budgetId;
  openModal('deleteBudgetModal');
}

async function handleConfirmBudgetDelete() {
  if (!currentBudgetDeleteId) return;

  try {
    // Before deleting, get the category so we can reset its alert state
    const budgetToDelete = allBudgets.find(b => b.id === currentBudgetDeleteId);
    const deletedCategory = budgetToDelete ? budgetToDelete.category : null;

    await window.finverseAPI.deleteBudget(currentBudgetDeleteId);
    showToast('Budget deleted', 'success');
    closeModal('deleteBudgetModal');

    // Reset localStorage alert state so alerts can fire again if a new budget is set
    if (deletedCategory && window.BudgetAlertEngine) {
      window.BudgetAlertEngine.resetCategoryState(deletedCategory);
    }

    currentBudgetDeleteId = null;
    await loadBudgets();
    renderAlertHistory();
  } catch (err) {
    console.error('Error deleting budget:', err);
    showToast('Failed to delete budget', 'error');
  }
}

window.openCreateBudgetModal = openCreateBudgetModal;
window.openEditBudgetModal = openEditBudgetModal;
window.openDeleteBudgetModal = openDeleteBudgetModal;

/* ==========================================================================
   Alert History Panel
   ========================================================================== */
function renderAlertHistory() {
  const container = document.getElementById('alertHistoryList');
  if (!container) return;

  if (!window.BudgetAlertEngine) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Alert engine not loaded.</p>';
    return;
  }

  const history = window.BudgetAlertEngine.getAlertHistory();

  if (!history || history.length === 0) {
    container.innerHTML = '<div class="empty-alert-state"><i class="fa-solid fa-bell-slash" style="font-size:1.5rem;color:var(--text-muted);margin-bottom:0.5rem;"></i><p style="color:var(--text-muted);font-size:0.85rem;">No alerts yet. Alerts will appear here when your budget thresholds are crossed.</p></div>';
    return;
  }

  const typeConfig = {
    danger:   { icon: '🚨', label: 'Over Budget',     color: 'var(--danger)' },
    critical: { icon: '🔔', label: '80% Critical',    color: '#E8730A' },
    warning:  { icon: '⚠️', label: '70% Warning',    color: 'var(--warning)' },
  };

  container.innerHTML = history.map(item => {
    const cfg = typeConfig[item.type] || { icon: 'ℹ️', label: item.type, color: 'var(--primary)' };
    const date = new Date(item.timestamp);
    const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="alert-history-item alert-type-${item.type}" style="border-left:3px solid ${cfg.color};">
        <div class="alert-history-icon">${cfg.icon}</div>
        <div class="alert-history-info">
          <div class="alert-history-title">${item.category} — ${cfg.label}</div>
          <div class="alert-history-sub">Spent: ${formatINR(item.spent)} of ${formatINR(item.limit)} (${item.percentage}%)</div>
        </div>
        <div class="alert-history-time">${dateStr}</div>
      </div>`;
  }).join('');
}

function clearAllAlerts() {
  if (window.BudgetAlertEngine) {
    window.BudgetAlertEngine.clearAlertHistory();
  }
  renderAlertHistory();
  showToast('Alert history cleared', 'success');
}

window.renderAlertHistory = renderAlertHistory;
window.clearAllAlerts = clearAllAlerts;
