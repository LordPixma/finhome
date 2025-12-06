import { eq, desc, sql, and, gte } from 'drizzle-orm';
import {
  getDb,
  transactions,
  accounts,
  budgets,
  financialHealthScores,
  userFinancialProfiles,
  financialHealthHistory,
  debtAccounts,
  aiFinancialInsights
} from '../db';
import type { AppContext } from '../types';

/**
 * Financial Health Score Calculation Service
 *
 * Calculates a comprehensive financial health score (0-100) based on:
 * - Savings Rate (20%): How much of income is being saved
 * - Debt Management (20%): Debt-to-income ratio and payment history
 * - Emergency Fund (20%): Months of expenses covered
 * - Budget Adherence (20%): How well spending stays within budgets
 * - Cash Flow (20%): Income vs expenses stability
 */

export interface FinancialHealthInput {
  tenantId: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalSavings: number;
  totalDebt: number;
  monthlyDebtPayments: number;
  emergencyFundBalance: number;
  emergencyFundTarget: number; // in months
  budgetUtilization: number; // percentage (0-100+)
  incomeStability: number; // 0-1 coefficient of variation
}

export interface ScoreBreakdown {
  savingsRate: {
    score: number;
    actual: number;
    target: number;
    description: string;
  };
  debtManagement: {
    score: number;
    debtToIncomeRatio: number;
    description: string;
  };
  emergencyFund: {
    score: number;
    monthsCovered: number;
    targetMonths: number;
    description: string;
  };
  budgetAdherence: {
    score: number;
    utilizationRate: number;
    description: string;
  };
  cashFlow: {
    score: number;
    netMonthly: number;
    stabilityIndex: number;
    description: string;
  };
}

export interface HealthScoreResult {
  overallScore: number;
  category: 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'critical';
  breakdown: ScoreBreakdown;
  insights: string[];
  recommendations: string[];
}

export type ScoreCategory = 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'critical';

export class FinancialHealthService {
  /**
   * Calculate the complete financial health score for a tenant
   */
  static async calculateHealthScore(c: AppContext, tenantId: string): Promise<HealthScoreResult> {
    // Gather all financial data
    const data = await this.gatherFinancialData(c, tenantId);

    // Calculate individual scores
    const savingsScore = this.calculateSavingsScore(data);
    const debtScore = this.calculateDebtScore(data);
    const emergencyFundScore = this.calculateEmergencyFundScore(data);
    const budgetScore = this.calculateBudgetScore(data);
    const cashFlowScore = this.calculateCashFlowScore(data);

    // Calculate weighted overall score (each component is 20%)
    const overallScore = Math.round(
      (savingsScore.score * 0.2) +
      (debtScore.score * 0.2) +
      (emergencyFundScore.score * 0.2) +
      (budgetScore.score * 0.2) +
      (cashFlowScore.score * 0.2)
    );

    // Determine category
    const category = this.getScoreCategory(overallScore);

    // Generate insights and recommendations
    const insights = this.generateInsights({
      savingsScore,
      debtScore,
      emergencyFundScore,
      budgetScore,
      cashFlowScore,
      overallScore,
      data
    });

    const recommendations = this.generateRecommendations({
      savingsScore,
      debtScore,
      emergencyFundScore,
      budgetScore,
      cashFlowScore,
      data
    });

    return {
      overallScore,
      category,
      breakdown: {
        savingsRate: savingsScore,
        debtManagement: debtScore,
        emergencyFund: emergencyFundScore,
        budgetAdherence: budgetScore,
        cashFlow: cashFlowScore
      },
      insights,
      recommendations
    };
  }

  /**
   * Store a calculated health score
   */
  static async storeHealthScore(c: AppContext, tenantId: string, result: HealthScoreResult): Promise<string> {
    const db = getDb(c.env.DB);
    const now = new Date();
    const scoreId = crypto.randomUUID();

    // Get the previous score for history tracking
    const previousScore = await db
      .select()
      .from(financialHealthScores)
      .where(eq(financialHealthScores.tenantId, tenantId))
      .orderBy(desc(financialHealthScores.calculatedAt))
      .limit(1)
      .get();

    // Store the new score
    await db.insert(financialHealthScores).values({
      id: scoreId,
      tenantId,
      overallScore: result.overallScore,
      savingsScore: result.breakdown.savingsRate.score,
      debtScore: result.breakdown.debtManagement.score,
      emergencyFundScore: result.breakdown.emergencyFund.score,
      budgetScore: result.breakdown.budgetAdherence.score,
      cashFlowScore: result.breakdown.cashFlow.score,
      scoreBreakdown: JSON.stringify(result.breakdown),
      scoreCategory: result.category,
      insights: JSON.stringify(result.insights),
      recommendations: JSON.stringify(result.recommendations),
      calculatedAt: now,
      createdAt: now
    });

    // Store history entry
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const scoreDelta = previousScore ? result.overallScore - previousScore.overallScore : 0;

    await db.insert(financialHealthHistory).values({
      id: crypto.randomUUID(),
      tenantId,
      scoreId,
      previousScore: previousScore?.overallScore || null,
      newScore: result.overallScore,
      scoreDelta,
      changeReason: this.generateChangeReason(previousScore?.overallScore, result.overallScore, result.breakdown),
      period,
      createdAt: now
    });

    return scoreId;
  }

  /**
   * Get the latest health score for a tenant
   */
  static async getLatestScore(c: AppContext, tenantId: string) {
    const db = getDb(c.env.DB);

    return await db
      .select()
      .from(financialHealthScores)
      .where(eq(financialHealthScores.tenantId, tenantId))
      .orderBy(desc(financialHealthScores.calculatedAt))
      .limit(1)
      .get();
  }

  /**
   * Get health score history for a tenant
   */
  static async getScoreHistory(c: AppContext, tenantId: string, months: number = 12) {
    const db = getDb(c.env.DB);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return await db
      .select()
      .from(financialHealthHistory)
      .where(and(
        eq(financialHealthHistory.tenantId, tenantId),
        gte(financialHealthHistory.createdAt, startDate)
      ))
      .orderBy(desc(financialHealthHistory.createdAt));
  }

  /**
   * Get or create user financial profile
   */
  static async getOrCreateProfile(c: AppContext, tenantId: string) {
    const db = getDb(c.env.DB);

    let profile = await db
      .select()
      .from(userFinancialProfiles)
      .where(eq(userFinancialProfiles.tenantId, tenantId))
      .get();

    if (!profile) {
      const now = new Date();
      const id = crypto.randomUUID();

      await db.insert(userFinancialProfiles).values({
        id,
        tenantId,
        lastUpdatedAt: now,
        createdAt: now
      });

      profile = await db
        .select()
        .from(userFinancialProfiles)
        .where(eq(userFinancialProfiles.id, id))
        .get();
    }

    return profile;
  }

  /**
   * Update user financial profile
   */
  static async updateProfile(c: AppContext, tenantId: string, updates: Partial<{
    monthlyIncome: number;
    incomeSource: string;
    employmentStatus: string;
    householdSize: number;
    dependents: number;
    housingStatus: string;
    monthlyRentMortgage: number;
    totalDebtBalance: number;
    monthlyDebtPayments: number;
    emergencyFundTarget: number;
    emergencyFundAccountId: string;
    riskTolerance: string;
    financialGoals: string[];
    retirementAge: number;
    hasRetirementAccount: boolean;
    hasLifeInsurance: boolean;
    hasHealthInsurance: boolean;
    hasIncomeProtection: boolean;
  }>) {
    const db = getDb(c.env.DB);
    const now = new Date();

    // Calculate profile completeness
    const profile = await this.getOrCreateProfile(c, tenantId);
    const completeness = this.calculateProfileCompleteness({ ...profile, ...updates });

    // Build update object with proper types
    const updateData: Record<string, any> = {
      profileCompleteness: completeness,
      lastUpdatedAt: now
    };

    // Add each field explicitly to avoid type issues with enums
    if (updates.monthlyIncome !== undefined) updateData.monthlyIncome = updates.monthlyIncome;
    if (updates.incomeSource !== undefined) updateData.incomeSource = updates.incomeSource;
    if (updates.employmentStatus !== undefined) updateData.employmentStatus = updates.employmentStatus;
    if (updates.householdSize !== undefined) updateData.householdSize = updates.householdSize;
    if (updates.dependents !== undefined) updateData.dependents = updates.dependents;
    if (updates.housingStatus !== undefined) updateData.housingStatus = updates.housingStatus;
    if (updates.monthlyRentMortgage !== undefined) updateData.monthlyRentMortgage = updates.monthlyRentMortgage;
    if (updates.totalDebtBalance !== undefined) updateData.totalDebtBalance = updates.totalDebtBalance;
    if (updates.monthlyDebtPayments !== undefined) updateData.monthlyDebtPayments = updates.monthlyDebtPayments;
    if (updates.emergencyFundTarget !== undefined) updateData.emergencyFundTarget = updates.emergencyFundTarget;
    if (updates.emergencyFundAccountId !== undefined) updateData.emergencyFundAccountId = updates.emergencyFundAccountId;
    if (updates.riskTolerance !== undefined) updateData.riskTolerance = updates.riskTolerance;
    if (updates.financialGoals !== undefined) updateData.financialGoals = JSON.stringify(updates.financialGoals);
    if (updates.retirementAge !== undefined) updateData.retirementAge = updates.retirementAge;
    if (updates.hasRetirementAccount !== undefined) updateData.hasRetirementAccount = updates.hasRetirementAccount;
    if (updates.hasLifeInsurance !== undefined) updateData.hasLifeInsurance = updates.hasLifeInsurance;
    if (updates.hasHealthInsurance !== undefined) updateData.hasHealthInsurance = updates.hasHealthInsurance;
    if (updates.hasIncomeProtection !== undefined) updateData.hasIncomeProtection = updates.hasIncomeProtection;

    await db
      .update(userFinancialProfiles)
      .set(updateData)
      .where(eq(userFinancialProfiles.tenantId, tenantId));

    return await this.getOrCreateProfile(c, tenantId);
  }

  /**
   * Get AI-generated insights for a tenant
   */
  static async getActiveInsights(c: AppContext, tenantId: string) {
    const db = getDb(c.env.DB);
    const now = new Date();

    return await db
      .select()
      .from(aiFinancialInsights)
      .where(and(
        eq(aiFinancialInsights.tenantId, tenantId),
        eq(aiFinancialInsights.isDismissed, false),
        sql`(${aiFinancialInsights.validUntil} IS NULL OR ${aiFinancialInsights.validUntil} > ${now.getTime()})`
      ))
      .orderBy(desc(aiFinancialInsights.priority), desc(aiFinancialInsights.generatedAt));
  }

  /**
   * Store a new AI-generated insight
   */
  static async storeInsight(c: AppContext, tenantId: string, insight: {
    type: 'spending_pattern' | 'savings_opportunity' | 'debt_advice' | 'budget_recommendation' | 'anomaly_detection' | 'goal_progress' | 'general_advice';
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    potentialImpact?: number;
    actionItems?: string[];
    relatedCategoryId?: string;
    relatedAccountId?: string;
    relatedGoalId?: string;
    validDays?: number;
  }) {
    const db = getDb(c.env.DB);
    const now = new Date();
    const validUntil = insight.validDays
      ? new Date(now.getTime() + insight.validDays * 24 * 60 * 60 * 1000)
      : null;

    return await db.insert(aiFinancialInsights).values({
      id: crypto.randomUUID(),
      tenantId,
      insightType: insight.type,
      title: insight.title,
      content: insight.content,
      priority: insight.priority,
      potentialImpact: insight.potentialImpact,
      actionItems: insight.actionItems ? JSON.stringify(insight.actionItems) : null,
      relatedCategoryId: insight.relatedCategoryId,
      relatedAccountId: insight.relatedAccountId,
      relatedGoalId: insight.relatedGoalId,
      validUntil,
      generatedAt: now,
      createdAt: now
    });
  }

  /**
   * Mark an insight as read/dismissed/acted upon
   */
  static async updateInsightStatus(c: AppContext, insightId: string, tenantId: string, status: {
    isRead?: boolean;
    isDismissed?: boolean;
    isActedUpon?: boolean;
  }) {
    const db = getDb(c.env.DB);

    return await db
      .update(aiFinancialInsights)
      .set(status)
      .where(and(
        eq(aiFinancialInsights.id, insightId),
        eq(aiFinancialInsights.tenantId, tenantId)
      ));
  }

  /**
   * Get debt accounts for a tenant
   */
  static async getDebtAccounts(c: AppContext, tenantId: string) {
    const db = getDb(c.env.DB);

    return await db
      .select()
      .from(debtAccounts)
      .where(and(
        eq(debtAccounts.tenantId, tenantId),
        eq(debtAccounts.status, 'active')
      ))
      .orderBy(desc(debtAccounts.interestRate));
  }

  /**
   * Add or update a debt account
   */
  static async upsertDebtAccount(c: AppContext, tenantId: string, debt: {
    id?: string;
    name: string;
    type: 'mortgage' | 'car_loan' | 'student_loan' | 'credit_card' | 'personal_loan' | 'overdraft' | 'other';
    linkedAccountId?: string;
    originalBalance: number;
    currentBalance: number;
    interestRate?: number;
    minimumPayment?: number;
    monthlyPayment?: number;
    startDate?: Date;
    endDate?: Date;
    creditorName?: string;
    payoffPriority?: number;
  }) {
    const db = getDb(c.env.DB);
    const now = new Date();

    if (debt.id) {
      // Update existing
      await db
        .update(debtAccounts)
        .set({
          name: debt.name,
          type: debt.type,
          linkedAccountId: debt.linkedAccountId,
          currentBalance: debt.currentBalance,
          interestRate: debt.interestRate,
          minimumPayment: debt.minimumPayment,
          monthlyPayment: debt.monthlyPayment,
          endDate: debt.endDate,
          creditorName: debt.creditorName,
          payoffPriority: debt.payoffPriority,
          updatedAt: now
        })
        .where(and(
          eq(debtAccounts.id, debt.id),
          eq(debtAccounts.tenantId, tenantId)
        ));

      return debt.id;
    } else {
      // Create new
      const id = crypto.randomUUID();
      await db.insert(debtAccounts).values({
        id,
        tenantId,
        name: debt.name,
        type: debt.type,
        linkedAccountId: debt.linkedAccountId,
        originalBalance: debt.originalBalance,
        currentBalance: debt.currentBalance,
        interestRate: debt.interestRate,
        minimumPayment: debt.minimumPayment,
        monthlyPayment: debt.monthlyPayment,
        startDate: debt.startDate,
        endDate: debt.endDate,
        creditorName: debt.creditorName,
        payoffPriority: debt.payoffPriority,
        createdAt: now,
        updatedAt: now
      });

      return id;
    }
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private static async gatherFinancialData(c: AppContext, tenantId: string): Promise<FinancialHealthInput> {
    const db = getDb(c.env.DB);
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // Get all accounts
    const allAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId));

    // Calculate total balances by account type
    let totalSavings = 0;
    let totalDebt = 0;

    for (const account of allAccounts) {
      if (account.type === 'savings' || account.type === 'investment') {
        totalSavings += account.balance;
      } else if (account.type === 'credit') {
        // Credit accounts typically have negative balance representing debt
        totalDebt += Math.abs(account.balance);
      }
    }

    // Get transactions for the last 3 months for averages
    const recentTransactions = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date
      })
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.date, threeMonthsAgo)
      ));

    // Calculate monthly income and expenses
    let totalIncome = 0;
    let totalExpenses = 0;
    const monthlyIncomes: number[] = [];
    const monthlyExpensesByMonth: Record<string, number> = {};

    for (const tx of recentTransactions) {
      const monthKey = `${new Date(tx.date).getFullYear()}-${new Date(tx.date).getMonth()}`;

      if (tx.type === 'income') {
        totalIncome += tx.amount;
        if (!monthlyIncomes.includes(new Date(tx.date).getMonth())) {
          monthlyIncomes.push(new Date(tx.date).getMonth());
        }
      } else if (tx.type === 'expense') {
        totalExpenses += Math.abs(tx.amount);
        monthlyExpensesByMonth[monthKey] = (monthlyExpensesByMonth[monthKey] || 0) + Math.abs(tx.amount);
      }
    }

    const monthCount = Math.max(1, Object.keys(monthlyExpensesByMonth).length);
    const monthlyIncome = totalIncome / monthCount;
    const monthlyExpenses = totalExpenses / monthCount;

    // Calculate income stability (coefficient of variation)
    const monthlyExpenseValues = Object.values(monthlyExpensesByMonth);
    let incomeStability = 0;
    if (monthlyExpenseValues.length > 1) {
      const mean = monthlyExpenseValues.reduce((a, b) => a + b, 0) / monthlyExpenseValues.length;
      const variance = monthlyExpenseValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monthlyExpenseValues.length;
      const stdDev = Math.sqrt(variance);
      incomeStability = mean > 0 ? stdDev / mean : 0;
    }

    // Get debt accounts
    const debts = await this.getDebtAccounts(c, tenantId);
    const monthlyDebtPayments = debts.reduce((sum, d) => sum + (d.monthlyPayment || d.minimumPayment || 0), 0);
    totalDebt += debts.reduce((sum, d) => sum + d.currentBalance, 0);

    // Get user profile for emergency fund info
    const profile = await this.getOrCreateProfile(c, tenantId);

    // Calculate emergency fund balance (from designated account or estimate from savings accounts)
    let emergencyFundBalance = 0;
    if (profile?.emergencyFundAccountId) {
      const efAccount = allAccounts.find(a => a.id === profile.emergencyFundAccountId);
      emergencyFundBalance = efAccount?.balance || 0;
    } else {
      // Use 30% of savings as estimated emergency fund
      emergencyFundBalance = totalSavings * 0.3;
    }

    const emergencyFundTarget = profile?.emergencyFundTarget || 3; // Default 3 months

    // Get budget utilization
    const currentBudgets = await db
      .select()
      .from(budgets)
      .where(eq(budgets.tenantId, tenantId));

    let budgetUtilization = 100; // Default if no budgets
    if (currentBudgets.length > 0) {
      const budgetAnalysis = await this.analyzeBudgetUtilization(c, tenantId, currentBudgets);
      budgetUtilization = budgetAnalysis.averageUtilization;
    }

    return {
      tenantId,
      monthlyIncome,
      monthlyExpenses,
      totalSavings,
      totalDebt,
      monthlyDebtPayments,
      emergencyFundBalance,
      emergencyFundTarget,
      budgetUtilization,
      incomeStability
    };
  }

  private static async analyzeBudgetUtilization(c: AppContext, tenantId: string, budgetsList: any[]) {
    const db = getDb(c.env.DB);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalBudget = 0;
    let totalSpent = 0;

    for (const budget of budgetsList) {
      totalBudget += budget.amount;

      // Get spending for this category this month
      const spending = await db
        .select({
          total: sql<number>`sum(abs(${transactions.amount}))`
        })
        .from(transactions)
        .where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.categoryId, budget.categoryId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, startOfMonth)
        ))
        .get();

      totalSpent += spending?.total || 0;
    }

    return {
      totalBudget,
      totalSpent,
      averageUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    };
  }

  private static calculateSavingsScore(data: FinancialHealthInput): ScoreBreakdown['savingsRate'] {
    const savingsRate = data.monthlyIncome > 0
      ? ((data.monthlyIncome - data.monthlyExpenses) / data.monthlyIncome) * 100
      : 0;

    const targetRate = 20; // 20% savings rate is the target

    let score: number;
    let description: string;

    if (savingsRate >= 30) {
      score = 100;
      description = 'Exceptional! You\'re saving over 30% of your income.';
    } else if (savingsRate >= 20) {
      score = 85 + ((savingsRate - 20) / 10) * 15;
      description = 'Great job! You\'re meeting the recommended 20% savings rate.';
    } else if (savingsRate >= 10) {
      score = 60 + ((savingsRate - 10) / 10) * 25;
      description = 'Good progress, but try to increase your savings rate to 20%.';
    } else if (savingsRate >= 5) {
      score = 40 + ((savingsRate - 5) / 5) * 20;
      description = 'You\'re saving some, but there\'s room for improvement.';
    } else if (savingsRate > 0) {
      score = savingsRate * 8;
      description = 'Low savings rate. Consider reviewing your expenses.';
    } else {
      score = 0;
      description = 'You\'re spending more than you earn. Urgent attention needed.';
    }

    return {
      score: Math.round(Math.min(100, Math.max(0, score))),
      actual: Math.round(savingsRate * 10) / 10,
      target: targetRate,
      description
    };
  }

  private static calculateDebtScore(data: FinancialHealthInput): ScoreBreakdown['debtManagement'] {
    const debtToIncomeRatio = data.monthlyIncome > 0
      ? (data.monthlyDebtPayments / data.monthlyIncome) * 100
      : 0;

    let score: number;
    let description: string;

    if (data.totalDebt === 0) {
      score = 100;
      description = 'Excellent! You\'re debt-free.';
    } else if (debtToIncomeRatio <= 20) {
      score = 90 + ((20 - debtToIncomeRatio) / 20) * 10;
      description = 'Healthy debt levels. Keep up the good work!';
    } else if (debtToIncomeRatio <= 36) {
      score = 65 + ((36 - debtToIncomeRatio) / 16) * 25;
      description = 'Manageable debt, but consider paying down high-interest debt.';
    } else if (debtToIncomeRatio <= 50) {
      score = 35 + ((50 - debtToIncomeRatio) / 14) * 30;
      description = 'High debt burden. Prioritize debt reduction.';
    } else {
      score = Math.max(0, 35 - ((debtToIncomeRatio - 50) / 10) * 10);
      description = 'Critical debt levels. Consider debt counselling.';
    }

    return {
      score: Math.round(Math.min(100, Math.max(0, score))),
      debtToIncomeRatio: Math.round(debtToIncomeRatio * 10) / 10,
      description
    };
  }

  private static calculateEmergencyFundScore(data: FinancialHealthInput): ScoreBreakdown['emergencyFund'] {
    const monthsCovered = data.monthlyExpenses > 0
      ? data.emergencyFundBalance / data.monthlyExpenses
      : 0;

    const targetMonths = data.emergencyFundTarget || 3;

    let score: number;
    let description: string;

    if (monthsCovered >= 6) {
      score = 100;
      description = 'Excellent! You have 6+ months of expenses covered.';
    } else if (monthsCovered >= targetMonths) {
      score = 85 + ((monthsCovered - targetMonths) / (6 - targetMonths)) * 15;
      description = `Great! You've met your ${targetMonths}-month emergency fund target.`;
    } else if (monthsCovered >= 3) {
      score = 70 + ((monthsCovered - 3) / (targetMonths - 3)) * 15;
      description = 'Good foundation. Continue building your emergency fund.';
    } else if (monthsCovered >= 1) {
      score = 40 + ((monthsCovered - 1) / 2) * 30;
      description = 'You have some cushion, but aim for 3-6 months of expenses.';
    } else if (monthsCovered > 0) {
      score = monthsCovered * 40;
      description = 'Limited emergency savings. This should be a priority.';
    } else {
      score = 0;
      description = 'No emergency fund. Start building one immediately.';
    }

    return {
      score: Math.round(Math.min(100, Math.max(0, score))),
      monthsCovered: Math.round(monthsCovered * 10) / 10,
      targetMonths,
      description
    };
  }

  private static calculateBudgetScore(data: FinancialHealthInput): ScoreBreakdown['budgetAdherence'] {
    const utilization = data.budgetUtilization;

    let score: number;
    let description: string;

    if (utilization <= 80) {
      score = 100;
      description = 'Excellent budget discipline! You\'re well under budget.';
    } else if (utilization <= 100) {
      score = 75 + ((100 - utilization) / 20) * 25;
      description = 'Great job staying within budget.';
    } else if (utilization <= 110) {
      score = 50 + ((110 - utilization) / 10) * 25;
      description = 'Slightly over budget. Review your spending.';
    } else if (utilization <= 125) {
      score = 25 + ((125 - utilization) / 15) * 25;
      description = 'Significantly over budget. Consider adjusting spending habits.';
    } else {
      score = Math.max(0, 25 - ((utilization - 125) / 25) * 25);
      description = 'Budget not being followed. Time for a financial review.';
    }

    return {
      score: Math.round(Math.min(100, Math.max(0, score))),
      utilizationRate: Math.round(utilization * 10) / 10,
      description
    };
  }

  private static calculateCashFlowScore(data: FinancialHealthInput): ScoreBreakdown['cashFlow'] {
    const netMonthly = data.monthlyIncome - data.monthlyExpenses;
    const netRatio = data.monthlyIncome > 0 ? netMonthly / data.monthlyIncome : 0;

    // Stability index (lower is better, 0-1 scale)
    const stabilityIndex = Math.min(1, data.incomeStability);

    let score: number;
    let description: string;

    // Base score from net cash flow
    if (netRatio >= 0.3) {
      score = 90;
      description = 'Strong positive cash flow with excellent margins.';
    } else if (netRatio >= 0.2) {
      score = 75;
      description = 'Healthy positive cash flow.';
    } else if (netRatio >= 0.1) {
      score = 60;
      description = 'Positive cash flow, but margins are thin.';
    } else if (netRatio >= 0) {
      score = 45;
      description = 'Breaking even. Work on increasing income or reducing expenses.';
    } else if (netRatio >= -0.1) {
      score = 25;
      description = 'Negative cash flow. Urgent attention needed.';
    } else {
      score = 10;
      description = 'Significant negative cash flow. Financial restructuring recommended.';
    }

    // Adjust for stability (stable income/expenses is better)
    const stabilityBonus = (1 - stabilityIndex) * 10;
    score = Math.min(100, score + stabilityBonus);

    return {
      score: Math.round(Math.min(100, Math.max(0, score))),
      netMonthly: Math.round(netMonthly * 100) / 100,
      stabilityIndex: Math.round(stabilityIndex * 100) / 100,
      description
    };
  }

  private static getScoreCategory(score: number): ScoreCategory {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 35) return 'needs_improvement';
    return 'critical';
  }

  private static generateInsights(params: {
    savingsScore: ScoreBreakdown['savingsRate'];
    debtScore: ScoreBreakdown['debtManagement'];
    emergencyFundScore: ScoreBreakdown['emergencyFund'];
    budgetScore: ScoreBreakdown['budgetAdherence'];
    cashFlowScore: ScoreBreakdown['cashFlow'];
    overallScore: number;
    data: FinancialHealthInput;
  }): string[] {
    const insights: string[] = [];
    const { savingsScore, debtScore, emergencyFundScore, budgetScore, overallScore, data } = params;
    void budgetScore; // Used for future enhancements

    // Overall insight
    if (overallScore >= 80) {
      insights.push('Your financial health is excellent. Keep maintaining your good habits!');
    } else if (overallScore >= 65) {
      insights.push('Your financial health is good with room for improvement in a few areas.');
    } else if (overallScore >= 50) {
      insights.push('Your financial health is fair. Focus on the areas highlighted below.');
    } else {
      insights.push('Your financial health needs attention. Consider the recommendations below.');
    }

    // Savings insight
    if (savingsScore.actual >= 20) {
      insights.push(`You're saving ${savingsScore.actual}% of your income - above the recommended 20%.`);
    } else if (savingsScore.actual > 0) {
      insights.push(`Your savings rate is ${savingsScore.actual}%. Increasing to 20% could significantly improve your financial security.`);
    }

    // Debt insight
    if (data.totalDebt > 0) {
      insights.push(`Your debt-to-income ratio is ${debtScore.debtToIncomeRatio}%. ${debtScore.debtToIncomeRatio > 36 ? 'This is above the recommended 36%.' : ''}`);
    }

    // Emergency fund insight
    insights.push(`Your emergency fund covers ${emergencyFundScore.monthsCovered} months of expenses (target: ${emergencyFundScore.targetMonths} months).`);

    // Budget insight
    if (budgetScore.utilizationRate > 100) {
      insights.push(`You're ${Math.round(budgetScore.utilizationRate - 100)}% over your monthly budgets.`);
    }

    return insights;
  }

  private static generateRecommendations(params: {
    savingsScore: ScoreBreakdown['savingsRate'];
    debtScore: ScoreBreakdown['debtManagement'];
    emergencyFundScore: ScoreBreakdown['emergencyFund'];
    budgetScore: ScoreBreakdown['budgetAdherence'];
    cashFlowScore: ScoreBreakdown['cashFlow'];
    data: FinancialHealthInput;
  }): string[] {
    const recommendations: string[] = [];
    const { savingsScore, debtScore, emergencyFundScore, budgetScore, cashFlowScore, data } = params;

    // Sort by priority (lowest score = highest priority)
    const scores = [
      { name: 'savings', score: savingsScore.score },
      { name: 'debt', score: debtScore.score },
      { name: 'emergency', score: emergencyFundScore.score },
      { name: 'budget', score: budgetScore.score },
      { name: 'cashFlow', score: cashFlowScore.score }
    ].sort((a, b) => a.score - b.score);

    // Generate recommendations for the 3 lowest scoring areas
    for (const item of scores.slice(0, 3)) {
      switch (item.name) {
        case 'savings':
          if (savingsScore.score < 70) {
            const targetIncrease = Math.ceil((20 - savingsScore.actual) * data.monthlyIncome / 100);
            recommendations.push(`Increase monthly savings by £${targetIncrease} to reach the recommended 20% savings rate.`);
          }
          break;
        case 'debt':
          if (debtScore.score < 70 && data.totalDebt > 0) {
            recommendations.push('Focus on paying down high-interest debt first (avalanche method) or smallest balances (snowball method).');
          }
          break;
        case 'emergency':
          if (emergencyFundScore.score < 70) {
            const targetAmount = emergencyFundScore.targetMonths * data.monthlyExpenses;
            const needed = targetAmount - data.emergencyFundBalance;
            recommendations.push(`Build your emergency fund by £${Math.round(needed)} to reach ${emergencyFundScore.targetMonths} months coverage.`);
          }
          break;
        case 'budget':
          if (budgetScore.score < 70) {
            recommendations.push('Review and adjust your budgets. Consider using the 50/30/20 rule: 50% needs, 30% wants, 20% savings.');
          }
          break;
        case 'cashFlow':
          if (cashFlowScore.score < 70) {
            if (cashFlowScore.netMonthly < 0) {
              recommendations.push(`You're spending £${Math.abs(Math.round(cashFlowScore.netMonthly))} more than you earn monthly. Identify non-essential expenses to cut.`);
            } else {
              recommendations.push('Consider diversifying income sources or finding ways to reduce variable expenses.');
            }
          }
          break;
      }
    }

    // Always add at least one actionable recommendation
    if (recommendations.length === 0) {
      recommendations.push('Continue your current financial habits and consider increasing your investment contributions.');
    }

    return recommendations;
  }

  private static generateChangeReason(previousScore: number | undefined | null, newScore: number, breakdown: ScoreBreakdown): string {
    if (!previousScore) {
      return 'Initial financial health score calculation.';
    }

    const delta = newScore - previousScore;
    if (Math.abs(delta) < 2) {
      return 'Score remained stable with minimal changes.';
    }

    // Find the most changed component
    const components = [
      { name: 'savings rate', score: breakdown.savingsRate.score },
      { name: 'debt management', score: breakdown.debtManagement.score },
      { name: 'emergency fund', score: breakdown.emergencyFund.score },
      { name: 'budget adherence', score: breakdown.budgetAdherence.score },
      { name: 'cash flow', score: breakdown.cashFlow.score }
    ];

    const lowestScore = components.reduce((min, c) => c.score < min.score ? c : min, components[0]);
    const highestScore = components.reduce((max, c) => c.score > max.score ? c : max, components[0]);

    if (delta > 0) {
      return `Score improved by ${delta} points, primarily due to better ${highestScore.name}.`;
    } else {
      return `Score decreased by ${Math.abs(delta)} points, mainly due to ${lowestScore.name} changes.`;
    }
  }

  private static calculateProfileCompleteness(profile: any): number {
    const fields = [
      'monthlyIncome',
      'incomeSource',
      'employmentStatus',
      'householdSize',
      'housingStatus',
      'monthlyRentMortgage',
      'emergencyFundTarget',
      'riskTolerance',
      'financialGoals'
    ];

    let completed = 0;
    for (const field of fields) {
      if (profile[field] !== null && profile[field] !== undefined && profile[field] !== '') {
        completed++;
      }
    }

    return Math.round((completed / fields.length) * 100);
  }
}
