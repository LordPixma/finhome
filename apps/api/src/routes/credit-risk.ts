import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { CreditRiskService } from '../services/creditRisk.service';
import type { Env } from '../types';

const creditRiskRouter = new Hono<Env>();

// Apply auth middleware to all routes
creditRiskRouter.use('/*', authMiddleware, tenantMiddleware);

// Validation schemas
const loanAffordabilitySchema = z.object({
  loanType: z.enum(['mortgage', 'personal', 'auto', 'credit_card', 'student', 'business', 'other']),
  requestedAmount: z.number().positive(),
  requestedTermMonths: z.number().positive().optional(),
  estimatedInterestRate: z.number().min(0).max(1).optional()
});

// ==========================================
// CREDIT RISK SCORE ENDPOINTS
// ==========================================

/**
 * GET /score - Get the latest credit risk score
 */
creditRiskRouter.get('/score', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const score = await CreditRiskService.getLatestScore(c, tenantId);

    if (!score) {
      return c.json({
        success: true,
        data: null,
        message: 'No credit risk score calculated yet. Calculate one to get started.'
      });
    }

    return c.json({
      success: true,
      data: {
        id: score.id,
        overallScore: score.overallScore,
        scoreBand: score.scoreBand,
        breakdown: {
          paymentHistory: score.paymentHistoryScore,
          creditUtilization: score.creditUtilizationScore,
          creditAge: score.creditAgeScore,
          creditMix: score.creditMixScore,
          recentInquiries: score.recentInquiriesScore
        },
        metrics: {
          totalCreditLimit: score.totalCreditLimit,
          totalCreditUsed: score.totalCreditUsed,
          utilizationPercentage: score.utilizationPercentage,
          oldestAccountAge: score.oldestAccountAge,
          averageAccountAge: score.averageAccountAge,
          numberOfAccounts: score.numberOfAccounts,
          missedPayments: score.missedPayments
        },
        riskFactors: score.riskFactors ? JSON.parse(score.riskFactors) : [],
        positiveFactors: score.positiveFactors ? JSON.parse(score.positiveFactors) : [],
        improvementTips: score.improvementTips ? JSON.parse(score.improvementTips) : [],
        calculatedAt: score.calculatedAt
      }
    });
  } catch (error: any) {
    console.error('Error fetching credit risk score:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch credit risk score' }
    }, 500);
  }
});

/**
 * POST /score/calculate - Calculate and store a new credit risk score
 */
creditRiskRouter.post('/score/calculate', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;

    // Calculate the score
    const result = await CreditRiskService.calculateCreditScore(c, tenantId);

    // Store the score
    const scoreId = await CreditRiskService.storeCreditScore(c, tenantId, result);

    return c.json({
      success: true,
      data: {
        id: scoreId,
        overallScore: result.overallScore,
        scoreBand: result.scoreBand,
        breakdown: result.breakdown,
        riskFactors: result.riskFactors,
        positiveFactors: result.positiveFactors,
        improvementTips: result.improvementTips
      }
    });
  } catch (error: any) {
    console.error('Error calculating credit risk score:', error);
    return c.json({
      success: false,
      error: { code: 'CALCULATION_ERROR', message: 'Failed to calculate credit risk score' }
    }, 500);
  }
});

/**
 * GET /score/history - Get credit risk score history
 */
creditRiskRouter.get('/score/history', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const months = parseInt(c.req.query('months') || '12');

    const history = await CreditRiskService.getScoreHistory(c, tenantId, months);

    return c.json({
      success: true,
      data: history.map(h => ({
        id: h.id,
        period: h.period,
        score: h.newScore,
        previousScore: h.previousScore,
        delta: h.scoreDelta,
        reason: h.changeReason,
        createdAt: h.createdAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching credit risk history:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch credit risk history' }
    }, 500);
  }
});

// ==========================================
// LOAN AFFORDABILITY ENDPOINTS
// ==========================================

/**
 * POST /affordability - Calculate loan affordability
 */
creditRiskRouter.post('/affordability', validateRequest(loanAffordabilitySchema), async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const body = c.get('validatedData') as z.infer<typeof loanAffordabilitySchema>;

    // Calculate affordability
    const result = await CreditRiskService.calculateLoanAffordability(
      c,
      tenantId,
      body.loanType,
      body.requestedAmount,
      body.requestedTermMonths,
      body.estimatedInterestRate
    );

    // Store the assessment
    const assessmentId = await CreditRiskService.storeAffordabilityAssessment(
      c,
      tenantId,
      body.loanType,
      body.requestedAmount,
      body.requestedTermMonths,
      body.estimatedInterestRate,
      result
    );

    return c.json({
      success: true,
      data: {
        id: assessmentId,
        ...result
      }
    });
  } catch (error: any) {
    console.error('Error calculating loan affordability:', error);
    return c.json({
      success: false,
      error: { code: 'CALCULATION_ERROR', message: 'Failed to calculate loan affordability' }
    }, 500);
  }
});

/**
 * GET /affordability - Get recent affordability assessments
 */
creditRiskRouter.get('/affordability', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const limit = parseInt(c.req.query('limit') || '10');

    const assessments = await CreditRiskService.getAffordabilityAssessments(c, tenantId, limit);

    return c.json({
      success: true,
      data: assessments.map(a => ({
        id: a.id,
        loanType: a.loanType,
        requestedAmount: a.requestedAmount,
        requestedTerm: a.requestedTerm,
        affordabilityScore: a.affordabilityScore,
        affordabilityBand: a.affordabilityBand,
        maxAffordableAmount: a.maxAffordableAmount,
        recommendedAmount: a.recommendedAmount,
        monthlyPaymentEstimate: a.monthlyPaymentEstimate,
        totalInterestEstimate: a.totalInterestEstimate,
        debtToIncomeRatio: a.debtToIncomeRatio,
        debtToIncomeAfterLoan: a.debtToIncomeAfterLoan,
        stressTestResults: a.stressTestResults ? JSON.parse(a.stressTestResults) : null,
        riskFactors: a.riskFactors ? JSON.parse(a.riskFactors) : [],
        recommendations: a.recommendations ? JSON.parse(a.recommendations) : [],
        aiSummary: a.aiSummary,
        status: a.status,
        calculatedAt: a.calculatedAt,
        expiresAt: a.expiresAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching affordability assessments:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch affordability assessments' }
    }, 500);
  }
});

/**
 * GET /affordability/:id - Get a specific affordability assessment
 */
creditRiskRouter.get('/affordability/:id', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const assessmentId = c.req.param('id');

    const assessments = await CreditRiskService.getAffordabilityAssessments(c, tenantId, 100);
    const assessment = assessments.find(a => a.id === assessmentId);

    if (!assessment) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assessment not found' }
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: assessment.id,
        loanType: assessment.loanType,
        requestedAmount: assessment.requestedAmount,
        requestedTerm: assessment.requestedTerm,
        estimatedInterestRate: assessment.estimatedInterestRate,
        affordabilityScore: assessment.affordabilityScore,
        affordabilityBand: assessment.affordabilityBand,
        maxAffordableAmount: assessment.maxAffordableAmount,
        recommendedAmount: assessment.recommendedAmount,
        monthlyPaymentEstimate: assessment.monthlyPaymentEstimate,
        totalInterestEstimate: assessment.totalInterestEstimate,
        monthlyIncome: assessment.monthlyIncome,
        monthlyExpenses: assessment.monthlyExpenses,
        existingDebtPayments: assessment.existingDebtPayments,
        disposableIncome: assessment.disposableIncome,
        debtToIncomeRatio: assessment.debtToIncomeRatio,
        debtToIncomeAfterLoan: assessment.debtToIncomeAfterLoan,
        stressTestResults: assessment.stressTestResults ? JSON.parse(assessment.stressTestResults) : null,
        riskFactors: assessment.riskFactors ? JSON.parse(assessment.riskFactors) : [],
        recommendations: assessment.recommendations ? JSON.parse(assessment.recommendations) : [],
        aiSummary: assessment.aiSummary,
        status: assessment.status,
        calculatedAt: assessment.calculatedAt,
        expiresAt: assessment.expiresAt
      }
    });
  } catch (error: any) {
    console.error('Error fetching affordability assessment:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch affordability assessment' }
    }, 500);
  }
});

// ==========================================
// CREDIT BUREAU ENDPOINTS (Future)
// ==========================================

/**
 * GET /bureaus - Get credit bureau connections
 */
creditRiskRouter.get('/bureaus', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const connections = await CreditRiskService.getBureauConnections(c, tenantId);

    return c.json({
      success: true,
      data: connections.map(conn => ({
        id: conn.id,
        bureau: conn.bureau,
        status: conn.status,
        lastSyncAt: conn.lastSyncAt,
        lastSyncStatus: conn.lastSyncStatus,
        consentExpiresAt: conn.consentExpiresAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching bureau connections:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch bureau connections' }
    }, 500);
  }
});

/**
 * GET /reports - Get credit reports
 */
creditRiskRouter.get('/reports', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const limit = parseInt(c.req.query('limit') || '5');

    const reports = await CreditRiskService.getCreditReports(c, tenantId, limit);

    return c.json({
      success: true,
      data: reports.map(report => ({
        id: report.id,
        bureau: report.bureau,
        creditScore: report.creditScore,
        scoreBand: report.scoreBand,
        scoreDate: report.scoreDate,
        summary: {
          totalAccounts: report.totalAccounts,
          openAccounts: report.openAccounts,
          closedAccounts: report.closedAccounts,
          delinquentAccounts: report.delinquentAccounts,
          totalBalances: report.totalBalances,
          totalCreditLimit: report.totalCreditLimit
        },
        inquiries: {
          hard: report.hardInquiries,
          soft: report.softInquiries
        },
        publicRecords: {
          bankruptcies: report.bankruptcies,
          judgments: report.judgments,
          liens: report.liens
        },
        reportDate: report.reportDate,
        expiresAt: report.expiresAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching credit reports:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch credit reports' }
    }, 500);
  }
});

// ==========================================
// SUMMARY ENDPOINT
// ==========================================

/**
 * GET /summary - Get complete credit risk summary
 */
creditRiskRouter.get('/summary', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;

    // Get all data in parallel
    const [score, history, assessments, bureauConnections, reports] = await Promise.all([
      CreditRiskService.getLatestScore(c, tenantId),
      CreditRiskService.getScoreHistory(c, tenantId, 12),
      CreditRiskService.getAffordabilityAssessments(c, tenantId, 5),
      CreditRiskService.getBureauConnections(c, tenantId),
      CreditRiskService.getCreditReports(c, tenantId, 3)
    ]);

    return c.json({
      success: true,
      data: {
        score: score ? {
          id: score.id,
          overallScore: score.overallScore,
          scoreBand: score.scoreBand,
          breakdown: {
            paymentHistory: score.paymentHistoryScore,
            creditUtilization: score.creditUtilizationScore,
            creditAge: score.creditAgeScore,
            creditMix: score.creditMixScore,
            recentInquiries: score.recentInquiriesScore
          },
          metrics: {
            totalCreditLimit: score.totalCreditLimit,
            totalCreditUsed: score.totalCreditUsed,
            utilizationPercentage: score.utilizationPercentage,
            missedPayments: score.missedPayments
          },
          riskFactors: score.riskFactors ? JSON.parse(score.riskFactors) : [],
          positiveFactors: score.positiveFactors ? JSON.parse(score.positiveFactors) : [],
          improvementTips: score.improvementTips ? JSON.parse(score.improvementTips) : [],
          calculatedAt: score.calculatedAt
        } : null,
        history: history.map(h => ({
          period: h.period,
          score: h.newScore,
          previousScore: h.previousScore,
          delta: h.scoreDelta
        })),
        recentAssessments: assessments.slice(0, 3).map(a => ({
          id: a.id,
          loanType: a.loanType,
          requestedAmount: a.requestedAmount,
          affordabilityBand: a.affordabilityBand,
          calculatedAt: a.calculatedAt
        })),
        bureauConnections: bureauConnections.map(conn => ({
          bureau: conn.bureau,
          status: conn.status,
          lastSyncAt: conn.lastSyncAt
        })),
        officialScores: reports.map(r => ({
          bureau: r.bureau,
          score: r.creditScore,
          date: r.scoreDate
        }))
      }
    });
  } catch (error: any) {
    console.error('Error fetching credit risk summary:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch credit risk summary' }
    }, 500);
  }
});

export default creditRiskRouter;
