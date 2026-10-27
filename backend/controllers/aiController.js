const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const User = require('../models/User');
const MLService = require('../services/mlService');
const { predictNextMonth } = require('../services/mlBridge');

/**
 * @desc    Get dynamic AI insights, ML predictions, and anomaly detection
 * @route   GET /api/ai/insights
 * @access  Private
 */
const getAIInsights = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
    const budgets = await Budget.find({ userId: req.user.id });

    // Call ML Python Prediction Service via Bridge
    let mlData = null;
    try {
      mlData = await predictNextMonth(transactions, budgets, user);
    } catch (mlErr) {
      console.warn('[AI Controller] ML Service prediction warning:', mlErr.message);
    }

    const anomaly = MLService.detectAnomalies(transactions);
    const behaviour = MLService.analyzeBehaviourPatterns(transactions);

    // Compute live user baselines
    let totalIncome = 0;
    let totalExpense = 0;
    let diningSpent = 0;
    let shoppingSpent = 0;
    const catMap = {};

    transactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === 'income') {
        totalIncome += amt;
      } else if (t.type === 'expense') {
        totalExpense += amt;
        catMap[t.category] = (catMap[t.category] || 0) + amt;

        const cLower = (t.category || '').toLowerCase();
        if (cLower.includes('food') || cLower.includes('dining')) {
          diningSpent += amt;
        } else if (cLower.includes('shopping')) {
          shoppingSpent += amt;
        }
      }
    });

    const netSavings = Math.max(0, totalIncome - totalExpense);
    const savingsRate = totalIncome > 0 ? Number(((netSavings / totalIncome) * 100).toFixed(1)) : 0;

    // Discretionary potential
    const discretionaryTotal = diningSpent + shoppingSpent;
    const potentialMonthlyAddition = Math.round(discretionaryTotal * 0.15);

    // Build dynamic user-specific insight cards
    const insightsList = [];

    if (transactions.length === 0) {
      // Empty state for new user
      insightsList.push({
        id: 'ins_welcome',
        type: 'info',
        icon: 'fa-wand-magic-sparkles',
        title: 'Welcome to FinverseAI Insights',
        explanation: 'Start tracking your daily income and expenses to unlock real-time financial intelligence.',
        impact: 'Personalized intelligence waiting',
        recommendation: 'Click + Add Transaction to record your first income or expense.',
      });
    } else {
      // 1. Top Outflow Category Insight
      const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
      if (sortedCats.length > 0) {
        const topCat = sortedCats[0];
        const topPercent = totalExpense > 0 ? Math.round((topCat[1] / totalExpense) * 100) : 0;
        insightsList.push({
          id: 'ins_top_cat',
          type: topPercent > 35 ? 'warning' : 'info',
          icon: 'fa-chart-pie',
          title: `${topCat[0]} represents ${topPercent}% of your spending`,
          explanation: `You have spent ₹${topCat[1].toLocaleString('en-IN')} on ${topCat[0]} out of ₹${totalExpense.toLocaleString('en-IN')} total recorded expenses.`,
          impact: `${topPercent}% of total expenses`,
          recommendation: topPercent > 35
            ? `Consider reviewing your ${topCat[0]} purchases to avoid heavy category concentration.`
            : `Your spending in ${topCat[0]} is proportional to your overall outflow.`,
        });
      }

      // 2. Weekend Behaviour Insight
      if (behaviour.weekendSpendingPercent > 0) {
        insightsList.push({
          id: 'ins_weekend',
          type: behaviour.weekendSpendingPercent > 50 ? 'warning' : 'info',
          icon: 'fa-calendar-week',
          title: `You spend ${behaviour.weekendSpendingPercent}% of your budget on weekends`,
          explanation: behaviour.message,
          impact: `${behaviour.discretionaryRiskLevel} discretionary leakage`,
          recommendation: behaviour.weekendSpendingPercent > 50
            ? 'Set a dedicated weekend cash or UPI limit to avoid spontaneous weekend debits.'
            : 'Your weekend spending distribution is well-balanced with weekday habits.',
        });
      }

      // 3. Savings Rate Insight
      insightsList.push({
        id: 'ins_savings',
        type: savingsRate >= 20 ? 'positive' : 'warning',
        icon: 'fa-piggy-bank',
        title: `Your savings rate is ${savingsRate}%`,
        explanation: `With ₹${totalIncome.toLocaleString('en-IN')} in inflow and ₹${totalExpense.toLocaleString('en-IN')} in outflow, you retained ₹${netSavings.toLocaleString('en-IN')}.`,
        impact: savingsRate >= 20 ? 'Strong savings velocity' : 'Sub-optimal savings buffer',
        recommendation: savingsRate >= 20
          ? 'Allocate your net surplus into high-yield recurring deposits or index funds.'
          : 'Aim to trim discretionary food and shopping expenses to elevate your savings rate above 20%.',
      });

      // 4. Anomaly Detection Insight
      if (anomaly.hasAnomaly) {
        insightsList.push({
          id: 'ins_anomaly',
          type: 'risk',
          icon: 'fa-triangle-exclamation',
          title: `Unusual spending spike in ${anomaly.category}`,
          explanation: anomaly.message,
          impact: `${anomaly.percentAboveAverage}% above category average`,
          recommendation: 'Review this transaction and apply the 48-hour rule before any non-essential purchase.',
        });
      } else {
        insightsList.push({
          id: 'ins_anomaly_clean',
          type: 'positive',
          icon: 'fa-shield-halved',
          title: 'No spending anomalies detected',
          explanation: 'All your expense categories are currently trending within expected baseline deviations.',
          impact: 'Stable cash management',
          recommendation: 'Maintain your current spending discipline to preserve this balance.',
        });
      }
    }

    // Determine predicted expense and confidence from ML model
    let predictedExpenses = 0;
    let forecastConfidence = 'Not enough financial history yet';
    let trendDirection = 'stable';
    let categoryForecast = {};

    if (mlData && mlData.has_enough_data && mlData.predictions) {
      predictedExpenses = mlData.predictions.next_month_total_expense;
      forecastConfidence = mlData.confidence || '94%';
      categoryForecast = mlData.predictions.categories;
      trendDirection = predictedExpenses > totalExpense ? 'increasing' : 'stable';
    } else if (totalExpense > 0) {
      const fallbackForecast = MLService.generateExpenseForecast(transactions, totalIncome);
      predictedExpenses = fallbackForecast.predictedNextMonthExpenses;
      forecastConfidence = 'Not enough financial history yet';
    }

    res.status(200).json({
      success: true,
      data: {
        predictedNextMonthExpenses: predictedExpenses,
        forecastConfidence,
        hasEnoughData: mlData ? !!mlData.has_enough_data : false,
        trendDirection,
        categoryForecast,
        anomalyDetected: {
          title: anomaly.hasAnomaly ? `High ${anomaly.category} Anomaly` : 'Baseline Normal',
          message: anomaly.message,
          category: anomaly.category,
          excessAmount: anomaly.hasAnomaly ? Math.max(0, anomaly.highestTransaction - anomaly.average) : 0,
        },
        weekendBehavior: {
          title: 'Weekend Spending Pattern',
          message: behaviour.message,
          impact: `${behaviour.discretionaryRiskLevel} discretionary leakage`,
        },
        savingsPotential: {
          title: 'Personalized Savings Target',
          potentialMonthlyAddition,
          recommendation: potentialMonthlyAddition > 0
            ? `Trimming restaurant dining and discretionary shopping by 15% unlocks ~₹${potentialMonthlyAddition.toLocaleString('en-IN')}/mo in additional savings.`
            : 'Record transactions in Dining and Shopping to calculate interactive savings projections.',
        },
        monthlyBaselines: {
          dining: diningSpent,
          shopping: shoppingSpent,
        },
        insightsList,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get 5-Pillar Financial Health Score
 * @route   GET /api/ai/health-score
 * @access  Private
 */
const getFinancialHealth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const transactions = await Transaction.find({ userId: req.user.id });
    const budgets = await Budget.find({ userId: req.user.id });

    const health = MLService.calculateHealthScore(transactions, budgets, user);

    res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Process Conversational AI Financial Coach Query (Persistent Chat)
 * @route   POST /api/ai/coach
 * @access  Private
 */
const getCoachResponse = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a message or inquiry',
      });
    }

    const Conversation = require('../models/Conversation');
    const user = await User.findById(req.user.id);
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
    const budgets = await Budget.find({ userId: req.user.id });

    // Retrieve ML forecast data if available
    let mlData = null;
    try {
      mlData = await predictNextMonth(transactions, budgets, user);
    } catch (e) {
      // Continue without ML forecast if not yet populated
    }

    // Get or create conversation for this user
    let conversation = await Conversation.findOne({ userId: req.user.id }).sort({ updatedAt: -1 });

    if (!conversation) {
      conversation = new Conversation({
        userId: req.user.id,
        title: 'Financial Coaching Session',
        messages: [],
      });
    }

    // Save user message
    conversation.messages.push({
      role: 'user',
      content: message,
    });

    // 1. Attempt real Generative AI LLM response (Gemini / OpenAI) if key configured
    const LLMService = require('../services/llmService');
    let coachReply = null;

    try {
      const realAI = await LLMService.generateRealAIResponse(message, user, transactions, budgets, mlData);
      if (realAI && realAI.reply) {
        coachReply = { reply: realAI.reply, source: realAI.source };
      }
    } catch (llmErr) {
      console.warn('[AI Coach Controller] Real AI call error, falling back:', llmErr.message);
    }

    // 2. Fall back to local financial intelligence engine
    if (!coachReply) {
      coachReply = MLService.processCoachQuery(message, transactions, budgets, user, mlData);
    }

    // Save assistant response
    conversation.messages.push({
      role: 'assistant',
      content: coachReply.reply,
    });

    conversation.lastActivity = new Date();
    await conversation.save();

    res.status(200).json({
      success: true,
      data: {
        ...coachReply,
        conversationId: conversation._id,
        messageCount: conversation.messages.length,
      },
    });
  } catch (error) {
    console.error('[AI Coach Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: 'FinverseAI Coach is temporarily unable to analyze your finances. Please try again.',
      data: {
        reply: "I'm experiencing a temporary issue accessing your financial records right now. Please try sending your message again in a moment.",
      },
    });
  }
};

/**
 * @desc    Get ML next-month predictions, category trends, and budget comparisons
 * @route   GET /api/ai/ml-predict
 * @access  Private
 */
const getMLPredictions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: 1 });
    const budgets = await Budget.find({ userId: req.user.id });

    const mlResult = await predictNextMonth(transactions, budgets, user);

    res.status(200).json({
      success: true,
      data: mlResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get chat history for the financial coach
 * @route   GET /api/ai/chat-history
 * @access  Private
 */
const getChatHistory = async (req, res, next) => {
  try {
    const Conversation = require('../models/Conversation');
    const conversation = await Conversation.findOne({ userId: req.user.id }).sort({ updatedAt: -1 });

    if (!conversation) {
      return res.status(200).json({
        success: true,
        data: { messages: [], conversationId: null },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        messages: conversation.messages,
        conversationId: conversation._id,
        title: conversation.title,
        lastActivity: conversation.lastActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear chat history
 * @route   DELETE /api/ai/chat-history
 * @access  Private
 */
const clearChatHistory = async (req, res, next) => {
  try {
    const Conversation = require('../models/Conversation');
    await Conversation.deleteMany({ userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Chat history cleared successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAIInsights,
  getFinancialHealth,
  getCoachResponse,
  getMLPredictions,
  getChatHistory,
  clearChatHistory,
};
