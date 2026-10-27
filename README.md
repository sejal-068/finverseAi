# FinverseAI - Modern AI-Powered Personal Finance Platform

> *"Understand your money. Plan your future."*

FinverseAI is a full-stack personal finance management application with a responsive **Vanilla HTML5/CSS3/JavaScript** frontend and a production-structured **Node.js + Express.js + MongoDB + Mongoose** backend with JWT authentication and realistic Indian Rupee (INR ₹) financial datasets.

---

## 📁 Complete Project Structure

```
FinverseAI/
├── frontend/                     # Pure HTML5, CSS3, & Vanilla JS frontend
│   ├── index.html                # Modern Landing Page
│   ├── login.html                # User Login & Validation
│   ├── signup.html               # Registration & Financial Goal Setup
│   ├── forgot-password.html      # Password Recovery Flow
│   ├── dashboard.html            # Core Financial Dashboard & Charts
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
│   │   ├── api.js                # Centralized mock REST service layer (Promises & Seed Data)
│   │   ├── main.js               # Global UI: Themes, Sidebar, Toasts, Modals
│   │   ├── auth.js               # Form Validation & Auth Handlers
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
├── backend/                      # Production REST API Backend
│   ├── server.js                 # Express Application Entrypoint & CORS setup
│   ├── package.json              # Backend Dependencies & Scripts
│   ├── .env                      # Local Environment Variables
│   ├── .env.example              # Environment Configuration Template
│   ├── .gitignore                # Node modules and secrets ignore rules
│   │
│   ├── config/
│   │   └── db.js                 # Mongoose MongoDB Connection Handler
│   │
│   ├── models/
│   │   ├── User.js               # User Schema with Goal Subdocs & bcrypt Hashing
│   │   ├── Transaction.js        # Transaction Schema with Composite Indexing
│   │   ├── Category.js           # Category Schema (Default & Custom)
│   │   └── Budget.js             # Budget Schema with Warning Thresholds
│   │
│   ├── controllers/
│   │   ├── authController.js     # Signup, Login, and Get Me Controllers
│   │   ├── userController.js     # User Profile & Milestone Goal CRUD
│   │   ├── transactionController.js # Multi-filtered Transaction CRUD
│   │   ├── categoryController.js # Dynamic Spending Aggregations
│   │   ├── budgetController.js   # Real-time Budget Utilization & Warnings
│   │   ├── dashboardController.js# Dashboard Aggregated KPI Metrics
│   │   └── analyticsController.js# Multi-range Cash Flow & Trajectory Engine
│   │
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth Endpoints
│   │   ├── userRoutes.js         # /api/user Endpoints
│   │   ├── transactionRoutes.js  # /api/transactions Endpoints
│   │   ├── categoryRoutes.js     # /api/categories Endpoints
│   │   ├── budgetRoutes.js       # /api/budgets Endpoints
│   │   ├── dashboardRoutes.js    # /api/dashboard Endpoints
│   │   └── analyticsRoutes.js    # /api/analytics Endpoints
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT Bearer Token Guard
│   │   └── errorMiddleware.js    # 404 & Centralized Error Handler
│   │
│   └── utils/
│       └── seedData.js           # MongoDB Seeder with Realistic INR Data
│
└── README.md
```

---

## 🚀 How to Run in Visual Studio Code

### Step 1: Open the Project
1. Open VS Code: `File > Open Folder...` -> Select `FinverseAI`

### Step 2: Set Up & Start the Backend
1. Open a new Terminal in VS Code (`Ctrl+\`` or `Terminal > New Terminal`).
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Verify or update your `.env` configuration (default provided):
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://127.0.0.1:27017/finverseai
   JWT_SECRET=finverseai_jwt_production_secret_key_2026_sejal
   JWT_EXPIRE=30d
   ```
5. (Optional) Seed the database with initial categories & demo data:
   ```bash
   npm run seed
   ```
6. Start the backend development server:
   ```bash
   npm run dev
   # or
   npm start
   ```
   The backend will be live at `http://localhost:5000`.

### Step 3: Run the Frontend
1. In the VS Code file explorer, right-click on `frontend/index.html` or `frontend/dashboard.html`.
2. Select **"Open with Live Server"** (using the Live Server extension by *Ritwick Dey*).
3. The frontend will launch at `http://127.0.0.1:5500/frontend/index.html`.

---

## 📡 REST API Documentation

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/signup` - Register a new user account with personal goals and monthly income.
- `POST /api/auth/login` - Authenticate with email & password; returns JWT token.
- `GET /api/auth/me` - Fetch currently authenticated user details (Protected).
- `POST /api/auth/google` - Google OAuth 2.0 Sign-In and account linkage.
- `POST /api/auth/forgot-password` - Request a secure password reset link via email.
- `GET /api/auth/reset-password/:token` - Validate password reset link (15-min expiry).
- `PUT /api/auth/reset-password/:token` - Set new password (one-time-use protected).

**Default Demo Account:**
- **Email**: `demo@finverse.ai`
- **Password**: `Finverse@2026`

### 👤 User Profile (`/api/user`)
- `GET /api/user/profile` - Get user profile and financial target milestones (Protected).
- `PUT /api/user/profile` - Update name, email, monthly income, goals, and targets (Protected).

### 💳 Transactions (`/api/transactions`)
- `GET /api/transactions` - Fetch transactions with multi-filtering and sorting (Protected).
  - *Query Params*: `search`, `category`, `type` (`income`/`expense`), `startDate`, `endDate`, `sortBy` (`date-desc`, `date-asc`, `amount-desc`, `amount-asc`).
- `POST /api/transactions` - Create a new transaction (Protected).
- `GET /api/transactions/:id` - Get transaction details by ID (Protected).
- `PUT /api/transactions/:id` - Update existing transaction (Protected).
- `DELETE /api/transactions/:id` - Delete transaction (Protected).

### 🏷️ Categories (`/api/categories`)
- `GET /api/categories` - Returns system & custom categories with real-time aggregated spending share (Protected).
- `POST /api/categories` - Create a custom category (Protected).
- `PUT /api/categories/:id` - Update custom category (Protected).
- `DELETE /api/categories/:id` - Delete custom category (Protected).

### 🎯 Budgets (`/api/budgets`)
- `GET /api/budgets` - Fetch active budgets with real-time utilization % and warning status (`normal`, `warning`, `danger`) (Protected).
- `POST /api/budgets` - Create a new budget ceiling (Protected).
- `PUT /api/budgets/:id` - Update budget amount or alert threshold (Protected).
- `DELETE /api/budgets/:id` - Delete budget (Protected).

### 📊 Dashboard (`/api/dashboard`)
- `GET /api/dashboard` - Returns computed total balance, income, expenses, savings rate, recent transactions, health score (0–100), and top category summary (Protected).

### 📈 Analytics (`/api/analytics`)
- `GET /api/analytics` - Computes multi-period cash flow trajectories, daily averages, and category distribution (Protected).
  - *Query Params*: `range` (`7d`, `30d`, `3m`, `6m`, `1y`).

---

## 🛠️ Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB & Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs
- **Validation**: express-validator
- **Security & Utilities**: CORS, dotenv
- **Frontend**: HTML5, CSS3, Vanilla ES6+ JavaScript, Chart.js 4.4.1
