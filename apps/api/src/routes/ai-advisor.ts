import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { AIAdvisorService } from '../services/aiAdvisor.service';
import type { Env } from '../types';

const aiAdvisorRouter = new Hono<Env>();

// Apply auth middleware to all routes
aiAdvisorRouter.use('/*', authMiddleware, tenantMiddleware);

// Validation schemas
const debtStrategySchema = z.object({
  extraMonthlyPayment: z.number().min(0).optional()
});

/**
 * GET /snapshot - Get comprehensive financial snapshot
 */
aiAdvisorRouter.get('/snapshot', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const snapshot = await AIAdvisorService.getFinancialSnapshot(c, tenantId);

    return c.json({
      success: true,
      data: snapshot
    });
  } catch (error: any) {
    console.error('Error getting financial snapshot:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get financial snapshot' }
    }, 500);
  }
});

/**
 * GET /predictions - Get spending predictions for upcoming months
 */
aiAdvisorRouter.get('/predictions', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const months = parseInt(c.req.query('months') || '3');

    const predictions = await AIAdvisorService.predictSpending(c, tenantId, Math.min(6, months));

    return c.json({
      success: true,
      data: {
        forecasts: predictions,
        generatedAt: new Date().toISOString(),
        disclaimer: 'Predictions are based on historical spending patterns and may not reflect future changes in circumstances.'
      }
    });
  } catch (error: any) {
    console.error('Error generating spending predictions:', error);
    return c.json({
      success: false,
      error: { code: 'PREDICTION_ERROR', message: 'Failed to generate spending predictions' }
    }, 500);
  }
});

/**
 * GET /goals/forecast - Get goal progress forecasts
 */
aiAdvisorRouter.get('/goals/forecast', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const forecasts = await AIAdvisorService.forecastGoals(c, tenantId);

    // Calculate summary stats
    const onTrack = forecasts.filter(g => g.onTrack).length;
    const atRisk = forecasts.length - onTrack;
    const avgProbability = forecasts.length > 0
      ? forecasts.reduce((sum, g) => sum + g.probabilityOfSuccess, 0) / forecasts.length
      : 0;

    return c.json({
      success: true,
      data: {
        forecasts,
        summary: {
          totalGoals: forecasts.length,
          onTrack,
          atRisk,
          averageSuccessProbability: Math.round(avgProbability * 100)
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error forecasting goals:', error);
    return c.json({
      success: false,
      error: { code: 'FORECAST_ERROR', message: 'Failed to forecast goals' }
    }, 500);
  }
});

/**
 * POST /debt/strategy - Get personalized debt payoff strategy
 */
aiAdvisorRouter.post('/debt/strategy', validateRequest(debtStrategySchema), async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const body = c.get('validatedData') as z.infer<typeof debtStrategySchema>;

    const strategy = await AIAdvisorService.generateDebtPayoffStrategy(
      c,
      tenantId,
      body.extraMonthlyPayment || 0
    );

    if (!strategy) {
      return c.json({
        success: true,
        data: null,
        message: 'No active debts found. You\'re debt-free!'
      });
    }

    return c.json({
      success: true,
      data: {
        strategy,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error generating debt strategy:', error);
    return c.json({
      success: false,
      error: { code: 'STRATEGY_ERROR', message: 'Failed to generate debt payoff strategy' }
    }, 500);
  }
});

/**
 * GET /debt/strategy - Get debt strategy with no extra payment
 */
aiAdvisorRouter.get('/debt/strategy', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const extraPayment = parseFloat(c.req.query('extraPayment') || '0');

    const strategy = await AIAdvisorService.generateDebtPayoffStrategy(c, tenantId, extraPayment);

    if (!strategy) {
      return c.json({
        success: true,
        data: null,
        message: 'No active debts found. You\'re debt-free!'
      });
    }

    return c.json({
      success: true,
      data: {
        strategy,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error generating debt strategy:', error);
    return c.json({
      success: false,
      error: { code: 'STRATEGY_ERROR', message: 'Failed to generate debt payoff strategy' }
    }, 500);
  }
});

/**
 * GET /advice - Get AI-powered personalized financial advice
 */
aiAdvisorRouter.get('/advice', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const advice = await AIAdvisorService.generatePersonalizedAdvice(c, tenantId);

    return c.json({
      success: true,
      data: {
        advice,
        generatedAt: new Date().toISOString(),
        disclaimer: 'This advice is AI-generated and should not replace consultation with a qualified financial adviser.'
      }
    });
  } catch (error: any) {
    console.error('Error generating personalized advice:', error);
    return c.json({
      success: false,
      error: { code: 'ADVICE_ERROR', message: 'Failed to generate personalized advice' }
    }, 500);
  }
});

/**
 * GET /summary - Get comprehensive AI advisor summary
 */
aiAdvisorRouter.get('/summary', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;

    // Get all data in parallel
    const [snapshot, predictions, goalForecasts, debtStrategy, advice] = await Promise.all([
      AIAdvisorService.getFinancialSnapshot(c, tenantId),
      AIAdvisorService.predictSpending(c, tenantId, 3),
      AIAdvisorService.forecastGoals(c, tenantId),
      AIAdvisorService.generateDebtPayoffStrategy(c, tenantId, 0),
      AIAdvisorService.generatePersonalizedAdvice(c, tenantId)
    ]);

    // Calculate quick insights
    const goalsOnTrack = goalForecasts.filter(g => g.onTrack).length;
    const nextMonthPrediction = predictions[0];
    const urgentActionsCount = advice.urgentActions.filter(a => a.priority === 'critical' || a.priority === 'high').length;

    return c.json({
      success: true,
      data: {
        snapshot,
        predictions: predictions.slice(0, 3),
        goalForecasts: goalForecasts.slice(0, 5),
        debtStrategy,
        advice,
        quickInsights: {
          healthScore: snapshot.healthScore,
          savingsRate: snapshot.savings.rate,
          goalsOnTrack,
          goalsTotal: goalForecasts.length,
          urgentActionsCount,
          nextMonthPredictedSavings: nextMonthPrediction?.predictedSavings ?? 0,
          debtFreeDate: debtStrategy?.projectedPayoffDate || null
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error generating AI advisor summary:', error);
    return c.json({
      success: false,
      error: { code: 'SUMMARY_ERROR', message: 'Failed to generate AI advisor summary' }
    }, 500);
  }
});

export default aiAdvisorRouter;
