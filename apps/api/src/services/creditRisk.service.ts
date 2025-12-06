import { eq, desc, and, gte, sql } from 'drizzle-orm';
import {
  getDb,
  transactions,
  accounts,
  creditRiskScores,
  creditRiskHistory,
  creditBureauConnections,
  creditReports,
  loanAffordabilityAssessments,
  debtAccounts
} from '../db';
import type { AppContext } from '../types';

/**
 * Credit Risk Assessment Service
 *
 * Calculates an internal credit risk score (0-999 scale, similar to Experian)
 * based on available financial data. This is an estimated score for guidance
 * purposes only - not an official credit bureau score.
 *
 * Score Factors (weighted):
 * - Payment History (35%): Track record of on-time payments
 * - Credit Utilization (30%): How much credit is being used vs available
 * - Credit Age (15%): Average age and oldest account
 * - Credit Mix (10%): Variety of credit types
 * - Recent Inquiries (10%): Recent applications for credit
 *
 * Score Bands:
 * - 961-999: Excellent
 * - 881-960: Good
 * - 721-880: Fair
 * - 561-720: Poor
 * - 0-560: Very Poor
 */

export type ScoreBand = 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';

export interface CreditRiskBreakdown {
  paymentHistory: {
    score: number;
    missedPayments: number;
    onTimePayments: number;
    paymentRate: number;
    description: string;
  };
  creditUtilization: {
    score: number;
    totalLimit: number;
    totalUsed: number;
    utilizationPercentage: number;
    description: string;
  };
  creditAge: {
    score: number;
    oldestAccountMonths: number;
    averageAccountMonths: number;
    description: string;
  };
  creditMix: {
    score: number;
    accountTypes: string[];
    numberOfTypes: number;
    description: string;
  };
  recentInquiries: {
    score: number;
    hardInquiries: number;
    recentApplications: number;
    description: string;
  };
}

export interface CreditRiskResult {
  overallScore: number;
  scoreBand: ScoreBand;
  breakdown: CreditRiskBreakdown;
  riskFactors: string[];
  positiveFactors: string[];
  improvementTips: string[];
}

export interface LoanAffordabilityResult {
  affordabilityScore: number;
  affordabilityBand: 'very_affordable' | 'affordable' | 'stretching' | 'risky' | 'unaffordable';
  maxAffordableAmount: number;
  recommendedAmount: number;
  monthlyPaymentEstimate: number;
  totalInterestEstimate: number;
  debtToIncomeRatio: number;
  debtToIncomeAfterLoan: number;
  stressTestResults: {
    canAffordWith2PercentRateIncrease: boolean;
    canAffordWith10PercentIncomeDecrease: boolean;
    monthsOfSavingsCoverage: number;
  };
  riskFactors: string[];
  recommendations: string[];
  aiSummary: string;
}

export class CreditRiskService {
  /**
   * Calculate the internal credit risk score for a tenant
   */
  static async calculateCreditScore(c: AppContext, tenantId: string): Promise<CreditRiskResult> {
    // Gather credit-related data
    const data = await this.gatherCreditData(c, tenantId);

    // Calculate individual factor scores (0-100 scale, then convert to contribution)
    const paymentHistoryResult = this.calculatePaymentHistoryScore(data);
    const creditUtilizationResult = this.calculateCreditUtilizationScore(data);
    const creditAgeResult = this.calculateCreditAgeScore(data);
    const creditMixResult = this.calculateCreditMixScore(data);
    const recentInquiriesResult = this.calculateRecentInquiriesScore(data);

    // Calculate weighted overall score (convert 0-100 to 0-999 scale)
    const weightedScore =
      (paymentHistoryResult.score * 0.35) +
      (creditUtilizationResult.score * 0.30) +
      (creditAgeResult.score * 0.15) +
      (creditMixResult.score * 0.10) +
      (recentInquiriesResult.score * 0.10);

    // Convert 0-100 to 0-999 scale
    const overallScore = Math.round(weightedScore * 9.99);

    // Determine score band
    const scoreBand = this.getScoreBand(overallScore);

    // Generate factors and tips
    const riskFactors = this.identifyRiskFactors(paymentHistoryResult, creditUtilizationResult, creditAgeResult, creditMixResult, recentInquiriesResult, data);
    const positiveFactors = this.identifyPositiveFactors(paymentHistoryResult, creditUtilizationResult, creditAgeResult, creditMixResult, recentInquiriesResult, data);
    const improvementTips = this.generateImprovementTips(paymentHistoryResult, creditUtilizationResult, creditAgeResult, creditMixResult, recentInquiriesResult, scoreBand);

    return {
      overallScore,
      scoreBand,
      breakdown: {
        paymentHistory: paymentHistoryResult,
        creditUtilization: creditUtilizationResult,
        creditAge: creditAgeResult,
        creditMix: creditMixResult,
        recentInquiries: recentInquiriesResult
      },
      riskFactors,
      positiveFactors,
      improvementTips
    };
  }

  /**
   * Store a calculated credit risk score
   */
  static async storeCreditScore(c: AppContext, tenantId: string, result: CreditRiskResult): Promise<string> {
    const db = getDb(c.env.DB);
    const now = new Date();
    const scoreId = crypto.randomUUID();

    // Get the previous score for history tracking
    const previousScore = await db
      .select()
      .from(creditRiskScores)
      .where(eq(creditRiskScores.tenantId, tenantId))
      .orderBy(desc(creditRiskScores.calculatedAt))
      .limit(1)
      .get();

    // Store the new score
    await db.insert(creditRiskScores).values({
      id: scoreId,
      tenantId,
      overallScore: result.overallScore,
      scoreBand: result.scoreBand,
      paymentHistoryScore: result.breakdown.paymentHistory.score,
      creditUtilizationScore: result.breakdown.creditUtilization.score,
      creditAgeScore: result.breakdown.creditAge.score,
      creditMixScore: result.breakdown.creditMix.score,
      recentInquiriesScore: result.breakdown.recentInquiries.score,
      totalCreditLimit: result.breakdown.creditUtilization.totalLimit,
      totalCreditUsed: result.breakdown.creditUtilization.totalUsed,
      utilizationPercentage: result.breakdown.creditUtilization.utilizationPercentage,
      oldestAccountAge: result.breakdown.creditAge.oldestAccountMonths,
      averageAccountAge: result.breakdown.creditAge.averageAccountMonths,
      numberOfAccounts: result.breakdown.creditMix.accountTypes.length,
      missedPayments: result.breakdown.paymentHistory.missedPayments,
      scoreBreakdown: JSON.stringify(result.breakdown),
      riskFactors: JSON.stringify(result.riskFactors),
      positiveFactors: JSON.stringify(result.positiveFactors),
      improvementTips: JSON.stringify(result.improvementTips),
      calculatedAt: now,
      createdAt: now
    });

    // Store history entry
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const scoreDelta = previousScore ? result.overallScore - previousScore.overallScore : 0;

    await db.insert(creditRiskHistory).values({
      id: crypto.randomUUID(),
      tenantId,
      scoreId,
      previousScore: previousScore?.overallScore || null,
      newScore: result.overallScore,
      scoreDelta,
      changeReason: this.generateChangeReason(previousScore?.overallScore, result.overallScore, result.scoreBand),
      period,
      createdAt: now
    });

    return scoreId;
  }

  /**
   * Get the latest credit risk score for a tenant
   */
  static async getLatestScore(c: AppContext, tenantId: string) {
    const db = getDb(c.env.DB);

    return await db
      .select()
      .from(creditRiskScores)
      .where(eq(creditRiskScores.tenantId, tenantId))
      .orderBy(desc(creditRiskScores.calculatedAt))
      .limit(1)
      .get();
  }

  /**
   * Get credit risk score history for a tenant
   */
  static async getScoreHistory(c: AppContext, tenantId: string, months: number = 12) {
    const db = getDb(c.env.DB);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return await db
      .select()
      .from(creditRiskHistory)
      .where(and(
        eq(creditRiskHistory.tenantId, tenantId),
        gte(creditRiskHistory.createdAt, startDate)
      ))
      .orderBy(desc(creditRiskHistory.createdAt));
  }

  /**
   * Calculate loan affordability assessment
   */
  static async calculateLoanAffordability(
    c: AppContext,
    tenantId: string,
    loanType: 'mortgage' | 'personal' | 'auto' | 'credit_card' | 'student' | 'business' | 'other',
    requestedAmount: number,
    requestedTermMonths?: number,
    estimatedRate?: number
  ): Promise<LoanAffordabilityResult> {
    const db = getDb(c.env.DB);

    // Get financial data
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Calculate monthly income and expenses from transactions
    const incomeResult = await db
      .select({
        total: sql<number>`sum(${transactions.amount})`
      })
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.type, 'income'),
        gte(transactions.date, threeMonthsAgo)
      ))
      .get();

    const expenseResult = await db
      .select({
        total: sql<number>`sum(abs(${transactions.amount}))`
      })
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, threeMonthsAgo)
      ))
      .get();

    const monthlyIncome = (incomeResult?.total || 0) / 3;
    const monthlyExpenses = (expenseResult?.total || 0) / 3;

    // Get existing debt payments
    const debts = await db
      .select()
      .from(debtAccounts)
      .where(and(
        eq(debtAccounts.tenantId, tenantId),
        eq(debtAccounts.status, 'active')
      ));

    const existingDebtPayments = debts.reduce((sum, d) => sum + (d.monthlyPayment || d.minimumPayment || 0), 0);

    // Set defaults based on loan type
    const defaultRates: Record<string, number> = {
      mortgage: 0.045,
      personal: 0.089,
      auto: 0.059,
      credit_card: 0.199,
      student: 0.055,
      business: 0.075,
      other: 0.10
    };

    const defaultTerms: Record<string, number> = {
      mortgage: 300, // 25 years
      personal: 60,  // 5 years
      auto: 60,      // 5 years
      credit_card: 36, // 3 years
      student: 120,  // 10 years
      business: 84,  // 7 years
      other: 60
    };

    const rate = estimatedRate || defaultRates[loanType] || 0.10;
    const term = requestedTermMonths || defaultTerms[loanType] || 60;

    // Calculate monthly payment for requested amount
    const monthlyRate = rate / 12;
    const monthlyPaymentEstimate = requestedAmount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
    const totalInterestEstimate = (monthlyPaymentEstimate * term) - requestedAmount;

    // Calculate debt-to-income ratios
    const debtToIncomeRatio = monthlyIncome > 0 ? (existingDebtPayments / monthlyIncome) * 100 : 0;
    const debtToIncomeAfterLoan = monthlyIncome > 0 ? ((existingDebtPayments + monthlyPaymentEstimate) / monthlyIncome) * 100 : 0;

    // Calculate disposable income
    const disposableIncome = monthlyIncome - monthlyExpenses - existingDebtPayments;

    // Calculate maximum affordable amount (based on 36% DTI limit)
    const maxMonthlyPayment = Math.max(0, (monthlyIncome * 0.36) - existingDebtPayments);
    const maxAffordableAmount = maxMonthlyPayment > 0
      ? maxMonthlyPayment * (Math.pow(1 + monthlyRate, term) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, term))
      : 0;

    // Calculate recommended amount (more conservative, 28% DTI)
    const recommendedMonthlyPayment = Math.max(0, (monthlyIncome * 0.28) - existingDebtPayments);
    const recommendedAmount = recommendedMonthlyPayment > 0
      ? recommendedMonthlyPayment * (Math.pow(1 + monthlyRate, term) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, term))
      : 0;

    // Stress tests
    const stressRate = rate + 0.02; // 2% rate increase
    const stressMonthlyRate = stressRate / 12;
    const stressPayment = requestedAmount * (stressMonthlyRate * Math.pow(1 + stressMonthlyRate, term)) / (Math.pow(1 + stressMonthlyRate, term) - 1);
    const canAffordWith2PercentRateIncrease = (existingDebtPayments + stressPayment) <= (monthlyIncome * 0.40);

    const reducedIncome = monthlyIncome * 0.9;
    const canAffordWith10PercentIncomeDecrease = (existingDebtPayments + monthlyPaymentEstimate) <= (reducedIncome * 0.40);

    // Get savings balance
    const savingsAccounts = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.tenantId, tenantId),
        eq(accounts.type, 'savings')
      ));

    const totalSavings = savingsAccounts.reduce((sum, a) => sum + a.balance, 0);
    const monthsOfSavingsCoverage = monthlyPaymentEstimate > 0 ? totalSavings / monthlyPaymentEstimate : 0;

    // Calculate affordability score (0-100)
    let affordabilityScore = 100;

    // Penalize for high DTI after loan
    if (debtToIncomeAfterLoan > 50) affordabilityScore -= 40;
    else if (debtToIncomeAfterLoan > 43) affordabilityScore -= 25;
    else if (debtToIncomeAfterLoan > 36) affordabilityScore -= 15;
    else if (debtToIncomeAfterLoan > 28) affordabilityScore -= 5;

    // Penalize for low disposable income after payment
    const remainingDisposable = disposableIncome - monthlyPaymentEstimate;
    if (remainingDisposable < 0) affordabilityScore -= 30;
    else if (remainingDisposable < 200) affordabilityScore -= 20;
    else if (remainingDisposable < 500) affordabilityScore -= 10;

    // Penalize for failing stress tests
    if (!canAffordWith2PercentRateIncrease) affordabilityScore -= 10;
    if (!canAffordWith10PercentIncomeDecrease) affordabilityScore -= 10;

    // Bonus for savings coverage
    if (monthsOfSavingsCoverage >= 6) affordabilityScore += 5;
    else if (monthsOfSavingsCoverage < 3) affordabilityScore -= 5;

    affordabilityScore = Math.max(0, Math.min(100, affordabilityScore));

    // Determine affordability band
    let affordabilityBand: 'very_affordable' | 'affordable' | 'stretching' | 'risky' | 'unaffordable';
    if (affordabilityScore >= 80) affordabilityBand = 'very_affordable';
    else if (affordabilityScore >= 60) affordabilityBand = 'affordable';
    else if (affordabilityScore >= 40) affordabilityBand = 'stretching';
    else if (affordabilityScore >= 20) affordabilityBand = 'risky';
    else affordabilityBand = 'unaffordable';

    // Generate risk factors
    const riskFactors: string[] = [];
    if (debtToIncomeAfterLoan > 43) riskFactors.push(`High debt-to-income ratio (${debtToIncomeAfterLoan.toFixed(1)}%) after taking this loan`);
    if (remainingDisposable < 500) riskFactors.push('Limited disposable income remaining after loan payment');
    if (!canAffordWith2PercentRateIncrease) riskFactors.push('Payment may become unaffordable if interest rates rise by 2%');
    if (!canAffordWith10PercentIncomeDecrease) riskFactors.push('Payment may become unaffordable if income decreases by 10%');
    if (monthsOfSavingsCoverage < 3) riskFactors.push('Insufficient savings to cover payments in case of emergency');
    if (requestedAmount > maxAffordableAmount) riskFactors.push(`Requested amount exceeds maximum affordable amount of £${Math.round(maxAffordableAmount).toLocaleString()}`);

    // Generate recommendations
    const recommendations: string[] = [];
    if (requestedAmount > recommendedAmount && recommendedAmount > 0) {
      recommendations.push(`Consider borrowing £${Math.round(recommendedAmount).toLocaleString()} for a more comfortable payment`);
    }
    if (debtToIncomeAfterLoan > 36) {
      recommendations.push('Pay down existing debts before taking on additional borrowing');
    }
    if (monthsOfSavingsCoverage < 6) {
      recommendations.push('Build up emergency savings before committing to this loan');
    }
    if (term < defaultTerms[loanType]) {
      recommendations.push('Consider a longer loan term to reduce monthly payments');
    }
    if (affordabilityScore < 60) {
      recommendations.push('Review your budget to identify areas where you can reduce spending');
    }

    // Generate AI summary
    const aiSummary = this.generateAffordabilitySummary(
      affordabilityBand,
      requestedAmount,
      monthlyPaymentEstimate,
      debtToIncomeAfterLoan,
      maxAffordableAmount,
      loanType
    );

    return {
      affordabilityScore,
      affordabilityBand,
      maxAffordableAmount: Math.round(maxAffordableAmount),
      recommendedAmount: Math.round(recommendedAmount),
      monthlyPaymentEstimate: Math.round(monthlyPaymentEstimate * 100) / 100,
      totalInterestEstimate: Math.round(totalInterestEstimate * 100) / 100,
      debtToIncomeRatio: Math.round(debtToIncomeRatio * 10) / 10,
      debtToIncomeAfterLoan: Math.round(debtToIncomeAfterLoan * 10) / 10,
      stressTestResults: {
        canAffordWith2PercentRateIncrease,
        canAffordWith10PercentIncomeDecrease,
        monthsOfSavingsCoverage: Math.round(monthsOfSavingsCoverage * 10) / 10
      },
      riskFactors,
      recommendations,
      aiSummary
    };
  }

  /**
   * Store a loan affordability assessment
   */
  static async storeAffordabilityAssessment(
    c: AppContext,
    tenantId: string,
    loanType: 'mortgage' | 'personal' | 'auto' | 'credit_card' | 'student' | 'business' | 'other',
    requestedAmount: number,
    requestedTerm: number | undefined,
    estimatedRate: number | undefined,
    result: LoanAffordabilityResult
  ): Promise<string> {
    const db = getDb(c.env.DB);
    const now = new Date();
    const assessmentId = crypto.randomUUID();

    // Assessment valid for 30 days
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(loanAffordabilityAssessments).values({
      id: assessmentId,
      tenantId,
      loanType,
      requestedAmount,
      requestedTerm,
      estimatedInterestRate: estimatedRate,
      maxAffordableAmount: result.maxAffordableAmount,
      recommendedAmount: result.recommendedAmount,
      monthlyPaymentEstimate: result.monthlyPaymentEstimate,
      totalInterestEstimate: result.totalInterestEstimate,
      affordabilityScore: result.affordabilityScore,
      affordabilityBand: result.affordabilityBand,
      debtToIncomeRatio: result.debtToIncomeRatio,
      debtToIncomeAfterLoan: result.debtToIncomeAfterLoan,
      stressTestResults: JSON.stringify(result.stressTestResults),
      riskFactors: JSON.stringify(result.riskFactors),
      recommendations: JSON.stringify(result.recommendations),
      aiSummary: result.aiSummary,
      status: 'completed',
      calculatedAt: now,
      expiresAt,
      createdAt: now
    });

    return assessmentId;
  }

  /**
   * Get recent affordability assessments for a tenant
   */
  static async getAffordabilityAssessments(c: AppContext, tenantId: string, limit: number = 10) {
    const db = getDb(c.env.DB);

    return await db
      .select()
      .from(loanAffordabilityAssessments)
      .where(eq(loanAffordabilityAssessments.tenantId, tenantId))
      .orderBy(desc(loanAffordabilityAssessments.calculatedAt))
      .limit(limit);
  }

  /**
   * Get credit bureau connections for a tenant
   */
  static async getBureauConnections(c: AppContext, tenantId: string) {
    const db = getDb(c.env.DB);

    return await db
      .select()
      .from(creditBureauConnections)
      .where(eq(creditBureauConnections.tenantId, tenantId));
  }

  /**
   * Get credit reports for a tenant
   */
  static async getCreditReports(c: AppContext, tenantId: string, limit: number = 5) {
    const db = getDb(c.env.DB);

    return await db
      .select()
      .from(creditReports)
      .where(eq(creditReports.tenantId, tenantId))
      .orderBy(desc(creditReports.reportDate))
      .limit(limit);
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private static async gatherCreditData(c: AppContext, tenantId: string) {
    const db = getDb(c.env.DB);
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Get all accounts
    const allAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId));

    // Calculate credit utilization
    let totalCreditLimit = 0;
    let totalCreditUsed = 0;
    const accountTypes: Set<string> = new Set();
    let oldestAccountDate: Date | null = null;
    let totalAccountAgeMonths = 0;

    for (const account of allAccounts) {
      accountTypes.add(account.type);

      // Track account age
      if (account.createdAt) {
        const accountAge = account.createdAt;
        if (!oldestAccountDate || accountAge < oldestAccountDate) {
          oldestAccountDate = accountAge;
        }
        const ageMonths = Math.floor((now.getTime() - accountAge.getTime()) / (1000 * 60 * 60 * 24 * 30));
        totalAccountAgeMonths += ageMonths;
      }

      // For credit accounts, track utilization
      if (account.type === 'credit') {
        // Assume a default credit limit if not available
        const creditLimit = 5000; // Default assumption
        totalCreditLimit += creditLimit;
        totalCreditUsed += Math.abs(account.balance);
      }
    }

    // Get debt accounts for more accurate credit info
    const debts = await db
      .select()
      .from(debtAccounts)
      .where(and(
        eq(debtAccounts.tenantId, tenantId),
        eq(debtAccounts.status, 'active')
      ));

    for (const debt of debts) {
      if (debt.type === 'credit_card' || debt.type === 'overdraft') {
        // Use original balance as credit limit for credit cards
        totalCreditLimit += debt.originalBalance;
        totalCreditUsed += debt.currentBalance;
      }
      accountTypes.add(debt.type);
    }

    // Get transactions to analyze payment behavior
    const recentTransactions = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.date, sixMonthsAgo)
      ));

    // Simulate payment history analysis
    // In a real system, this would track actual payment due dates vs payment dates
    const totalPayments = recentTransactions.filter(tx =>
      tx.type === 'expense' &&
      (tx.description?.toLowerCase().includes('payment') ||
       tx.description?.toLowerCase().includes('repayment') ||
       tx.description?.toLowerCase().includes('credit card'))
    ).length;

    // Estimate missed payments (in reality, this would come from actual payment tracking)
    // For now, assume good payment history if there are regular payments
    const estimatedOnTimePayments = Math.max(0, totalPayments);
    const estimatedMissedPayments = 0; // Conservative estimate

    // Check for recent credit applications (simulated)
    const recentApplicationTransactions = recentTransactions.filter(tx =>
      tx.description?.toLowerCase().includes('application') ||
      tx.description?.toLowerCase().includes('credit check')
    );

    // Calculate average account age
    const averageAccountAgeMonths = allAccounts.length > 0
      ? totalAccountAgeMonths / allAccounts.length
      : 0;

    const oldestAccountAgeMonths = oldestAccountDate
      ? Math.floor((now.getTime() - oldestAccountDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;

    return {
      totalCreditLimit,
      totalCreditUsed,
      utilizationPercentage: totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0,
      accountTypes: Array.from(accountTypes),
      numberOfAccounts: allAccounts.length + debts.length,
      oldestAccountAgeMonths,
      averageAccountAgeMonths,
      onTimePayments: estimatedOnTimePayments,
      missedPayments: estimatedMissedPayments,
      recentApplications: recentApplicationTransactions.length,
      debts
    };
  }

  private static calculatePaymentHistoryScore(data: any): CreditRiskBreakdown['paymentHistory'] {
    const { onTimePayments, missedPayments } = data;
    const totalPayments = onTimePayments + missedPayments;
    const paymentRate = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 100;

    let score: number;
    let description: string;

    if (missedPayments === 0 && onTimePayments >= 12) {
      score = 100;
      description = 'Excellent payment history with no missed payments.';
    } else if (missedPayments === 0) {
      score = 90;
      description = 'Good payment history. Continue building your track record.';
    } else if (missedPayments <= 1 && paymentRate >= 95) {
      score = 75;
      description = 'Minor blemish on record. Focus on making all payments on time.';
    } else if (missedPayments <= 2 && paymentRate >= 90) {
      score = 60;
      description = 'Some missed payments affecting your score.';
    } else if (paymentRate >= 80) {
      score = 40;
      description = 'Payment history needs improvement.';
    } else {
      score = 20;
      description = 'Significant payment issues. Prioritize getting current on all accounts.';
    }

    return {
      score,
      missedPayments,
      onTimePayments,
      paymentRate: Math.round(paymentRate * 10) / 10,
      description
    };
  }

  private static calculateCreditUtilizationScore(data: any): CreditRiskBreakdown['creditUtilization'] {
    const { totalCreditLimit, totalCreditUsed, utilizationPercentage } = data;

    let score: number;
    let description: string;

    if (utilizationPercentage <= 10) {
      score = 100;
      description = 'Excellent credit utilization. Keep it under 30%.';
    } else if (utilizationPercentage <= 30) {
      score = 90;
      description = 'Good credit utilization within the recommended range.';
    } else if (utilizationPercentage <= 50) {
      score = 70;
      description = 'Moderate utilization. Consider paying down balances.';
    } else if (utilizationPercentage <= 75) {
      score = 45;
      description = 'High credit utilization is hurting your score.';
    } else if (utilizationPercentage <= 100) {
      score = 25;
      description = 'Very high utilization. Pay down debt urgently.';
    } else {
      score = 10;
      description = 'Over limit on credit accounts. This severely impacts your score.';
    }

    return {
      score,
      totalLimit: totalCreditLimit,
      totalUsed: totalCreditUsed,
      utilizationPercentage: Math.round(utilizationPercentage * 10) / 10,
      description
    };
  }

  private static calculateCreditAgeScore(data: any): CreditRiskBreakdown['creditAge'] {
    const { oldestAccountAgeMonths, averageAccountAgeMonths } = data;

    let score: number;
    let description: string;

    if (oldestAccountAgeMonths >= 120 && averageAccountAgeMonths >= 60) {
      score = 100;
      description = 'Excellent credit history length.';
    } else if (oldestAccountAgeMonths >= 84 && averageAccountAgeMonths >= 36) {
      score = 85;
      description = 'Good credit history. Continue maintaining accounts.';
    } else if (oldestAccountAgeMonths >= 48 && averageAccountAgeMonths >= 24) {
      score = 70;
      description = 'Moderate credit history. Avoid closing old accounts.';
    } else if (oldestAccountAgeMonths >= 24) {
      score = 50;
      description = 'Building credit history. Be patient and consistent.';
    } else if (oldestAccountAgeMonths >= 12) {
      score = 35;
      description = 'Limited credit history. Keep accounts open and active.';
    } else {
      score = 20;
      description = 'Very new to credit. Focus on responsible credit building.';
    }

    return {
      score,
      oldestAccountMonths: oldestAccountAgeMonths,
      averageAccountMonths: Math.round(averageAccountAgeMonths),
      description
    };
  }

  private static calculateCreditMixScore(data: any): CreditRiskBreakdown['creditMix'] {
    const { accountTypes } = data;
    const numberOfTypes = accountTypes.length;

    // Define credit type categories
    const hasRevolvingCredit = accountTypes.some((t: string) =>
      ['credit_card', 'overdraft', 'credit'].includes(t)
    );
    const hasInstallmentLoans = accountTypes.some((t: string) =>
      ['mortgage', 'car_loan', 'personal_loan', 'student_loan', 'loan'].includes(t)
    );
    const hasSavings = accountTypes.includes('savings');

    let score: number;
    let description: string;

    if (numberOfTypes >= 4 && hasRevolvingCredit && hasInstallmentLoans) {
      score = 100;
      description = 'Excellent credit mix with diverse account types.';
    } else if (numberOfTypes >= 3 && (hasRevolvingCredit || hasInstallmentLoans)) {
      score = 80;
      description = 'Good variety of credit accounts.';
    } else if (numberOfTypes >= 2) {
      score = 60;
      description = 'Limited credit mix. Consider diversifying if appropriate.';
    } else if (numberOfTypes >= 1) {
      score = 40;
      description = 'Single type of credit. Mix can help build score.';
    } else {
      score = 20;
      description = 'No credit accounts found.';
    }

    // Bonus for having savings alongside credit
    if (hasSavings && score < 100) {
      score = Math.min(100, score + 10);
      description += ' Having savings demonstrates financial responsibility.';
    }

    return {
      score,
      accountTypes,
      numberOfTypes,
      description
    };
  }

  private static calculateRecentInquiriesScore(data: any): CreditRiskBreakdown['recentInquiries'] {
    const { recentApplications } = data;

    // In reality, this would track actual hard inquiries from credit reports
    const hardInquiries = Math.min(recentApplications, 10); // Cap at realistic number

    let score: number;
    let description: string;

    if (hardInquiries === 0) {
      score = 100;
      description = 'No recent credit applications. This helps your score.';
    } else if (hardInquiries <= 2) {
      score = 85;
      description = 'Few recent inquiries. Minimal impact on score.';
    } else if (hardInquiries <= 4) {
      score = 65;
      description = 'Several recent applications. Avoid applying for more credit.';
    } else if (hardInquiries <= 6) {
      score = 45;
      description = 'Many recent inquiries hurting your score.';
    } else {
      score = 25;
      description = 'Excessive credit applications. Wait before applying again.';
    }

    return {
      score,
      hardInquiries,
      recentApplications,
      description
    };
  }

  private static getScoreBand(score: number): ScoreBand {
    if (score >= 961) return 'excellent';
    if (score >= 881) return 'good';
    if (score >= 721) return 'fair';
    if (score >= 561) return 'poor';
    return 'very_poor';
  }

  private static identifyRiskFactors(
    paymentHistory: CreditRiskBreakdown['paymentHistory'],
    creditUtilization: CreditRiskBreakdown['creditUtilization'],
    creditAge: CreditRiskBreakdown['creditAge'],
    creditMix: CreditRiskBreakdown['creditMix'],
    recentInquiries: CreditRiskBreakdown['recentInquiries'],
    _data: any
  ): string[] {
    const factors: string[] = [];

    if (paymentHistory.missedPayments > 0) {
      factors.push(`${paymentHistory.missedPayments} missed payment(s) on record`);
    }
    if (creditUtilization.utilizationPercentage > 30) {
      factors.push(`High credit utilization at ${creditUtilization.utilizationPercentage}%`);
    }
    if (creditAge.oldestAccountMonths < 24) {
      factors.push('Limited credit history length');
    }
    if (creditMix.numberOfTypes < 2) {
      factors.push('Limited variety of credit accounts');
    }
    if (recentInquiries.hardInquiries > 2) {
      factors.push(`${recentInquiries.hardInquiries} recent credit applications`);
    }

    return factors;
  }

  private static identifyPositiveFactors(
    paymentHistory: CreditRiskBreakdown['paymentHistory'],
    creditUtilization: CreditRiskBreakdown['creditUtilization'],
    creditAge: CreditRiskBreakdown['creditAge'],
    creditMix: CreditRiskBreakdown['creditMix'],
    recentInquiries: CreditRiskBreakdown['recentInquiries'],
    _data: any
  ): string[] {
    const factors: string[] = [];

    if (paymentHistory.missedPayments === 0 && paymentHistory.onTimePayments >= 6) {
      factors.push('Consistent on-time payment history');
    }
    if (creditUtilization.utilizationPercentage <= 30) {
      factors.push('Low credit utilization');
    }
    if (creditAge.oldestAccountMonths >= 48) {
      factors.push('Established credit history');
    }
    if (creditMix.numberOfTypes >= 3) {
      factors.push('Good mix of credit accounts');
    }
    if (recentInquiries.hardInquiries <= 1) {
      factors.push('Few recent credit applications');
    }

    return factors;
  }

  private static generateImprovementTips(
    paymentHistory: CreditRiskBreakdown['paymentHistory'],
    creditUtilization: CreditRiskBreakdown['creditUtilization'],
    creditAge: CreditRiskBreakdown['creditAge'],
    creditMix: CreditRiskBreakdown['creditMix'],
    recentInquiries: CreditRiskBreakdown['recentInquiries'],
    scoreBand: ScoreBand
  ): string[] {
    const tips: string[] = [];

    // Priority order based on impact
    if (paymentHistory.score < 70) {
      tips.push('Set up automatic payments to ensure you never miss a due date');
    }

    if (creditUtilization.score < 70) {
      tips.push('Pay down credit card balances to below 30% of your limit');
      if (creditUtilization.utilizationPercentage > 50) {
        tips.push('Consider requesting a credit limit increase (without additional spending)');
      }
    }

    if (creditAge.score < 60 && creditAge.oldestAccountMonths < 48) {
      tips.push('Keep your oldest credit accounts open, even if unused');
    }

    if (creditMix.score < 60) {
      tips.push('Consider a credit-builder loan or secured credit card to diversify');
    }

    if (recentInquiries.score < 70) {
      tips.push('Avoid applying for new credit for 6-12 months');
    }

    // General tips based on score band
    if (scoreBand === 'very_poor' || scoreBand === 'poor') {
      tips.push('Consider speaking with a financial advisor about credit repair strategies');
    }

    if (tips.length === 0) {
      tips.push('Continue your current habits to maintain your excellent score');
    }

    return tips.slice(0, 5); // Max 5 tips
  }

  private static generateChangeReason(previousScore: number | undefined | null, newScore: number, scoreBand: ScoreBand): string {
    if (!previousScore) {
      return `Initial credit risk score calculated at ${newScore} (${scoreBand}).`;
    }

    const delta = newScore - previousScore;
    if (Math.abs(delta) < 10) {
      return 'Score remained stable with minimal changes.';
    }

    if (delta > 0) {
      return `Score improved by ${delta} points, moving toward ${scoreBand} range.`;
    } else {
      return `Score decreased by ${Math.abs(delta)} points. Review risk factors for improvement opportunities.`;
    }
  }

  private static generateAffordabilitySummary(
    band: 'very_affordable' | 'affordable' | 'stretching' | 'risky' | 'unaffordable',
    requestedAmount: number,
    monthlyPayment: number,
    dtiAfterLoan: number,
    maxAffordable: number,
    loanType: string
  ): string {
    const loanTypeName = loanType.replace('_', ' ');
    const amountStr = `£${requestedAmount.toLocaleString()}`;
    const paymentStr = `£${Math.round(monthlyPayment).toLocaleString()}`;
    const maxStr = `£${Math.round(maxAffordable).toLocaleString()}`;

    switch (band) {
      case 'very_affordable':
        return `This ${loanTypeName} of ${amountStr} appears very affordable for your situation. The estimated monthly payment of ${paymentStr} would keep your debt-to-income ratio at a healthy ${dtiAfterLoan.toFixed(1)}%.`;
      case 'affordable':
        return `This ${loanTypeName} of ${amountStr} should be manageable based on your current finances. The ${paymentStr} monthly payment would bring your debt-to-income ratio to ${dtiAfterLoan.toFixed(1)}%.`;
      case 'stretching':
        return `This ${loanTypeName} of ${amountStr} would stretch your budget. With a ${paymentStr} monthly payment, your debt-to-income ratio would be ${dtiAfterLoan.toFixed(1)}%. Consider borrowing less or reducing existing debts first.`;
      case 'risky':
        return `This ${loanTypeName} of ${amountStr} carries significant risk. The ${paymentStr} monthly payment would push your debt-to-income ratio to ${dtiAfterLoan.toFixed(1)}%. Your maximum affordable amount is approximately ${maxStr}.`;
      case 'unaffordable':
        return `This ${loanTypeName} of ${amountStr} is not recommended based on your current financial situation. The ${paymentStr} monthly payment would result in a debt-to-income ratio of ${dtiAfterLoan.toFixed(1)}%. Consider a smaller amount up to ${maxStr}.`;
    }
  }
}
