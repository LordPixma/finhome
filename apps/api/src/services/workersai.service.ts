/**
 * Cloudflare Workers AI Service Implementation
 * 
 * Provides AI-powered financial insights using Cloudflare Workers AI models
 */

import type {
  WorkersAIService,
  CategorySuggestion,
  SpendingInsights,
  AnomalyAlert,
  BudgetAdvice,
  FinancialContext,
  Transaction,
  UserProfile,
  SpendingData,
  SpendingHistory,
  PredictionResult
} from './workersai.types';

export class CloudflareAIService implements WorkersAIService {
  constructor(private ai: any) {}

  /**
   * AI-powered transaction categorization using natural language processing
   */
  async categorizeTransaction(description: string, amount: number): Promise<CategorySuggestion> {
    try {
      const prompt = `
Analyze this financial transaction and categorize it appropriately:

Transaction: "${description}"
Amount: $${amount}

Based on the description, determine the most appropriate category from:
- Food & Dining
- Transportation  
- Shopping
- Entertainment
- Bills & Utilities
- Healthcare
- Travel
- Income
- Transfer
- Other

Provide your analysis in this exact JSON format:
{
  "category": "category_name",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this category was chosen",
  "alternativeCategories": ["alternative1", "alternative2"]
}`;

      const response = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: prompt }]
      });

      // Parse the AI response
      const result = this.parseJSONResponse(response.response);
      
      return {
        category: result.category || 'Other',
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || 'AI analysis of transaction description',
        alternativeCategories: result.alternativeCategories || []
      };
    } catch (error) {
      console.error('AI categorization failed:', error);
      return this.getFallbackCategorization(description, amount);
    }
  }

  /**
   * Analyze spending patterns and provide insights
   */
  async analyzeSpendingPatterns(transactions: Transaction[]): Promise<SpendingInsights> {
    try {
      const spendingByCategory = this.groupTransactionsByCategory(transactions);
      const totalSpending = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const prompt = `
Analyze this spending data and provide insights:

Total Monthly Spending: $${totalSpending.toFixed(2)}
Category Breakdown:
${Object.entries(spendingByCategory)
  .map(([cat, amount]) => `- ${cat}: $${amount.toFixed(2)} (${((amount/totalSpending)*100).toFixed(1)}%)`)
  .join('\n')}

Provide analysis in this JSON format:
{
  "summary": "Brief overview of spending patterns",
  "trends": [
    {"category": "Food & Dining", "trend": "increasing", "percentage": 15}
  ],
  "recommendations": ["Specific actionable advice"],
  "riskAreas": ["Areas of concern"]
}`;

      const response = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: prompt }]
      });

      return this.parseJSONResponse(response.response);
    } catch (error) {
      console.error('Spending analysis failed:', error);
      return this.getFallbackSpendingInsights(transactions);
    }
  }

  /**
   * Detect unusual spending patterns and anomalies
   */
  async detectAnomalies(transactions: Transaction[]): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];
    
    try {
      // Calculate averages and detect outliers
      const amounts = transactions.map(t => Math.abs(t.amount));
      const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      
      // Check for unusually large transactions
      transactions.forEach(transaction => {
        const amount = Math.abs(transaction.amount);
        if (amount > avgAmount * 3 && amount > 100) {
          alerts.push({
            type: 'unusual_amount',
            severity: amount > avgAmount * 5 ? 'high' : 'medium',
            description: `Unusually large transaction: $${amount.toFixed(2)} (${((amount/avgAmount - 1) * 100).toFixed(0)}% above average)`,
            transactionId: transaction.id,
            suggestedAction: 'Review this transaction to ensure it\'s legitimate'
          });
        }
      });

      // Check for new merchants (simplified version)
      const merchantCounts = this.countMerchants(transactions);
      Object.entries(merchantCounts).forEach(([merchant, count]) => {
        if (count === 1 && transactions.find(t => t.merchant === merchant && Math.abs(t.amount) > 50)) {
          const transaction = transactions.find(t => t.merchant === merchant)!;
          alerts.push({
            type: 'new_merchant',
            severity: 'low',
            description: `First transaction with new merchant: ${merchant}`,
            transactionId: transaction.id,
            suggestedAction: 'Verify this is a legitimate new merchant'
          });
        }
      });

      return alerts;
    } catch (error) {
      console.error('Anomaly detection failed:', error);
      return [];
    }
  }

  /**
   * Generate personalized budget recommendations
   */
  async generateBudgetRecommendations(profile: UserProfile, spending: SpendingData): Promise<BudgetAdvice> {
    try {
      const prompt = `
Generate budget recommendations for this user:

Profile:
- Monthly Income: $${profile.monthlyIncome}
- Family Size: ${profile.familySize}
- Risk Tolerance: ${profile.riskTolerance}
- Goals: ${profile.financialGoals.join(', ')}

Current Spending:
${Object.entries(spending.monthlySpending)
  .map(([cat, amount]) => `- ${cat}: $${amount.toFixed(2)}`)
  .join('\n')}

Provide budget advice in this JSON format:
{
  "overallScore": 85,
  "recommendations": [
    {
      "category": "Food & Dining",
      "currentSpending": 800,
      "recommendedBudget": 600,
      "reasoning": "Reduce dining out, cook more at home",
      "priority": "high"
    }
  ],
  "savings_opportunities": ["Specific ways to save money"],
  "warnings": ["Areas of financial concern"]
}`;

      const response = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: prompt }]
      });

      return this.parseJSONResponse(response.response);
    } catch (error) {
      console.error('Budget recommendation failed:', error);
      return this.getFallbackBudgetAdvice(profile, spending);
    }
  }

  /**
   * Provide personalized financial guidance
   */
  async provideFiscalGuidance(question: string, context: FinancialContext): Promise<string> {
    try {
      const prompt = `
You are a knowledgeable financial advisor. Answer this question based on the user's context:

Question: "${question}"

User Context:
- Monthly Income: $${context.monthlyIncome}
- Current Budgets: ${context.currentBudgets.map(b => `${b.category}: $${b.amount} (spent: $${b.spent})`).join(', ')}
- Goals: ${context.goals.map(g => `${g.name}: $${g.currentAmount}/$${g.targetAmount}`).join(', ')}

Provide helpful, practical financial advice in 2-3 paragraphs. Be encouraging but realistic.`;

      const response = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: prompt }]
      });

      return response.response || 'I apologize, but I\'m unable to provide guidance at this time. Please consult with a financial professional for personalized advice.';
    } catch (error) {
      console.error('Financial guidance failed:', error);
      return 'I apologize, but I\'m experiencing technical difficulties. Please try again later or consult with a financial professional.';
    }
  }

  /**
   * Generate monthly spending summary
   */
  async summarizeMonthlySpending(transactions: Transaction[]): Promise<string> {
    try {
      const totalSpending = transactions.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);
      const totalIncome = transactions.reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);
      const categoryBreakdown = this.groupTransactionsByCategory(transactions);

      const prompt = `
Summarize this month's financial activity:

Income: $${totalIncome.toFixed(2)}
Expenses: $${totalSpending.toFixed(2)}
Net: $${(totalIncome - totalSpending).toFixed(2)}

Spending by Category:
${Object.entries(categoryBreakdown)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([cat, amount]) => `- ${cat}: $${amount.toFixed(2)}`)
  .join('\n')}

Provide a concise, encouraging 2-paragraph summary focusing on key insights and actionable next steps.`;

      const response = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: prompt }]
      });

      return response.response || this.getFallbackSummary(totalIncome, totalSpending);
    } catch (error) {
      console.error('Spending summary failed:', error);
      return this.getFallbackSummary(0, 0);
    }
  }

  /**
   * Predict future spending based on historical data
   */
  async predictFutureSpending(historicalData: SpendingHistory): Promise<PredictionResult> {
    // This would use a more sophisticated model in production
    // For now, we'll use trend analysis
    const predictions: Record<string, number> = {};
    let totalConfidence = 0;

    Object.entries(historicalData.categoryHistory).forEach(([category, monthlyData]) => {
      const amounts = Object.values(monthlyData);
      const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const trend = historicalData.trends[category] || 0;
      
      predictions[category] = Math.max(0, average * (1 + trend / 100));
      totalConfidence += Math.min(0.9, Math.max(0.3, 1 - Math.abs(trend) / 100));
    });

    return {
      nextMonthPrediction: predictions,
      confidenceScore: totalConfidence / Object.keys(predictions).length,
      insights: [
        'Predictions based on your spending patterns over the last 6 months',
        'Actual spending may vary due to seasonal factors and life changes'
      ],
      recommendations: [
        'Set up alerts for categories that are trending upward',
        'Consider setting aside extra budget for volatile categories'
      ]
    };
  }

  // Helper methods
  private parseJSONResponse(response: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {};
    }
  }

  private groupTransactionsByCategory(transactions: Transaction[]): Record<string, number> {
    const groups: Record<string, number> = {};
    transactions.forEach(transaction => {
      const category = transaction.category || 'Other';
      const amount = Math.abs(transaction.amount);
      groups[category] = (groups[category] || 0) + amount;
    });
    return groups;
  }

  private countMerchants(transactions: Transaction[]): Record<string, number> {
    const counts: Record<string, number> = {};
    transactions.forEach(transaction => {
      if (transaction.merchant) {
        counts[transaction.merchant] = (counts[transaction.merchant] || 0) + 1;
      }
    });
    return counts;
  }

  private getFallbackCategorization(description: string, _amount: number): CategorySuggestion {
    // Simple keyword-based fallback
    const desc = description.toLowerCase();
    if (desc.includes('restaurant') || desc.includes('food') || desc.includes('starbucks')) {
      return { category: 'Food & Dining', confidence: 0.7, reasoning: 'Keyword match for food-related transaction' };
    }
    if (desc.includes('gas') || desc.includes('fuel') || desc.includes('uber')) {
      return { category: 'Transportation', confidence: 0.7, reasoning: 'Keyword match for transportation' };
    }
    return { category: 'Other', confidence: 0.3, reasoning: 'Unable to determine category' };
  }

  private getFallbackSpendingInsights(transactions: Transaction[]): SpendingInsights {
    const totalSpending = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return {
      summary: `You spent $${totalSpending.toFixed(2)} this month across ${transactions.length} transactions.`,
      trends: [],
      recommendations: ['Track your spending regularly', 'Set up budgets for major categories'],
      riskAreas: []
    };
  }

  private getFallbackBudgetAdvice(_profile: UserProfile, _spending: SpendingData): BudgetAdvice {
    return {
      overallScore: 70,
      recommendations: [],
      savings_opportunities: ['Review your largest expense categories for potential savings'],
      warnings: []
    };
  }

  private getFallbackSummary(income: number, spending: number): string {
    return `This month you earned $${income.toFixed(2)} and spent $${spending.toFixed(2)}. Keep tracking your expenses to identify opportunities for improvement.`;
  }
}