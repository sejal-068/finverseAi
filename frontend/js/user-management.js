/**
 * FinverseAI - User Data Management & Individual Ledger Inspection
 * Handles Excel-style registry summary table, individual user detail lookup by userId,
 * real-time user search, and Excel export.
 */

let allUsersCache = [];
let currentUserDetailCache = null;
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initUserManagement();
});

async function initUserManagement() {
  const loadingEl = document.getElementById('adminLoadingState');
  const deniedEl = document.getElementById('accessDeniedState');
  const allUsersView = document.getElementById('allUsersView');
  const userDetailView = document.getElementById('userDetailView');

  // 1. Immediate token check — must be logged in
  const token = localStorage.getItem('finverse_token');
  if (!token) {
    window.location.replace('login.html');
    return;
  }

  // 2. Immediate local role check (fast barrier before network roundtrip)
  const rawUser = localStorage.getItem('finverse_user');
  if (rawUser) {
    try {
      const u = JSON.parse(rawUser);
      const isKnownAdmin = u && (u.role === 'admin' || (u.email && u.email.toLowerCase() === 'sejalshambharkar068@gmail.com'));
      if (!isKnownAdmin) {
        window.location.replace('dashboard.html?denied=admin_only');
        return;
      }
    } catch (e) {}
  }

  try {
    // 3. Server-side verification of admin status
    const accessRes = await window.finverseAPI.checkAdminAccess();

    if (!accessRes.success || !accessRes.isAdmin) {
      window.location.replace('dashboard.html?denied=admin_only');
      return;
    }

    // User is authorized administrator
    if (loadingEl) loadingEl.style.display = 'none';
    if (deniedEl) deniedEl.style.display = 'none';

    initEventListeners();

    // Check if URL has a ?userId= parameter
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('userId');

    if (targetUserId) {
      await openUserDetail(targetUserId);
    } else {
      await loadAllUsers();
    }

  } catch (error) {
    console.error('Error verifying admin access:', error);
    window.location.replace('dashboard.html?denied=admin_only');
  }
}





function initEventListeners() {
  // Search Users
  const searchInput = document.getElementById('userSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderUsersTable();
    });
  }

  // Filter Buttons
  const filterGroup = document.getElementById('filterPillsGroup');
  if (filterGroup) {
    filterGroup.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        filterGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter') || 'all';
        renderUsersTable();
      });
    });
  }

  // Refresh Users Button
  const refreshBtn = document.getElementById('refreshUsersBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadAllUsers(true);
    });
  }

  // Export All Users to CSV
  const exportAllBtn = document.getElementById('exportAllCsvBtn');
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => {
      exportAllUsersToCsv();
    });
  }

  // Back to Users Button
  const backBtn = document.getElementById('backToUsersBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      history.pushState(null, '', 'user-management.html');
      document.getElementById('userDetailView').style.display = 'none';
      document.getElementById('allUsersView').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Export Single User to Excel Button
  const exportUserBtn = document.getElementById('exportUserExcelBtn');
  if (exportUserBtn) {
    exportUserBtn.addEventListener('click', () => {
      if (currentUserDetailCache && currentUserDetailCache.user) {
        const u = currentUserDetailCache.user;
        showToast(`Preparing Excel export for ${u.name}...`, 'info');
        window.finverseAPI.downloadUserExcel(u.id, u.name)
          .then(() => showToast(`Excel export downloaded successfully!`, 'success'))
          .catch((err) => showToast(err.message || 'Export failed', 'error'));
      }
    });
  }

  // Filter within user's transactions ledger
  const txFilter = document.getElementById('txFilterInput');
  if (txFilter) {
    txFilter.addEventListener('input', () => {
      renderUserTransactions();
    });
  }

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const uId = params.get('userId');
    if (uId) {
      openUserDetail(uId, false);
    } else {
      document.getElementById('userDetailView').style.display = 'none';
      document.getElementById('allUsersView').style.display = 'block';
    }
  });
}

/**
 * Load all registered users summary from backend
 */
async function loadAllUsers(isManualRefresh = false) {
  const allUsersView = document.getElementById('allUsersView');
  const userDetailView = document.getElementById('userDetailView');

  if (userDetailView) userDetailView.style.display = 'none';
  if (allUsersView) allUsersView.style.display = 'block';

  try {
    const res = await window.finverseAPI.getAdminUsers();

    if (!res.success) {
      showToast(res.message || 'Failed to fetch users', 'error');
      return;
    }

    allUsersCache = res.data || [];

    // Calculate Platform Totals
    let totalTxns = 0;
    let totalInflow = 0;
    let totalOutflow = 0;

    allUsersCache.forEach(u => {
      totalTxns += Number(u.txCount || 0);
      totalInflow += Number(u.totalIncome || 0);
      totalOutflow += Number(u.totalExpenses || 0);
    });

    document.getElementById('statTotalUsers').textContent = allUsersCache.length;
    document.getElementById('statTotalTxns').textContent = totalTxns;
    document.getElementById('statTotalInflow').textContent = `₹${totalInflow.toLocaleString('en-IN')}`;
    document.getElementById('statTotalOutflow').textContent = `₹${totalOutflow.toLocaleString('en-IN')}`;

    // Update filter counts
    const activeCount = allUsersCache.filter(u => u.txCount > 0).length;
    const zeroCount = allUsersCache.filter(u => u.txCount === 0).length;
    document.getElementById('countAll').textContent = allUsersCache.length;
    document.getElementById('countActive').textContent = activeCount;
    document.getElementById('countZero').textContent = zeroCount;

    renderUsersTable();

    if (isManualRefresh) {
      showToast('Users directory updated', 'success');
    }
  } catch (error) {
    console.error('Error loading users:', error);
    showToast(error.message || 'Unable to connect to users database', 'error');
  }
}

/**
 * Render the Excel-style summary table with real-time filtering
 */
function renderUsersTable() {
  const tableBody = document.getElementById('usersTableBody');
  if (!tableBody) return;

  const searchInput = document.getElementById('userSearchInput');
  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

  // Apply filters
  let filtered = allUsersCache.filter(u => {
    // Search query match
    const nameMatch = (u.name || '').toLowerCase().includes(query);
    const emailMatch = (u.email || '').toLowerCase().includes(query);
    const idMatch = (u.id || '').toLowerCase().includes(query);
    const matchesSearch = nameMatch || emailMatch || idMatch;

    if (!matchesSearch) return false;

    // Filter pill match
    if (activeFilter === 'active') return u.txCount > 0;
    if (activeFilter === 'zero') return u.txCount === 0;
    return true;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <i class="fa-solid fa-users-slash" style="font-size: 2rem; margin-bottom: 0.75rem; display: block;"></i>
          No users match the current search filter "${escapeHtml(query)}".
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map((u, index) => {
    const initials = getInitials(u.name);
    const netSavings = Number(u.netSavings || 0);
    const savingsRate = Number(u.savingsRate || 0);
    const txCount = Number(u.txCount || 0);
    const shortId = u.id ? `${u.id.substring(0, 6)}...${u.id.substring(u.id.length - 4)}` : '—';

    const savingsColor = netSavings > 0 ? 'var(--success)' : (netSavings < 0 ? 'var(--danger)' : 'var(--text-muted)');
    const txBadgeClass = txCount > 0 ? 'badge-primary' : 'badge-secondary';

    return `
      <tr class="user-row" data-user-id="${u.id}" onclick="openUserDetail('${u.id}')" title="Click to inspect this user's full financial data">
        <td class="excel-row-num">${index + 1}</td>
        <td>
          <code style="background: var(--bg-secondary); padding: 0.2rem 0.45rem; border-radius: 4px; font-size: 0.75rem;" title="${u.id}">
            ${shortId}
          </code>
        </td>
        <td>
          <div class="excel-user-pill">
            <div class="excel-user-avatar">${initials}</div>
            <div>
              <div class="excel-user-name">${escapeHtml(u.name || 'Unnamed')}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(u.occupation || u.financialGoal || 'User')}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="excel-user-email">${escapeHtml(u.email || '—')}</span>
        </td>
        <td style="text-align: center;">
          <span class="badge ${txBadgeClass}" style="font-size: 0.75rem;">
            <i class="fa-solid fa-receipt"></i> ${txCount}
          </span>
        </td>
        <td style="text-align: right;" class="excel-currency text-success">
          ₹${Number(u.totalIncome || 0).toLocaleString('en-IN')}
        </td>
        <td style="text-align: right;" class="excel-currency text-danger">
          ₹${Number(u.totalExpenses || 0).toLocaleString('en-IN')}
        </td>
        <td style="text-align: right;" class="excel-currency" style="color: ${savingsColor};">
          ₹${netSavings.toLocaleString('en-IN')}
        </td>
        <td style="text-align: center;">
          <span class="excel-badge" style="background: rgba(99, 102, 241, 0.12); color: var(--primary);">
            ${savingsRate}%
          </span>
        </td>
        <td style="text-align: center;" onclick="event.stopPropagation();">
          <button class="btn btn-primary btn-sm" onclick="openUserDetail('${u.id}')" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">
            <i class="fa-solid fa-folder-open"></i> View Data
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Open detailed view showing ONLY that user's data using their userId
 */
async function openUserDetail(userId, updateHistory = true) {
  if (!userId) return;

  const allUsersView = document.getElementById('allUsersView');
  const userDetailView = document.getElementById('userDetailView');

  // Switch views immediately and scroll to top
  if (allUsersView) allUsersView.style.display = 'none';
  if (userDetailView) userDetailView.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (updateHistory) {
    history.pushState(null, '', `?userId=${userId}`);
  }

  // Show placeholder while loading
  document.getElementById('detailUserName').textContent = 'Loading User Profile...';
  document.getElementById('detailUserEmail').textContent = 'Fetching transactions and budgets...';

  try {
    const res = await window.finverseAPI.getAdminUserDetail(userId);

    if (!res.success || !res.data) {
      showToast(res.message || 'User data not found', 'error');
      return;
    }

    currentUserDetailCache = res.data;
    const { user, financialSummary, categorySpending, budgets, transactions, conversations } = res.data;

    // 1. Populate User Profile Header
    document.getElementById('detailUserIdText').textContent = user.id;
    document.getElementById('detailUserName').textContent = user.name || 'Unnamed';
    document.getElementById('detailUserEmail').textContent = user.email || '—';
    document.getElementById('detailUserAvatar').textContent = getInitials(user.name);
    document.getElementById('detailAuthProviderBadge').textContent = user.authProvider === 'google' ? 'Google OAuth' : 'Local Email';
    document.getElementById('detailMonthlyIncome').textContent = `₹${Number(user.monthlyIncome || 0).toLocaleString('en-IN')}`;
    document.getElementById('detailFinancialGoal').textContent = user.financialGoal || 'Save Money';
    document.getElementById('detailOccupation').textContent = user.occupation || 'Not Specified';
    document.getElementById('detailDependents').textContent = `${user.dependents || 0} ${user.dependents === 1 ? 'person' : 'people'}`;
    document.getElementById('detailCreatedAt').textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—';

    // 2. Populate Financial Summary KPIs
    document.getElementById('detailTotalIncome').textContent = `₹${Number(financialSummary.totalIncome || 0).toLocaleString('en-IN')}`;
    document.getElementById('detailTotalExpenses').textContent = `₹${Number(financialSummary.totalExpenses || 0).toLocaleString('en-IN')}`;
    document.getElementById('detailNetSavings').textContent = `₹${Number(financialSummary.netSavings || 0).toLocaleString('en-IN')}`;
    document.getElementById('detailSavingsRate').textContent = `${financialSummary.savingsRate}%`;
    document.getElementById('detailTxnCount').textContent = `${financialSummary.txCount} Total`;

    // 3. Populate Category-wise Spending
    renderCategorySpending(categorySpending);

    // 4. Populate Budgets
    renderBudgets(budgets);

    // 5. Populate Transactions Ledger
    renderUserTransactions();

    // 6. Populate AI Coach Conversations
    renderConversations(conversations);

  } catch (error) {
    console.error('Error fetching user detail:', error);
    showToast(error.message || 'Failed to load user financial data', 'error');
  }
}

/**
 * Render AI Coach Conversations & Insights History
 */
function renderConversations(conversations = []) {
  const container = document.getElementById('detailConversationsContainer');
  const countBadge = document.getElementById('detailConversationsCountBadge');
  if (!container) return;

  let totalMsgs = 0;
  (conversations || []).forEach(c => {
    totalMsgs += Number(c.messagesCount || (c.messages ? c.messages.length : 0));
  });

  if (countBadge) {
    countBadge.innerHTML = `<i class="fa-solid fa-comments"></i> ${(conversations || []).length} Sessions (${totalMsgs} Messages)`;
  }

  if (!conversations || conversations.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.88rem;">
        <i class="fa-solid fa-robot" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
        No AI Coach conversations logged yet for this user.
      </div>
    `;
    return;
  }

  container.innerHTML = conversations.map((conv, index) => {
    const sessionDate = conv.lastActivity ? new Date(conv.lastActivity).toLocaleString('en-IN') : 'Recent';
    const msgs = conv.messages || [];

    const messagesHtml = msgs.length === 0
      ? '<div style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">No messages in this session.</div>'
      : msgs.map(m => {
          const isUser = m.role === 'user';
          const roleLabel = isUser ? 'User' : 'AI Financial Coach';
          const roleBadgeColor = isUser ? 'var(--primary)' : 'var(--success)';
          const roleIcon = isUser ? 'fa-user' : 'fa-robot';
          const msgTime = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
          const bubbleBg = isUser ? 'rgba(91, 75, 219, 0.08)' : 'rgba(34, 160, 107, 0.08)';
          const borderSide = isUser ? 'border-left: 3px solid var(--primary);' : 'border-left: 3px solid var(--success);';

          return `
            <div class="conversation-msg-bubble ${isUser ? 'user-bubble' : 'coach-bubble'}">
              <div class="conversation-msg-meta">
                <span style="font-weight: 700; color: ${roleBadgeColor}; display: flex; align-items: center; gap: 0.4rem;">
                  <i class="fa-solid ${roleIcon}"></i> ${roleLabel}
                </span>
                <span style="color: var(--text-muted);">${msgTime}</span>
              </div>
              <div style="font-size: 0.85rem; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap;">${escapeHtml(m.content || '')}</div>
            </div>
          `;
        }).join('');

    return `
      <div class="conversation-session-card">
        <div class="conversation-session-header">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <i class="fa-solid fa-comments text-primary" style="font-size: 0.95rem;"></i>
            <strong style="font-size: 0.92rem;">${escapeHtml(conv.title || 'Financial Coaching Session')}</strong>
            <span class="badge" style="background: var(--bg-secondary); font-size: 0.7rem;">Session #${index + 1}</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            <i class="fa-regular fa-clock"></i> ${sessionDate} &nbsp;|&nbsp; <strong>${msgs.length}</strong> messages
          </div>
        </div>
        <div class="conversation-msg-container">
          ${messagesHtml}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Category Spending with progress bars
 */
function renderCategorySpending(categories = []) {
  const container = document.getElementById('detailCategoriesList');
  const countBadge = document.getElementById('detailCategoryCountBadge');
  if (!container) return;

  if (countBadge) countBadge.textContent = `${categories.length} Categories`;

  if (!categories || categories.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
        <i class="fa-solid fa-tags" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
        No category-wise expenses recorded yet for this user.
      </div>
    `;
    return;
  }

  const categoryColors = ['#5B4BDB', '#ec4899', '#f59e0b', '#22A06B', '#0ea5e9', '#7C6CF2', '#14b8a6'];

  container.innerHTML = categories.map((cat, i) => {
    const color = categoryColors[i % categoryColors.length];
    return `
      <div class="category-progress-item">
        <div class="category-progress-label">
          <span><i class="fa-solid fa-circle" style="color: ${color}; font-size: 0.55rem; margin-right: 0.4rem;"></i> ${escapeHtml(cat.category)}</span>
          <span class="excel-currency">₹${cat.amount.toLocaleString('en-IN')} <small style="color: var(--text-muted);">(${cat.percentage}%)</small></span>
        </div>
        <div class="category-progress-track">
          <div class="category-progress-bar" style="width: ${cat.percentage}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Budgets with limits and spent indicators
 */
function renderBudgets(budgets = []) {
  const container = document.getElementById('detailBudgetsList');
  const countBadge = document.getElementById('detailBudgetsCountBadge');
  if (!container) return;

  if (countBadge) countBadge.textContent = `${budgets.length} Budgets`;

  if (!budgets || budgets.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
        <i class="fa-solid fa-wallet" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
        No budgets set up for this user.
      </div>
    `;
    return;
  }

  container.innerHTML = budgets.map(b => {
    const isExceeded = b.spent > b.limit;
    const isWarning = b.percentage >= 80 && !isExceeded;
    const statusColor = isExceeded ? 'var(--danger)' : (isWarning ? 'var(--warning)' : 'var(--success)');
    const statusText = isExceeded ? 'Exceeded' : (isWarning ? 'Warning' : 'Healthy');

    return `
      <div style="background: var(--bg-secondary); padding: 0.85rem 1rem; border-radius: var(--radius-md); margin-bottom: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
          <strong style="font-size: 0.88rem;">${escapeHtml(b.category)}</strong>
          <span class="badge" style="background: ${statusColor}; color: #fff; font-size: 0.7rem;">${statusText} (${b.percentage}%)</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.35rem;">
          <span>Spent: ₹${b.spent.toLocaleString('en-IN')}</span>
          <span>Limit: ₹${b.limit.toLocaleString('en-IN')}</span>
        </div>
        <div class="category-progress-track">
          <div class="category-progress-bar" style="width: ${b.percentage}%; background: ${statusColor};"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Transactions Ledger with search filter
 */
function renderUserTransactions() {
  const tbody = document.getElementById('detailTransactionsTableBody');
  if (!tbody || !currentUserDetailCache) return;

  const txFilter = document.getElementById('txFilterInput');
  const query = (txFilter ? txFilter.value : '').toLowerCase().trim();

  let txList = currentUserDetailCache.transactions || [];

  if (query) {
    txList = txList.filter(t => {
      const desc = (t.description || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const pm = (t.paymentMethod || '').toLowerCase();
      return desc.includes(query) || cat.includes(query) || pm.includes(query);
    });
  }

  if (txList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <i class="fa-solid fa-receipt" style="font-size: 1.8rem; margin-bottom: 0.5rem; display: block;"></i>
          ${query ? 'No transactions match your search filter.' : 'No transactions recorded yet for this user.'}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = txList.map(t => {
    const isIncome = t.type === 'income';
    const typeBadge = isIncome ? 'badge-success' : 'badge-danger';
    const typeIcon = isIncome ? 'fa-arrow-down-left' : 'fa-arrow-up-right';
    const amtColor = isIncome ? 'var(--success)' : 'var(--danger)';
    const dateFormatted = t.date ? new Date(t.date).toLocaleDateString('en-IN') : '—';

    return `
      <tr>
        <td style="white-space: nowrap; font-size: 0.82rem; color: var(--text-muted);">${dateFormatted}</td>
        <td>
          <span class="badge ${typeBadge}" style="font-size: 0.72rem;">
            <i class="fa-solid ${typeIcon}"></i> ${t.type.toUpperCase()}
          </span>
        </td>
        <td style="font-weight: 500;">${escapeHtml(t.description || '—')}</td>
        <td>
          <span class="badge" style="background: var(--bg-secondary); color: var(--text-primary); font-size: 0.75rem;">
            <i class="fa-solid fa-tag" style="font-size: 0.65rem;"></i> ${escapeHtml(t.category || 'General')}
          </span>
        </td>
        <td style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(t.paymentMethod || 'UPI')}</td>
        <td style="text-align: right; font-weight: 700; color: ${amtColor}; font-family: monospace;">
          ${isIncome ? '+' : '-'}₹${Number(t.amount || 0).toLocaleString('en-IN')}
        </td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(t.notes || '—')}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Client-side Export of All Users Summary Table to CSV/Excel
 */
function exportAllUsersToCsv() {
  if (allUsersCache.length === 0) {
    showToast('No users available to export', 'warning');
    return;
  }

  let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
  csv += 'FINVERSE-AI ALL REGISTERED USERS DIRECTORY EXPORT\n';
  csv += `Export Generated,${new Date().toLocaleString('en-IN')}\n\n`;
  csv += '#,User ID,Full Name,Email Address,Total Transactions,Total Income (INR),Total Expenses (INR),Net Savings (INR),Savings Rate %,Monthly Income (INR),Financial Goal,Auth Provider,Registered Date\n';

  allUsersCache.forEach((u, i) => {
    const id = u.id || '';
    const name = (u.name || '').replace(/"/g, '""');
    const email = (u.email || '').replace(/"/g, '""');
    const tx = u.txCount || 0;
    const inc = u.totalIncome || 0;
    const exp = u.totalExpenses || 0;
    const net = u.netSavings || 0;
    const rate = u.savingsRate || 0;
    const mInc = u.monthlyIncome || 0;
    const goal = (u.financialGoal || '').replace(/"/g, '""');
    const auth = u.authProvider || 'local';
    const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '';

    csv += `${i + 1},${id},"${name}","${email}",${tx},"₹${inc.toLocaleString('en-IN')}","₹${exp.toLocaleString('en-IN')}","₹${net.toLocaleString('en-IN')}",${rate}%,"₹${mInc.toLocaleString('en-IN')}","${goal}",${auth},${date}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FinverseAI_All_Users_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('All Users Directory exported to CSV/Excel!', 'success');
}

function getInitials(name = '') {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  let res = parts[0][0].toUpperCase();
  if (parts.length > 1) res += parts[parts.length - 1][0].toUpperCase();
  return res;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
