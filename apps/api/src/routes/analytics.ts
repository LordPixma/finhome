import { Hono } from 'hono';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { getDb, transactions, categories, accounts } from '../db';
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

// Get account performance comparison
analytics.get('/account-performance', async c => {
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  let dateFilter = eq(transactions.tenantId, tenantId);

  if (startDate && endDate) {
    dateFilter = and(
      eq(transactions.tenantId, tenantId),
      gte(transactions.date, new Date(startDate)),
      lte(transactions.date, new Date(endDate))
    );
  }

  const accountStats = await db
    .select({
      accountId: transactions.accountId,
      accountName: accounts.name,
      accountType: accounts.type,
      totalIncome: sql<number>`sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end)`,
      totalExpenses: sql<number>`sum(case when ${transactions.type} = 'expense' then abs(${transactions.amount}) else 0 end)`,
      transactionCount: sql<number>`count(*)`,
      avgTransaction: sql<number>`avg(abs(${transactions.amount}))`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(dateFilter)
    .groupBy(transactions.accountId, accounts.name, accounts.type)
    .all();

  return c.json({
    success: true,
    data: accountStats.map(stat => ({
      ...stat,
      netCashflow: stat.totalIncome - stat.totalExpenses,
    })),
  });
});

// Get category trends over time
analytics.get('/category-trends', async c => {
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  const categoryId = c.req.query('categoryId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const groupBy = c.req.query('groupBy') || 'month'; // 'day', 'week', 'month', 'year'

  let dateFormat = '%Y-%m';
  switch (groupBy) {
    case 'day':
      dateFormat = '%Y-%m-%d';
      break;
    case 'week':
      dateFormat = '%Y-W%W';
      break;
    case 'year':
      dateFormat = '%Y';
      break;
  }

  let whereClause = eq(transactions.tenantId, tenantId);

  if (categoryId) {
    whereClause = and(whereClause, eq(transactions.categoryId, categoryId));
  }

  if (startDate && endDate) {
    whereClause = and(
      whereClause,
      gte(transactions.date, new Date(startDate)),
      lte(transactions.date, new Date(endDate))
    );
  }

  const trends = await db
    .select({
      period: sql<string>`strftime('${sql.raw(dateFormat)}', ${transactions.date})`,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      totalAmount: sql<number>`sum(abs(${transactions.amount}))`,
      transactionCount: sql<number>`count(*)`,
      avgAmount: sql<number>`avg(abs(${transactions.amount}))`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(whereClause)
    .groupBy(sql`strftime('${sql.raw(dateFormat)}', ${transactions.date})`, transactions.categoryId, categories.name)
    .orderBy(sql`strftime('${sql.raw(dateFormat)}', ${transactions.date})`)
    .all();

  return c.json({
    success: true,
    data: trends,
  });
});

// Get top merchants/payees
analytics.get('/top-merchants', async c => {
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  const limit = parseInt(c.req.query('limit') || '10', 10);
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  let whereClause = eq(transactions.tenantId, tenantId);

  if (startDate && endDate) {
    whereClause = and(
      whereClause,
      gte(transactions.date, new Date(startDate)),
      lte(transactions.date, new Date(endDate))
    );
  }

  const topMerchants = await db
    .select({
      description: transactions.description,
      categoryName: categories.name,
      transactionCount: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(abs(${transactions.amount}))`,
      avgAmount: sql<number>`avg(abs(${transactions.amount}))`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(whereClause)
    .groupBy(transactions.description, categories.name)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(limit)
    .all();

  return c.json({
    success: true,
    data: topMerchants,
  });
});

// Get transaction velocity (frequency analysis)
analytics.get('/transaction-velocity', async c => {
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  let whereClause = eq(transactions.tenantId, tenantId);

  if (startDate && endDate) {
    whereClause = and(
      whereClause,
      gte(transactions.date, new Date(startDate)),
      lte(transactions.date, new Date(endDate))
    );
  }

  // Get transactions by day of week
  const byDayOfWeek = await db
    .select({
      dayOfWeek: sql<number>`cast(strftime('%w', ${transactions.date}) as integer)`,
      dayName: sql<string>`case cast(strftime('%w', ${transactions.date}) as integer)
        when 0 then 'Sunday'
        when 1 then 'Monday'
        when 2 then 'Tuesday'
        when 3 then 'Wednesday'
        when 4 then 'Thursday'
        when 5 then 'Friday'
        when 6 then 'Saturday'
      end`,
      transactionCount: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(abs(${transactions.amount}))`,
      avgAmount: sql<number>`avg(abs(${transactions.amount}))`,
    })
    .from(transactions)
    .where(whereClause)
    .groupBy(sql`cast(strftime('%w', ${transactions.date}) as integer)`)
    .orderBy(sql`cast(strftime('%w', ${transactions.date}) as integer)`)
    .all();

  // Get transactions by hour of day
  const byHourOfDay = await db
    .select({
      hour: sql<number>`cast(strftime('%H', ${transactions.date}) as integer)`,
      transactionCount: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(abs(${transactions.amount}))`,
    })
    .from(transactions)
    .where(whereClause)
    .groupBy(sql`cast(strftime('%H', ${transactions.date}) as integer)`)
    .orderBy(sql`cast(strftime('%H', ${transactions.date}) as integer)`)
    .all();

  return c.json({
    success: true,
    data: {
      byDayOfWeek,
      byHourOfDay,
    },
  });
});

// Get comparative analysis (period-over-period)
analytics.get('/comparative', async c => {
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  const period = c.req.query('period') || 'month'; // 'month', 'quarter', 'year'
  const compareCount = parseInt(c.req.query('compareCount') || '2', 10); // Compare last N periods

  // Calculate date ranges for comparison
  const now = new Date();
  const periods: { start: Date; end: Date; label: string }[] = [];

  for (let i = 0; i < compareCount; i++) {
    let start: Date, end: Date, label: string;

    if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      label = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else if (period === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const targetQuarter = currentQuarter - i;
      const quarterStart = targetQuarter * 3;
      start = new Date(now.getFullYear(), quarterStart, 1);
      end = new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59);
      label = `Q${targetQuarter + 1} ${start.getFullYear()}`;
    } else {
      start = new Date(now.getFullYear() - i, 0, 1);
      end = new Date(now.getFullYear() - i, 11, 31, 23, 59, 59);
      label = start.getFullYear().toString();
    }

    periods.push({ start, end, label });
  }

  // Fetch data for each period
  const comparisons = await Promise.all(
    periods.map(async ({ start, end, label }) => {
      const periodStats = await db
        .select({
          totalIncome: sql<number>`sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end)`,
          totalExpenses: sql<number>`sum(case when ${transactions.type} = 'expense' then abs(${transactions.amount}) else 0 end)`,
          transactionCount: sql<number>`count(*)`,
          avgTransaction: sql<number>`avg(abs(${transactions.amount}))`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            gte(transactions.date, start),
            lte(transactions.date, end)
          )
        )
        .get();

      // Get category breakdown for period
      const categoryBreakdown = await db
        .select({
          categoryName: categories.name,
          totalAmount: sql<number>`sum(abs(${transactions.amount}))`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            gte(transactions.date, start),
            lte(transactions.date, end)
          )
        )
        .groupBy(categories.name)
        .orderBy(desc(sql<number>`sum(abs(${transactions.amount}))`))
        .limit(5)
        .all();

      return {
        period: label,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        stats: {
          ...periodStats,
          netCashflow: (periodStats?.totalIncome || 0) - (periodStats?.totalExpenses || 0),
        },
        topCategories: categoryBreakdown,
      };
    })
  );

  return c.json({
    success: true,
    data: comparisons,
  });
});

export default analytics;
