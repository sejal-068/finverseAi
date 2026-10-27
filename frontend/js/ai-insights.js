/**
 * FinverseAI - AI Insights & Behaviour Engine Controller
 * Prepares UI for ML predictions, anomaly detection, and dynamic savings simulator.
 */

let userMonthlyBaselines = { dining: 0, shopping: 0 };

document.addEventListener('DOMContentLoaded', async () => {
  await loadAIInsights();
});

async function loadAIInsights() {
  if (!window.finverseAPI) return;

  try {
    const data = await window.finverseAPI.getAIInsights();

    // Top Prediction Cards
    const predValEl = document.getElementById('predExpenseVal');
    const predConfEl = document.getElementById('predConfidenceTag');

    if (data.hasEnoughData) {
      if (predValEl) predValEl.textContent = formatINR(data.predictedNextMonthExpenses || 0);
      if (predConfEl) predConfEl.textContent = `${data.forecastConfidence} model confidence`;
    } else {
      if (predValEl) {
        predValEl.textContent = (data.predictedNextMonthExpenses > 0)
          ? formatINR(data.predictedNextMonthExpenses)
          : '₹0';
      }
      if (predConfEl) predConfEl.textContent = 'Not enough financial history yet';
    }

    const anomalyTitleEl = document.getElementById('anomalyTitle');
    const anomalyDescEl = document.getElementById('anomalyDesc');
    if (anomalyTitleEl) anomalyTitleEl.textContent = data.anomalyDetected?.title || 'Baseline Normal';
    if (anomalyDescEl) anomalyDescEl.textContent = data.anomalyDetected?.message || 'No abnormal spending spikes detected.';

    const savingsValEl = document.getElementById('savingsOptVal');
    const savingsDescEl = document.getElementById('savingsOptDesc');
    const addVal = data.savingsPotential?.potentialMonthlyAddition || 0;
    if (savingsValEl) savingsValEl.textContent = addVal > 0 ? `+${formatINR(addVal)}/mo` : '₹0/mo';
    if (savingsDescEl) savingsDescEl.textContent = data.savingsPotential?.recommendation || 'Record transactions to project savings.';

    // Render Categorized Insight Cards
    renderInsightCards(data.insightsList || []);

    // Initialize Interactive Savings Simulator with current user's real financial baselines
    userMonthlyBaselines = data.monthlyBaselines || { dining: 0, shopping: 0 };
    initSavingsSimulator(userMonthlyBaselines);

  } catch (err) {
    console.error('Error loading AI insights:', err);
    showToast('Failed to load AI insights', 'error');

    const predValEl = document.getElementById('predExpenseVal');
    const predConfEl = document.getElementById('predConfidenceTag');
    if (predValEl) predValEl.textContent = '₹0';
    if (predConfEl) predConfEl.textContent = 'Not enough financial history yet';

    renderInsightCards([]);
    initSavingsSimulator({ dining: 0, shopping: 0 });
  }
}

function renderInsightCards(insights) {
  const container = document.getElementById('aiInsightCardsContainer');
  if (!container) return;

  if (!insights || insights.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <i class="fa-solid fa-brain" style="font-size: 2.5rem; color: var(--primary); margin-bottom: 1rem;"></i>
        <h4 style="margin-bottom: 0.5rem;">No Financial Patterns Detected Yet</h4>
        <p class="text-muted" style="max-width: 450px; margin: 0 auto 1.5rem;">
          FinverseAI needs transaction records to perform statistical outlier detection and behavioral pattern clustering.
        </p>
        <a href="transactions.html" class="btn btn-primary btn-sm">
          <i class="fa-solid fa-plus"></i> Add Your First Transaction
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = insights.map(ins => {
    let cardClass = 'info';
    if (ins.type === 'warning') cardClass = 'warning';
    if (ins.type === 'risk') cardClass = 'risk';
    if (ins.type === 'positive') cardClass = 'positive';

    return `
      <div class="insight-card ${cardClass}">
        <div>
          <div class="insight-card-top">
            <div class="insight-icon-box">
              <i class="fa-solid ${ins.icon}"></i>
            </div>
            <div class="insight-body-text">
              <h4>${ins.title}</h4>
              <p>${ins.explanation}</p>
            </div>
          </div>

          <div class="insight-recommendation-box">
            <strong><i class="fa-solid fa-wand-magic-sparkles"></i> AI Recommendation:</strong>
            <p style="margin-top: 0.25rem;">${ins.recommendation}</p>
          </div>
        </div>

        <div class="insight-impact-badge">
          <span><i class="fa-solid fa-chart-line"></i> Impact: <strong>${ins.impact}</strong></span>
          <span class="badge badge-ai"><i class="fa-solid fa-brain"></i> Dynamic Insight</span>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   Interactive AI Savings Simulator (Calculates using user's actual baselines)
   ========================================================================== */
function initSavingsSimulator(baselines = { dining: 0, shopping: 0 }) {
  const diningSlider = document.getElementById('simDiningSlider');
  const shoppingSlider = document.getElementById('simShoppingSlider');
  const resultMonthlyEl = document.getElementById('simMonthlyResult');
  const resultAnnualEl = document.getElementById('simAnnualResult');

  if (!diningSlider || !shoppingSlider) return;

  const diningBase = Number(baselines.dining || 0);
  const shoppingBase = Number(baselines.shopping || 0);

  const calculateSavings = () => {
    const diningCutPercent = Number(diningSlider.value);
    const shoppingCutPercent = Number(shoppingSlider.value);

    const diningPercentEl = document.getElementById('simDiningPercent');
    const shoppingPercentEl = document.getElementById('simShoppingPercent');
    if (diningPercentEl) diningPercentEl.textContent = diningCutPercent + '%';
    if (shoppingPercentEl) shoppingPercentEl.textContent = shoppingCutPercent + '%';

    // If user has zero expenses in dining and shopping
    if (diningBase === 0 && shoppingBase === 0) {
      if (resultMonthlyEl) resultMonthlyEl.textContent = formatINR(0);
      if (resultAnnualEl) resultAnnualEl.textContent = formatINR(0);
      return;
    }

    const diningSaved = (diningBase * diningCutPercent) / 100;
    const shoppingSaved = (shoppingBase * shoppingCutPercent) / 100;
    const totalMonthly = Math.round(diningSaved + shoppingSaved);
    const totalAnnual = totalMonthly * 12;

    if (resultMonthlyEl) resultMonthlyEl.textContent = formatINR(totalMonthly);
    if (resultAnnualEl) resultAnnualEl.textContent = formatINR(totalAnnual);
  };

  // Remove existing listeners by replacing elements with clones
  const newDining = diningSlider.cloneNode(true);
  const newShopping = shoppingSlider.cloneNode(true);
  diningSlider.parentNode.replaceChild(newDining, diningSlider);
  shoppingSlider.parentNode.replaceChild(newShopping, shoppingSlider);

  newDining.addEventListener('input', calculateSavings);
  newShopping.addEventListener('input', calculateSavings);
  calculateSavings();
}
