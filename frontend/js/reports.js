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
    const user = await window.finverseAPI.getUserProfile();

    let totalIncome = 0;
    let totalExpenses = 0;

    txs.forEach(t => {
      if (t.type === 'income') totalIncome += Number(t.amount);
      if (t.type === 'expense') totalExpenses += Number(t.amount);
    });

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

    // Set Dates
    const periodNameEl = document.getElementById('reportPeriodTitle');
    const periodDatesEl = document.getElementById('reportPeriodDates');

    if (type === 'weekly') {
      if (periodNameEl) periodNameEl.textContent = 'Weekly Financial Statement';
      if (periodDatesEl) periodDatesEl.textContent = '14 Aug 2026 - 20 Aug 2026';
    } else if (type === 'yearly') {
      if (periodNameEl) periodNameEl.textContent = 'Annual Financial Review 2026';
      if (periodDatesEl) periodDatesEl.textContent = '01 Jan 2026 - 31 Dec 2026';
    } else {
      if (periodNameEl) periodNameEl.textContent = 'Monthly Financial Statement';
      if (periodDatesEl) periodDatesEl.textContent = '01 Aug 2026 - 31 Aug 2026';
    }

    // Set Stats
    document.getElementById('reportTotalIncome').textContent = formatINR(totalIncome);
    document.getElementById('reportTotalExpenses').textContent = formatINR(totalExpenses);
    document.getElementById('reportNetSavings').textContent = formatINR(netSavings);
    document.getElementById('reportSavingsRate').textContent = savingsRate + '%';

    // Render Categories Table
    renderReportCategoryBreakdown(categories, totalExpenses);

    // Render Chart
    renderReportChart(totalIncome, totalExpenses, netSavings);

  } catch (err) {
    console.error('Error generating report:', err);
    showToast('Failed to generate report', 'error');
  }
}

function renderReportCategoryBreakdown(categories, totalExpenses) {
  const tbody = document.getElementById('reportCategoryTableBody');
  if (!tbody) return;

  const expenseCats = categories.filter(c => c.type === 'expense' && c.spent > 0);

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
        backgroundColor: ['#10B981', '#EF4444', '#6366F1'],
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
