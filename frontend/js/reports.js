/**
 * FinverseAI - Financial Reports Controller
 * Handles Weekly, Monthly, and Annual Financial Statements, Generation, and PDF/Print Export.
 */

let reportChartInstance = null;
let currentReportType = 'monthly';

document.addEventListener('DOMContentLoaded', async () => {
  initReportControls();
  await generateReport(currentReportType);
});

function initReportControls() {
  const tabBtns = document.querySelectorAll('.report-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentReportType = btn.getAttribute('data-type');
      await generateReport(currentReportType);
    });
  });

  const generateBtn = document.getElementById('generateReportBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      generateBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...';
      generateBtn.disabled = true;
      await generateReport(currentReportType);
      generateBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Regenerate Report';
      generateBtn.disabled = false;
      showToast('Report updated successfully', 'success');
    });
  }

  const printBtn = document.getElementById('printReportBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

async function generateReport(type) {
  if (!window.finverseAPI) return;

  try {
    const txs = await window.finverseAPI.getTransactions();
    const categories = await window.finverseAPI.getCategories();

    // Dynamic date ranges
    const now = new Date();
    const periodNameEl = document.getElementById('reportPeriodTitle');
    const periodDatesEl = document.getElementById('reportPeriodDates');
    const fmtDate = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    let startDate, endDate;

    if (type === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      if (periodNameEl) periodNameEl.textContent = 'Weekly Financial Statement';
      if (periodDatesEl) periodDatesEl.textContent = `${fmtDate(startDate)} - ${fmtDate(endDate)}`;
    } else if (type === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      if (periodNameEl) periodNameEl.textContent = `Annual Financial Review ${now.getFullYear()}`;
      if (periodDatesEl) periodDatesEl.textContent = `${fmtDate(startDate)} - ${fmtDate(endDate)}`;
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      if (periodNameEl) periodNameEl.textContent = 'Monthly Financial Statement';
      if (periodDatesEl) periodDatesEl.textContent = `${fmtDate(startDate)} - ${fmtDate(endDate)}`;
    }

    // Filter transactions for selected period
    const filteredTxs = txs.filter(t => {
      const d = new Date(t.date);
      return !isNaN(d.getTime()) && d >= startDate && d <= endDate;
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    const catSpentMap = {};
    const catCountMap = {};

    filteredTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') totalIncome += amt;
      if (t.type === 'expense') {
        totalExpenses += amt;
        catSpentMap[t.category] = (catSpentMap[t.category] || 0) + amt;
        catCountMap[t.category] = (catCountMap[t.category] || 0) + 1;
      }
    });

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

    // Set Stats
    const incomeEl = document.getElementById('reportTotalIncome');
    const expenseEl = document.getElementById('reportTotalExpenses');
    const savingsEl = document.getElementById('reportNetSavings');
    const rateEl = document.getElementById('reportSavingsRate');
    if (incomeEl) incomeEl.textContent = formatINR(totalIncome);
    if (expenseEl) expenseEl.textContent = formatINR(totalExpenses);
    if (savingsEl) savingsEl.textContent = formatINR(netSavings);
    if (rateEl) rateEl.textContent = savingsRate + '%';

    // Show empty state if no data in period
    if (filteredTxs.length === 0) {
      const tbody = document.getElementById('reportCategoryTableBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No transactions recorded in this period.</td></tr>';
      renderReportChart(totalIncome, totalExpenses, netSavings);
      return;
    }

    // Render Categories Table
    renderReportCategoryBreakdown(categories, totalExpenses, catSpentMap, catCountMap);

    // Render Chart
    renderReportChart(totalIncome, totalExpenses, netSavings);

  } catch (err) {
    console.error('Error generating report:', err);
    showToast('Failed to generate report', 'error');
  }
}

function renderReportCategoryBreakdown(categories, totalExpenses, catSpentMap = {}, catCountMap = {}) {
  const tbody = document.getElementById('reportCategoryTableBody');
  if (!tbody) return;

  const expenseCats = categories
    .filter(c => c.type === 'expense')
    .map(c => {
      const spent = catSpentMap[c.name] !== undefined ? catSpentMap[c.name] : (c.spent || 0);
      const count = catCountMap[c.name] !== undefined ? catCountMap[c.name] : (c.count || 0);
      const percentage = totalExpenses > 0 ? Number(((spent / totalExpenses) * 100).toFixed(1)) : 0;
      return { ...c, spent, count, percentage };
    })
    .filter(c => c.spent > 0);

  if (expenseCats.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No expense transactions in this period.</td></tr>';
    return;
  }

  tbody.innerHTML = expenseCats.map(c => {
    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid ${c.icon}" style="color: ${c.color}"></i>
            <strong>${c.name}</strong>
          </div>
        </td>
        <td>${c.count}</td>
        <td class="font-bold">${formatINR(c.spent)}</td>
        <td>${c.percentage}%</td>
        <td>
          <div class="progress-bar-bg" style="width: 120px;">
            <div class="progress-bar-fill" style="width: ${c.percentage}%; background: ${c.color};"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}


function renderReportChart(income, expense, savings) {
  const ctx = document.getElementById('reportSummaryChart');
  if (!ctx) return;

  if (reportChartInstance) {
    reportChartInstance.destroy();
  }

  reportChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Total Income', 'Total Expenses', 'Net Retained Savings'],
      datasets: [{
        label: 'Amount (₹)',
        data: [income, expense, savings],
        backgroundColor: ['#22A06B', '#E45858', '#5B4BDB'],
        borderRadius: 6,
        barPercentage: 0.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => ` Amount: ₹${item.raw.toLocaleString('en-IN')}`
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
