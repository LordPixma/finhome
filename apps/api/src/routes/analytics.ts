import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { getDb, transactions, categories } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import type { AppContext } from '../types';
import type { SpendingAnalytics } from '@finhome/shared';

const analytics = new Hono<{ Bindings: AppContext['env']; Variables: AppContext['var'] }>();

// Apply middleware
analytics.use('*', authMiddleware, tenantMiddleware);

// Get spending analytics
analytics.get('/spending', async c => {
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  // Get summary
  const summary = await db
    .select({
      type: transactions.type,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(eq(transactions.tenantId, tenantId))
    .groupBy(transactions.type)
    .all();

  const totalIncome = summary.find(s => s.type === 'income')?.total || 0;
  const totalExpenses = summary.find(s => s.type === 'expense')?.total || 0;
  const netCashflow = totalIncome - totalExpenses;

  // Get by category
  const byCategory = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      amount: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.tenantId, tenantId), eq(transactions.type, 'expense')))
    .groupBy(transactions.categoryId, categories.name)
    .all();

  const result: SpendingAnalytics = {
    totalIncome,
    totalExpenses,
    netCashflow,
    byCategory: byCategory.map(c => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName || 'Unknown',
      amount: c.amount,
      percentage: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0,
    })),
    trend: [], // TODO: Implement trend calculation
  };

  return c.json({
    success: true,
    data: result,
  });
});

// Get cashflow data
analytics.get('/cashflow', async c => {
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  // Get monthly cashflow trend (last 6 months)
  const trend = await db
    .select({
      date: sql<string>`strftime('%Y-%m', ${transactions.date})`,
      type: transactions.type,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(eq(transactions.tenantId, tenantId))
    .groupBy(sql`strftime('%Y-%m', ${transactions.date})`, transactions.type)
    .orderBy(sql`strftime('%Y-%m', ${transactions.date})`)
    .all();

  return c.json({
    success: true,
    data: trend,
  });
});

export default analytics;
