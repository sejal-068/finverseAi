/**
 * FinverseAI - REST API Client (Production)
 * Pure API client — NO localStorage fallbacks, NO demo data.
 * All data comes from the authenticated backend only.
 */

const API_BASE_URL = (typeof window !== 'undefined' && window.location.port === '5000')
  ? '/api'
  : (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname || 'localhost'}:5000/api`
      : 'http://localhost:5000/api');

const STORAGE_KEYS = {
  TOKEN: 'finverse_token',
  USER: 'finverse_user',
};

// Category display metadata (used for icons/colors when backend doesn't provide them)
const CATEGORY_DISPLAY = {
  'Food & Dining':       { icon: 'fa-utensils',           color: '#D97706', bg: '#FEF3C7' },
  'Shopping':            { icon: 'fa-bag-shopping',        color: '#DB2777', bg: '#FCE7F3' },
  'Transport':           { icon: 'fa-car',                 color: '#4F46E5', bg: '#E0E7FF' },
  'Bills & Utilities':   { icon: 'fa-file-invoice-dollar', color: '#DC2626', bg: '#FEE2E2' },
  'Entertainment':       { icon: 'fa-film',                color: '#7C3AED', bg: '#EDE9FE' },
  'Health & Wellness':   { icon: 'fa-heart-pulse',         color: '#059669', bg: '#D1FAE5' },
  'Education':           { icon: 'fa-graduation-cap',      color: '#0284C7', bg: '#E0F2FE' },
  'Travel':              { icon: 'fa-plane',               color: '#EA580C', bg: '#FFEDD5' },
  'Salary':              { icon: 'fa-money-bill-wave',     color: '#059669', bg: '#D1FAE5' },
  'Freelance':           { icon: 'fa-laptop-code',         color: '#0891B2', bg: '#CFFAFE' },
  'Freelance & Bonus':   { icon: 'fa-laptop-code',         color: '#0891B2', bg: '#CFFAFE' },
  'Investment Returns':  { icon: 'fa-chart-line',          color: '#0891B2', bg: '#CFFAFE' },
  'Groceries':           { icon: 'fa-cart-shopping',       color: '#16A34A', bg: '#DCFCE7' },
  'Rent':                { icon: 'fa-house',               color: '#DC2626', bg: '#FEE2E2' },
  'Healthcare':          { icon: 'fa-heart-pulse',         color: '#059669', bg: '#D1FAE5' },
  'Other':               { icon: 'fa-shapes',              color: '#64748B', bg: '#F1F5F9' },
};

class FinverseAPIService {
  constructor() {}

  getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN) || '';
  }

  setToken(token) {
    if (token) localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    else localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Universal HTTP Request helper with JWT authentication & timeout
   */
  async _fetchAPI(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      let data;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (parseErr) {
          data = { message: 'Could not parse response from server' };
        }
      } else {
        const text = await response.text();
        data = { message: (text && text.length < 150) ? text : `Server request failed with status ${response.status}` };
      }

      if (!response.ok) {
        throw new Error(data.message || `API error: ${response.status}`);
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Server request timed out. Please check if the backend is running.');
      }
      throw err;
    }

  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================
  async login(email, password) {
    const res = await this._fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      this.setToken(res.token);
      if (res.user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
    }
    return res;
  }

  async signup(userData) {
    const res = await this._fetchAPI('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (res.token) {
      this.setToken(res.token);
      if (res.user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
    }
    return res;
  }

  async forgotPassword(email) {
    return await this._fetchAPI('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async validateResetToken(token) {
    return await this._fetchAPI(`/auth/reset-password/${encodeURIComponent(token)}`, {
      method: 'GET',
    });
  }

  async resetPassword(token, password) {
    const res = await this._fetchAPI(`/auth/reset-password/${encodeURIComponent(token)}`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
    if (res.token) {
      this.setToken(res.token);
      if (res.user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
    }
    return res;
  }

  async googleAuth(payload) {
    const res = await this._fetchAPI('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) {
      this.setToken(res.token);
      if (res.user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
    }
    return res;
  }

  async getGoogleConfig() {
    return await this._fetchAPI('/auth/google/config');
  }

  // ==========================================
  // USER PROFILE
  // ==========================================
  async getUserProfile() {
    const res = await this._fetchAPI('/user/profile');
    if (res.data) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data));
      return res.data;
    }
    return res;
  }

  async updateUserProfile(userData) {
    const res = await this._fetchAPI('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    if (res.data) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data));
      return res.data;
    }
    return res;
  }

  async changePassword(currentPassword, newPassword) {
    return await this._fetchAPI('/user/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getSettings() {
    return await this._fetchAPI('/user/settings');
  }

  async updateSettings(settings) {
    return await this._fetchAPI('/user/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async deleteAccount(password) {
    return await this._fetchAPI('/user/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  }

  async getChatHistory() {
    return await this._fetchAPI('/ai/chat-history');
  }

  async clearChatHistory() {
    return await this._fetchAPI('/ai/chat-history', {
      method: 'DELETE',
    });
  }

  // ==========================================
  // DASHBOARD
  // ==========================================
  async getDashboardData() {
    const res = await this._fetchAPI('/dashboard');
    return res.data || res;
  }

  // ==========================================
  // TRANSACTIONS
  // ==========================================
  async getTransactions(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.category && filters.category !== 'all') queryParams.append('category', filters.category);
    if (filters.type && filters.type !== 'all') queryParams.append('type', filters.type);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);

    const res = await this._fetchAPI(`/transactions?${queryParams.toString()}`);
    return res.data || [];
  }

  async createTransaction(txData) {
    const res = await this._fetchAPI('/transactions', {
      method: 'POST',
      body: JSON.stringify(txData),
    });
    return res.data || res;
  }

  async updateTransaction(id, updatedData) {
    const res = await this._fetchAPI(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedData),
    });
    return res.data || res;
  }

  async deleteTransaction(id) {
    const res = await this._fetchAPI(`/transactions/${id}`, {
      method: 'DELETE',
    });
    return res;
  }

  // ==========================================
  // CATEGORIES
  // ==========================================
  async getCategories() {
    const res = await this._fetchAPI('/categories');
    return res.data || [];
  }

  async createCategory(catData) {
    const res = await this._fetchAPI('/categories', {
      method: 'POST',
      body: JSON.stringify(catData),
    });
    return res.data || res;
  }

  async deleteCategory(id) {
    const res = await this._fetchAPI(`/categories/${id}`, {
      method: 'DELETE',
    });
    return res;
  }

  // ==========================================
  // BUDGETS
  // ==========================================
  async getBudgets() {
    const res = await this._fetchAPI('/budgets');
    return res.data || [];
  }

  async createBudget(bData) {
    const res = await this._fetchAPI('/budgets', {
      method: 'POST',
      body: JSON.stringify(bData),
    });
    return res.data || res;
  }

  async updateBudget(id, bData) {
    const res = await this._fetchAPI(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bData),
    });
    return res.data || res;
  }

  async deleteBudget(id) {
    const res = await this._fetchAPI(`/budgets/${id}`, {
      method: 'DELETE',
    });
    return res;
  }

  // ==========================================
  // ANALYTICS
  // ==========================================
  async getAnalytics(range = '30d') {
    const res = await this._fetchAPI(`/analytics?range=${range}`);
    return res.data || res;
  }

  // ==========================================
  // AI INSIGHTS & ML PREDICTIONS
  // ==========================================
  async getAIInsights() {
    const res = await this._fetchAPI('/ai/insights');
    return res.data || res;
  }

  async getFinancialHealth() {
    const res = await this._fetchAPI('/ai/health-score');
    return res.data || res;
  }

  async getCoachResponse(userMessage) {
    const res = await this._fetchAPI('/ai/coach', {
      method: 'POST',
      body: JSON.stringify({ message: userMessage }),
    });
    return res.data || res;
  }

  // ==========================================
  // ML PREDICTIONS (new Python service)
  // ==========================================
  async getMLPredictions() {
    const res = await this._fetchAPI('/ai/ml-predict');
    return res.data || res;
  }

  // ==========================================
  // ADMIN USER MANAGEMENT
  // ==========================================
  async checkAdminAccess() {
    return await this._fetchAPI('/admin/check-access');
  }

  async getAdminUsers() {
    return await this._fetchAPI('/admin/users');
  }

  async getAdminUserDetail(userId) {
    return await this._fetchAPI(`/admin/users/${userId}`);
  }

  async downloadUserExcel(userId, userName = 'User') {
    const token = this.getToken();
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || 'Failed to download Excel file');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = (userName || 'User').replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `FinverseAI_${cleanName}_Data_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
}

// Global Singleton Instance
window.finverseAPI = new FinverseAPIService();
