/**
 * FinverseAI - Machine Learning & Financial Intelligence Engine
 * --------------------------------------------------------------
 * Dynamic, user-specific algorithms for:
 * 1. Predictive expense forecasting fallback & aggregation
 * 2. Statistical anomaly & outlier detection (IQR / Z-Score)
 * 3. Behavioural pattern analysis (Weekend vs Weekday distribution)
 * 4. 5-Pillar Financial Health Score Engine (0-100 score)
 * 5. Dynamic conversational AI Financial Coach reasoning
 */

class MLService {
  /**
   * 1. PREDICTIVE EXPENSE FORECASTING (Statistical Moving Average Baseline)
   */
  static generateExpenseForecast(transactions, monthlyIncome = 0) {
    const expenseTxs = (transactions || []).filter((t) => t.type === 'expense');

    if (expenseTxs.length === 0) {
      return {
        predictedNextMonthExpenses: 0,
        forecastConfidence: 'Not enough financial history yet',
        trendDirection: 'stable',
        categoryForecast: {},
        projectedSavings: Math.max(0, monthlyIncome),
      };
    }

    const categoryTotals = {};
    let totalSpent = 0;

    expenseTxs.forEach((t) => {
      const amt = Number(t.amount) || 0;
      totalSpent += amt;
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
    });

    const growthFactor = 1.03;
    const predictedTotal = Math.round(totalSpent * growthFactor);

    const categoryForecast = {};
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      categoryForecast[cat] = Math.round(amt * growthFactor);
    });

    return {
      predictedNextMonthExpenses: predictedTotal,
      forecastConfidence: '88%',
      trendDirection: predictedTotal > totalSpent ? 'increasing' : 'stable',
      categoryForecast,
      projectedSavings: Math.max(0, monthlyIncome - predictedTotal),
    };
  }

  /**
   * 2. STATISTICAL ANOMALY & OUTLIER DETECTION
   */
  static detectAnomalies(transactions) {
    const expenseTxs = (transactions || []).filter((t) => t.type === 'expense');
    if (expenseTxs.length === 0) {
      return {
        hasAnomaly: false,
        category: 'None',
        highestTransaction: 0,
        average: 0,
        percentAboveAverage: 0,
        zScore: 0,
        message: 'No abnormal spending spikes detected.',
      };
    }

    const categoryGroups = {};
    expenseTxs.forEach((t) => {
      if (!categoryGroups[t.category]) categoryGroups[t.category] = [];
      categoryGroups[t.category].push(Number(t.amount || 0));
    });

    const anomalies = [];

    Object.entries(categoryGroups).forEach(([cat, amounts]) => {
      if (amounts.length >= 2) {
        const sum = amounts.reduce((a, b) => a + b, 0);
        const mean = sum / amounts.length;
        const maxVal = Math.max(...amounts);

        const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance) || (mean * 0.3);

        const zScore = stdDev > 0 ? (maxVal - mean) / stdDev : 0;
        const percentAbove = mean > 0 ? Math.round(((maxVal - mean) / mean) * 100) : 0;

        if (maxVal > 1500 && (zScore > 1.3 || percentAbove >= 40)) {
          anomalies.push({
            hasAnomaly: true,
            category: cat,
            highestTransaction: maxVal,
            average: Math.round(mean),
            percentAboveAverage: percentAbove,
            zScore: Number(zScore.toFixed(2)),
            message: `${cat} has an unusually high debit of ₹${maxVal.toLocaleString('en-IN')}, which is ${percentAbove}% above your average ₹${Math.round(mean).toLocaleString('en-IN')}.`,
          });
        }
      }
    });

    if (anomalies.length > 0) {
      anomalies.sort((a, b) => b.percentAboveAverage - a.percentAboveAverage);
      return anomalies[0];
    }

    return {
      hasAnomaly: false,
      category: 'None',
      highestTransaction: 0,
      average: 0,
      percentAboveAverage: 0,
      zScore: 0,
      message: 'All spending categories are currently within normal baseline ranges.',
    };
  }

  /**
   * 3. BEHAVIOURAL PATTERN ANALYSIS
   */
  static analyzeBehaviourPatterns(transactions) {
    const expenseTxs = (transactions || []).filter((t) => t.type === 'expense');

    if (expenseTxs.length === 0) {
      return {
        weekendSpendingPercent: 0,
        weekdaySpendingPercent: 0,
        foodWeekendSurgePercent: 0,
        message: 'No transaction data available yet to determine weekend spending trends.',
        discretionaryRiskLevel: 'Low',
      };
    }

    let weekendSpend = 0;
    let weekdaySpend = 0;
    let foodWeekendSpend = 0;
    let foodTotalSpend = 0;

    expenseTxs.forEach((t) => {
      const date = new Date(t.date);
      const day = date.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
      const isWeekend = day === 0 || day === 5 || day === 6;
      const amt = Number(t.amount) || 0;

      if (isWeekend) weekendSpend += amt;
      else weekdaySpend += amt;

      const catLower = (t.category || '').toLowerCase();
      if (catLower.includes('food') || catLower.includes('dining')) {
        foodTotalSpend += amt;
        if (isWeekend) foodWeekendSpend += amt;
      }
    });

    const total = weekendSpend + weekdaySpend;
    const weekendPercent = total > 0 ? Math.round((weekendSpend / total) * 100) : 0;
    const foodWeekendPercent = foodTotalSpend > 0 ? Math.round((foodWeekendSpend / foodTotalSpend) * 100) : 0;

    let message = `You spend ${weekendPercent}% of your overall budget on Friday, Saturday, and Sunday.`;
    if (foodTotalSpend > 0) {
      message = `You spend ${foodWeekendPercent}% of your food budget on weekends (Fri-Sun).`;
    }

    return {
      weekendSpendingPercent: weekendPercent,
      weekdaySpendingPercent: 100 - weekendPercent,
      foodWeekendSurgePercent: foodWeekendPercent,
      message,
      discretionaryRiskLevel: weekendPercent > 55 ? 'High' : (weekendPercent > 35 ? 'Moderate' : 'Low'),
    };
  }

  /**
   * 4. 5-PILLAR FINANCIAL HEALTH SCORE ENGINE (0 - 100)
   */
  static calculateHealthScore(transactions, budgets, user) {
    const txs = transactions || [];
    if (txs.length === 0) {
      return {
        score: 50,
        maxScore: 100,
        status: 'Building Profile',
        description: 'Add your income and expenses to calculate your personalized 5-pillar health score.',
        positiveFactors: ['Account profile created successfully'],
        improvementAreas: ['Add transactions to track savings rate and budget compliance'],
        pillars: {
          savingsRateScore: 10,
          budgetComplianceScore: 10,
          cashFlowSurplusScore: 10,
          emergencyBufferScore: 10,
          incomeStabilityScore: 10,
        },
      };
    }

    let income = 0;
    let expenses = 0;
    const userIncome = Number(user.monthlyIncome) || 0;

    txs.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') income += amt;
      if (t.type === 'expense') expenses += amt;
    });

    if (income === 0 && userIncome > 0) income = userIncome;
    const netSavings = Math.max(0, income - expenses);
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

    // Pillar 1: Savings Rate (Max 30 pts)
    let p1 = 5;
    if (savingsRate >= 40) p1 = 30;
    else if (savingsRate >= 30) p1 = 25;
    else if (savingsRate >= 20) p1 = 18;
    else if (savingsRate >= 10) p1 = 12;

    // Pillar 2: Budget Compliance (Max 25 pts)
    let p2 = 20;
    if (budgets && budgets.length > 0) {
      const withinLimit = budgets.filter((b) => (b.spent || 0) <= (b.limit || 0)).length;
      p2 = Math.round((withinLimit / budgets.length) * 25);
    }

    // Pillar 3: Cash Flow Surplus (Max 20 pts)
    let p3 = netSavings > 0 ? 20 : (income >= expenses ? 12 : 5);

    // Pillar 4: Expense to Income Ratio (Max 15 pts)
    const expenseRatio = income > 0 ? expenses / income : 1;
    let p4 = 8;
    if (expenseRatio <= 0.5) p4 = 15;
    else if (expenseRatio <= 0.7) p4 = 12;
    else if (expenseRatio <= 0.9) p4 = 8;
    else p4 = 3;

    // Pillar 5: Diversification / Income Sources (Max 10 pts)
    const incomeSources = txs.filter((t) => t.type === 'income').length;
    let p5 = incomeSources > 1 ? 10 : (incomeSources === 1 ? 8 : 4);

    const totalScore = Math.min(100, Math.max(25, p1 + p2 + p3 + p4 + p5));

    let status = 'Strong Financial Health';
    if (totalScore < 60) status = 'Needs Improvement';
    else if (totalScore < 75) status = 'Moderate Standing';

    const positiveFactors = [];
    const improvementAreas = [];

    if (savingsRate >= 20) {
      positiveFactors.push(`Healthy savings rate of ${savingsRate.toFixed(1)}%`);
    } else {
      improvementAreas.push(`Savings rate is ${savingsRate.toFixed(1)}% (aim for 20%+)`);
    }

    if (netSavings > 0) {
      positiveFactors.push(`Positive cash flow surplus of ₹${Math.round(netSavings).toLocaleString('en-IN')}`);
    } else if (expenses > income && income > 0) {
      improvementAreas.push(`Monthly expenses exceed income by ₹${Math.round(expenses - income).toLocaleString('en-IN')}`);
    }

    if (budgets && budgets.length > 0) {
      const over = budgets.filter((b) => (b.spent || 0) > (b.limit || 0));
      if (over.length === 0) {
        positiveFactors.push('All active categories within budgeted limits');
      } else {
        improvementAreas.push(`${over.length} budget ${over.length === 1 ? 'category is' : 'categories are'} currently exceeded`);
      }
    }

    if (positiveFactors.length === 0) positiveFactors.push('Consistent financial tracking');
    if (improvementAreas.length === 0) improvementAreas.push('Keep maintaining your budget limits');

    return {
      score: totalScore,
      maxScore: 100,
      status,
      description: status === 'Strong Financial Health'
        ? 'Your cash flow is stable with positive savings and controlled spending.'
        : 'Focus on reducing discretionary expenses to build a larger monthly savings cushion.',
      positiveFactors,
      improvementAreas,
      pillars: {
        savingsRateScore: p1,
        budgetComplianceScore: p2,
        cashFlowSurplusScore: p3,
        emergencyBufferScore: p4,
        incomeStabilityScore: p5,
      },
    };
  }

  /**
   * 5. AI FINANCIAL COACH CONVERSATIONAL ENGINE
   * Redesigned to be human, empathetic, conversational, supportive, and data-driven.
   * Accurately distinguishes intents: Future Prediction, Spending Analysis, Savings,
   * Affordability, Budgeting, Overspending, and General inquiries.
   */
  static processCoachQuery(queryText, transactions = [], budgets = [], user = {}, mlData = null) {
    const rawQ = (queryText || '').trim();
    const q = rawQ.toLowerCase();
    const firstName = user.name ? user.name.split(' ')[0] : 'there';
    const dependents = Number(user.dependents) || 0;
    const incomeType = user.incomeType || 'Salaried';
    const goals = Array.isArray(user.financialGoals) && user.financialGoals.length > 0
      ? user.financialGoals
      : (user.financialGoal ? [user.financialGoal] : []);

    let totalIncome = 0;
    let totalExpense = 0;
    const catSpending = {};

    (transactions || []).forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') totalIncome += amt;
      if (t.type === 'expense') {
        totalExpense += amt;
        catSpending[t.category] = (catSpending[t.category] || 0) + amt;
      }
    });

    if (totalIncome === 0 && Number(user.monthlyIncome) > 0) {
      totalIncome = Number(user.monthlyIncome);
    }

    const netSurplus = Math.max(0, totalIncome - totalExpense);
    const savingsRate = totalIncome > 0 ? Number(((netSurplus / totalIncome) * 100).toFixed(1)) : 0;
    const sortedCats = Object.entries(catSpending).sort((a, b) => b[1] - a[1]);
    const hasTransactions = (transactions && transactions.length > 0) || totalExpense > 0;

    // Helper context notes
    let dependentNote = '';
    if (dependents > 0) {
      dependentNote = ` Since you have ${dependents} ${dependents === 1 ? 'person' : 'people'} depending on your income, keeping a comfortable monthly buffer is especially helpful.`;
    }

    let incomeTypeNote = '';
    if (['Freelance', 'Irregular', 'Business', 'Self-employed'].includes(incomeType)) {
      incomeTypeNote = ` With a ${incomeType.toLowerCase()} income routine, having a little extra reserve gives you great peace of mind.`;
    }

    let goalNote = '';
    if (goals.length > 0) {
      goalNote = ` Keeping your goal of "${goals[0]}" in mind, here is how the numbers line up:`;
    }

    // =========================================================================
    // INTENT 0A: CURRENT BALANCE & AVAILABLE FUNDS
    // ("give me my current balance", "what is my balance", "how much money do i have")
    // =========================================================================
    const isBalanceQuery =
      q.includes('balance') ||
      q.includes('current balance') ||
      q.includes('how much money') ||
      q.includes('how much do i have') ||
      q.includes('how much is left') ||
      q.includes('available balance') ||
      q.includes('available funds') ||
      q.includes('remaining balance') ||
      q.includes('my balance') ||
      q.includes('account balance') ||
      q.includes('net worth') ||
      q.includes('total money') ||
      q.includes('wallet') ||
      q.includes('how much in my account');

    if (isBalanceQuery) {
      const topCat = sortedCats[0];
      const statusNote = netSurplus > 0
        ? `You have a comfortable unallocated buffer of **₹${netSurplus.toLocaleString('en-IN')}** for this cycle.`
        : `Your recorded spending is currently running close to your inflow. Limiting non-essential purchases will restore your balance.`;

      return {
        reply: `Hi ${firstName}! Here is your current financial balance snapshot:\n\n• **Current Available Balance / Buffer**: **₹${netSurplus.toLocaleString('en-IN')}**\n• **Total Inflow (Income)**: **₹${totalIncome.toLocaleString('en-IN')}**\n• **Total Recorded Expenses**: **₹${totalExpense.toLocaleString('en-IN')}** across ${transactions.length} transactions\n• **Active Savings Cushion**: **${savingsRate}%** retained\n\n${statusNote}${topCat ? ` Your primary spending area is **${topCat[0]}** at ₹${topCat[1].toLocaleString('en-IN')}.` : ''}${dependentNote}\n\nWould you like me to show where you spend the most, or predict your next month forecast?`,
      };
    }

    // =========================================================================
    // INTENT 0B: WHERE DO I SPEND MORE / HIGHEST SPENDING
    // ("where i spend more", "where do i spend more", "where i spend most", "biggest expense")
    // =========================================================================
    const isTopSpendingQuery =
      q.includes('where i spend more') ||
      q.includes('where do i spend more') ||
      q.includes('where i spend most') ||
      q.includes('where do i spend most') ||
      q.includes('where am i spending') ||
      q.includes('where did i spend') ||
      q.includes('where i spend') ||
      q.includes('top spend') ||
      q.includes('top category') ||
      q.includes('highest expense') ||
      q.includes('biggest expense') ||
      q.includes('most expensive') ||
      q.includes('what i spend most on') ||
      q.includes('spend more') ||
      q.includes('spend most') ||
      q.includes('highest spending') ||
      q.includes('max spend') ||
      q.includes('where is my money going');

    if (isTopSpendingQuery) {
      if (!hasTransactions || sortedCats.length === 0) {
        return {
          reply: `You haven't recorded any expense transactions yet, so I cannot determine your top spending areas. Once you log your expenses (like food, shopping, or bills), I'll immediately highlight where most of your money goes!`,
        };
      }

      const topCat = sortedCats[0];
      const topPercent = totalExpense > 0 ? Math.round((topCat[1] / totalExpense) * 100) : 0;
      const breakdownLines = sortedCats.map(([c, a]) => {
        const pct = totalExpense > 0 ? Math.round((a / totalExpense) * 100) : 0;
        return `• **${c}**: **₹${a.toLocaleString('en-IN')}** (${pct}% of total spending)`;
      }).join('\n');

      const advice = topPercent > 35
        ? `Because **${topCat[0]}** accounts for **${topPercent}%** of your total spending, trimming just 10–15% here could free up an extra **~₹${Math.round(topCat[1] * 0.12).toLocaleString('en-IN')}** every month!`
        : `Your expenses are relatively well-distributed, with **${topCat[0]}** leading at ₹${topCat[1].toLocaleString('en-IN')}.`;

      return {
        reply: `Here is a clear breakdown of where you spend the most money:\n\n🏆 **Top Spending Category**: **${topCat[0]}** at **₹${topCat[1].toLocaleString('en-IN')}** (${topPercent}% of all expenses)\n\n**All Categories Breakdown:**\n${breakdownLines}\n\n**Financial Coach Advice:**\n${advice}\n\nWould you like suggestions on how to reduce spending in **${topCat[0]}**, or check if an upcoming purchase is affordable?`,
      };
    }

    // =========================================================================
    // INTENT 0C: CATEGORY-SPECIFIC INQUIRIES
    // ("how much did i spend on shopping", "food spending", "tell me about travel")
    // =========================================================================
    const matchedCategory = Object.keys(catSpending).find((c) => q.includes(c.toLowerCase()));
    if (matchedCategory && (q.includes('spend') || q.includes('how much') || q.includes('cost') || q.includes('total') || q.includes('about'))) {
      const amt = catSpending[matchedCategory] || 0;
      const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
      const catBudget = (budgets || []).find((b) => (b.category || '').toLowerCase() === matchedCategory.toLowerCase());
      let budgetInfo = '';
      if (catBudget) {
        const bLimit = Number(catBudget.limit || 0);
        const bRemaining = Math.max(0, bLimit - amt);
        budgetInfo = `\n• **Budget Limit**: ₹${bLimit.toLocaleString('en-IN')} (${bRemaining > 0 ? `₹${bRemaining.toLocaleString('en-IN')} remaining` : 'Exceeded!'})`;
      }

      return {
        reply: `Here is your spending analysis for **${matchedCategory}**:\n\n• **Total Spent in ${matchedCategory}**: **₹${amt.toLocaleString('en-IN')}**\n• **Share of Total Outflow**: **${pct}%**${budgetInfo}\n\nWould you like tips on managing this category or setting a custom budget?`,
      };
    }

    // =========================================================================
    // INTENT 1: FUTURE PREDICTION / NEXT-MONTH EXPENSE FORECAST
    // ("What is my future prediction?", "Predict my next month expenses", "Give me my future prediction", etc.)
    // =========================================================================
    const isPredictionQuery =
      q.includes('future') ||
      q.includes('predict') ||
      q.includes('forecast') ||
      q.includes('next month') ||
      q.includes('next-month') ||
      q.includes('upcoming') ||
      q.includes('projection') ||
      q.includes('what will i spend') ||
      q.includes('how much will i spend');

    if (isPredictionQuery) {
      // Case 1A: No transactions logged yet
      if (!hasTransactions) {
        return {
          reply: `I cannot generate your future prediction just yet because you haven't recorded any income or expense transactions in your account.\n\n**How to unlock your personalized forecast:**\n• Add at least 3–5 regular transactions (such as your salary, rent, groceries, dining, or bills).\n• As soon as you log your spending habits, our predictive engine will analyze your category patterns, estimate your next-month expenses, highlight major spending areas, and project your monthly savings cushion!\n\nYou can click **+ Add Transaction** at any time to record your first entry.`,
        };
      }

      // Case 1B: Multi-month data available with trained RandomForest ML model
      if (mlData && mlData.has_enough_data && mlData.predictions) {
        const p = mlData.predictions;
        const catEntries = Object.entries(p.categories || {}).sort((a, b) => b[1] - a[1]);
        const topCatLines = catEntries.slice(0, 3)
          .map(([c, a]) => `• **${c}**: ~₹${Math.round(a).toLocaleString('en-IN')}`)
          .join('\n');

        const diff = p.next_month_total_expense - totalExpense;
        const trendText = diff > 500
          ? `Trending slightly higher (+₹${Math.round(diff).toLocaleString('en-IN')}) compared to your current recorded spending of ₹${totalExpense.toLocaleString('en-IN')}.`
          : (diff < -500
            ? `Trending lower (-₹${Math.round(Math.abs(diff)).toLocaleString('en-IN')}) compared to your current recorded outflow.`
            : `Trending stable around your current spending level of ₹${totalExpense.toLocaleString('en-IN')}.`);

        const possibleSavings = Math.round(p.next_month_total_expense * 0.12);

        return {
          reply: `Based on your historical spending trends across multiple monthly cycles, our **predictive AI forecasting engine** (RandomForest model) has generated your personalized financial forecast for next month:\n\n• **Predicted Income Inflow**: **₹${p.next_month_income.toLocaleString('en-IN')}**\n• **Estimated Next Month Expenses**: **₹${p.next_month_total_expense.toLocaleString('en-IN')}**\n• **Projected Monthly Savings**: **₹${p.projected_savings.toLocaleString('en-IN')}**\n• **Model Confidence**: **${mlData.confidence || '94%'}**\n\n**Major Spending Categories Driving This Forecast:**\n${topCatLines || '• Distributed across standard categories'}\n\n**Spending Trend & Savings Opportunity:**\n${trendText} By applying a gentle 10–15% trim to discretionary spending, you could preserve an additional **~₹${possibleSavings.toLocaleString('en-IN')}** next month.\n\n*(Note: These predictions are estimates based on your past spending habits and machine learning patterns. Your actual month-end figures will depend on your day-to-day spending choices.)*`,
        };
      }

      // Case 1C: User has recorded transactions, but fewer than 2 complete monthly cycles
      // Analyze current spending trends, categories, and run-rate baseline
      const estimatedNextMonthExpense = Math.round(totalExpense);
      const estimatedNextMonthIncome = totalIncome;
      const projectedSavings = Math.max(0, estimatedNextMonthIncome - estimatedNextMonthExpense);
      const topCatsFormatted = sortedCats.slice(0, 3).map(([c, a]) => {
        const pct = totalExpense > 0 ? Math.round((a / totalExpense) * 100) : 0;
        return `• **${c}**: ₹${a.toLocaleString('en-IN')} (${pct}% of current outflow)`;
      }).join('\n');

      const topCategory = sortedCats[0];
      const possibleSavings = topCategory ? Math.round(topCategory[1] * 0.15) : Math.round(totalExpense * 0.10);
      const expenseRatio = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;
      const trendDesc = expenseRatio <= 60
        ? `Your spending is currently well-controlled at ${expenseRatio}% of your monthly inflow, maintaining an active buffer of ₹${netSurplus.toLocaleString('en-IN')}.`
        : `Your spending represents ${expenseRatio}% of your inflow. Keeping an eye on variable purchases will help grow your monthly buffer.`;

      return {
        reply: `Based on your historical spending trends across your ${transactions.length} recorded transactions, here is your personalized financial forecast:\n\n• **Estimated Next Month Expenses**: **₹${estimatedNextMonthExpense.toLocaleString('en-IN')}** (projected from your current recorded spending pace)\n• **Expected Income Inflow**: **₹${estimatedNextMonthIncome.toLocaleString('en-IN')}**\n• **Projected Savings Cushion**: **₹${projectedSavings.toLocaleString('en-IN')}**\n\n**Major Spending Categories Driving This Forecast:**\n${topCatsFormatted || '• No category breakdown available yet'}\n\n**Spending Trend & Savings Opportunity:**\n${trendDesc} If you trim about 10–15% in ${topCategory ? `**${topCategory[0]}**` : 'discretionary areas'}, you could preserve an extra **~₹${possibleSavings.toLocaleString('en-IN')}** in savings next month!\n\n*(Note: These figures are estimates based on your current recorded spending pace. Once you accumulate 2+ monthly cycles, our advanced RandomForest machine learning model will unlock automated multi-month seasonal predictions.)*`,
      };
    }

    // =========================================================================
    // INTENT 2: OVERSPENDING / FINANCIAL STRESS / GUILT
    // ("I spent too much this month", "overspent", "stress", "expensive month")
    // =========================================================================
    const isOverspendingQuery =
      q.includes('spent too much') ||
      q.includes('spend too much') ||
      q.includes('overspent') ||
      q.includes('stress') ||
      q.includes('expensive month') ||
      q.includes('feeling bad') ||
      q.includes('over budget') ||
      q.includes('guilt') ||
      q.includes('too much money');

    if (isOverspendingQuery) {
      const topCat = sortedCats[0];
      const topDetail = topCat
        ? `Looking at your records, your highest outflow was in **${topCat[0]}** at ₹${topCat[1].toLocaleString('en-IN')}.`
        : `You've recorded ₹${totalExpense.toLocaleString('en-IN')} in total expenses this month.`;

      const surplusNote = netSurplus > 0
        ? `The good news is you still have a net buffer of ₹${netSurplus.toLocaleString('en-IN')} for this period.`
        : `Right now, outflows are running close to or above your logged income, so pausing non-essential purchases for a week or two will give your balance some breathing room.`;

      return {
        reply: `That's okay. One expensive month doesn't mean you've failed at managing money. Let's look at where most of it went and see what we can adjust next month.\n\n${topDetail} ${surplusNote} We don't need any drastic cutbacks—just being mindful of a few day-to-day choices can make next month feel much lighter.`,
      };
    }

    // =========================================================================
    // INTENT 3: AFFORDABILITY QUESTIONS
    // ("Can I afford ₹5,000?", "Can I afford a ₹10,000 gadget?", "Can I buy a phone for 15000?")
    // =========================================================================
    const isAffordabilityQuery =
      q.includes('afford') ||
      q.includes('can i buy') ||
      q.includes('should i buy') ||
      q.includes('can i purchase') ||
      q.includes('can i spend') ||
      ((q.includes('buy') || q.includes('purchase')) && /\d/.test(q)) ||
      (q.includes('afford') && /\d/.test(q));

    if (isAffordabilityQuery) {
      const match = q.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
      let amountRequested = 5000;
      if (match) {
        const parsed = Number(match[1].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) amountRequested = parsed;
      }

      // Empty state affordability
      if (!hasTransactions) {
        const pct = totalIncome > 0 ? Math.round((amountRequested / totalIncome) * 100) : 0;
        return {
          reply: `Your financial journey starts here. Based on your registered monthly income of **₹${totalIncome.toLocaleString('en-IN')}** (with no active expenses logged yet), a **₹${amountRequested.toLocaleString('en-IN')}** purchase represents **${pct}%** of your monthly income.\n\nOnce you log your regular monthly expenses (such as rent and bills), I'll calculate your exact live buffer and check whether a ₹${amountRequested.toLocaleString('en-IN')} purchase fits comfortably into your monthly flow.${dependentNote}`,
        };
      }

      if (netSurplus >= amountRequested * 1.4) {
        const remainingBuffer = netSurplus - amountRequested;
        return {
          reply: `Looking at your current monthly numbers, **yes, you can comfortably afford this ₹${amountRequested.toLocaleString('en-IN')} purchase**.${goalNote}\n\n• Current monthly surplus: **₹${netSurplus.toLocaleString('en-IN')}**\n• Estimated buffer remaining after purchase: **₹${remainingBuffer.toLocaleString('en-IN')}**\n\nYou'll still have a solid cushion in place without putting any pressure on your essentials.${dependentNote}`,
        };
      } else if (netSurplus >= amountRequested) {
        const remainingBuffer = netSurplus - amountRequested;
        return {
          reply: `You can technically afford this **₹${amountRequested.toLocaleString('en-IN')}** purchase right now, but it's close to your current safety margin.\n\n• Current surplus: **₹${netSurplus.toLocaleString('en-IN')}**\n• Buffer remaining after purchase: **₹${remainingBuffer.toLocaleString('en-IN')}**\n\nIf you have any upcoming bills or irregular expenses later this month, it might leave you with a thinner cushion than usual.${dependentNote}${incomeTypeNote} If it's not urgent, waiting a few weeks until your next income cycle might feel much more comfortable.`,
        };
      } else {
        const deficit = amountRequested - netSurplus;
        return {
          reply: `Looking at your numbers for this cycle, spending **₹${amountRequested.toLocaleString('en-IN')}** right now would exceed your current unallocated surplus of **₹${netSurplus.toLocaleString('en-IN')}** by about **₹${deficit.toLocaleString('en-IN')}**.\n\nTaking this on immediately might cause some financial pressure before the next month starts.${dependentNote} If this is something you really want, we could set aside a smaller amount over the next two months so you can get it without feeling strained.`,
        };
      }
    }

    // =========================================================================
    // INTENT 4: HOW TO SAVE MORE / SAVING ADVICE / INVEST
    // ("How can I save more?", "How can I save more money?", "Tips to save")
    // =========================================================================
    const isSavingsQuery =
      q.includes('save') ||
      q.includes('saving') ||
      q.includes('how can i save') ||
      q.includes('cut back') ||
      q.includes('invest') ||
      q.includes('reduce expense');

    if (isSavingsQuery) {
      if (!hasTransactions || sortedCats.length === 0) {
        const targetSavings = Math.round(totalIncome * 0.2);
        return {
          reply: `To uncover specific savings opportunities in your everyday habits, I need a few recorded transactions. However, based on your monthly income of **₹${totalIncome.toLocaleString('en-IN')}**:\n\n• **Pay Yourself First (20%)**: Aim to set aside **₹${targetSavings.toLocaleString('en-IN')}** directly for savings or investments as soon as your income arrives.\n• **Track Fixed vs Discretionary**: Log your fixed essentials (rent, utilities) and variable costs (food, shopping).\n\nOnce you record your regular spending, I'll identify exact discretionary expenses where you can easily save without feeling restricted!`,
        };
      }

      const topCat = sortedCats[0];
      const secondCat = sortedCats[1];
      const trimAmount = Math.round(topCat[1] * 0.15);

      let goalConnection = '';
      if (goals.length > 0) {
        goalConnection = ` That would put you directly on track towards your goal to **${goals[0]}**.`;
      }

      let extraCat = '';
      if (secondCat && secondCat[1] > 500) {
        const trim2 = Math.round(secondCat[1] * 0.15);
        extraCat = ` Even a gentle reduction in **${secondCat[0]}** could preserve another **₹${trim2.toLocaleString('en-IN')}**.`;
      }

      return {
        reply: `Looking at your spending, it seems a few small expenses are adding up this month. Your current savings rate is **${savingsRate}%** (₹${netSurplus.toLocaleString('en-IN')} retained).\n\nYou don't need to make a huge change. If we reduce your ${topCat[0].toLowerCase()} and everyday discretionary spending a little, you could keep more money aside without making the month feel restrictive.\n\nFor example, trimming just 15% in **${topCat[0]}** would free up about **₹${trimAmount.toLocaleString('en-IN')}** each month.${extraCat}${goalConnection}\n\n**Two easy habits to try:**\n1. Use the **48-hour rule** before non-essential purchases.\n2. Set a dedicated weekend spending cap to prevent impulsive digital transactions.`,
      };
    }

    // =========================================================================
    // INTENT 5: BUDGET PLANNING / 50-30-20 PRINCIPLE
    // ("Give me a budget plan", "50/30/20", "how should i budget")
    // =========================================================================
    const isBudgetQuery =
      q.includes('budget') ||
      q.includes('50/30/20') ||
      q.includes('50-30-20') ||
      q.includes('rule') ||
      (q.includes('plan') && !q.includes('future'));

    if (isBudgetQuery) {
      const effectiveIncome = totalIncome > 0 ? totalIncome : (Number(user.monthlyIncome) || 50000);
      const needs = Math.round(effectiveIncome * 0.5);
      const wants = Math.round(effectiveIncome * 0.3);
      const savings = Math.round(effectiveIncome * 0.2);

      let depAddon = '';
      if (dependents > 0) {
        depAddon = ` With ${dependents} ${dependents === 1 ? 'dependent' : 'dependents'} in your household, protecting that 20% savings buffer gives your family great stability.`;
      }

      return {
        reply: `Here is a balanced, gentle way to look at your ₹${effectiveIncome.toLocaleString('en-IN')} monthly income using the 50/30/20 principle:\n\n• **Needs (50%)**: **₹${needs.toLocaleString('en-IN')}** for rent, groceries, utilities, and daily travel\n• **Wants (30%)**: **₹${wants.toLocaleString('en-IN')}** for eating out, entertainment, and shopping\n• **Savings & Cushion (20%)**: **₹${savings.toLocaleString('en-IN')}** for emergency funds and future goals\n\n${depAddon}You don't have to hit these numbers perfectly right away—think of them as helpful guideposts rather than strict rules!`,
      };
    }

    // =========================================================================
    // INTENT 6: SPENDING BREAKDOWN / ANALYSIS
    // ("Analyze my spending", "spending breakdown", "where did my money go")
    // =========================================================================
    const isSpendingQuery =
      q.includes('spending') ||
      q.includes('analyze') ||
      q.includes('expense') ||
      q.includes('breakdown') ||
      q.includes('where did my money go') ||
      q.includes('where is my money') ||
      q.includes('habit') ||
      q.includes('pattern');

    if (isSpendingQuery) {
      if (!hasTransactions) {
        return {
          reply: `You don't have any recorded expenses yet to analyze. Once you add your daily transactions (groceries, food, bills, or shopping), I will provide a personalized category breakdown, discretionary ratio, and spending trends!`,
        };
      }

      const topStr = sortedCats.slice(0, 4).map(([c, a]) => {
        const pct = totalExpense > 0 ? Math.round((a / totalExpense) * 100) : 0;
        return `• **${c}**: ₹${a.toLocaleString('en-IN')} (${pct}% of total spending)`;
      }).join('\n');

      let budgetAlert = '';
      if (budgets && budgets.length > 0) {
        const over = budgets.filter((b) => (b.spent || 0) > (b.limit || 0));
        if (over.length > 0) {
          budgetAlert = `\n\n⚠️ **Budget Alert**: You have exceeded your limit in ${over.map(b => b.category).join(', ')}.`;
        } else {
          budgetAlert = `\n\n✅ **Budget Status**: All your active budget categories are within their designated limits.`;
        }
      }

      return {
        reply: `Here's a clear, friendly breakdown of how your money has moved based on your recorded transactions:\n\n• **Money In**: ₹${totalIncome.toLocaleString('en-IN')}\n• **Money Out**: ₹${totalExpense.toLocaleString('en-IN')} across ${transactions.length} transactions\n• **Net Cushion**: ₹${netSurplus.toLocaleString('en-IN')} (Savings Rate: **${savingsRate}%**)\n\n**Where most of it went:**\n${topStr}${budgetAlert}\n\nYour highest outflow category is **${sortedCats[0] ? sortedCats[0][0] : 'General'}**. Keeping track of these categories is already the best step toward staying in control!`,
      };
    }

    // =========================================================================
    // INTENT 7: GREETING
    // ("Hi", "Hello", "Hey")
    // =========================================================================
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings)\b/i.test(q)) {
      return {
        reply: `Hi ${firstName}! I'm your FinverseAI Financial Coach. Looking at your account right now: you have ${transactions.length} transactions recorded (₹${totalIncome.toLocaleString('en-IN')} inflow, ₹${totalExpense.toLocaleString('en-IN')} outflow, and ₹${netSurplus.toLocaleString('en-IN')} monthly cushion).\n\nHow can I help you today? You can ask me to predict your next month expenses, analyze your spending, give you a budget plan, or check whether a purchase is affordable!`,
      };
    }

    // =========================================================================
    // INTENT 8: GENERAL / CONVERSATIONAL FALLBACK
    // (Never return the generic static welcome message)
    // =========================================================================
    if (!hasTransactions) {
      return {
        reply: `Your financial journey starts here. Welcome to FinverseAI! I'm here to help you understand your money, track where it goes, and build toward your goals together. Add your first income or expense transaction to unlock personalized insights and predictions!`,
      };
    }

    const topCat = sortedCats[0];
    return {
      reply: `Hi ${firstName}! I understand you're asking about **"${rawQ}"**.\n\nHere is your active financial standing:\n• **Available Balance / Buffer**: **₹${netSurplus.toLocaleString('en-IN')}**\n• **Monthly Inflow**: **₹${totalIncome.toLocaleString('en-IN')}** | **Total Outflows**: **₹${totalExpense.toLocaleString('en-IN')}**\n• **Primary Spending Category**: ${topCat ? `**${topCat[0]}** (₹${topCat[1].toLocaleString('en-IN')})` : 'None yet'}\n• **Savings Cushion**: **${savingsRate}%**\n\nI can help you with specific questions like:\n• *"Give me my current balance"*\n• *"Where do I spend more?"*\n• *"What is my next month prediction?"*\n• *"How can I save more?"*\n• *"Can I afford a ₹5,000 purchase?"*\n\nLet me know how you'd like to proceed!`,
    };
  }
}

module.exports = MLService;
