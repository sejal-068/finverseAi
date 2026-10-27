/**
 * FinverseAI - Node.js to Python ML Prediction Bridge
 * ----------------------------------------------------
 * Connects the Express backend to the Python Machine Learning Service.
 * Flow:
 * Authenticated User -> MongoDB Transactions -> Monthly Aggregation
 * -> Category Mapping -> Python ML Service -> Predictions, Trends, Budgets.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PYTHON_SERVICE_PATH = path.join(__dirname, '..', 'ml_service', 'ml_service.py');
const ML_SERVICE_HTTP_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';

// Category mapping from application category names to ML category names
const APP_TO_ML_CATEGORY_MAP = {
  'food & dining': 'Food',
  'food': 'Food',
  'dining': 'Food',
  'groceries': 'Groceries',
  'grocery': 'Groceries',
  'shopping': 'Shopping',
  'transport': 'Transport',
  'travel': 'Transport',
  'bills & utilities': 'Bills',
  'bills': 'Bills',
  'utilities': 'Bills',
  'rent': 'Rent',
  'housing': 'Rent',
  'entertainment': 'Entertainment',
  'health & wellness': 'Healthcare',
  'healthcare': 'Healthcare',
  'medical': 'Healthcare',
  'education': 'Education',
};

function mapCategoryToML(categoryName) {
  if (!categoryName) return 'Shopping';
  const clean = categoryName.trim().toLowerCase();
  return APP_TO_ML_CATEGORY_MAP[clean] || 'Shopping';
}

/**
 * Aggregate MongoDB transactions by month for a specific user
 */
function aggregateTransactionsByMonth(transactions, userMonthlyIncome = 0) {
  const monthMap = {};

  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    if (isNaN(d.getTime())) return;

    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = {
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        income: 0,
        Food: 0,
        Shopping: 0,
        Transport: 0,
        Rent: 0,
        Bills: 0,
        Entertainment: 0,
        Healthcare: 0,
        Education: 0,
        Groceries: 0,
        total_expense: 0,
      };
    }

    const amt = Number(tx.amount || 0);
    if (tx.type === 'income') {
      monthMap[monthKey].income += amt;
    } else if (tx.type === 'expense') {
      const mlCategory = mapCategoryToML(tx.category);
      monthMap[monthKey][mlCategory] = (monthMap[monthKey][mlCategory] || 0) + amt;
      monthMap[monthKey].total_expense += amt;
    }
  });

  // Sort months chronologically
  const sortedKeys = Object.keys(monthMap).sort();
  const result = sortedKeys.map((k) => {
    const item = monthMap[k];
    // If no income recorded for that month, fallback to user.monthlyIncome if available
    if (item.income === 0 && userMonthlyIncome > 0) {
      item.income = userMonthlyIncome;
    }
    return item;
  });

  return result;
}

/**
 * Call Python ML Service via CLI (stdin / stdout)
 */
function callPythonViaCLI(payload) {
  return new Promise((resolve, reject) => {
    const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
    const pyProcess = spawn(pythonExecutable, [PYTHON_SERVICE_PATH, '--stdin'], {
      cwd: path.join(__dirname, '..'),
    });

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pyProcess.on('error', (err) => {
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });

    pyProcess.on('close', (code) => {
      try {
        const startMarker = '___PREDICTION_OUTPUT_START___';
        const endMarker = '___PREDICTION_OUTPUT_END___';

        if (stdoutData.includes(startMarker) && stdoutData.includes(endMarker)) {
          const jsonStr = stdoutData.split(startMarker)[1].split(endMarker)[0].trim();
          const parsed = JSON.parse(jsonStr);
          return resolve(parsed);
        }

        // Attempt fallback JSON parse
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (parseErr) {
        reject(
          new Error(
            `Python process exited with code ${code}. Failed to parse JSON output. Stderr: ${stderrData} Stdout: ${stdoutData}`
          )
        );
      }
    });

    // Write input payload to stdin and close
    pyProcess.stdin.write(JSON.stringify(payload));
    pyProcess.stdin.end();
  });
}

/**
 * Main ML Predict function:
 * First attempts FastAPI HTTP microservice, falls back to Python CLI bridge.
 */
async function predictNextMonth(transactions, budgets = [], user = {}) {
  const monthsData = aggregateTransactionsByMonth(transactions, user.monthlyIncome || 0);

  // If user has fewer than 2 months of historical transactions
  if (monthsData.length < 2) {
    return {
      success: true,
      has_enough_data: false,
      message: 'Not enough financial history yet',
      reason: 'At least 2 distinct monthly cycles are required for machine learning forecasting.',
      minimum_months_required: 2,
      available_months: monthsData.length,
      predictions: null,
      trends: [],
      budget_comparisons: [],
      confidence: null,
    };
  }

  const now = new Date();
  const payload = {
    months_data: monthsData,
    budgets: budgets.map((b) => ({
      category: b.category,
      limit: Number(b.limit || 0),
    })),
    current_month: now.getMonth() + 1,
    current_year: now.getFullYear(),
  };

  // Try HTTP first if available
  if (typeof fetch === 'function') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const httpRes = await fetch(`${ML_SERVICE_HTTP_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (httpRes.ok) {
        const data = await httpRes.json();
        return data;
      }
    } catch (e) {
      // Fall through to CLI execution
    }
  }

  // Fallback to CLI bridge
  return await callPythonViaCLI(payload);
}

module.exports = {
  predictNextMonth,
  aggregateTransactionsByMonth,
  mapCategoryToML,
};
