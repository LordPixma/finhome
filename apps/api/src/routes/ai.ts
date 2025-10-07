/**
 * AI-Powered Features API Routes
 * 
 * Provides endpoints for Cloudflare Workers AI integration
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { subdomainMiddleware } from '../middleware/subdomain';
import { validateRequest } from '../middleware/validation';
import { getDb, transactions, categories } from '../db';
import { CloudflareAIService } from '../services/workersai.service';
import { eq, and, desc, gte } from 'drizzle-orm';
import type { Env } from '../types';
import { z } from 'zod';

const aiRouter = new Hono<Env>();

// Apply auth and tenant middleware to all routes
aiRouter.use('*', authMiddleware);
aiRouter.use('*', subdomainMiddleware);

// Index route to enumerate available AI endpoints (prevents base path 404 confusion)
aiRouter.get('/', c => {
  return c.json({
    success: true,
    data: {
      endpoints: [
        'GET /api/ai/status',
        'POST /api/ai/categorize-transaction',
        'GET /api/ai/spending-insights',
        'GET /api/ai/detect-anomalies',
        'POST /api/ai/financial-advice',
        'GET /api/ai/monthly-summary',
        'GET /api/ai/budget-recommendations'
      ],
      note: 'All routes require Authorization bearer token and tenant subdomain.'
    }
  });
});

// Validation schemas
const CategorySuggestionSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number()
});

const FinancialQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  monthlyIncome: z.number().optional()
});

/**
 * AI Service Status Check
 * GET /api/ai/status
 */
aiRouter.get('/status', async c => {
  try {
    // Initialize AI service to test availability
    new CloudflareAIService(c.env.AI);
    
    return c.json({
      success: true,
      data: {
        status: 'AI service ready',
        modelsAvailable: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'AI service not available'
      }
    }, 500);
  }
});

/**
 * AI Transaction Categorization
 * POST /api/ai/categorize-transaction
 */
aiRouter.post('/categorize-transaction', validateRequest(CategorySuggestionSchema), async c => {
  try {
    const { description, amount } = c.get('validatedData');
    const aiService = new CloudflareAIService(c.env.AI);

    const suggestion = await aiService.categorizeTransaction(description, amount);

    return c.json({
      success: true,
      data: suggestion
    });
  } catch (error) {
    console.error('AI categorization error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'AI_ERROR', message: 'Failed to categorize transaction' }
      },
      500
    );
  }
});

/**
 * AI Spending Analysis  
 * GET /api/ai/spending-insights
 */
aiRouter.get('/spending-insights', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);
    const aiService = new CloudflareAIService(c.env.AI);

    // Get last 30 days of transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        date: transactions.date,
        category: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          gte(transactions.date, thirtyDaysAgo)
        )
      )
      .orderBy(desc(transactions.date))
      .limit(100);

    const formattedTransactions = recentTransactions.map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      date: t.date.toISOString(),
      category: t.category || 'Uncategorized'
    }));

    const insights = await aiService.analyzeSpendingPatterns(formattedTransactions);

    return c.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('AI spending analysis error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'AI_ERROR', message: 'Failed to analyze spending' }
      },
      500
    );
  }
});

/**
 * AI Anomaly Detection
 * GET /api/ai/detect-anomalies
 */
aiRouter.get('/detect-anomalies', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);
    const aiService = new CloudflareAIService(c.env.AI);

    // Get last 60 days for better anomaly detection
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentTransactions = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          gte(transactions.date, sixtyDaysAgo)
        )
      )
      .orderBy(desc(transactions.date))
      .limit(200);

    const formattedTransactions = recentTransactions.map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      date: t.date.toISOString(),
      merchant: t.description.split(' ')[0] // Simple merchant extraction
    }));

    const anomalies = await aiService.detectAnomalies(formattedTransactions);

    return c.json({
      success: true,
      data: {
        anomalies,
        summary: `Found ${anomalies.length} potential anomalies in your recent transactions`
      }
    });
  } catch (error) {
    console.error('AI anomaly detection error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'AI_ERROR', message: 'Failed to detect anomalies' }
      },
      500
    );
  }
});

/**
 * AI Financial Assistant
 * POST /api/ai/financial-advice
 */
aiRouter.post('/financial-advice', validateRequest(FinancialQuestionSchema), async c => {
  try {
    const { question, monthlyIncome } = c.get('validatedData');
    const aiService = new CloudflareAIService(c.env.AI);

    // Note: Future enhancement would fetch user's financial context from DB

    // Build financial context (simplified)
    const context = {
      monthlyIncome: monthlyIncome || 5000, // Default if not provided
      currentBudgets: [], // Would fetch from budgets table
      goals: [], // Would fetch from goals table
      demographics: {}
    };

    const advice = await aiService.provideFiscalGuidance(question, context);

    return c.json({
      success: true,
      data: {
        advice,
        disclaimer: 'This advice is generated by AI and should not replace professional financial consultation.'
      }
    });
  } catch (error) {
    console.error('AI financial advice error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'AI_ERROR', message: 'Failed to provide financial advice' }
      },
      500
    );
  }
});

/**
 * AI Monthly Summary
 * GET /api/ai/monthly-summary
 */
aiRouter.get('/monthly-summary', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);
    const aiService = new CloudflareAIService(c.env.AI);

    // Get current month's transactions
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyTransactions = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        date: transactions.date,
        category: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          gte(transactions.date, startOfMonth)
        )
      )
      .orderBy(desc(transactions.date));

    const formattedTransactions = monthlyTransactions.map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      date: t.date.toISOString(),
      category: t.category || 'Uncategorized'
    }));

    const summary = await aiService.summarizeMonthlySpending(formattedTransactions);

    return c.json({
      success: true,
      data: {
        summary,
        period: startOfMonth.toISOString().slice(0, 7), // YYYY-MM format
        transactionCount: formattedTransactions.length
      }
    });
  } catch (error) {
    console.error('AI monthly summary error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'AI_ERROR', message: 'Failed to generate monthly summary' }
      },
      500
    );
  }
});

/**
 * AI Budget Recommendations
 * GET /api/ai/budget-recommendations
 */
aiRouter.get('/budget-recommendations', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);
    const aiService = new CloudflareAIService(c.env.AI);

    // Get last 3 months of spending data
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentTransactions = await db
      .select({
        amount: transactions.amount,
        category: categories.name,
        date: transactions.date
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          gte(transactions.date, threeMonthsAgo)
        )
      );

    // Calculate monthly spending by category
    const monthlySpending: Record<string, number> = {};
    recentTransactions.forEach(t => {
      if (t.amount < 0) { // Only expenses
        const category = t.category || 'Other';
        monthlySpending[category] = (monthlySpending[category] || 0) + Math.abs(t.amount);
      }
    });

    // Average over 3 months
    Object.keys(monthlySpending).forEach(category => {
      monthlySpending[category] = monthlySpending[category] / 3;
    });

    const profile = {
      monthlyIncome: 5000, // Would get from user settings
      familySize: 1,
      financialGoals: ['Emergency Fund', 'Savings'],
      riskTolerance: 'moderate' as const
    };

    const spendingData = {
      monthlySpending,
      trends: {} // Would calculate trends here
    };

    const recommendations = await aiService.generateBudgetRecommendations(profile, spendingData);

    return c.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('AI budget recommendations error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'AI_ERROR', message: 'Failed to generate budget recommendations' }
      },
      500
    );
  }
});

export default aiRouter;