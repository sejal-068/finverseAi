/**
 * FinverseAI - Categories Page Controller
 * Handles Category Breakdown, Spending Distribution Chart, and Custom Category Creation.
 */

let categoryChartInstance = null;
let currentDeleteCatId = null;

document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  await loadCategories();
});

function initEventListeners() {
  const addCategoryForm = document.getElementById('addCategoryForm');
  if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', handleAddCategorySubmit);
  }

  // Icon picker click handler
  document.querySelectorAll('.icon-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      const iconInput = document.getElementById('selectedCategoryIcon');
      if (iconInput) iconInput.value = opt.getAttribute('data-icon');
    });
  });

  const confirmDeleteBtn = document.getElementById('confirmCatDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmCatDelete);
  }
}

async function loadCategories() {
  if (!window.finverseAPI) return;

  try {
    const categories = await window.finverseAPI.getCategories();
    renderCategoriesGrid(categories);
    renderCategoryChart(categories);
  } catch (err) {
    console.error('Error loading categories:', err);
    showToast('Failed to load categories', 'error');
  }
}

function renderCategoriesGrid(categories) {
  const grid = document.getElementById('categoriesGridContainer');
  if (!grid) return;

  const expenseCategories = categories.filter(c => c.type === 'expense');

  grid.innerHTML = expenseCategories.map(cat => {
    return `
      <div class="category-card">
        <div class="cat-card-header">
          <div class="cat-info-group">
            <div class="cat-icon-container" style="background: ${cat.bg || 'var(--bg-subtle)'}; color: ${cat.color || 'var(--primary)'};">
              <i class="fa-solid ${cat.icon || 'fa-tag'}"></i>
            </div>
            <div class="cat-title-wrap">
              <h3>${cat.name}</h3>
              <span>${cat.count} ${cat.count === 1 ? 'transaction' : 'transactions'}</span>
            </div>
          </div>
          <div class="cat-card-actions">
            ${cat.id.startsWith('cat_custom_') || !['cat_food', 'cat_bills', 'cat_shopping'].includes(cat.id) ? `
              <button class="btn-table-action delete" onclick="openDeleteCatModal('${cat.id}')" title="Delete Category">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <div class="cat-spend-amount">
          ${formatINR(cat.spent)}
        </div>

        <div class="cat-progress-section">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${cat.percentage}%; background: ${cat.color || 'var(--primary)'};"></div>
          </div>
          <div class="cat-progress-meta">
            <span>Share of expenses</span>
            <span class="font-bold">${cat.percentage}%</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCategoryChart(categories) {
  const ctx = document.getElementById('categoriesMainChart');
  if (!ctx) return;

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  const expenseCats = categories.filter(c => c.type === 'expense' && c.spent > 0);
  const labels = expenseCats.map(c => c.name);
  const dataValues = expenseCats.map(c => c.spent);
  const bgColors = expenseCats.map(c => c.color || '#4F46E5');

  categoryChartInstance = new Chart(ctx, {
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
          position: 'right',
          labels: { boxWidth: 12, font: { family: 'Inter', size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: (item) => ` ${item.label}: ₹${item.raw.toLocaleString('en-IN')}`
          }
        }
      },
      cutout: '65%'
    }
  });
}

function openAddCategoryModal() {
  const form = document.getElementById('addCategoryForm');
  if (form) form.reset();
  document.getElementById('selectedCategoryIcon').value = 'fa-tag';
  openModal('addCategoryModal');
}

async function handleAddCategorySubmit(e) {
  e.preventDefault();

  const name = document.getElementById('catName').value.trim();
  const icon = document.getElementById('selectedCategoryIcon').value || 'fa-tag';
  const type = document.getElementById('catType').value || 'expense';
  const color = document.getElementById('catColor').value || '#10B981';

  if (!name) {
    showToast('Please enter category name', 'warning');
    return;
  }

  try {
    await window.finverseAPI.createCategory({
      name,
      icon,
      type,
      color,
      bg: color + '20'
    });

    showToast('Custom category created', 'success');
    closeModal('addCategoryModal');
    await loadCategories();
  } catch (err) {
    console.error('Error creating category:', err);
    showToast('Failed to create category', 'error');
  }
}

function openDeleteCatModal(catId) {
  currentDeleteCatId = catId;
  openModal('deleteCatModal');
}

async function handleConfirmCatDelete() {
  if (!currentDeleteCatId) return;

  try {
    await window.finverseAPI.deleteCategory(currentDeleteCatId);
    showToast('Category deleted', 'success');
    closeModal('deleteCatModal');
    currentDeleteCatId = null;
    await loadCategories();
  } catch (err) {
    console.error('Error deleting category:', err);
    showToast('Failed to delete category', 'error');
  }
}

window.openAddCategoryModal = openAddCategoryModal;
window.openDeleteCatModal = openDeleteCatModal;
