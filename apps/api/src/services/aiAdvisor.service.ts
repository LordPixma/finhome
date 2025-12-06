import { eq, desc, and, gte } from 'drizzle-orm';
import {
  getDb,
  transactions,
  accounts,
  goals,
  goalContributions,
  categories,
  userFinancialProfiles,
  financialHealthScores,
  debtAccounts
} from '../db';
import type { AppContext } from '../types';
import { CloudflareAIService } from './workersai.service';

/**
 * AI Financial Advisor Service
 *
 * Provides advanced AI-powered financial guidance including:
 * - Spending predictions and forecasting
 * - Goal progress forecasting and recommendations
 * - Personalized financial advice based on complete financial picture
 * - Budget optimization suggestions
 * - Debt payoff strategy recommendations
 */

export interface SpendingPrediction {
  category: string;
  predictedAmount: number;
  confidence: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  percentageChange: number;
  reasoning: string;
}

export interface MonthlyForecast {
  month: string;
  predictedIncome: number;
  predictedExpenses: number;
  predictedSavings: number;
  confidence: number;
  categoryBreakdown: SpendingPrediction[];
}

export interface GoalForecast {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date | null;
  projectedCompletionDate: Date | null;
  onTrack: boolean;
  requiredMonthlyContribution: number;
  currentMonthlyAverage: number;
  probabilityOfSuccess: number;
  recommendations: string[];
}

export interface DebtPayoffStrategy {
  method: 'avalanche' | 'snowball' | 'hybrid';
  totalDebt: number;
  monthlyPayment: number;
  projectedPayoffDate: Date;
  totalInterestSaved: number;
  payoffOrder: Array<{
    debtId: string;
    debtName: string;
    balance: number;
    interestRate: number;
    priority: number;
    projectedPayoffMonth: number;
  }>;
  recommendations: string[];
}

export interface PersonalizedAdvice {
  urgentActions: Array<{
    priority: 'critical' | 'high' | 'medium';
    title: string;
    description: string;
    potentialImpact: string;
    actionSteps: string[];
  }>;
  optimizations: Array<{
    area: string;
    currentSituation: string;
    recommendation: string;
    estimatedBenefit: string;
  }>;
  longTermSuggestions: Array<{
    title: string;
    description: string;
    timeframe: string;
  }>;
  overallAssessment: string;
}

export interface FinancialSnapshot {
  income: {
    monthly: number;
    trend: number;
  };
  expenses: {
    monthly: number;
    trend: number;
    byCategory: Record<string, number>;
  };
  savings: {
    rate: number;
    total: number;
  };
  debt: {
    total: number;
    monthlyPayments: number;
    debtToIncomeRatio: number;
  };
  goals: {
    total: number;
    onTrack: number;
    atRisk: number;
  };
  healthScore: number | null;
}

export class AIAdvisorService {
  /**
   * Get a comprehensive financial snapshot
   */
  static async getFinancialSnapshot(c: AppContext, tenantId: string): Promise<FinancialSnapshot> {
    const db = getDb(c.env.DB);
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get transactions for analysis
    const recentTransactions = await db
      .select({
        amount: transactions.amount,
        type: transactions.type,
        date: transactions.date,
        categoryName: categories.name
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.date, threeMonthsAgo)
      ));

    // Calculate monthly averages
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthsTxns = recentTransactions.filter(t => t.date < currentMonthStart);

    const monthlyIncome = this.calculateMonthlyAverage(previousMonthsTxns.filter(t => t.type === 'income'), 2);
    const monthlyExpenses = this.calculateMonthlyAverage(previousMonthsTxns.filter(t => t.type === 'expense'), 2);

    // Calculate expense by category
    const expensesByCategory: Record<string, number> = {};
    recentTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.categoryName || 'Other';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Math.abs(t.amount);
    });

    // Calculate trends
    const lastMonthIncome = recentTransactions
      .filter(t => t.type === 'income' && t.date >= lastMonth && t.date < currentMonthStart)
      .reduce((sum, t) => sum + t.amount, 0);
    const incomeTrend = monthlyIncome > 0 ? ((lastMonthIncome - monthlyIncome) / monthlyIncome) * 100 : 0;

    const lastMonthExpenses = Math.abs(recentTransactions
      .filter(t => t.type === 'expense' && t.date >= lastMonth && t.date < currentMonthStart)
      .reduce((sum, t) => sum + t.amount, 0));
    const expensesTrend = monthlyExpenses > 0 ? ((lastMonthExpenses - monthlyExpenses) / monthlyExpenses) * 100 : 0;

    // Get savings accounts
    const savingsAccounts = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.tenantId, tenantId),
        eq(accounts.type, 'savings')
      ));
    const totalSavings = savingsAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Get debt info
    const debts = await db
      .select()
      .from(debtAccounts)
      .where(and(
        eq(debtAccounts.tenantId, tenantId),
        eq(debtAccounts.status, 'active')
      ));
    const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
    const monthlyDebtPayments = debts.reduce((sum, d) => sum + (d.monthlyPayment || d.minimumPayment || 0), 0);

    // Get goals
    const activeGoals = await db
      .select()
      .from(goals)
      .where(and(
        eq(goals.tenantId, tenantId),
        eq(goals.status, 'active')
      ));

    // Determine goals on track vs at risk
    const goalsOnTrack = activeGoals.filter(g => {
      if (!g.deadline) return true;
      const monthsRemaining = Math.max(1, (g.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const requiredMonthly = (g.targetAmount - g.currentAmount) / monthsRemaining;
      const savingsRate = monthlyIncome - monthlyExpenses;
      return requiredMonthly <= savingsRate * 0.5; // Can achieve with 50% of savings
    }).length;

    // Get health score
    const latestHealthScore = await db
      .select({ overallScore: financialHealthScores.overallScore })
      .from(financialHealthScores)
      .where(eq(financialHealthScores.tenantId, tenantId))
      .orderBy(desc(financialHealthScores.calculatedAt))
      .limit(1)
      .get();

    return {
      income: {
        monthly: monthlyIncome,
        trend: incomeTrend
      },
      expenses: {
        monthly: monthlyExpenses,
        trend: expensesTrend,
        byCategory: expensesByCategory
      },
      savings: {
        rate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0,
        total: totalSavings
      },
      debt: {
        total: totalDebt,
        monthlyPayments: monthlyDebtPayments,
        debtToIncomeRatio: monthlyIncome > 0 ? (monthlyDebtPayments / monthlyIncome) * 100 : 0
      },
      goals: {
        total: activeGoals.length,
        onTrack: goalsOnTrack,
        atRisk: activeGoals.length - goalsOnTrack
      },
      healthScore: latestHealthScore?.overallScore ?? null
    };
  }

  /**
   * Generate spending predictions for the next months
   */
  static async predictSpending(c: AppContext, tenantId: string, months: number = 3): Promise<MonthlyForecast[]> {
    const db = getDb(c.env.DB);
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Get historical transactions
    const historicalTransactions = await db
      .select({
        amount: transactions.amount,
        type: transactions.type,
        date: transactions.date,
        categoryName: categories.name
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.date, sixMonthsAgo)
      ));

    // Group by month and category
    const monthlyData: Record<string, { income: number; expenses: Record<string, number> }> = {};

    historicalTransactions.forEach(t => {
      const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: {} };
      }

      if (t.type === 'income') {
        monthlyData[monthKey].income += t.amount;
      } else if (t.type === 'expense') {
        const cat = t.categoryName || 'Other';
        monthlyData[monthKey].expenses[cat] = (monthlyData[monthKey].expenses[cat] || 0) + Math.abs(t.amount);
      }
    });

    // Calculate trends per category
    const categoryTrends = this.calculateCategoryTrends(monthlyData);

    // Generate forecasts
    const forecasts: MonthlyForecast[] = [];
    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const forecastMonthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

      // Calculate average income
      const monthlyIncomes = Object.values(monthlyData).map(m => m.income);
      const avgIncome = monthlyIncomes.reduce((a, b) => a + b, 0) / Math.max(1, monthlyIncomes.length);

      // Calculate category predictions
      const categoryBreakdown: SpendingPrediction[] = [];
      let totalPredictedExpenses = 0;

      Object.entries(categoryTrends).forEach(([category, trend]) => {
        const predictedAmount = trend.average * Math.pow(1 + trend.growthRate / 100, i);
        totalPredictedExpenses += predictedAmount;

        categoryBreakdown.push({
          category,
          predictedAmount: Math.round(predictedAmount * 100) / 100,
          confidence: Math.max(0.5, Math.min(0.95, 1 - Math.abs(trend.volatility))),
          trend: trend.growthRate > 2 ? 'increasing' : trend.growthRate < -2 ? 'decreasing' : 'stable',
          percentageChange: trend.growthRate,
          reasoning: this.generateTrendReasoning(category, trend)
        });
      });

      forecasts.push({
        month: forecastMonthKey,
        predictedIncome: Math.round(avgIncome * 100) / 100,
        predictedExpenses: Math.round(totalPredictedExpenses * 100) / 100,
        predictedSavings: Math.round((avgIncome - totalPredictedExpenses) * 100) / 100,
        confidence: 0.75 - (i * 0.05), // Confidence decreases with time
        categoryBreakdown: categoryBreakdown.sort((a, b) => b.predictedAmount - a.predictedAmount)
      });
    }

    return forecasts;
  }

  /**
   * Generate goal forecasts with AI-powered recommendations
   */
  static async forecastGoals(c: AppContext, tenantId: string): Promise<GoalForecast[]> {
    const db = getDb(c.env.DB);
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // Get active goals
    const activeGoals = await db
      .select()
      .from(goals)
      .where(and(
        eq(goals.tenantId, tenantId),
        eq(goals.status, 'active')
      ));

    if (activeGoals.length === 0) {
      return [];
    }

    // Get contribution history for each goal
    const contributions = await db
      .select()
      .from(goalContributions)
      .where(gte(goalContributions.date, threeMonthsAgo));

    // Get current savings rate
    const recentTransactions = await db
      .select({ amount: transactions.amount, type: transactions.type })
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.date, threeMonthsAgo)
      ));

    const monthlyIncome = this.calculateMonthlyAverage(recentTransactions.filter(t => t.type === 'income'), 3);
    const monthlyExpenses = this.calculateMonthlyAverage(recentTransactions.filter(t => t.type === 'expense'), 3);
    const monthlySavings = monthlyIncome - monthlyExpenses;

    const forecasts: GoalForecast[] = [];

    for (const goal of activeGoals) {
      const goalContribs = contributions.filter(c => c.goalId === goal.id);
      const totalContributed = goalContribs.reduce((sum, c) => sum + c.amount, 0);
      const monthsOfData = Math.max(1, goalContribs.length > 0 ? 3 : 1);
      const currentMonthlyAverage = totalContributed / monthsOfData;

      const remaining = goal.targetAmount - goal.currentAmount;
      let projectedCompletionDate: Date | null = null;
      let requiredMonthlyContribution = 0;
      let probabilityOfSuccess = 0.5;

      if (goal.deadline) {
        const monthsRemaining = Math.max(1, (goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
        requiredMonthlyContribution = remaining / monthsRemaining;

        // Calculate probability based on current vs required
        if (currentMonthlyAverage >= requiredMonthlyContribution) {
          probabilityOfSuccess = Math.min(0.95, 0.7 + (currentMonthlyAverage / requiredMonthlyContribution - 1) * 0.25);
        } else if (currentMonthlyAverage > 0) {
          probabilityOfSuccess = Math.max(0.1, currentMonthlyAverage / requiredMonthlyContribution * 0.7);
        } else {
          // No contributions yet, base on available savings
          probabilityOfSuccess = Math.min(0.6, monthlySavings / requiredMonthlyContribution * 0.6);
        }
      }

      // Calculate projected completion date based on current rate
      if (currentMonthlyAverage > 0) {
        const monthsToComplete = remaining / currentMonthlyAverage;
        projectedCompletionDate = new Date(now.getTime() + monthsToComplete * 30 * 24 * 60 * 60 * 1000);
      } else if (monthlySavings > 0) {
        const monthsToComplete = remaining / (monthlySavings * 0.3); // Assume 30% of savings go to goals
        projectedCompletionDate = new Date(now.getTime() + monthsToComplete * 30 * 24 * 60 * 60 * 1000);
      }

      const onTrack = goal.deadline ? (projectedCompletionDate !== null && projectedCompletionDate <= goal.deadline) : probabilityOfSuccess > 0.5;

      // Generate recommendations
      const recommendations = this.generateGoalRecommendations(
        goal,
        currentMonthlyAverage,
        requiredMonthlyContribution,
        monthlySavings,
        onTrack
      );

      forecasts.push({
        goalId: goal.id,
        goalName: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline,
        projectedCompletionDate,
        onTrack,
        requiredMonthlyContribution: Math.round(requiredMonthlyContribution * 100) / 100,
        currentMonthlyAverage: Math.round(currentMonthlyAverage * 100) / 100,
        probabilityOfSuccess: Math.round(probabilityOfSuccess * 100) / 100,
        recommendations
      });
    }

    return forecasts.sort((a, b) => b.probabilityOfSuccess - a.probabilityOfSuccess);
  }

  /**
   * Generate debt payoff strategy
   */
  static async generateDebtPayoffStrategy(c: AppContext, tenantId: string, extraMonthlyPayment: number = 0): Promise<DebtPayoffStrategy | null> {
    const db = getDb(c.env.DB);

    // Get active debts
    const debts = await db
      .select()
      .from(debtAccounts)
      .where(and(
        eq(debtAccounts.tenantId, tenantId),
        eq(debtAccounts.status, 'active')
      ));

    if (debts.length === 0) {
      return null;
    }

    const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
    const totalMinPayments = debts.reduce((sum, d) => sum + (d.minimumPayment || 0), 0);
    const monthlyPayment = totalMinPayments + extraMonthlyPayment;

    // Calculate avalanche strategy (highest interest first)
    const avalancheOrder = [...debts].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));

    // Calculate snowball strategy (lowest balance first)
    const snowballOrder = [...debts].sort((a, b) => a.currentBalance - b.currentBalance);

    // Simulate payoff for avalanche method
    const avalancheResult = this.simulatePayoff(avalancheOrder, monthlyPayment);
    const snowballResult = this.simulatePayoff(snowballOrder, monthlyPayment);

    // Choose the method that saves more interest (usually avalanche)
    const method = avalancheResult.totalInterest <= snowballResult.totalInterest ? 'avalanche' : 'snowball';
    const selectedResult = method === 'avalanche' ? avalancheResult : snowballResult;
    const selectedOrder = method === 'avalanche' ? avalancheOrder : snowballOrder;

    // Generate recommendations
    const recommendations: string[] = [];
    if (extraMonthlyPayment === 0) {
      recommendations.push('Consider adding extra payments to accelerate debt payoff');
    }
    if (method === 'avalanche') {
      recommendations.push('Focusing on highest-interest debt first minimizes total interest paid');
    } else {
      recommendations.push('Snowball method builds momentum by eliminating smaller debts quickly');
    }

    const highInterestDebt = debts.find(d => (d.interestRate || 0) > 0.2);
    if (highInterestDebt) {
      recommendations.push(`Consider balance transfer for ${highInterestDebt.name} (${((highInterestDebt.interestRate || 0) * 100).toFixed(1)}% APR)`);
    }

    return {
      method,
      totalDebt: Math.round(totalDebt * 100) / 100,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      projectedPayoffDate: selectedResult.payoffDate,
      totalInterestSaved: Math.round((snowballResult.totalInterest - avalancheResult.totalInterest) * 100) / 100,
      payoffOrder: selectedOrder.map((d, i) => ({
        debtId: d.id,
        debtName: d.name,
        balance: d.currentBalance,
        interestRate: d.interestRate || 0,
        priority: i + 1,
        projectedPayoffMonth: selectedResult.payoffMonths[d.id] || 0
      })),
      recommendations
    };
  }

  /**
   * Generate comprehensive personalized advice using AI
   */
  static async generatePersonalizedAdvice(c: AppContext, tenantId: string): Promise<PersonalizedAdvice> {
    const aiService = new CloudflareAIService(c.env.AI);

    // Gather all financial data
    const snapshot = await this.getFinancialSnapshot(c, tenantId);
    const goalForecasts = await this.forecastGoals(c, tenantId);

    // Get user profile
    const db = getDb(c.env.DB);
    const profile = await db
      .select()
      .from(userFinancialProfiles)
      .where(eq(userFinancialProfiles.tenantId, tenantId))
      .get();

    // Build comprehensive context for AI
    const context = {
      income: snapshot.income.monthly,
      expenses: snapshot.expenses.monthly,
      savingsRate: snapshot.savings.rate,
      totalSavings: snapshot.savings.total,
      totalDebt: snapshot.debt.total,
      debtToIncome: snapshot.debt.debtToIncomeRatio,
      healthScore: snapshot.healthScore,
      goalsAtRisk: goalForecasts.filter(g => !g.onTrack).length,
      topSpendingCategories: Object.entries(snapshot.expenses.byCategory)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      riskTolerance: profile?.riskTolerance || 'moderate',
      emergencyFundTarget: profile?.emergencyFundTarget || 3,
      housingStatus: profile?.housingStatus
    };

    try {
      const prompt = `You are a certified UK financial planner providing personalized advice.

Financial Profile:
- Monthly Income: £${context.income.toFixed(2)}
- Monthly Expenses: £${context.expenses.toFixed(2)}
- Savings Rate: ${context.savingsRate.toFixed(1)}%
- Total Savings: £${context.totalSavings.toFixed(2)}
- Total Debt: £${context.totalDebt.toFixed(2)}
- Debt-to-Income: ${context.debtToIncome.toFixed(1)}%
- Financial Health Score: ${context.healthScore ?? 'Not calculated'}/100
- Goals at Risk: ${context.goalsAtRisk}
- Risk Tolerance: ${context.riskTolerance}
- Housing: ${context.housingStatus || 'Unknown'}
- Emergency Fund Target: ${context.emergencyFundTarget} months

Top Spending Categories:
${context.topSpendingCategories.map(([cat, amount]) => `- ${cat}: £${amount.toFixed(2)}/month`).join('\n')}

Provide comprehensive financial advice in this JSON format:
{
  "urgentActions": [
    {"priority": "high", "title": "Action title", "description": "Why this matters", "potentialImpact": "£X/month savings", "actionSteps": ["Step 1", "Step 2"]}
  ],
  "optimizations": [
    {"area": "Spending/Saving/Investing", "currentSituation": "Current state", "recommendation": "What to do", "estimatedBenefit": "Expected benefit"}
  ],
  "longTermSuggestions": [
    {"title": "Strategy", "description": "Details", "timeframe": "6-12 months"}
  ],
  "overallAssessment": "2-3 sentence summary of financial health and key priorities"
}

Focus on practical, actionable UK-specific advice. Use British English.`;

      const response = await aiService['ai'].run(aiService['MODEL'], {
        messages: [
          { role: 'system', content: 'You are an expert UK financial advisor providing JSON-formatted advice.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1024
      });

      const result = this.parseJSONResponse(response.response);

      return {
        urgentActions: result.urgentActions || this.getFallbackUrgentActions(context),
        optimizations: result.optimizations || this.getFallbackOptimizations(context),
        longTermSuggestions: result.longTermSuggestions || this.getFallbackLongTerm(context),
        overallAssessment: result.overallAssessment || this.getFallbackAssessment(context)
      };
    } catch (error) {
      console.error('AI advice generation failed:', error);
      return {
        urgentActions: this.getFallbackUrgentActions(context),
        optimizations: this.getFallbackOptimizations(context),
        longTermSuggestions: this.getFallbackLongTerm(context),
        overallAssessment: this.getFallbackAssessment(context)
      };
    }
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private static calculateMonthlyAverage(txns: Array<{ amount: number }>, months: number): number {
    const total = txns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return total / Math.max(1, months);
  }

  private static calculateCategoryTrends(monthlyData: Record<string, { income: number; expenses: Record<string, number> }>): Record<string, { average: number; growthRate: number; volatility: number }> {
    const categoryData: Record<string, number[]> = {};

    Object.values(monthlyData).forEach(month => {
      Object.entries(month.expenses).forEach(([category, amount]) => {
        if (!categoryData[category]) categoryData[category] = [];
        categoryData[category].push(amount);
      });
    });

    const trends: Record<string, { average: number; growthRate: number; volatility: number }> = {};

    Object.entries(categoryData).forEach(([category, amounts]) => {
      const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      // Calculate growth rate using linear regression
      let growthRate = 0;
      if (amounts.length >= 2) {
        const n = amounts.length;
        const xMean = (n - 1) / 2;
        const yMean = average;

        let numerator = 0;
        let denominator = 0;
        amounts.forEach((y, i) => {
          numerator += (i - xMean) * (y - yMean);
          denominator += (i - xMean) ** 2;
        });

        const slope = denominator !== 0 ? numerator / denominator : 0;
        growthRate = average > 0 ? (slope / average) * 100 : 0;
      }

      // Calculate volatility (coefficient of variation)
      const variance = amounts.reduce((sum, val) => sum + (val - average) ** 2, 0) / amounts.length;
      const volatility = average > 0 ? Math.sqrt(variance) / average : 0;

      trends[category] = {
        average: Math.round(average * 100) / 100,
        growthRate: Math.round(growthRate * 10) / 10,
        volatility: Math.round(volatility * 100) / 100
      };
    });

    return trends;
  }

  private static generateTrendReasoning(category: string, trend: { average: number; growthRate: number; volatility: number }): string {
    if (trend.growthRate > 10) {
      return `${category} spending is increasing significantly. Review for potential savings.`;
    } else if (trend.growthRate > 2) {
      return `${category} spending is trending upward. Monitor for budget adjustments.`;
    } else if (trend.growthRate < -10) {
      return `${category} spending is decreasing notably. Great progress in this area!`;
    } else if (trend.growthRate < -2) {
      return `${category} spending is trending downward. Keep up the good habits.`;
    } else if (trend.volatility > 0.3) {
      return `${category} spending varies significantly month to month.`;
    }
    return `${category} spending is stable and predictable.`;
  }

  private static generateGoalRecommendations(
    goal: any,
    currentMonthly: number,
    requiredMonthly: number,
    availableSavings: number,
    onTrack: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!onTrack) {
      if (currentMonthly === 0) {
        recommendations.push(`Start contributing to reach your goal. Even £${Math.round(requiredMonthly / 4)} weekly would help.`);
      } else if (currentMonthly < requiredMonthly * 0.5) {
        const increase = requiredMonthly - currentMonthly;
        recommendations.push(`Increase monthly contributions by £${Math.round(increase)} to stay on track.`);
      }

      if (availableSavings > requiredMonthly * 2) {
        recommendations.push('You have available savings that could be redirected to this goal.');
      }

      if (goal.deadline) {
        const canExtend = new Date(goal.deadline);
        canExtend.setMonth(canExtend.getMonth() + 3);
        recommendations.push(`Consider extending deadline to ${canExtend.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} for a more achievable pace.`);
      }
    } else {
      if (currentMonthly > requiredMonthly * 1.5) {
        recommendations.push('Excellent progress! You could reach this goal ahead of schedule.');
      }
      recommendations.push('Keep up your current contribution rate.');
    }

    return recommendations;
  }

  private static simulatePayoff(
    debts: any[],
    monthlyPayment: number
  ): { payoffDate: Date; totalInterest: number; payoffMonths: Record<string, number> } {
    const balances: Record<string, number> = {};
    const minPayments: Record<string, number> = {};
    const rates: Record<string, number> = {};
    const payoffMonths: Record<string, number> = {};

    debts.forEach(d => {
      balances[d.id] = d.currentBalance;
      minPayments[d.id] = d.minimumPayment || 0;
      rates[d.id] = (d.interestRate || 0) / 12; // Monthly rate
    });

    let month = 0;
    let totalInterest = 0;
    const maxMonths = 360; // 30 years max

    while (Object.values(balances).some(b => b > 0) && month < maxMonths) {
      month++;
      let availablePayment = monthlyPayment;

      // Apply interest and minimum payments
      for (const debtId of Object.keys(balances)) {
        if (balances[debtId] <= 0) continue;

        // Add interest
        const interest = balances[debtId] * rates[debtId];
        balances[debtId] += interest;
        totalInterest += interest;

        // Apply minimum payment
        const minPayment = Math.min(minPayments[debtId], balances[debtId]);
        balances[debtId] -= minPayment;
        availablePayment -= minPayment;

        if (balances[debtId] <= 0) {
          payoffMonths[debtId] = month;
        }
      }

      // Apply extra payment to first debt with remaining balance
      for (const debt of debts) {
        if (balances[debt.id] > 0 && availablePayment > 0) {
          const extraPayment = Math.min(availablePayment, balances[debt.id]);
          balances[debt.id] -= extraPayment;
          availablePayment -= extraPayment;

          if (balances[debt.id] <= 0) {
            payoffMonths[debt.id] = month;
          }
        }
      }
    }

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + month);

    return { payoffDate, totalInterest, payoffMonths };
  }

  private static parseJSONResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch {
      return {};
    }
  }

  private static getFallbackUrgentActions(context: any): PersonalizedAdvice['urgentActions'] {
    const actions: PersonalizedAdvice['urgentActions'] = [];

    if (context.savingsRate < 10) {
      actions.push({
        priority: 'high',
        title: 'Increase Savings Rate',
        description: `Your current savings rate of ${context.savingsRate.toFixed(1)}% is below the recommended 20%`,
        potentialImpact: `£${(context.income * 0.1).toFixed(0)}/month in additional savings`,
        actionSteps: ['Review discretionary spending', 'Set up automatic transfers to savings', 'Identify subscriptions to cancel']
      });
    }

    if (context.debtToIncome > 40) {
      actions.push({
        priority: 'critical',
        title: 'Address High Debt Burden',
        description: `Your debt-to-income ratio of ${context.debtToIncome.toFixed(1)}% is above healthy levels`,
        potentialImpact: 'Improved credit score and reduced financial stress',
        actionSteps: ['Prioritize high-interest debt', 'Consider debt consolidation', 'Create a debt payoff plan']
      });
    }

    if (context.totalSavings < context.income * context.emergencyFundTarget) {
      actions.push({
        priority: 'high',
        title: 'Build Emergency Fund',
        description: `Emergency fund should cover ${context.emergencyFundTarget} months of expenses`,
        potentialImpact: 'Financial security during unexpected events',
        actionSteps: ['Open a dedicated savings account', 'Set up automatic monthly transfers', 'Target saving 10% of income']
      });
    }

    return actions.length > 0 ? actions : [{
      priority: 'medium',
      title: 'Continue Building Wealth',
      description: 'Your finances are in good shape. Focus on long-term growth.',
      potentialImpact: 'Long-term financial independence',
      actionSteps: ['Review investment allocations', 'Maximize pension contributions', 'Consider ISA investments']
    }];
  }

  private static getFallbackOptimizations(context: any): PersonalizedAdvice['optimizations'] {
    const optimizations: PersonalizedAdvice['optimizations'] = [];

    const topCategories = context.topSpendingCategories;
    if (topCategories.length > 0) {
      const [topCat, topAmount] = topCategories[0];
      const percentOfExpenses = (topAmount / context.expenses) * 100;

      if (percentOfExpenses > 30) {
        optimizations.push({
          area: 'Spending',
          currentSituation: `${topCat} accounts for ${percentOfExpenses.toFixed(0)}% of spending`,
          recommendation: `Review ${topCat.toLowerCase()} expenses for potential savings`,
          estimatedBenefit: `Potential to save £${(topAmount * 0.1).toFixed(0)}/month`
        });
      }
    }

    if (context.savingsRate > 0 && context.savingsRate < 20) {
      optimizations.push({
        area: 'Saving',
        currentSituation: `Saving ${context.savingsRate.toFixed(1)}% of income`,
        recommendation: 'Increase savings rate towards the 20% target',
        estimatedBenefit: 'Faster goal achievement and emergency fund growth'
      });
    }

    return optimizations;
  }

  private static getFallbackLongTerm(context: any): PersonalizedAdvice['longTermSuggestions'] {
    const suggestions: PersonalizedAdvice['longTermSuggestions'] = [];

    suggestions.push({
      title: 'Build Investment Portfolio',
      description: 'Consider stocks and shares ISA for tax-efficient long-term growth',
      timeframe: '12+ months'
    });

    if (context.housingStatus === 'rent') {
      suggestions.push({
        title: 'Explore Homeownership',
        description: 'Research Help to Buy and Lifetime ISA options for first-time buyers',
        timeframe: '2-5 years'
      });
    }

    suggestions.push({
      title: 'Maximise Pension Contributions',
      description: 'Take advantage of employer matching and tax relief on pension contributions',
      timeframe: 'Ongoing'
    });

    return suggestions;
  }

  private static getFallbackAssessment(context: any): string {
    if (context.savingsRate >= 20 && context.debtToIncome < 30) {
      return 'Your financial health is strong. Focus on maintaining your current habits while exploring investment opportunities for long-term wealth building.';
    } else if (context.savingsRate >= 10 && context.debtToIncome < 40) {
      return 'You\'re making good progress. Prioritize increasing your savings rate and managing debt to accelerate your financial goals.';
    } else {
      return 'There\'s room for improvement in your finances. Focus on building an emergency fund, reducing unnecessary expenses, and creating a clear debt payoff strategy.';
    }
  }
}
