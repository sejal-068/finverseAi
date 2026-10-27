/**
 * FinverseAI - Core Global JavaScript Utilities
 * Handles Theme Toggling, Mobile Sidebar, Active Navigation, Toasts, and Modals.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard must run first — may redirect to login
  if (checkAuthGuard()) return;

  initTheme();
  initSidebar();
  initActiveNavLink();
  initUserDropdown();
  initGlobalUserProfile();
  initAdminNavigation();
  initLogoutHandlers();
  initGlobalShortcuts();

  // Populate dynamic elements that depend on user data
  populateDynamicUserElements();

  // Check for redirected denied message
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('denied') === 'admin_only') {
    setTimeout(() => {
      showToast('Access Denied: Administrator privileges required to access User Management.', 'error');
    }, 300);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

/* ==========================================================================
   Auth Guard — Redirect unauthenticated users to login.html
   ========================================================================== */
function checkAuthGuard() {
  const publicPages = [
    'index.html', 'login.html', 'signup.html', 'forgot-password.html', 'reset-password.html',
    'index', 'login', 'signup', 'forgot-password', 'reset-password', ''
  ];
  const currentPage = window.location.pathname.split('/').pop() || '';

  // Skip guard on public pages
  if (publicPages.includes(currentPage)) return false;

  const token = localStorage.getItem('finverse_token');
  if (!token) {
    window.location.href = 'login.html';
    return true; // signal redirect
  }

  // Async token validation (non-blocking — redirect if token is invalid)
  if (window.finverseAPI && typeof window.finverseAPI._fetchAPI === 'function') {
    window.finverseAPI._fetchAPI('/auth/me')
      .then(res => {
        if (!res.success) {
          localStorage.removeItem('finverse_token');
          localStorage.removeItem('finverse_user');
          window.location.href = 'login.html';
        } else if (res.data) {
          localStorage.setItem('finverse_user', JSON.stringify(res.data));
          initGlobalUserProfile();
          initAdminNavigation();
          populateDynamicUserElements();
        }
      })
      .catch((err) => {
        if (err && err.message && (err.message.includes('401') || err.message.includes('token') || err.message.includes('Access denied'))) {
          localStorage.removeItem('finverse_token');
          localStorage.removeItem('finverse_user');
          window.location.href = 'login.html';
        } else {
          console.warn('Auth check skipped (offline or network error). Keeping active session.');
        }
      });
  }

  return false;
}

/* ==========================================================================
   Populate Dynamic User Elements (reports, coach, dashboard greeting)
   ========================================================================== */
function populateDynamicUserElements() {
  try {
    const raw = localStorage.getItem('finverse_user');
    if (!raw) return;
    const user = JSON.parse(raw);
    if (!user) return;

    const firstName = user.name ? user.name.split(' ')[0] : '';

    // Dashboard greeting: "Good Morning, Sejal"
    const greetingEl = document.getElementById('dashboardGreeting');
    if (greetingEl && firstName) {
      const hour = new Date().getHours();
      let greeting = 'Good Evening';
      if (hour < 12) greeting = 'Good Morning';
      else if (hour < 17) greeting = 'Good Afternoon';
      greetingEl.textContent = `${greeting}, ${firstName}`;
    }

    // Reports page: "Generated for: Sejal Shambharkar (email)"
    const reportNameEl = document.getElementById('reportUserName');
    if (reportNameEl) reportNameEl.textContent = user.name || '—';
    const reportEmailEl = document.getElementById('reportUserEmail');
    if (reportEmailEl) reportEmailEl.textContent = user.email || '—';

    // Financial Coach welcome
    const coachWelcome = document.getElementById('coachWelcomeMsg');
    if (coachWelcome && firstName && !coachWelcome.innerHTML.includes('financial partner')) {
      coachWelcome.innerHTML = `Hi ${firstName}! I'm here as your personal financial partner. How can I help you navigate your finances today?`;
    }

  } catch (e) {
    console.error('Error populating dynamic user elements:', e);
  }
}

/* ==========================================================================
   Theme Management (Light / Dark Mode)
   ========================================================================== */
function initTheme() {
  const savedTheme = localStorage.getItem('finverse_theme') || 'light';
  applyTheme(savedTheme);

  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('finverse_theme', newTheme);
      showToast(`Switched to ${newTheme} mode`, 'info');
    });
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcons = document.querySelectorAll('.theme-toggle-btn i');
  themeIcons.forEach(icon => {
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
    } else {
      icon.className = 'fa-solid fa-moon';
    }
  });
}

/* ==========================================================================
   Mobile Sidebar Drawer
   ========================================================================== */
function initSidebar() {
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  
  if (!sidebar) return;

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('show');
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('show')) {
      if (!sidebar.contains(e.target) && (!mobileMenuBtn || !mobileMenuBtn.contains(e.target))) {
        sidebar.classList.remove('show');
      }
    }
  });
}

/* ==========================================================================
   Active Navigation Link Highlighter
   ========================================================================== */
function initActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/* ==========================================================================
   Header User Dropdown Menu & Profile Synchronization
   ========================================================================== */
function initUserDropdown() {
  const profilePill = document.querySelector('.user-profile-pill');
  const dropdownMenu = document.querySelector('.user-dropdown-menu');

  if (profilePill && dropdownMenu) {
    profilePill.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      dropdownMenu.classList.remove('show');
    });
  }
}

function initGlobalUserProfile() {
  try {
    const raw = localStorage.getItem('finverse_user');
    if (!raw) return;
    const user = JSON.parse(raw);
    if (!user || !user.name) return;

    // Calculate Initials (e.g. "Sejal Verma" -> "SV")
    const nameParts = user.name.trim().split(' ').filter(Boolean);
    let initials = nameParts[0] ? nameParts[0][0].toUpperCase() : 'U';
    if (nameParts.length > 1) {
      initials += nameParts[nameParts.length - 1][0].toUpperCase();
    }

    // Update Header Avatar: Picture or Initials
    document.querySelectorAll('.user-avatar').forEach((el) => {
      if (user.avatarUrl) {
        el.innerHTML = `<img src="${user.avatarUrl}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.textContent='${initials}';">`;
      } else {
        el.textContent = initials;
      }
    });

    // Update Header User Full Name
    document.querySelectorAll('.user-name').forEach((el) => {
      el.textContent = user.name;
    });

    // Update User Role / Goal
    document.querySelectorAll('.user-role').forEach((el) => {
      el.textContent = user.primaryGoal || user.financialGoal || 'Personal Plan';
    });

    // Update Profile Page Displays if present
    const profileNameInput = document.getElementById('profileName');
    if (profileNameInput && !profileNameInput.value) {
      profileNameInput.value = user.name;
    }
    const profileEmailInput = document.getElementById('profileEmail');
    if (profileEmailInput && !profileEmailInput.value) {
      profileEmailInput.value = user.email;
    }
  } catch (e) {
    console.error('Error syncing user profile in header:', e);
  }
}

/* ==========================================================================
   Admin Navigation Management (Sidebar & Dropdown)
   ========================================================================== */
function initAdminNavigation() {
  try {
    const raw = localStorage.getItem('finverse_user');
    let isAdmin = false;

    if (raw) {
      const user = JSON.parse(raw);
      if (user) {
        if (user.role === 'admin' || (user.email && user.email.toLowerCase() === 'sejalshambharkar068@gmail.com')) {
          isAdmin = true;
        }
      }
    }

    const adminNavs = document.querySelectorAll('.admin-only-nav');

    if (isAdmin) {
      // 1. Show existing admin nav groups in sidebar
      adminNavs.forEach(el => {
        el.style.display = 'block';
      });

      // 2. If no admin link exists in this page's sidebar, dynamically inject it
      const existingLink = document.querySelector('.sidebar a[href="user-management.html"]');
      if (!existingLink) {
        const sidebarNavContainer = document.querySelector('.sidebar-content > div') || document.querySelector('.sidebar-menu') || document.querySelector('.sidebar-content');
        if (sidebarNavContainer) {
          const adminGroup = document.createElement('div');
          adminGroup.className = 'nav-group admin-only-nav';
          adminGroup.innerHTML = `
            <span class="nav-label">Administration</span>
            <ul class="nav-list">
              <li>
                <a href="user-management.html" class="nav-link ${window.location.pathname.includes('user-management') ? 'active' : ''}">
                  <i class="fa-solid fa-users-gear"></i>
                  <span>User Management</span>
                  <span class="nav-badge" style="background: var(--warning); color: #000;">Admin</span>
                </a>
              </li>
            </ul>
          `;
          const sidebarBottom = document.querySelector('.sidebar-bottom');
          if (sidebarNavContainer.classList.contains('sidebar-content') && sidebarBottom) {
            sidebarNavContainer.insertBefore(adminGroup, sidebarBottom);
          } else {
            sidebarNavContainer.appendChild(adminGroup);
          }
        }
      }

      // 3. Add to User Dropdown if not already present
      document.querySelectorAll('.user-dropdown-menu').forEach(menu => {
        if (!menu.querySelector('a[href="user-management.html"]')) {
          const item = document.createElement('a');
          item.href = 'user-management.html';
          item.className = 'dropdown-item';
          item.innerHTML = '<i class="fa-solid fa-users-gear"></i> User Management';
          const divider = menu.querySelector('.dropdown-divider');
          if (divider) menu.insertBefore(item, divider);
          else menu.appendChild(item);
        }
      });
    } else {
      // Normal user: Strictly hide or remove admin navigation options
      adminNavs.forEach(el => {
        el.style.display = 'none';
      });
      document.querySelectorAll('a[href="user-management.html"]').forEach(el => {
        const li = el.closest('li');
        if (li) {
          const navGroup = li.closest('.nav-group');
          li.remove();
          if (navGroup && (!navGroup.querySelector('li') || navGroup.classList.contains('admin-only-nav'))) {
            navGroup.remove();
          }
        } else {
          el.remove();
        }
      });
    }
  } catch (e) {
    console.error('Error in initAdminNavigation:', e);
  }
}

function initLogoutHandlers() {
  document.querySelectorAll('a[href="login.html"], .logout-btn').forEach((link) => {
    const text = link.textContent.toLowerCase();
    if (text.includes('logout') || text.includes('sign out')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('finverse_token');
        localStorage.removeItem('finverse_user');
        window.location.href = 'login.html';
      });
    }
  });
}

/* ==========================================================================
   Keyboard Shortcuts
   ========================================================================== */
function initGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Focus search on Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      const searchInput = document.querySelector('.header-search input, .search-box-wide input');
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    }
    // Close modal on Escape
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

/* ==========================================================================
   Currency & Number Formatters
   ========================================================================== */
function formatINR(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-xmark';
  if (type === 'warning') iconClass = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass} toast-icon"></i>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

/* ==========================================================================
   Modal Helpers
   ========================================================================== */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('show'));
  document.body.style.overflow = '';
}

/* ==========================================================================
   Form Input Error & Sanitization Helpers (Global)
   ========================================================================== */
function showInputError(inputEl, message) {
  if (!inputEl) return;
  const formGroup = inputEl.closest('.form-group');
  if (!formGroup) return;
  formGroup.classList.add('has-error');
  let errorEl = formGroup.querySelector('.form-error');
  if (errorEl && message) {
    errorEl.textContent = message;
  }
}

function clearInputError(inputEl) {
  if (!inputEl) return;
  const formGroup = inputEl.closest('.form-group');
  if (!formGroup) return;
  formGroup.classList.remove('has-error');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
