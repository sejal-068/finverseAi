/**
 * FinverseAI - Dashboard Page Controller
 * Handles Metrics Rendering, Chart.js Visualizations, Health Score, and AI Recommendation.
 */

let incomeExpenseChartInstance = null;
let categoryDonutChartInstance = null;
let expenseTrendChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboardData();

  // Run budget alert checks on dashboard load
  if (window.BudgetAlertEngine) {
    setTimeout(() => window.BudgetAlertEngine.check(), 1000);
  }
});

function initDashboardGreeting(userName = '') {
  const greetingEl = document.getElementById('dashboardGreeting');
  const dateEl = document.getElementById('dashboardDate');

  const now = new Date();
  const hour = now.getHours();

  let timeOfDay = 'Morning';
  if (hour >= 12 && hour < 17) {
    timeOfDay = 'Afternoon';
  } else if (hour >= 17) {
    timeOfDay = 'Evening';
  }

  // Retrieve user name from param or localStorage
  let displayName = userName;
  if (!displayName) {
    try {
      const storedUser = JSON.parse(localStorage.getItem('finverse_user'));
      displayName = storedUser?.name || 'User';
    } catch (e) {
      displayName = 'User';
    }
  }

  // Extract first name (e.g. "Sejal" from "Sejal Verma")
  const firstName = displayName.split(' ')[0] || displayName;

  if (greetingEl) {
    greetingEl.textContent = `Good ${timeOfDay}, ${firstName}`;
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

    initDashboardGreeting(data.user?.name || '');

    // Update Summary Metrics
    const metricBalance = document.getElementById('metricTotalBalance');
    const metricIncome = document.getElementById('metricTotalIncome');
    const metricExpenses = document.getElementById('metricTotalExpenses');
    const metricSavings = document.getElementById('metricTotalSavings');
    if (metricBalance) metricBalance.textContent = formatINR(data.totalBalance || 0);
    if (metricIncome) metricIncome.textContent = formatINR(data.totalIncome || 0);
    if (metricExpenses) metricExpenses.textContent = formatINR(data.totalExpenses || 0);
    if (metricSavings) metricSavings.textContent = formatINR(data.savings || 0);

    // Update Dynamic Trend Subtitles
    const balanceBadge = document.getElementById('metricBalanceTrendBadge');
    const balanceNote = document.getElementById('metricBalanceTrendNote');
    if (balanceBadge && balanceNote) {
      if ((data.totalIncome || 0) === 0 && (data.totalExpenses || 0) === 0) {
        balanceBadge.className = 'trend-badge';
        balanceBadge.innerHTML = '<i class="fa-solid fa-wallet"></i> Current';
        balanceNote.textContent = 'Net Cash Flow';
      } else if ((data.totalBalance || 0) >= 0) {
        balanceBadge.className = 'trend-badge up';
        balanceBadge.innerHTML = '<i class="fa-solid fa-arrow-up"></i> Surplus';
        balanceNote.textContent = 'Positive balance';
      } else {
        balanceBadge.className = 'trend-badge down';
        balanceBadge.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Deficit';
        balanceNote.textContent = 'Negative balance';
      }
    }

    const incomeBadge = document.getElementById('metricIncomeTrendBadge');
    const incomeNote = document.getElementById('metricIncomeSourcesNote');
    if (incomeBadge && incomeNote) {
      if (data.incomeGrowth !== null && data.incomeGrowth !== undefined) {
        const isUp = data.incomeGrowth >= 0;
        incomeBadge.className = `trend-badge ${isUp ? 'up' : 'down'}`;
        incomeBadge.innerHTML = `<i class="fa-solid fa-arrow-${isUp ? 'up' : 'down'}"></i> ${Math.abs(data.incomeGrowth)}%`;
        incomeNote.textContent = 'vs last month';
      } else {
        const count = data.activeIncomeSourcesCount || (data.totalIncome > 0 ? 1 : 0);
        incomeBadge.className = 'trend-badge up';
        incomeBadge.innerHTML = `<i class="fa-solid fa-money-bill"></i> Inflow`;
        incomeNote.textContent = `${count} active ${count === 1 ? 'source' : 'sources'}`;
      }
    }

    const expenseBadge = document.getElementById('metricExpenseTrendBadge');
    const expenseNote = document.getElementById('metricExpenseCategoryNote');
    if (expenseBadge && expenseNote) {
      if (data.expenseGrowth !== null && data.expenseGrowth !== undefined) {
        const isUp = data.expenseGrowth > 0;
        expenseBadge.className = `trend-badge ${isUp ? 'down' : 'up'}`;
        expenseBadge.innerHTML = `<i class="fa-solid fa-arrow-${isUp ? 'up' : 'down'}"></i> ${Math.abs(data.expenseGrowth)}%`;
        expenseNote.textContent = 'vs last month';
      } else if (data.categorySummary && data.categorySummary.length > 0) {
        const top = data.categorySummary[0];
        expenseBadge.className = 'trend-badge down';
        expenseBadge.innerHTML = `<i class="fa-solid fa-receipt"></i> Top: ${top.name}`;
        expenseNote.textContent = `${top.percentage}% of expenses`;
      } else {
        expenseBadge.className = 'trend-badge';
        expenseBadge.innerHTML = '<i class="fa-solid fa-receipt"></i> Outflow';
        expenseNote.textContent = 'No expenses recorded';
      }
    }

    const savingsBadge = document.getElementById('metricSavingsTrendBadge');
    const savingsNote = document.getElementById('metricSavingsRateNote');
    if (savingsBadge && savingsNote) {
      const rate = data.savingsRate || 0;
      savingsBadge.className = `trend-badge ${rate >= 20 ? 'up' : 'down'}`;
      savingsBadge.innerHTML = `<i class="fa-solid fa-chart-pie"></i> ${rate}%`;
      savingsNote.textContent = rate >= 20 ? 'Healthy Savings Rate' : 'Savings Rate';
    }

    // Update AI Recommendation Banner
    const aiRecEl = document.getElementById('aiRecText');
    if (aiRecEl) {
      if (data.aiRecommendation && data.aiRecommendation.message) {
        aiRecEl.textContent = data.aiRecommendation.message;
      } else if ((data.totalIncome || 0) === 0 && (data.totalExpenses || 0) === 0) {
        aiRecEl.textContent = 'Welcome to FinverseAI! Start by adding your income and expenses to get personalized AI insights.';
      } else {
        aiRecEl.textContent = 'Keep tracking your finances consistently to unlock deeper AI insights.';
      }
    }

    // Render Recent Transactions
    renderRecentTransactions(data.recentTransactions || []);

    // Fetch additional data — handle failures gracefully
    let categories = [];
    let budgets = [];
    let health = null;

    try { categories = await window.finverseAPI.getCategories(); } catch (e) { console.warn('Categories fetch failed'); }
    try { budgets = await window.finverseAPI.getBudgets(); } catch (e) { console.warn('Budgets fetch failed'); }
    try { health = await window.finverseAPI.getFinancialHealth(); } catch (e) { console.warn('Health score fetch failed'); }

    // Render Health Score Widget
    if (health && ((data.totalIncome || 0) > 0 || (data.totalExpenses || 0) > 0)) {
      renderHealthScore(health);
    } else {
      renderHealthScoreEmpty();
    }

    // Render Upcoming Budgets
    renderUpcomingBudgets(budgets || []);

    // Render Charts with real data
    const monthlyTrend = data.cashFlowTrend || data.monthlyTrend || [];
    renderIncomeExpenseChart(monthlyTrend);
    renderCategoryDonutChart(categories || []);

    // Calculate weekly expense breakdown from backend or transactions
    const weeklyExpenses = data.weeklyExpenses || computeWeeklyExpenses(data.recentTransactions || []);
    renderExpenseTrendChart(weeklyExpenses);

  } catch (error) {
    console.error('Error loading dashboard data:', error);
    // Show empty state instead of error for new users
    initDashboardGreeting('');
    const metricBalance = document.getElementById('metricTotalBalance');
    const metricIncome = document.getElementById('metricTotalIncome');
    const metricExpenses = document.getElementById('metricTotalExpenses');
    const metricSavings = document.getElementById('metricTotalSavings');
    if (metricBalance) metricBalance.textContent = formatINR(0);
    if (metricIncome) metricIncome.textContent = formatINR(0);
    if (metricExpenses) metricExpenses.textContent = formatINR(0);
    if (metricSavings) metricSavings.textContent = formatINR(0);

    const aiRecEl = document.getElementById('aiRecText');
    if (aiRecEl) aiRecEl.textContent = 'Could not load dashboard data. Please check your connection.';

    renderHealthScoreEmpty();
    renderRecentTransactions([]);
    renderUpcomingBudgets([]);
    renderIncomeExpenseChart([]);
    renderCategoryDonutChart([]);
    renderExpenseTrendChart([]);
  }
}

/**
 * Compute weekly expense totals from transactions for the current month
 */
function computeWeeklyExpenses(transactions) {
  if (!transactions || transactions.length === 0) return [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weeks = [0, 0, 0, 0, 0];
  transactions.forEach(tx => {
    if (tx.type !== 'expense') return;
    const d = new Date(tx.date);
    if (d >= monthStart) {
      const weekIdx = Math.min(4, Math.floor((d.getDate() - 1) / 7));
      weeks[weekIdx] += Number(tx.amount) || 0;
    }
  });
  // Remove trailing zero weeks
  while (weeks.length > 1 && weeks[weeks.length - 1] === 0) weeks.pop();
  return weeks.some(w => w > 0) ? weeks : [];
}

function renderRecentTransactions(transactions) {
  const container = document.getElementById('recentTransactionsList');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
        <i class="fa-solid fa-receipt" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.4;"></i>
        <p style="font-weight: 600; margin-bottom: 0.25rem; color: var(--text-primary);">Your financial journey starts here.</p>
        <p style="font-size: 0.85rem; margin-bottom: 1rem;">Add your first income or expense and I'll start helping you understand your money.</p>
        <a href="transactions.html" class="btn btn-primary btn-sm"><i class="fa-solid fa-plus"></i> Add First Transaction</a>
      </div>
    `;
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
  const badgeEl = document.getElementById('healthScoreBadge');

  if (scoreNumEl) scoreNumEl.textContent = health.score !== undefined ? health.score : '--';
  if (scoreStatusEl) scoreStatusEl.textContent = health.status || 'Active';
  if (scoreDescEl) scoreDescEl.textContent = health.description || '';
  if (badgeEl) badgeEl.textContent = `${health.score || 0}/100`;

  if (factorsContainer) {
    const positiveHtml = (health.positiveFactors || []).map(f => `
      <div class="factor-item positive">
        <i class="fa-solid fa-circle-check factor-icon"></i>
        <span class="factor-text">${f}</span>
      </div>
    `).join('');

    const improveHtml = (health.improvementAreas || []).map(f => `
      <div class="factor-item improve">
        <i class="fa-solid fa-triangle-exclamation factor-icon"></i>
        <span class="factor-text">${f}</span>
      </div>
    `).join('');

    factorsContainer.innerHTML = (positiveHtml + improveHtml) || `
      <div class="factor-item" style="color: var(--text-muted); justify-content: center; padding: 1rem 0;">
        <span>Keep recording transactions to update your score</span>
      </div>
    `;
  }
}

function renderHealthScoreEmpty() {
  const scoreNumEl = document.getElementById('healthScoreNum');
  const scoreStatusEl = document.getElementById('healthScoreStatus');
  const scoreDescEl = document.getElementById('healthScoreDesc');
  const factorsContainer = document.getElementById('healthFactorsList');
  const badgeEl = document.getElementById('healthScoreBadge');

  if (scoreNumEl) scoreNumEl.textContent = '--';
  if (scoreStatusEl) scoreStatusEl.textContent = 'Building Profile';
  if (scoreDescEl) scoreDescEl.textContent = 'Add your income and expenses to calculate your personalized 5-pillar health score.';
  if (badgeEl) badgeEl.textContent = '--/100';

  if (factorsContainer) {
    factorsContainer.innerHTML = `
      <div class="factor-item" style="color: var(--text-muted); justify-content: center; padding: 1.5rem 0;">
        <i class="fa-solid fa-chart-line" style="margin-right: 0.5rem;"></i>
        <span>Add transactions to unlock health insights</span>
      </div>
    `;
  }
}

function renderUpcomingBudgets(budgets) {
  const container = document.getElementById('dashboardBudgetList');
  if (!container) return;

  if (!budgets || budgets.length === 0) {
    container.innerHTML = `<p class="text-muted text-center" style="padding: 1rem 0;">No budgets set yet. Create budgets to track your spending.</p>`;
    return;
  }

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
function renderIncomeExpenseChart(monthlyData) {
  const ctx = document.getElementById('incomeExpenseChart');
  if (!ctx) return;

  if (incomeExpenseChartInstance) {
    incomeExpenseChartInstance.destroy();
  }

  const hasData = monthlyData && monthlyData.length > 0 && monthlyData.some(d => ((d.income || 0) > 0 || (d.expenses || 0) > 0));
  const labels = hasData ? monthlyData.map(d => d.month) : ['No transactions yet'];
  const incomeData = hasData ? monthlyData.map(d => d.income || 0) : [0];
  const expenseData = hasData ? monthlyData.map(d => d.expenses || 0) : [0];

  incomeExpenseChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          backgroundColor: '#22A06B',
          borderRadius: 6,
          barPercentage: 0.6
        },
        {
          label: 'Expenses',
          data: expenseData,
          backgroundColor: '#E45858',
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

  const expenseCats = (categories || []).filter(c => c.type === 'expense' && Number(c.spent) > 0);

  if (expenseCats.length === 0) {
    categoryDonutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['No expense data yet'],
        datasets: [{
          data: [1],
          backgroundColor: ['#E2E8F0'],
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
              label: () => ' No expenses recorded yet'
            }
          }
        },
        cutout: '70%'
      }
    });
    return;
  }

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

function renderExpenseTrendChart(weeklyData) {
  const ctx = document.getElementById('expenseTrendChart');
  if (!ctx) return;

  if (expenseTrendChartInstance) {
    expenseTrendChartInstance.destroy();
  }

  const hasData = weeklyData && weeklyData.length > 0 && weeklyData.some(w => Number(w) > 0);
  const labels = hasData ? weeklyData.map((_, i) => `Week ${i + 1}`) : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const dataValues = hasData ? weeklyData : [0, 0, 0, 0];

  expenseTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Weekly Expenses',
        data: dataValues,
        borderColor: '#5B4BDB',
        backgroundColor: 'rgba(91, 75, 219, 0.12)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#5B4BDB',
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
