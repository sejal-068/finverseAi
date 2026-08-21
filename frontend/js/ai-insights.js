/**
 * FinverseAI - AI Insights & Behaviour Engine Controller
 * Prepares UI for ML prediction placeholders, anomaly detection, and interactive savings simulator.
 */

document.addEventListener('DOMContentLoaded', async () => {
  await loadAIInsights();
  initSavingsSimulator();
});

async function loadAIInsights() {
  if (!window.finverseAPI) return;

  try {
    const data = await window.finverseAPI.getAIInsights();

    // Top Prediction Cards
    document.getElementById('predExpenseVal').textContent = formatINR(data.predictedNextMonthExpenses);
    document.getElementById('predConfidenceTag').textContent = `${data.forecastConfidence} model confidence`;

    document.getElementById('anomalyTitle').textContent = data.anomalyDetected.title;
    document.getElementById('anomalyDesc').textContent = data.anomalyDetected.message;

    document.getElementById('savingsOptVal').textContent = `+${formatINR(data.savingsPotential.potentialMonthlyAddition)}/mo`;
    document.getElementById('savingsOptDesc').textContent = data.savingsPotential.recommendation;

    // Render Categorized Insight Cards
    renderInsightCards(data.insightsList);

  } catch (err) {
    console.error('Error loading AI insights:', err);
    showToast('Failed to load AI insights', 'error');
  }
}

function renderInsightCards(insights) {
  const container = document.getElementById('aiInsightCardsContainer');
  if (!container) return;

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
          <span class="badge badge-ai"><i class="fa-solid fa-brain"></i> ML Detected</span>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   Interactive AI Savings Simulator
   ========================================================================== */
function initSavingsSimulator() {
  const diningSlider = document.getElementById('simDiningSlider');
  const shoppingSlider = document.getElementById('simShoppingSlider');
  const resultMonthlyEl = document.getElementById('simMonthlyResult');
  const resultAnnualEl = document.getElementById('simAnnualResult');

  if (!diningSlider || !shoppingSlider) return;

  const calculateSavings = () => {
    const diningCutPercent = Number(diningSlider.value);
    const shoppingCutPercent = Number(shoppingSlider.value);

    // Current baseline: Dining = ₹6,700, Shopping = ₹3,500
    const diningSaved = (6700 * diningCutPercent) / 100;
    const shoppingSaved = (3500 * shoppingCutPercent) / 100;
    const totalMonthly = Math.round(diningSaved + shoppingSaved);
    const totalAnnual = totalMonthly * 12;

    document.getElementById('simDiningPercent').textContent = diningCutPercent + '%';
    document.getElementById('simShoppingPercent').textContent = shoppingCutPercent + '%';

    if (resultMonthlyEl) resultMonthlyEl.textContent = formatINR(totalMonthly);
    if (resultAnnualEl) resultAnnualEl.textContent = formatINR(totalAnnual);
  };

  diningSlider.addEventListener('input', calculateSavings);
  shoppingSlider.addEventListener('input', calculateSavings);
  calculateSavings();
}
