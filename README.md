# FinverseAI - Modern AI-Powered Personal Finance Management Frontend

> *"Understand your money. Plan your future."*

FinverseAI is a responsive personal finance management frontend built with **HTML5, CSS3, and Vanilla JavaScript**. It features an AI-powered design language, interactive **Chart.js** data visualizations, dark/light theme switching, and a modular architecture ready for REST API integration with a backend (Node.js/Express + MongoDB + Python ML).

---

## 🌟 Key Features

1. **AI-Driven Insights & Anomalies**:
   - Behavioural pattern detection (e.g. weekend spending surges).
   - Spending anomaly alerts (e.g. Shopping up 42%).
   - Next-month predictive expense forecasting (₹27,800 baseline).
   - Interactive compound savings simulator.

2. **AI Financial Coach Chatbot**:
   - Context-aware chatbot analyzing live financial inflow and outflow.
   - Quick prompt pills for affordability checks (*"Can I afford a ₹5,000 purchase?"*), 50/30/20 budget generation, and savings strategies.

3. **Complete Financial Dashboard**:
   - Total Balance, Total Inflow, Total Outflow, and Net Savings in Indian Rupees (₹).
   - Dynamic 0–100 Financial Health Score meter with positive factors & areas to improve.
   - 4 Chart.js charts: Income vs Expenses, Weekly Pace, Category Donut, Savings Trend.

4. **Transaction Management (Full CRUD)**:
   - Real-time search, category filtering, type filtering (Income/Expense), and sorting.
   - Add, edit, and delete transactions with modal forms and validation.
   - CSV export capability.

5. **Category & Budget Trackers**:
   - Visual category distribution with share percentages.
   - Budget threshold meters with warning tags (*Normal*, *Near Limit*, *Over Budget*).

6. **Financial Reports & Statement Export**:
   - Weekly, monthly, and annual financial statements.
   - Print & PDF download formatting.

7. **Theme Engine & Indian Rupee (INR ₹) Standards**:
   - Seamless Light & Dark mode toggle stored in `localStorage`.
   - Formatted in Indian numbering system.

---

## 📁 Complete Project Structure

```
FinverseAI/
│
├── frontend/
│   ├── index.html                # Professional Landing Page
│   ├── login.html                # User Login & Validation
│   ├── signup.html               # Registration & Financial Goal Setup
│   ├── forgot-password.html      # Password Recovery Flow
│   ├── dashboard.html            # Core Financial Dashboard
│   ├── transactions.html         # Transaction Table & CRUD Modals
│   ├── categories.html           # Category Breakdown & Custom Categories
│   ├── budgets.html              # Budget Caps & Threshold Warnings
│   ├── analytics.html            # Deep-dive Analytics & Cash Flow Charts
│   ├── ai-insights.html          # ML Prediction & Anomaly Engine
│   ├── financial-coach.html      # Interactive AI Advisor Chat Interface
│   ├── reports.html              # Financial Statements & PDF Export
│   ├── profile.html              # Profile Management & Goal Trackers
│   ├── settings.html             # Theme, Notifications, & Storage Reset
│   │
│   ├── css/
│   │   ├── style.css             # Global Design System, Tokens, & Components
│   │   ├── auth.css              # Authentication & Password Strength Forms
│   │   ├── dashboard.css         # Dashboard Widgets, Score Cards & Summary
│   │   ├── transactions.css      # Table, Search Toolbars, & Modals
│   │   ├── categories.css        # Category Grid & Donut Wrapper
│   │   ├── budgets.css           # Budget Progress Bars & Threshold States
│   │   ├── analytics.css         # Multi-metric KPI Cards & Chart Grid
│   │   ├── ai-insights.css       # AI Badges, Predictions, & Simulator
│   │   ├── financial-coach.css   # Chat Bubbles, Prompts, & Status Badges
│   │   ├── reports.css           # Statement Formats & Print Styling
│   │   └── responsive.css        # Breakpoints (Mobile, Tablet, Desktop)
│   │
│   ├── js/
│   │   ├── api.js                # Mock REST API Service Layer (Promises & Seed Data)
│   │   ├── main.js               # Global UI: Themes, Sidebar, Toasts, Modals
│   │   ├── auth.js               # Validation, Password Strength, & Auth Mock
│   │   ├── dashboard.js          # Dashboard Metrics & Chart.js Instances
│   │   ├── transactions.js       # Search, Filter, Sort, Pagination, & CRUD
│   │   ├── categories.js         # Category CRUD & Donut Chart
│   │   ├── budgets.js            # Budget CRUD & Utilization Logic
│   │   ├── analytics.js          # Date Range Filtering & Multi-chart Views
│   │   ├── ai-insights.js        # Predictive Calculations & Savings Slider
│   │   ├── financial-coach.js    # AI Chat Simulation & Rule Engine
│   │   ├── reports.js            # Statement Generation & PDF Trigger
│   │   ├── profile.js            # Profile Details & Target Milestones
│   │   └── settings.js           # Theme Switcher & Storage Reset
│   │
│   └── assets/
│       └── images/
│           └── logo.svg          # FinverseAI Vector Logo
│
└── README.md
```

---

## 🚀 How to Run in VS Code

### Option 1: Using VS Code Live Server (Recommended)
1. Open the project folder in **Visual Studio Code**:
   `File > Open Folder...` -> Select `FinverseAI`
2. Install the **Live Server** extension by *Ritwick Dey* from the VS Code Extensions Marketplace (`Ctrl+Shift+X` or `Cmd+Shift+X`, search for `Live Server`).
3. Right-click on `frontend/index.html` (or `frontend/dashboard.html`) in the Explorer pane.
4. Click **"Open with Live Server"**.
5. Live Server will automatically open `http://127.0.0.1:5500/frontend/index.html` in your default browser.

### Option 2: Using Node.js `npx serve` or Python
If you have Node.js or Python installed, run in terminal:
```bash
# Using Node.js
npx serve frontend

# Or using Python 3
python -m http.server 8000 --directory frontend
```
Then visit `http://localhost:8000/index.html`.

---

## 🔌 Future Backend Integration Guide (REST API Ready)

The entire frontend data access is isolated in **`frontend/js/api.js`**. All functions return standard JavaScript `Promise` instances.

When developing your backend:
1. **Node.js + Express**: Create routes corresponding to:
   - `GET /api/dashboard` -> Returns summary totals and recent entries.
   - `GET /api/transactions` -> Accepts query filters (`?category=...&type=...&search=...`).
   - `POST /api/transactions` -> Creates a new transaction document in MongoDB.
   - `PUT /api/transactions/:id` -> Updates an existing transaction.
   - `DELETE /api/transactions/:id` -> Deletes a transaction.
   - `GET /api/budgets` / `POST /api/budgets` -> Manages monthly budget caps.
   - `GET /api/categories` -> Retrieves spending buckets.
   - `GET /api/ai/insights` -> Python ML engine output for predictions & anomalies.
   - `POST /api/ai/coach` -> Connects to an LLM / Python LangChain service.

2. Replace the `localStorage` implementation in `js/api.js` with `fetch('/api/...')` calls:
   ```javascript
   async getTransactions(filters = {}) {
     const query = new URLSearchParams(filters).toString();
     const response = await fetch(`/api/transactions?${query}`);
     return await response.json();
   }
   ```
   **No frontend UI or HTML files will need to be rewritten.**

---

## 💻 Tech Stack & Design Standards
- **HTML5**: Semantic tags (`<header>`, `<aside>`, `<main>`, `<section>`, `<nav>`).
- **CSS3**: CSS Custom Properties for theme tokens, Flexbox & Grid layouts, `@media` print styling, no heavy utility frameworks.
- **Vanilla JavaScript (ES6+)**: Pure modules, event delegation, debounce utilities, asynchronous Promise architecture.
- **Chart.js 4.4.1 (CDN)**: Crisp, responsive charts with custom tooltips and styling.
- **Font Awesome 6.5.1 (CDN)**: Modern FinTech iconography.

---

## 📄 License & College Project Ready
Built for modern fullstack personal finance platforms, academic capstones, and major project presentations.
