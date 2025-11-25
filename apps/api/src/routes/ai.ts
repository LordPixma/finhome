/**
 * AI-Powered Features API Routes
 * 
 * Provides endpoints for Cloudflare Workers AI integration
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { getDb, transactions, categories } from '../db';
import { CloudflareAIService } from '../services/workersai.service';
import { eq, and, desc, gte } from 'drizzle-orm';
import type { Env } from '../types';
import { z } from 'zod';

const aiRouter = new Hono<Env>();

// Apply auth middleware to all routes
// Note: Subdomain middleware disabled - tenant context comes from JWT in auth middleware
aiRouter.use('*', authMiddleware);

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
        'GET /api/ai/budget-recommendations',
        'GET /api/ai/report'
      ],
      note: 'All routes require Authorization bearer token. Tenant context extracted from JWT.'
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

  /**
   * Generate AI Financial Insights PDF
   * GET /api/ai/report
   * Optional query: period=YYYY-MM (defaults to current month)
   */
  aiRouter.get('/report', async c => {
    try {
      const tenantId = c.get('tenantId')!;
      const db = getDb(c.env.DB);
      const aiService = new CloudflareAIService(c.env.AI);

      // Determine period
      const url = new URL(c.req.url);
      const period = url.searchParams.get('period'); // YYYY-MM
      const baseDate = period ? new Date(`${period}-01T00:00:00Z`) : new Date();
      const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  // endOfMonth not currently required but retained logic above for potential future range filtering

      // Fetch transactions for the month
      const monthly = await db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          date: transactions.date,
          category: categories.name
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(eq(transactions.tenantId, tenantId), gte(transactions.date, startOfMonth)))
        .orderBy(desc(transactions.date));

      // Basic stats
      const expenses = monthly.filter(t => t.amount < 0);
      const income = monthly.filter(t => t.amount > 0);
      const totalSpending = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
      const totalIncome = income.reduce((s, t) => s + t.amount, 0);
      const net = totalIncome - totalSpending;

      // Group by category
      const byCategory: Record<string, number> = {};
      expenses.forEach(t => {
        const cat = t.category || 'Uncategorized';
        byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount);
      });
      const topCategories = Object.entries(byCategory).sort((a,b) => b[1]-a[1]).slice(0,5);

      // AI summary
      const formatted = monthly.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        date: t.date.toISOString(),
        category: t.category || 'Uncategorized'
      }));
      const summary = formatted.length > 0
        ? await aiService.summarizeMonthlySpending(formatted)
        : 'No transactions recorded for this period.';

      // Generate professional PDF using pdf-lib
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();
      const margin = 60;
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let y = height - 70;
      const lineHeight = 18;
      const periodStr = `${startOfMonth.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}`;
      const dateStr = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      const drawText = (text: string, x: number, size = 11, options: any = {}) => {
        page.drawText(text, {
          x, y, size,
          font: options.bold ? bold : font,
          color: options.color || rgb(0.2, 0.2, 0.2),
          maxWidth: options.maxWidth || (width - margin * 2)
        });
        y -= (options.spacing || lineHeight);
      };

      const drawSection = (title: string) => {
        y -= 10;
        page.drawLine({ start: { x: margin, y: y + 2 }, end: { x: width - margin, y: y + 2 }, thickness: 1.5, color: rgb(0.2, 0.45, 0.8) });
        y -= 20;
        drawText(title, margin, 14, { bold: true, color: rgb(0.1, 0.3, 0.7), spacing: 25 });
      };

      const drawBox = (x: number, y: number, w: number, h: number, bgColor: any, borderColor: any) => {
        page.drawRectangle({ x, y, width: w, height: h, color: bgColor, borderColor, borderWidth: 1.5 });
      };

      // Professional Header with gradient simulation
      page.drawRectangle({ x: 0, y: height - 50, width, height: 50, color: rgb(0.15, 0.35, 0.75) });
      page.drawText('FINANCIAL INSIGHTS REPORT', { x: margin, y: height - 30, size: 18, font: bold, color: rgb(1, 1, 1) });
      page.drawText('Powered by Finhome360 AI', { x: margin, y: height - 44, size: 9, font, color: rgb(0.9, 0.9, 1) });

      // Report metadata
      y -= 5;
      drawText(`Reporting Period: ${periodStr}`, margin, 10, { bold: true });
      drawText(`Report Generated: ${dateStr}`, margin, 9, { color: rgb(0.4, 0.4, 0.4) });

      // Executive Summary section
      drawSection('EXECUTIVE SUMMARY');
      const summaryLines = summary.split('\n').filter(Boolean).slice(0, 8);
      summaryLines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed) drawText(trimmed, margin, 10, { spacing: 16 });
      });

      // Financial Overview section with boxes
      drawSection('FINANCIAL OVERVIEW');

      // Three-column metrics - save current y position and draw boxes independently
      const colWidth = (width - margin * 2 - 20) / 3;
      const boxY = y;
      const boxHeight = 70;

      // Income box
      drawBox(margin, boxY, colWidth, boxHeight, rgb(0.95, 0.98, 0.95), rgb(0.3, 0.7, 0.4));
      page.drawText('TOTAL INCOME', { x: margin + 10, y: boxY + 50, size: 9, font: bold, color: rgb(0.2, 0.5, 0.3) });
      page.drawText(`£${totalIncome.toFixed(2)}`, { x: margin + 10, y: boxY + 28, size: 16, font: bold, color: rgb(0.1, 0.4, 0.2) });

      // Expenses box
      drawBox(margin + colWidth + 10, boxY, colWidth, boxHeight, rgb(0.98, 0.95, 0.95), rgb(0.8, 0.3, 0.3));
      page.drawText('TOTAL EXPENSES', { x: margin + colWidth + 20, y: boxY + 50, size: 9, font: bold, color: rgb(0.7, 0.2, 0.2) });
      page.drawText(`£${totalSpending.toFixed(2)}`, { x: margin + colWidth + 20, y: boxY + 28, size: 16, font: bold, color: rgb(0.6, 0.1, 0.1) });

      // Net savings box
      const netColor = net >= 0 ? rgb(0.2, 0.5, 0.8) : rgb(0.8, 0.3, 0.2);
      const netBg = net >= 0 ? rgb(0.95, 0.97, 0.99) : rgb(0.99, 0.95, 0.95);
      drawBox(margin + colWidth * 2 + 20, boxY, colWidth, boxHeight, netBg, netColor);
      page.drawText('NET SAVINGS', { x: margin + colWidth * 2 + 30, y: boxY + 50, size: 9, font: bold, color: netColor });
      page.drawText(`£${net.toFixed(2)}`, { x: margin + colWidth * 2 + 30, y: boxY + 28, size: 16, font: bold, color: netColor });
      page.drawText(`Savings Rate: ${totalIncome > 0 ? ((net/totalIncome)*100).toFixed(1) : '0'}%`, { x: margin + colWidth * 2 + 30, y: boxY + 10, size: 8, font, color: rgb(0.4, 0.4, 0.4) });

      // Move y position down after the boxes
      y = boxY - boxHeight - 20;

      // Top Expense Categories section
      drawSection('TOP EXPENSE CATEGORIES');

      if (topCategories.length > 0) {
        page.drawRectangle({ x: margin, y: y - 10, width: width - margin * 2, height: 1, color: rgb(0.8, 0.8, 0.8) });
        y -= 25;

        topCategories.forEach(([cat, amt], idx) => {
          const pct = totalSpending > 0 ? (amt / totalSpending) * 100 : 0;
          const barWidth = (width - margin * 2 - 150) * (pct / 100);

          // Category name
          page.drawText(`${idx + 1}. ${cat}`, { x: margin, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) });

          // Bar chart
          page.drawRectangle({
            x: margin + 150,
            y: y - 3,
            width: barWidth,
            height: 12,
            color: rgb(0.3, 0.5, 0.9),
            borderWidth: 0.5,
            borderColor: rgb(0.2, 0.4, 0.8)
          });

          // Amount and percentage
          page.drawText(`£${amt.toFixed(2)}  (${pct.toFixed(1)}%)`, {
            x: margin + 155 + barWidth,
            y: y + 1,
            size: 9,
            font,
            color: rgb(0.3, 0.3, 0.3)
          });

          y -= 22;
        });
      } else {
        drawText('No expense data available for this period.', margin, 10, { color: rgb(0.5, 0.5, 0.5) });
      }

      // Footer with professional styling
      const footerY = 45;
      page.drawLine({ start: { x: margin, y: footerY + 25 }, end: { x: width - margin, y: footerY + 25 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
      page.drawText('This report is generated using advanced AI analysis', { x: margin, y: footerY + 10, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
      page.drawText('Finhome360 • Personal Finance Management • https://finhome360.com', { x: margin, y: footerY - 5, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(`Page 1 of 1`, { x: width - margin - 50, y: footerY - 5, size: 8, font, color: rgb(0.5, 0.5, 0.5) });

      const pdfBytes = await pdfDoc.save();
      const origin = c.req.header('Origin') || '*';
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="finhome-ai-report-${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth()+1).padStart(2,'0')}.pdf"`,
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    } catch (error) {
      console.error('AI report generation error:', error);
      return c.json(
        {
          success: false,
          error: { code: 'AI_REPORT_ERROR', message: 'Failed to generate AI report PDF' }
        },
        500
      );
    }
  });

export default aiRouter;