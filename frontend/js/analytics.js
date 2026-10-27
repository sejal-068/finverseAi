/**
 * FinverseAI - Analytics Page Controller
 * Handles Multi-period Financial Insights, KPI Highlights, and Deep-dive Chart.js Visualizations.
 */

let cashFlowChartInstance = null;
let categoryDistChartInstance = null;
let savingsTrendChartInstance = null;
let dailySpendingChartInstance = null;

let currentRange = '30d';

document.addEventListener('DOMContentLoaded', async () => {
  initRangeSelectors();
  await loadAnalyticsData(currentRange);
});

function initRangeSelectors() {
  const rangeBtns = document.querySelectorAll('.range-pill-btn');
  rangeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      rangeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.getAttribute('data-range');
      await loadAnalyticsData(currentRange);
      showToast(`Updated analytics for ${btn.textContent}`, 'info');
    });
  });
}

async function loadAnalyticsData(range) {
  if (!window.finverseAPI) return;

  try {
    const analytics = await window.finverseAPI.getAnalytics(range);
    const categories = await window.finverseAPI.getCategories();

    // Update KPI Card Numbers
    document.getElementById('kpiMonthlyIncome').textContent = formatINR(analytics.monthlyIncome);
    document.getElementById('kpiMonthlyExpenses').textContent = formatINR(analytics.monthlyExpenses);
    document.getElementById('kpiSavingsRate').textContent = analytics.savingsRate + '%';
    document.getElementById('kpiAvgDaily').textContent = formatINR(analytics.avgDailySpend);
    document.getElementById('kpiHighestCategory').textContent = analytics.highestCategory;
    document.getElementById('kpiExpenseGrowth').textContent = analytics.expenseGrowth;

    // Render Charts
    renderCashFlowChart(analytics.cashFlowTrend);
    renderCategoryDistributionChart(categories);
    renderSavingsTrendChart(analytics.cashFlowTrend);
    renderDailySpendingChart(analytics.dailySpending || {});

  } catch (err) {
    console.error('Error loading analytics:', err);
    showToast('Failed to load analytics data', 'error');
  }
}

function renderCashFlowChart(trendData) {
  const ctx = document.getElementById('analyticsCashFlowChart');
  if (!ctx) return;

  if (cashFlowChartInstance) {
    cashFlowChartInstance.destroy();
  }

  const labels = trendData.map(d => d.month);
  const incomeData = trendData.map(d => d.income);
  const expenseData = trendData.map(d => d.expenses);
  const savingsData = trendData.map(d => d.savings);

  cashFlowChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Inflow (Income)',
          data: incomeData,
          backgroundColor: '#22A06B',
          borderRadius: 6
        },
        {
          label: 'Total Outflow (Expenses)',
          data: expenseData,
          backgroundColor: '#E45858',
          borderRadius: 6
        },
        {
          label: 'Net Savings',
          data: savingsData,
          backgroundColor: '#5B4BDB',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'Inter' } } },
        tooltip: {
          callbacks: {
            label: (item) => ` ${item.dataset.label}: ₹${item.raw.toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => '₹' + (v / 1000) + 'k' },
          grid: { color: 'rgba(226, 232, 240, 0.6)' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderCategoryDistributionChart(categories) {
  const ctx = document.getElementById('analyticsCategoryDistChart');
  if (!ctx) return;

  if (categoryDistChartInstance) {
    categoryDistChartInstance.destroy();
  }

  const expenseCats = categories.filter(c => c.type === 'expense' && c.spent > 0);

  categoryDistChartInstance = new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: expenseCats.map(c => c.name),
      datasets: [{
        data: expenseCats.map(c => c.spent),
        backgroundColor: expenseCats.map(c => c.color + 'CC')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (item) => ` ${item.label}: ₹${item.raw.toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        r: { grid: { color: 'rgba(226, 232, 240, 0.6)' }, ticks: { display: false } }
      }
    }
  });
}

function renderSavingsTrendChart(trendData) {
  const ctx = document.getElementById('analyticsSavingsTrendChart');
  if (!ctx) return;

  if (savingsTrendChartInstance) {
    savingsTrendChartInstance.destroy();
  }

  savingsTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendData.map(d => d.month),
      datasets: [{
        label: 'Monthly Net Savings (₹)',
        data: trendData.map(d => d.savings),
        borderColor: '#22A06B',
        backgroundColor: 'rgba(34, 160, 107, 0.12)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#22A06B',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => ` Saved: ₹${item.raw.toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => '₹' + (v / 1000) + 'k' },
          grid: { color: 'rgba(226, 232, 240, 0.6)' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderDailySpendingChart(dailyMap = {}) {
  const ctx = document.getElementById('analyticsDailySpendingChart');
  if (!ctx) return;

  if (dailySpendingChartInstance) {
    dailySpendingChartInstance.destroy();
  }

  // Get real user days and amounts from backend
  const entries = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  let days = [];
  let amounts = [];

  if (entries.length > 0) {
    days = entries.map(([dateStr]) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    });
    amounts = entries.map(([, amt]) => amt);
  } else {
    days = ['No Data'];
    amounts = [0];
  }

  const maxVal = Math.max(...amounts, 0);
  const threshold = maxVal > 0 ? maxVal * 0.7 : 3000;

  dailySpendingChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Daily Outflow',
        data: amounts,
        backgroundColor: amounts.map(amt => amt >= threshold && amt > 0 ? '#E45858' : '#5B4BDB'),
        borderRadius: 4
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
          ticks: { callback: (v) => '₹' + v.toLocaleString('en-IN') },
          grid: { color: 'rgba(226, 232, 240, 0.6)' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

