/**
 * FinverseAI - Generative AI LLM Integration Service
 * ---------------------------------------------------
 * Enables direct connection to real Conversational AI (Google Gemini or OpenAI)
 * with automatic fallback to FinverseAI's local financial intelligence engine.
 */

class LLMService {
  /**
   * Check if any real Generative AI API key is configured
   */
  static isConfigured() {
    return Boolean(
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) ||
      (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim())
    );
  }

  /**
   * Build complete live financial context for the AI prompt
   */
  static buildFinancialContext(user, transactions, budgets, mlData) {
    const firstName = user.name ? user.name.split(' ')[0] : 'User';
    const monthlyIncome = Number(user.monthlyIncome || 0);

    let totalIncome = 0;
    let totalExpense = 0;
    const catTotals = {};

    (transactions || []).forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === 'income') totalIncome += amt;
      else if (t.type === 'expense') {
        totalExpense += amt;
        catTotals[t.category] = (catTotals[t.category] || 0) + amt;
      }
    });

    if (totalIncome === 0 && monthlyIncome > 0) {
      totalIncome = monthlyIncome;
    }

    const currentBalance = totalIncome - totalExpense;
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

    const recentTxs = (transactions || []).slice(0, 8).map((t) => {
      return `${t.date ? new Date(t.date).toISOString().split('T')[0] : ''} | ${t.type.toUpperCase()}: ₹${t.amount} in ${t.category} (${t.description || ''})`;
    }).join('\n');

    const budgetStatus = (budgets || []).map((b) => {
      return `${b.category}: Limit ₹${b.limit}, Spent ₹${b.spent || 0}, Status: ${b.status || 'normal'}`;
    }).join('\n');

    return `
You are FinverseAI Coach, a warm, professional, highly knowledgeable personal financial advisor for ${firstName}.
Always be helpful, clear, and empathetic. Use INR currency symbol (₹) for money values.
Format your response with clean markdown bullet points, bold key numbers, and actionable advice.
Never recite internal algorithm names or tech buzzwords. Speak like a real human financial coach.

LIVE USER FINANCIAL CONTEXT:
- User Name: ${user.name || firstName}
- Registered Monthly Income: ₹${monthlyIncome.toLocaleString('en-IN')}
- Total Logged Inflow: ₹${totalIncome.toLocaleString('en-IN')}
- Total Logged Outflows: ₹${totalExpense.toLocaleString('en-IN')}
- Current Available Balance / Buffer: ₹${currentBalance.toLocaleString('en-IN')}
- Dependents: ${user.dependents || 0}
- Income Type: ${user.incomeType || 'Salaried'}
- Financial Goals: ${(user.financialGoals || [user.financialGoal || 'Savings']).join(', ')}

SPENDING BREAKDOWN BY CATEGORY:
${sortedCats.length > 0 ? sortedCats.map(([c, a]) => `• ${c}: ₹${a.toLocaleString('en-IN')} (${totalExpense > 0 ? Math.round((a / totalExpense) * 100) : 0}%)`).join('\n') : '• No recorded expenses yet'}

ACTIVE BUDGETS:
${budgetStatus || '• No active category budgets set yet'}

RECENT TRANSACTIONS:
${recentTxs || '• No recorded transactions yet'}
`.trim();
  }

  /**
   * Query Google Gemini API
   */
  static async queryGemini(apiKey, systemPrompt, userMessage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\nUSER QUESTION: ${userMessage}\n\nPlease answer the user's question directly, accurately, and conversationally based on their real financial context above.` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');
      return text.trim();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Query OpenAI API
   */
  static async queryOpenAI(apiKey, systemPrompt, userMessage) {
    const url = 'https://api.openai.com/v1/chat/completions';

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from OpenAI');
      return text.trim();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Main method: generates response from configured Real AI, or returns null to trigger local engine
   */
  static async generateRealAIResponse(userMessage, user, transactions, budgets, mlData) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      return null; // No real AI key configured, use built-in smart engine
    }

    const systemPrompt = this.buildFinancialContext(user, transactions, budgets, mlData);

    // Try Gemini first if key available
    if (geminiKey && geminiKey.trim()) {
      try {
        const reply = await this.queryGemini(geminiKey, systemPrompt, userMessage);
        return { reply, source: 'gemini' };
      } catch (err) {
        console.warn('[LLMService] Gemini API call failed, falling back:', err.message);
      }
    }

    // Try OpenAI if key available
    if (openaiKey && openaiKey.trim()) {
      try {
        const reply = await this.queryOpenAI(openaiKey, systemPrompt, userMessage);
        return { reply, source: 'openai' };
      } catch (err) {
        console.warn('[LLMService] OpenAI API call failed, falling back:', err.message);
      }
    }

    return null;
  }
}

module.exports = LLMService;
