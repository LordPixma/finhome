import { format, subMonths, addMonths, eachMonthOfInterval } from 'date-fns';

export interface Transaction {
  id: string;
  amount: number;
  date: number;
  type: 'income' | 'expense' | 'transfer';
  categoryId: string;
  category?: {
    name: string;
    color?: string;
  };
}

export interface PredictionData {
  month: string;
  income: number;
  expense: number;
  net: number;
  predicted: boolean;
  confidence: number;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  percentage: number;
  description: string;
}

export interface SpendingInsight {
  type: 'warning' | 'positive' | 'neutral';
  title: string;
  description: string;
  impact: number; // Financial impact in GBP
  category?: string;
}

export interface ForecastResult {
  predictions: PredictionData[];
  trends: {
    income: TrendAnalysis;
    expense: TrendAnalysis;
    savings: TrendAnalysis;
  };
  insights: SpendingInsight[];
  confidence: number;
}

export class PredictiveAnalytics {
  private transactions: Transaction[];

  constructor(transactions: Transaction[]) {
    this.transactions = transactions;
  }

  /**
   * Generate spending forecast for the next N months
   */
  generateForecast(monthsAhead: number = 6): ForecastResult {
    const monthlyData = this.getMonthlyHistoricalData();
    const predictions = this.predictFutureSpending(monthlyData, monthsAhead);
    const trends = this.analyzeTrends(monthlyData);
    const insights = this.generateInsights(monthlyData, predictions);

    return {
      predictions: [...monthlyData, ...predictions],
      trends,
      insights,
      confidence: this.calculateOverallConfidence(monthlyData)
    };
  }

  /**
   * Get historical monthly data
   */
  private getMonthlyHistoricalData(): PredictionData[] {
    const monthlyMap: Record<string, PredictionData> = {};
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 12); // Get 12 months of history

    // Initialize months with zero values
    const months = eachMonthOfInterval({
      start: sixMonthsAgo,
      end: now
    });

    months.forEach(month => {
      const monthKey = format(month, 'yyyy-MM');
      const monthLabel = format(month, 'MMM yyyy');
      monthlyMap[monthKey] = {
        month: monthLabel,
        income: 0,
        expense: 0,
        net: 0,
        predicted: false,
        confidence: 1.0
      };
    });

    // Aggregate transaction data
    this.transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = format(date, 'yyyy-MM');
      
      if (monthlyMap[monthKey]) {
        const amount = Math.abs(transaction.amount);
        
        if (transaction.type === 'income') {
          monthlyMap[monthKey].income += amount;
        } else if (transaction.type === 'expense') {
          monthlyMap[monthKey].expense += amount;
        }
      }
    });

    // Calculate net savings
    Object.values(monthlyMap).forEach(month => {
      month.net = month.income - month.expense;
    });

    return Object.values(monthlyMap)
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }

  /**
   * Predict future spending using trend analysis and seasonal patterns
   */
  private predictFutureSpending(historicalData: PredictionData[], monthsAhead: number): PredictionData[] {
    const predictions: PredictionData[] = [];
    const now = new Date();

    // Calculate moving averages and trends
    const recentData = historicalData.slice(-6); // Last 6 months for trend
    const avgIncome = recentData.reduce((sum, m) => sum + m.income, 0) / recentData.length;
    const avgExpense = recentData.reduce((sum, m) => sum + m.expense, 0) / recentData.length;

    // Calculate growth rates
    const incomeGrowthRate = this.calculateGrowthRate(recentData.map(m => m.income));
    const expenseGrowthRate = this.calculateGrowthRate(recentData.map(m => m.expense));

    // Generate predictions for future months
    for (let i = 1; i <= monthsAhead; i++) {
      const futureMonth = addMonths(now, i);
      const monthLabel = format(futureMonth, 'MMM yyyy');

      // Apply seasonal adjustments
      const seasonalFactor = this.getSeasonalFactor(futureMonth);
      
      // Predict with trend and seasonal adjustments
      const predictedIncome = avgIncome * (1 + incomeGrowthRate * i) * seasonalFactor.income;
      const predictedExpense = avgExpense * (1 + expenseGrowthRate * i) * seasonalFactor.expense;

      // Calculate confidence (decreases over time)
      const confidence = Math.max(0.3, 0.9 - (i * 0.1));

      predictions.push({
        month: monthLabel,
        income: predictedIncome,
        expense: predictedExpense,
        net: predictedIncome - predictedExpense,
        predicted: true,
        confidence
      });
    }

    return predictions;
  }

  /**
   * Calculate growth rate from historical data
   */
  private calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;

    const changes = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) {
        changes.push((values[i] - values[i - 1]) / values[i - 1]);
      }
    }

    if (changes.length === 0) return 0;
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }

  /**
   * Get seasonal adjustment factors
   */
  private getSeasonalFactor(month: Date): { income: number; expense: number } {
    const monthNumber = month.getMonth();
    
    // Simple seasonal patterns (can be enhanced with ML)
    const seasonalPatterns = {
      income: [0.95, 0.98, 1.02, 1.0, 1.0, 1.0, 0.98, 0.98, 1.0, 1.0, 1.05, 1.15], // Dec bonus, Jan dip
      expense: [1.15, 0.9, 1.0, 1.05, 1.0, 1.1, 1.08, 1.05, 0.95, 1.0, 1.1, 1.2]   // Holiday spending
    };

    return {
      income: seasonalPatterns.income[monthNumber],
      expense: seasonalPatterns.expense[monthNumber]
    };
  }

  /**
   * Analyze trends in the data
   */
  private analyzeTrends(data: PredictionData[]): ForecastResult['trends'] {
    const recentData = data.slice(-6);
    
    if (recentData.length < 2) {
      return {
        income: { direction: 'stable', percentage: 0, description: 'Insufficient data' },
        expense: { direction: 'stable', percentage: 0, description: 'Insufficient data' },
        savings: { direction: 'stable', percentage: 0, description: 'Insufficient data' }
      };
    }

    const analyzeTrend = (values: number[], label: string): TrendAnalysis => {
      const firstHalf = values.slice(0, Math.ceil(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
      
      const changePercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
      
      let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (Math.abs(changePercent) > 5) {
        direction = changePercent > 0 ? 'increasing' : 'decreasing';
      }

      const absChange = Math.abs(changePercent);
      let description = '';
      
      if (direction === 'increasing') {
        description = `${label} trending up by ${absChange.toFixed(1)}% over recent months`;
      } else if (direction === 'decreasing') {
        description = `${label} trending down by ${absChange.toFixed(1)}% over recent months`;
      } else {
        description = `${label} remaining relatively stable`;
      }

      return { direction, percentage: changePercent, description };
    };

    return {
      income: analyzeTrend(recentData.map(d => d.income), 'Income'),
      expense: analyzeTrend(recentData.map(d => d.expense), 'Expenses'),
      savings: analyzeTrend(recentData.map(d => d.net), 'Savings')
    };
  }

  /**
   * Generate actionable insights
   */
  private generateInsights(historical: PredictionData[], predictions: PredictionData[]): SpendingInsight[] {
    const insights: SpendingInsight[] = [];
    const recentMonths = historical.slice(-3);
    const futureMonths = predictions.slice(0, 3);

    // Average calculations
    const avgIncome = recentMonths.reduce((sum, m) => sum + m.income, 0) / recentMonths.length;
    const avgExpense = recentMonths.reduce((sum, m) => sum + m.expense, 0) / recentMonths.length;
    const avgSavings = avgIncome - avgExpense;

    // Savings rate analysis
    const savingsRate = avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0;
    
    if (savingsRate < 10) {
      insights.push({
        type: 'warning',
        title: 'Low Savings Rate',
        description: `Your savings rate is ${savingsRate.toFixed(1)}%. Experts recommend saving at least 20% of income.`,
        impact: avgIncome * 0.2 - avgSavings
      });
    } else if (savingsRate > 30) {
      insights.push({
        type: 'positive',
        title: 'Excellent Savings Rate',
        description: `Your savings rate of ${savingsRate.toFixed(1)}% is exceptional! You're on track for strong financial health.`,
        impact: avgSavings - avgIncome * 0.2
      });
    }

    // Future prediction insights
    const futureAvgExpense = futureMonths.reduce((sum, m) => sum + m.expense, 0) / futureMonths.length;
    const expenseIncrease = ((futureAvgExpense - avgExpense) / avgExpense) * 100;

    if (expenseIncrease > 10) {
      insights.push({
        type: 'warning',
        title: 'Rising Expenses Predicted',
        description: `Our model predicts expenses may increase by ${expenseIncrease.toFixed(1)}% in coming months. Consider reviewing your budget.`,
        impact: futureAvgExpense - avgExpense
      });
    }

    // Category-specific insights (if we had category data)
    this.addCategoryInsights(insights);

    return insights;
  }

  /**
   * Add insights based on spending categories
   */
  private addCategoryInsights(insights: SpendingInsight[]): void {
    // Analyze spending by category
    const categoryTotals: Record<string, number> = {};
    
    this.transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const categoryName = t.category?.name || 'Uncategorized';
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + Math.abs(t.amount);
      });

    const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    
    // Find categories that are unusually high
    Object.entries(categoryTotals).forEach(([category, amount]) => {
      const percentage = (amount / totalExpenses) * 100;
      
      if (percentage > 25 && category !== 'Housing' && category !== 'Rent') {
        insights.push({
          type: 'warning',
          title: `High ${category} Spending`,
          description: `${category} accounts for ${percentage.toFixed(1)}% of your expenses. Consider if this aligns with your priorities.`,
          impact: amount,
          category
        });
      }
    });
  }

  /**
   * Calculate overall prediction confidence
   */
  private calculateOverallConfidence(historical: PredictionData[]): number {
    // Base confidence on data quality and consistency
    const dataPoints = historical.length;
    const dataQuality = Math.min(1.0, dataPoints / 12); // Full confidence with 12+ months

    // Calculate variance in historical data
    const expenses = historical.map(h => h.expense).filter(e => e > 0);
    if (expenses.length < 2) return 0.5;

    const mean = expenses.reduce((sum, e) => sum + e, 0) / expenses.length;
    const variance = expenses.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / expenses.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    // Lower variance = higher confidence
    const stabilityScore = Math.max(0.3, 1 - coefficientOfVariation);

    return dataQuality * stabilityScore;
  }
}

export default PredictiveAnalytics;