/**
 * FinverseAI - Dashboard Page Controller
 * Handles Metrics Rendering, Chart.js Visualizations, Health Score, and AI Recommendation.
 */

let incomeExpenseChartInstance = null;
let categoryDonutChartInstance = null;
let expenseTrendChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  initDashboardGreeting();
  await loadDashboardData();
});

function initDashboardGreeting() {
  const greetingEl = document.getElementById('dashboardGreeting');
  const dateEl = document.getElementById('dashboardDate');

  const now = new Date();
  const hour = now.getHours();
  let timeOfDay = 'Morning';
  if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
  else if (hour >= 17) timeOfDay = 'Evening';

  if (greetingEl) {
    greetingEl.textContent = `Good ${timeOfDay}, Aarav`;
  }

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}

async function loadDashboardData() {
  if (!window.finverseAPI) return;

  try {
    const data = await window.finverseAPI.getDashboardData();
    const categories = await window.finverseAPI.getCategories();
    const budgets = await window.finverseAPI.getBudgets();
    const health = await window.finverseAPI.getFinancialHealth();

    // Update Summary Metrics
    document.getElementById('metricTotalBalance').textContent = formatINR(data.totalBalance);
    document.getElementById('metricTotalIncome').textContent = formatINR(data.totalIncome);
    document.getElementById('metricTotalExpenses').textContent = formatINR(data.totalExpenses);
    document.getElementById('metricTotalSavings').textContent = formatINR(data.savings);

    // Update AI Recommendation Banner
    if (data.aiRecommendation) {
      document.getElementById('aiRecText').textContent = data.aiRecommendation.message;
    }

    // Render Recent Transactions
    renderRecentTransactions(data.recentTransactions);

    // Render Health Score Widget
    renderHealthScore(health);

    // Render Upcoming Budgets
    renderUpcomingBudgets(budgets);

    // Render Charts
    renderIncomeExpenseChart();
    renderCategoryDonutChart(categories);
    renderExpenseTrendChart();

  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showToast('Failed to load dashboard data', 'error');
  }
}

function renderRecentTransactions(transactions) {
  const container = document.getElementById('recentTransactionsList');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = `<p class="text-muted text-center" style="padding: 1rem 0;">No transactions yet.</p>`;
    return;
  }

  const categoryIcons = {
    'Salary': 'fa-money-bill-wave',
    'Bills & Utilities': 'fa-file-invoice-dollar',
    'Freelance & Bonus': 'fa-laptop-code',
    'Food & Dining': 'fa-utensils',
    'Shopping': 'fa-bag-shopping',
    'Transport': 'fa-car',
    'Entertainment': 'fa-film',
    'Health & Wellness': 'fa-heart-pulse',
    'Education': 'fa-graduation-cap',
    'Travel': 'fa-plane',
    'Other': 'fa-shapes'
  };

  container.innerHTML = transactions.map(tx => {
    const icon = categoryIcons[tx.category] || 'fa-receipt';
    const isIncome = tx.type === 'income';
    const sign = isIncome ? '+' : '-';
    const amountClass = isIncome ? 'income' : 'expense';

    return `
      <div class="tx-item-mini">
        <div class="tx-left">
          <div class="tx-cat-icon">
            <i class="fa-solid ${icon}"></i>
          </div>
          <div>
            <div class="tx-name">${tx.description}</div>
            <div class="tx-sub">
              <span>${tx.category}</span> • <span>${formatDate(tx.date)}</span>
            </div>
          </div>
        </div>
        <div class="tx-amount ${amountClass}">
          ${sign}${formatINR(tx.amount)}
        </div>
      </div>
    `;
  }).join('');
}

function renderHealthScore(health) {
  const scoreNumEl = document.getElementById('healthScoreNum');
  const scoreStatusEl = document.getElementById('healthScoreStatus');
  const scoreDescEl = document.getElementById('healthScoreDesc');
  const factorsContainer = document.getElementById('healthFactorsList');

  if (scoreNumEl) scoreNumEl.textContent = health.score;
  if (scoreStatusEl) scoreStatusEl.textContent = health.status;
  if (scoreDescEl) scoreDescEl.textContent = health.description;

  if (factorsContainer) {
    const positiveHtml = health.positiveFactors.map(f => `
      <div class="factor-item positive">
        <i class="fa-solid fa-circle-check factor-icon"></i>
        <span class="factor-text">${f}</span>
      </div>
    `).join('');

    const improveHtml = health.improvementAreas.map(f => `
      <div class="factor-item improve">
        <i class="fa-solid fa-triangle-exclamation factor-icon"></i>
        <span class="factor-text">${f}</span>
      </div>
    `).join('');

    factorsContainer.innerHTML = positiveHtml + improveHtml;
  }
}

function renderUpcomingBudgets(budgets) {
  const container = document.getElementById('dashboardBudgetList');
  if (!container) return;

  const topBudgets = budgets.slice(0, 3);
  container.innerHTML = topBudgets.map(b => {
    let barColorClass = '';
    if (b.status === 'warning') barColorClass = 'warning';
    if (b.status === 'danger') barColorClass = 'danger';

    return `
      <div class="budget-mini-item">
        <div class="budget-mini-header">
          <span>${b.category}</span>
          <span>${formatINR(b.spent)} / ${formatINR(b.limit)}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${barColorClass}" style="width: ${Math.min(100, b.percentage)}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   Chart.js Visualizations
   ========================================================================== */
function renderIncomeExpenseChart() {
  const ctx = document.getElementById('incomeExpenseChart');
  if (!ctx) return;

  if (incomeExpenseChartInstance) {
    incomeExpenseChartInstance.destroy();
  }

  incomeExpenseChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug'],
      datasets: [
        {
          label: 'Income',
          data: [45000, 48000, 50000, 52000, 58000],
          backgroundColor: '#10B981',
          borderRadius: 6,
          barPercentage: 0.6
        },
        {
          label: 'Expenses',
          data: [22000, 24000, 26500, 24800, 27800],
          backgroundColor: '#EF4444',
          borderRadius: 6,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 12, font: { family: 'Inter', size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ₹${item.raw.toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => '₹' + (val / 1000) + 'k',
            font: { family: 'Inter' }
          },
          grid: { color: 'rgba(226, 232, 240, 0.6)' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter' } }
        }
      }
    }
  });
}

function renderCategoryDonutChart(categories) {
  const ctx = document.getElementById('categoryDonutChart');
  if (!ctx) return;

  if (categoryDonutChartInstance) {
    categoryDonutChartInstance.destroy();
  }

  const expenseCats = categories.filter(c => c.type === 'expense' && c.spent > 0);
  const labels = expenseCats.map(c => c.name);
  const dataValues = expenseCats.map(c => c.spent);
  const bgColors = expenseCats.map(c => c.color);

  categoryDonutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: dataValues,
        backgroundColor: bgColors,
        borderWidth: 2,
        borderColor: '#FFFFFF'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, font: { family: 'Inter', size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: (item) => ` ${item.label}: ₹${item.raw.toLocaleString('en-IN')}`
          }
        }
      },
      cutout: '70%'
    }
  });
}

function renderExpenseTrendChart() {
  const ctx = document.getElementById('expenseTrendChart');
  if (!ctx) return;

  if (expenseTrendChartInstance) {
    expenseTrendChartInstance.destroy();
  }

  expenseTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        label: 'Weekly Expenses',
        data: [7200, 6400, 8500, 5700],
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.12)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#6366F1',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => ` Spent: ₹${item.raw.toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: (val) => '₹' + (val / 1000) + 'k',
            font: { family: 'Inter' }
          },
          grid: { color: 'rgba(226, 232, 240, 0.6)' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter' } }
        }
      }
    }
  });
}
