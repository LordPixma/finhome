import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { FinancialHealthService } from '../services/financialHealth.service';
import type { Env } from '../types';

const financialHealthRouter = new Hono<Env>();

// Apply middleware
financialHealthRouter.use('*', authMiddleware, tenantMiddleware);

// ==========================================
// HEALTH SCORE ENDPOINTS
// ==========================================

/**
 * GET /api/financial-health/score
 * Get the latest financial health score for the current tenant
 */
financialHealthRouter.get('/score', async c => {
  const tenantId = c.get('tenantId')!;

  try {
    const latestScore = await FinancialHealthService.getLatestScore(c, tenantId);

    if (!latestScore) {
      // Calculate a new score if none exists
      const result = await FinancialHealthService.calculateHealthScore(c, tenantId);
      const scoreId = await FinancialHealthService.storeHealthScore(c, tenantId, result);

      return c.json({
        success: true,
        data: {
          id: scoreId,
          ...result,
          isNew: true
        }
      });
    }

    // Parse stored JSON fields
    return c.json({
      success: true,
      data: {
        id: latestScore.id,
        overallScore: latestScore.overallScore,
        category: latestScore.scoreCategory,
        breakdown: latestScore.scoreBreakdown ? JSON.parse(latestScore.scoreBreakdown) : null,
        insights: latestScore.insights ? JSON.parse(latestScore.insights) : [],
        recommendations: latestScore.recommendations ? JSON.parse(latestScore.recommendations) : [],
        calculatedAt: latestScore.calculatedAt,
        isNew: false
      }
    });
  } catch (error) {
    console.error('Error getting financial health score:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get financial health score' }
    }, 500);
  }
});

/**
 * POST /api/financial-health/score/calculate
 * Force recalculation of the financial health score
 */
financialHealthRouter.post('/score/calculate', async c => {
  const tenantId = c.get('tenantId')!;

  try {
    const result = await FinancialHealthService.calculateHealthScore(c, tenantId);
    const scoreId = await FinancialHealthService.storeHealthScore(c, tenantId, result);

    return c.json({
      success: true,
      data: {
        id: scoreId,
        ...result
      }
    }, 201);
  } catch (error) {
    console.error('Error calculating financial health score:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to calculate financial health score' }
    }, 500);
  }
});

/**
 * GET /api/financial-health/score/history
 * Get the score history for trend analysis
 */
financialHealthRouter.get('/score/history', async c => {
  const tenantId = c.get('tenantId')!;
  const months = parseInt(c.req.query('months') || '12');

  try {
    const history = await FinancialHealthService.getScoreHistory(c, tenantId, months);

    return c.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting score history:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get score history' }
    }, 500);
  }
});

// ==========================================
// PROFILE ENDPOINTS
// ==========================================

const profileUpdateSchema = z.object({
  monthlyIncome: z.number().min(0).optional(),
  incomeSource: z.enum(['employed', 'self_employed', 'retired', 'student', 'other']).optional(),
  employmentStatus: z.enum(['full_time', 'part_time', 'contract', 'freelance', 'unemployed', 'retired']).optional(),
  householdSize: z.number().int().min(1).optional(),
  dependents: z.number().int().min(0).optional(),
  housingStatus: z.enum(['own_outright', 'mortgage', 'rent', 'living_with_family', 'other']).optional(),
  monthlyRentMortgage: z.number().min(0).optional(),
  totalDebtBalance: z.number().min(0).optional(),
  monthlyDebtPayments: z.number().min(0).optional(),
  emergencyFundTarget: z.number().min(1).max(24).optional(),
  emergencyFundAccountId: z.string().uuid().optional(),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  financialGoals: z.array(z.string()).optional(),
  retirementAge: z.number().int().min(40).max(100).optional(),
  hasRetirementAccount: z.boolean().optional(),
  hasLifeInsurance: z.boolean().optional(),
  hasHealthInsurance: z.boolean().optional(),
  hasIncomeProtection: z.boolean().optional()
});

/**
 * GET /api/financial-health/profile
 * Get the user's financial profile
 */
financialHealthRouter.get('/profile', async c => {
  const tenantId = c.get('tenantId')!;

  try {
    const profile = await FinancialHealthService.getOrCreateProfile(c, tenantId);

    // Parse financial goals if it's a string
    const parsedProfile = {
      ...profile,
      financialGoals: profile?.financialGoals ? JSON.parse(profile.financialGoals) : []
    };

    return c.json({
      success: true,
      data: parsedProfile
    });
  } catch (error) {
    console.error('Error getting financial profile:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get financial profile' }
    }, 500);
  }
});

/**
 * PUT /api/financial-health/profile
 * Update the user's financial profile
 */
financialHealthRouter.put('/profile', validateRequest(profileUpdateSchema), async c => {
  const tenantId = c.get('tenantId')!;
  const updates = c.get('validatedData') as z.infer<typeof profileUpdateSchema>;

  try {
    const profile = await FinancialHealthService.updateProfile(c, tenantId, updates);

    // Parse financial goals if it's a string
    const parsedProfile = {
      ...profile,
      financialGoals: profile?.financialGoals ? JSON.parse(profile.financialGoals) : []
    };

    return c.json({
      success: true,
      data: parsedProfile
    });
  } catch (error) {
    console.error('Error updating financial profile:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update financial profile' }
    }, 500);
  }
});

// ==========================================
// INSIGHTS ENDPOINTS
// ==========================================

/**
 * GET /api/financial-health/insights
 * Get active AI-generated financial insights
 */
financialHealthRouter.get('/insights', async c => {
  const tenantId = c.get('tenantId')!;

  try {
    const insights = await FinancialHealthService.getActiveInsights(c, tenantId);

    // Parse action items for each insight
    const parsedInsights = insights.map(insight => ({
      ...insight,
      actionItems: insight.actionItems ? JSON.parse(insight.actionItems) : []
    }));

    return c.json({
      success: true,
      data: parsedInsights
    });
  } catch (error) {
    console.error('Error getting financial insights:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get financial insights' }
    }, 500);
  }
});

const insightStatusSchema = z.object({
  isRead: z.boolean().optional(),
  isDismissed: z.boolean().optional(),
  isActedUpon: z.boolean().optional()
});

/**
 * PATCH /api/financial-health/insights/:id
 * Update insight status (read, dismissed, acted upon)
 */
financialHealthRouter.patch('/insights/:id', validateRequest(insightStatusSchema), async c => {
  const tenantId = c.get('tenantId')!;
  const insightId = c.req.param('id');
  const status = c.get('validatedData') as z.infer<typeof insightStatusSchema>;

  try {
    await FinancialHealthService.updateInsightStatus(c, insightId, tenantId, status);

    return c.json({
      success: true,
      data: { id: insightId, ...status }
    });
  } catch (error) {
    console.error('Error updating insight status:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update insight status' }
    }, 500);
  }
});

// ==========================================
// DEBT MANAGEMENT ENDPOINTS
// ==========================================

/**
 * GET /api/financial-health/debts
 * Get all debt accounts
 */
financialHealthRouter.get('/debts', async c => {
  const tenantId = c.get('tenantId')!;

  try {
    const debts = await FinancialHealthService.getDebtAccounts(c, tenantId);

    return c.json({
      success: true,
      data: debts
    });
  } catch (error) {
    console.error('Error getting debt accounts:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get debt accounts' }
    }, 500);
  }
});

const debtSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  type: z.enum(['mortgage', 'car_loan', 'student_loan', 'credit_card', 'personal_loan', 'overdraft', 'other']),
  linkedAccountId: z.string().uuid().optional().nullable(),
  originalBalance: z.number().min(0),
  currentBalance: z.number().min(0),
  interestRate: z.number().min(0).max(100).optional().nullable(),
  minimumPayment: z.number().min(0).optional().nullable(),
  monthlyPayment: z.number().min(0).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  creditorName: z.string().max(100).optional().nullable(),
  payoffPriority: z.number().int().min(0).optional()
});

/**
 * POST /api/financial-health/debts
 * Create a new debt account
 */
financialHealthRouter.post('/debts', validateRequest(debtSchema), async c => {
  const tenantId = c.get('tenantId')!;
  const debt = c.get('validatedData') as z.infer<typeof debtSchema>;

  try {
    const id = await FinancialHealthService.upsertDebtAccount(c, tenantId, {
      ...debt,
      startDate: debt.startDate ? new Date(debt.startDate) : undefined,
      endDate: debt.endDate ? new Date(debt.endDate) : undefined,
      linkedAccountId: debt.linkedAccountId || undefined,
      interestRate: debt.interestRate || undefined,
      minimumPayment: debt.minimumPayment || undefined,
      monthlyPayment: debt.monthlyPayment || undefined,
      creditorName: debt.creditorName || undefined,
    });

    return c.json({
      success: true,
      data: { id, ...debt }
    }, 201);
  } catch (error) {
    console.error('Error creating debt account:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create debt account' }
    }, 500);
  }
});

/**
 * PUT /api/financial-health/debts/:id
 * Update an existing debt account
 */
financialHealthRouter.put('/debts/:id', validateRequest(debtSchema), async c => {
  const tenantId = c.get('tenantId')!;
  const id = c.req.param('id');
  const debt = c.get('validatedData') as z.infer<typeof debtSchema>;

  try {
    await FinancialHealthService.upsertDebtAccount(c, tenantId, {
      ...debt,
      id,
      startDate: debt.startDate ? new Date(debt.startDate) : undefined,
      endDate: debt.endDate ? new Date(debt.endDate) : undefined,
      linkedAccountId: debt.linkedAccountId || undefined,
      interestRate: debt.interestRate || undefined,
      minimumPayment: debt.minimumPayment || undefined,
      monthlyPayment: debt.monthlyPayment || undefined,
      creditorName: debt.creditorName || undefined,
    });

    return c.json({
      success: true,
      data: { id, ...debt }
    });
  } catch (error) {
    console.error('Error updating debt account:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update debt account' }
    }, 500);
  }
});

// ==========================================
// SUMMARY ENDPOINT
// ==========================================

/**
 * GET /api/financial-health/summary
 * Get a complete financial health summary
 */
financialHealthRouter.get('/summary', async c => {
  const tenantId = c.get('tenantId')!;

  try {
    // Get latest score
    let score = await FinancialHealthService.getLatestScore(c, tenantId);

    // Calculate if no score exists or if it's older than 24 hours
    const needsRecalculation = !score ||
      (new Date().getTime() - new Date(score.calculatedAt).getTime() > 24 * 60 * 60 * 1000);

    if (needsRecalculation) {
      const result = await FinancialHealthService.calculateHealthScore(c, tenantId);
      await FinancialHealthService.storeHealthScore(c, tenantId, result);
      score = await FinancialHealthService.getLatestScore(c, tenantId);
    }

    // Get profile
    const profile = await FinancialHealthService.getOrCreateProfile(c, tenantId);

    // Get recent history (last 6 months)
    const history = await FinancialHealthService.getScoreHistory(c, tenantId, 6);

    // Get active insights
    const insights = await FinancialHealthService.getActiveInsights(c, tenantId);

    // Get debts
    const debts = await FinancialHealthService.getDebtAccounts(c, tenantId);

    return c.json({
      success: true,
      data: {
        score: score ? {
          id: score.id,
          overallScore: score.overallScore,
          category: score.scoreCategory,
          breakdown: score.scoreBreakdown ? JSON.parse(score.scoreBreakdown) : null,
          insights: score.insights ? JSON.parse(score.insights) : [],
          recommendations: score.recommendations ? JSON.parse(score.recommendations) : [],
          calculatedAt: score.calculatedAt
        } : null,
        profile: profile ? {
          ...profile,
          financialGoals: profile.financialGoals ? JSON.parse(profile.financialGoals) : []
        } : null,
        history: history.map(h => ({
          period: h.period,
          score: h.newScore,
          previousScore: h.previousScore,
          delta: h.scoreDelta,
          reason: h.changeReason
        })),
        insights: insights.slice(0, 5).map(i => ({
          id: i.id,
          type: i.insightType,
          title: i.title,
          content: i.content,
          priority: i.priority,
          potentialImpact: i.potentialImpact,
          actionItems: i.actionItems ? JSON.parse(i.actionItems) : []
        })),
        debts: {
          total: debts.reduce((sum, d) => sum + d.currentBalance, 0),
          count: debts.length,
          items: debts.slice(0, 5)
        }
      }
    });
  } catch (error) {
    console.error('Error getting financial health summary:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get financial health summary' }
    }, 500);
  }
});

export default financialHealthRouter;
