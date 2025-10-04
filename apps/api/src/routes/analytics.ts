import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { getDb, transactions, categories } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import type { Env } from '../types';
import type { SpendingAnalytics } from '@finhome360/shared';

const analytics = new Hono<Env>();

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

  // Get trend data (last 6 months)
  const trendData = await db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', ${transactions.date})`,
      type: transactions.type,
      amount: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.tenantId, tenantId),
        sql`${transactions.date} >= date('now', '-6 months')`
      )
    )
    .groupBy(sql`strftime('%Y-%m-%d', ${transactions.date})`, transactions.type)
    .orderBy(sql`strftime('%Y-%m-%d', ${transactions.date})`)
    .all();

  // Organize trend by date
  const trendMap = new Map<string, { income: number; expenses: number }>();
  
  for (const item of trendData) {
    if (!trendMap.has(item.date)) {
      trendMap.set(item.date, { income: 0, expenses: 0 });
    }
    const entry = trendMap.get(item.date)!;
    if (item.type === 'income') {
      entry.income += item.amount;
    } else if (item.type === 'expense') {
      entry.expenses += item.amount;
    }
  }

  const trend = Array.from(trendMap.entries()).map(([date, values]) => ({
    date,
    income: values.income,
    expenses: values.expenses,
  }));

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
    trend,
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
