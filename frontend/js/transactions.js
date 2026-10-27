/**
 * FinverseAI - Transactions Page Controller
 * Handles Data Table, Search, Filtering, Sorting, Pagination, CSV Export, and CRUD Modals.
 */

let allTransactions = [];
let currentPage = 1;
const itemsPerPage = 8;
let currentEditId = null;
let currentDeleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  await loadTransactions();
});

function initEventListeners() {
  // Search and Filter controls
  const searchInput = document.getElementById('txSearchInput');
  const catFilter = document.getElementById('txCategoryFilter');
  const typeFilter = document.getElementById('txTypeFilter');
  const sortSelect = document.getElementById('txSortSelect');

  if (searchInput) searchInput.addEventListener('input', debounce(loadTransactions, 250));
  if (catFilter) catFilter.addEventListener('change', loadTransactions);
  if (typeFilter) typeFilter.addEventListener('change', loadTransactions);
  if (sortSelect) sortSelect.addEventListener('change', loadTransactions);

  // Add Transaction Form
  const addTxForm = document.getElementById('addTransactionForm');
  if (addTxForm) {
    addTxForm.addEventListener('submit', handleAddOrEditSubmit);
  }

  // Delete Confirmation Button
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  }

  // Export CSV Button
  const exportBtn = document.getElementById('exportCsvBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportCSV);
  }

  // Pagination buttons
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  if (prevBtn) prevBtn.addEventListener('click', () => changePage(currentPage - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => changePage(currentPage + 1));
}

async function loadTransactions() {
  if (!window.finverseAPI) return;

  const search = document.getElementById('txSearchInput')?.value.trim() || '';
  const category = document.getElementById('txCategoryFilter')?.value || 'all';
  const type = document.getElementById('txTypeFilter')?.value || 'all';
  const sortBy = document.getElementById('txSortSelect')?.value || 'date-desc';

  try {
    allTransactions = await window.finverseAPI.getTransactions({
      search,
      category,
      type,
      sortBy
    });

    currentPage = 1;
    renderTransactionTable();
    updateSummaryStats(allTransactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    showToast('Failed to load transactions', 'error');
  }
}

function updateSummaryStats(txs) {
  let totalIncome = 0;
  let totalExpense = 0;

  txs.forEach(t => {
    if (t.type === 'income') totalIncome += Number(t.amount);
    if (t.type === 'expense') totalExpense += Number(t.amount);
  });

  const incomeEl = document.getElementById('summaryIncomeVal');
  const expenseEl = document.getElementById('summaryExpenseVal');
  const countEl = document.getElementById('summaryCountVal');

  if (incomeEl) incomeEl.textContent = formatINR(totalIncome);
  if (expenseEl) expenseEl.textContent = formatINR(totalExpense);
  if (countEl) countEl.textContent = txs.length + ' Items';
}

function renderTransactionTable() {
  const tbody = document.getElementById('transactionsTableBody');
  const emptyState = document.getElementById('transactionsEmptyState');
  const pagination = document.getElementById('transactionsPagination');

  if (!tbody) return;

  if (allTransactions.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
    if (pagination) pagination.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (pagination) pagination.style.display = 'flex';

  const totalPages = Math.ceil(allTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageTransactions = allTransactions.slice(startIndex, startIndex + itemsPerPage);

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

  tbody.innerHTML = pageTransactions.map(tx => {
    const isIncome = tx.type === 'income';
    const icon = categoryIcons[tx.category] || 'fa-receipt';
    const sign = isIncome ? '+' : '-';
    const amountClass = isIncome ? 'income' : 'expense';
    const typeBadge = isIncome 
      ? `<span class="badge badge-success"><i class="fa-solid fa-arrow-down"></i> Income</span>`
      : `<span class="badge badge-danger"><i class="fa-solid fa-arrow-up"></i> Expense</span>`;

    return `
      <tr>
        <td class="font-mono text-muted" style="font-size: 0.8rem;">${formatDate(tx.date)}</td>
        <td>
          <div class="tx-cell-description">
            <div class="tx-icon-pill">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div class="tx-details-col">
              <span class="tx-main-title">${tx.description}</span>
              ${tx.notes ? `<span class="tx-note">${tx.notes}</span>` : ''}
            </div>
          </div>
        </td>
        <td>
          <span class="badge badge-info">${tx.category}</span>
        </td>
        <td>${typeBadge}</td>
        <td>
          <span class="payment-badge">
            <i class="fa-regular fa-credit-card"></i> ${tx.paymentMethod || 'UPI'}
          </span>
        </td>
        <td class="tx-amount-col ${amountClass}">
          ${sign}${formatINR(tx.amount)}
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-table-action" onclick="openEditModal('${tx.id}')" title="Edit Transaction">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="btn-table-action delete" onclick="openDeleteModal('${tx.id}')" title="Delete Transaction">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pageNumbersContainer = document.getElementById('pageNumbersContainer');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const paginationInfo = document.getElementById('paginationInfoText');

  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;

  if (paginationInfo) {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, allTransactions.length);
    paginationInfo.textContent = `Showing ${start}-${end} of ${allTransactions.length} transactions`;
  }

  if (pageNumbersContainer) {
    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i++) {
      pagesHtml += `
        <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
          ${i}
        </button>
      `;
    }
    pageNumbersContainer.innerHTML = pagesHtml;
  }
}

function changePage(newPage) {
  const totalPages = Math.ceil(allTransactions.length / itemsPerPage);
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderTransactionTable();
  }
}

/* ==========================================================================
   Add / Edit Transaction Modal Handlers
   ========================================================================== */
function openAddTransactionModal() {
  currentEditId = null;
  const form = document.getElementById('addTransactionForm');
  if (form) form.reset();

  const titleEl = document.getElementById('txModalTitle');
  if (titleEl) titleEl.textContent = 'Add Transaction';

  // Set default date to today
  const dateInput = document.getElementById('txDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  openModal('transactionModal');
}

function openEditModal(txId) {
  const tx = allTransactions.find(t => t.id === txId);
  if (!tx) return;

  currentEditId = txId;
  const titleEl = document.getElementById('txModalTitle');
  if (titleEl) titleEl.textContent = 'Edit Transaction';

  document.getElementById('txAmount').value = tx.amount;
  document.getElementById('txDescription').value = tx.description;
  document.getElementById('txCategory').value = tx.category;
  document.getElementById('txDate').value = tx.date;
  document.getElementById('txType').value = tx.type;
  document.getElementById('txPaymentMethod').value = tx.paymentMethod || 'UPI';
  document.getElementById('txNotes').value = tx.notes || '';

  openModal('transactionModal');
}

async function handleAddOrEditSubmit(e) {
  e.preventDefault();

  const amount = Number(document.getElementById('txAmount').value);
  const description = document.getElementById('txDescription').value.trim();
  const category = document.getElementById('txCategory').value;
  const date = document.getElementById('txDate').value;
  const type = document.getElementById('txType').value;
  const paymentMethod = document.getElementById('txPaymentMethod').value;
  const notes = document.getElementById('txNotes').value.trim();

  if (!amount || amount <= 0) {
    showToast('Please enter a valid amount', 'warning');
    return;
  }
  if (!description) {
    showToast('Please enter a description', 'warning');
    return;
  }

  const payload = { amount, description, category, date, type, paymentMethod, notes };

  try {
    if (currentEditId) {
      await window.finverseAPI.updateTransaction(currentEditId, payload);
      showToast('Transaction updated successfully', 'success');
    } else {
      await window.finverseAPI.createTransaction(payload);
      showToast('Transaction added successfully', 'success');
    }

    closeModal('transactionModal');
    await loadTransactions();

    // Trigger budget alert check for the affected category (expense transactions only)
    if (type === 'expense' && window.BudgetAlertEngine) {
      setTimeout(() => window.BudgetAlertEngine.check(category, { force: true, addedAmount: amount }), 300);
    }
  } catch (err) {
    console.error('Error saving transaction:', err);
    showToast('Failed to save transaction', 'error');
  }
}

/* ==========================================================================
   Delete Transaction Handlers
   ========================================================================== */
function openDeleteModal(txId) {
  currentDeleteId = txId;
  openModal('deleteModal');
}

async function handleConfirmDelete() {
  if (!currentDeleteId) return;

  // Capture the category before deletion (expense check)
  const txToDelete = allTransactions.find(t => (t.id || t._id) === currentDeleteId);
  const deletedCategory = txToDelete && txToDelete.type === 'expense' ? txToDelete.category : null;

  try {
    await window.finverseAPI.deleteTransaction(currentDeleteId);
    showToast('Transaction deleted', 'success');
    closeModal('deleteModal');
    currentDeleteId = null;
    await loadTransactions();

    // Re-check budget state for the deleted category (spending may have dropped)
    if (deletedCategory && window.BudgetAlertEngine) {
      setTimeout(() => window.BudgetAlertEngine.check(deletedCategory), 400);
    }
  } catch (err) {
    console.error('Error deleting transaction:', err);
    showToast('Failed to delete transaction', 'error');
  }
}

/* ==========================================================================
   CSV Export
   ========================================================================== */
function handleExportCSV() {
  if (allTransactions.length === 0) {
    showToast('No transactions to export', 'warning');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'ID,Date,Description,Category,Type,Amount (INR),Payment Method,Notes\n';

  allTransactions.forEach(t => {
    const row = [
      t.id,
      t.date,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.category}"`,
      t.type,
      t.amount,
      `"${t.paymentMethod || ''}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `FinverseAI_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Transactions exported to CSV', 'success');
}

// Utility debounce helper
function debounce(fn, wait) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Expose modal openers to window scope for onclick bindings
window.openAddTransactionModal = openAddTransactionModal;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.changePage = changePage;
