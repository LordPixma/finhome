import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import {
  getDb,
  transactions,
  accounts,
  categories,
  budgets,
  goals,
  goalContributions,
} from '../db';
import type { AppContext } from '../types';

/**
 * Data Export Service
 *
 * Provides export functionality for transactions, budgets, goals, and analytics
 * in multiple formats (CSV, JSON, PDF-ready data).
 */

export type ExportFormat = 'csv' | 'json' | 'pdf';
export type ExportType = 'transactions' | 'budgets' | 'goals' | 'analytics' | 'full';

export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  startDate?: Date;
  endDate?: Date;
  accountId?: string;
  categoryId?: string;
  includeArchived?: boolean;
}

export interface ExportResult {
  filename: string;
  mimeType: string;
  data: string | object;
}

export class ExportService {
  /**
   * Export transactions
   */
  static async exportTransactions(
    c: AppContext,
    tenantId: string,
    options: {
      format: ExportFormat;
      startDate?: Date;
      endDate?: Date;
      accountId?: string;
      categoryId?: string;
    }
  ): Promise<ExportResult> {
    const db = getDb(c.env.DB);
    const { format, startDate, endDate, accountId, categoryId } = options;

    // Build query conditions
    const conditions = [eq(transactions.tenantId, tenantId)];

    if (startDate) {
      conditions.push(gte(transactions.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(transactions.date, endDate));
    }
    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId));
    }
    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId));
    }

    const data = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        notes: transactions.notes,
        accountName: accounts.name,
        categoryName: categories.name,
        categoryIcon: categories.icon,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date));

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      return {
        filename: `transactions-${dateStr}.csv`,
        mimeType: 'text/csv',
        data: this.transactionsToCSV(data),
      };
    } else if (format === 'json') {
      return {
        filename: `transactions-${dateStr}.json`,
        mimeType: 'application/json',
        data: JSON.stringify(data, null, 2),
      };
    } else {
      // PDF format returns structured data for PDF generation
      return {
        filename: `transactions-${dateStr}.pdf`,
        mimeType: 'application/json',
        data: {
          title: 'Transaction Report',
          generatedAt: new Date().toISOString(),
          dateRange: {
            start: startDate?.toISOString(),
            end: endDate?.toISOString(),
          },
          summary: this.calculateTransactionSummary(data),
          transactions: data,
        },
      };
    }
  }

  /**
   * Export budgets
   */
  static async exportBudgets(
    c: AppContext,
    tenantId: string,
    options: {
      format: ExportFormat;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ExportResult> {
    const db = getDb(c.env.DB);
    const { format, startDate, endDate } = options;

    const conditions = [eq(budgets.tenantId, tenantId)];

    if (startDate) {
      conditions.push(gte(budgets.startDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(budgets.endDate, endDate));
    }

    const budgetData = await db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        amount: budgets.amount,
        period: budgets.period,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(budgets.startDate));

    // Calculate spent for each budget from transactions
    const data = await Promise.all(budgetData.map(async (budget) => {
      const spent = await db
        .select({ total: sql<number>`COALESCE(SUM(ABS(${transactions.amount})), 0)` })
        .from(transactions)
        .where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.categoryId, budget.categoryId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, budget.startDate),
          budget.endDate ? lte(transactions.date, budget.endDate) : sql`1=1`
        ))
        .get();

      return {
        ...budget,
        spent: spent?.total || 0,
      };
    }));

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      return {
        filename: `budgets-${dateStr}.csv`,
        mimeType: 'text/csv',
        data: this.budgetsToCSV(data),
      };
    } else if (format === 'json') {
      return {
        filename: `budgets-${dateStr}.json`,
        mimeType: 'application/json',
        data: JSON.stringify(data, null, 2),
      };
    } else {
      return {
        filename: `budgets-${dateStr}.pdf`,
        mimeType: 'application/json',
        data: {
          title: 'Budget Report',
          generatedAt: new Date().toISOString(),
          dateRange: {
            start: startDate?.toISOString(),
            end: endDate?.toISOString(),
          },
          summary: this.calculateBudgetSummary(data),
          budgets: data,
        },
      };
    }
  }

  /**
   * Export goals
   */
  static async exportGoals(
    c: AppContext,
    tenantId: string,
    options: {
      format: ExportFormat;
      includeContributions?: boolean;
    }
  ): Promise<ExportResult> {
    const db = getDb(c.env.DB);
    const { format, includeContributions = true } = options;

    const goalsData = await db
      .select({
        id: goals.id,
        name: goals.name,
        description: goals.description,
        targetAmount: goals.targetAmount,
        currentAmount: goals.currentAmount,
        deadline: goals.deadline,
        status: goals.status,
        color: goals.color,
        icon: goals.icon,
        accountName: accounts.name,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .leftJoin(accounts, eq(goals.accountId, accounts.id))
      .where(eq(goals.tenantId, tenantId))
      .orderBy(desc(goals.createdAt));

    let contributionsData: any[] = [];
    if (includeContributions) {
      const goalIds = goalsData.map(g => g.id);
      if (goalIds.length > 0) {
        contributionsData = await db
          .select()
          .from(goalContributions)
          .where(sql`${goalContributions.goalId} IN (${sql.join(goalIds.map(id => sql`${id}`), sql`, `)})`);
      }
    }

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      return {
        filename: `goals-${dateStr}.csv`,
        mimeType: 'text/csv',
        data: this.goalsToCSV(goalsData),
      };
    } else if (format === 'json') {
      return {
        filename: `goals-${dateStr}.json`,
        mimeType: 'application/json',
        data: JSON.stringify({ goals: goalsData, contributions: contributionsData }, null, 2),
      };
    } else {
      return {
        filename: `goals-${dateStr}.pdf`,
        mimeType: 'application/json',
        data: {
          title: 'Goals Report',
          generatedAt: new Date().toISOString(),
          summary: this.calculateGoalsSummary(goalsData),
          goals: goalsData.map(goal => ({
            ...goal,
            contributions: contributionsData.filter(c => c.goalId === goal.id),
          })),
        },
      };
    }
  }

  /**
   * Export analytics summary
   */
  static async exportAnalytics(
    c: AppContext,
    tenantId: string,
    options: {
      format: ExportFormat;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ExportResult> {
    const db = getDb(c.env.DB);
    const { format, startDate, endDate } = options;

    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || now;

    // Get spending by category
    const spendingByCategory = await db
      .select({
        categoryName: categories.name,
        categoryIcon: categories.icon,
        total: sql<number>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, start),
        lte(transactions.date, end)
      ))
      .groupBy(transactions.categoryId);

    // Get income vs expenses
    const incomeVsExpenses = await db
      .select({
        type: transactions.type,
        total: sql<number>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.date, start),
        lte(transactions.date, end)
      ))
      .groupBy(transactions.type);

    // Get monthly trends
    const monthlyTrends = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${transactions.date})`,
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
        expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        gte(transactions.date, start),
        lte(transactions.date, end)
      ))
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`)
      .orderBy(sql`strftime('%Y-%m', ${transactions.date})`);

    // Get account balances
    const accountBalances = await db
      .select({
        name: accounts.name,
        type: accounts.type,
        balance: accounts.balance,
      })
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId));

    const analytics = {
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      spendingByCategory,
      incomeVsExpenses,
      monthlyTrends,
      accountBalances,
      totals: {
        totalIncome: incomeVsExpenses.find(i => i.type === 'income')?.total || 0,
        totalExpenses: incomeVsExpenses.find(i => i.type === 'expense')?.total || 0,
        netSavings: (incomeVsExpenses.find(i => i.type === 'income')?.total || 0) -
                    (incomeVsExpenses.find(i => i.type === 'expense')?.total || 0),
        totalBalance: accountBalances.reduce((sum, a) => sum + (a.balance || 0), 0),
      },
    };

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      return {
        filename: `analytics-${dateStr}.csv`,
        mimeType: 'text/csv',
        data: this.analyticsToCSV(analytics),
      };
    } else if (format === 'json') {
      return {
        filename: `analytics-${dateStr}.json`,
        mimeType: 'application/json',
        data: JSON.stringify(analytics, null, 2),
      };
    } else {
      return {
        filename: `analytics-${dateStr}.pdf`,
        mimeType: 'application/json',
        data: {
          title: 'Financial Analytics Report',
          generatedAt: new Date().toISOString(),
          ...analytics,
        },
      };
    }
  }

  /**
   * Full export - all data
   */
  static async exportAll(
    c: AppContext,
    tenantId: string,
    options: {
      format: ExportFormat;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ExportResult> {
    const { format, startDate, endDate } = options;

    const [transactionsExport, budgetsExport, goalsExport, analyticsExport] = await Promise.all([
      this.exportTransactions(c, tenantId, { format: 'json', startDate, endDate }),
      this.exportBudgets(c, tenantId, { format: 'json', startDate, endDate }),
      this.exportGoals(c, tenantId, { format: 'json' }),
      this.exportAnalytics(c, tenantId, { format: 'json', startDate, endDate }),
    ]);

    const fullData = {
      exportedAt: new Date().toISOString(),
      dateRange: {
        start: startDate?.toISOString(),
        end: endDate?.toISOString(),
      },
      transactions: JSON.parse(transactionsExport.data as string),
      budgets: JSON.parse(budgetsExport.data as string),
      goals: JSON.parse(goalsExport.data as string),
      analytics: JSON.parse(analyticsExport.data as string),
    };

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      return {
        filename: `finhome-export-${dateStr}.json`,
        mimeType: 'application/json',
        data: JSON.stringify(fullData, null, 2),
      };
    } else if (format === 'csv') {
      // For CSV, we'll return a ZIP-like structure description
      // In practice, this would need a ZIP library
      return {
        filename: `finhome-export-${dateStr}.csv`,
        mimeType: 'text/csv',
        data: this.transactionsToCSV(fullData.transactions),
      };
    } else {
      return {
        filename: `finhome-export-${dateStr}.pdf`,
        mimeType: 'application/json',
        data: {
          title: 'Complete Financial Report',
          generatedAt: new Date().toISOString(),
          ...fullData,
        },
      };
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private static transactionsToCSV(data: any[]): string {
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Account', 'Notes'];
    const rows = data.map(t => [
      t.date ? new Date(t.date).toISOString().slice(0, 10) : '',
      this.escapeCSV(t.description || ''),
      t.amount?.toFixed(2) || '0.00',
      t.type || '',
      this.escapeCSV(t.categoryName || ''),
      this.escapeCSV(t.accountName || ''),
      this.escapeCSV(t.notes || ''),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private static budgetsToCSV(data: any[]): string {
    const headers = ['Category', 'Budget Amount', 'Spent', 'Remaining', 'Period', 'Start Date', 'End Date'];
    const rows = data.map(b => [
      this.escapeCSV(b.categoryName || ''),
      b.amount?.toFixed(2) || '0.00',
      b.spent?.toFixed(2) || '0.00',
      ((b.amount || 0) - (b.spent || 0)).toFixed(2),
      b.period || '',
      b.startDate ? new Date(b.startDate).toISOString().slice(0, 10) : '',
      b.endDate ? new Date(b.endDate).toISOString().slice(0, 10) : '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private static goalsToCSV(data: any[]): string {
    const headers = ['Name', 'Description', 'Target Amount', 'Current Amount', 'Progress %', 'Deadline', 'Status', 'Account'];
    const rows = data.map(g => [
      this.escapeCSV(g.name || ''),
      this.escapeCSV(g.description || ''),
      g.targetAmount?.toFixed(2) || '0.00',
      g.currentAmount?.toFixed(2) || '0.00',
      ((g.currentAmount / g.targetAmount) * 100).toFixed(1),
      g.deadline ? new Date(g.deadline).toISOString().slice(0, 10) : '',
      g.status || '',
      this.escapeCSV(g.accountName || ''),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private static analyticsToCSV(analytics: any): string {
    const sections: string[] = [];

    // Summary section
    sections.push('=== FINANCIAL SUMMARY ===');
    sections.push(`Date Range,${analytics.dateRange?.start || 'N/A'},${analytics.dateRange?.end || 'N/A'}`);
    sections.push(`Total Income,${analytics.totals?.totalIncome?.toFixed(2) || '0.00'}`);
    sections.push(`Total Expenses,${analytics.totals?.totalExpenses?.toFixed(2) || '0.00'}`);
    sections.push(`Net Savings,${analytics.totals?.netSavings?.toFixed(2) || '0.00'}`);
    sections.push(`Total Balance,${analytics.totals?.totalBalance?.toFixed(2) || '0.00'}`);
    sections.push('');

    // Spending by category
    sections.push('=== SPENDING BY CATEGORY ===');
    sections.push('Category,Total,Count');
    analytics.spendingByCategory?.forEach((cat: any) => {
      sections.push(`${this.escapeCSV(cat.categoryName || '')},${cat.total?.toFixed(2) || '0.00'},${cat.count || 0}`);
    });
    sections.push('');

    // Monthly trends
    sections.push('=== MONTHLY TRENDS ===');
    sections.push('Month,Income,Expenses,Net');
    analytics.monthlyTrends?.forEach((month: any) => {
      const net = (month.income || 0) - (month.expenses || 0);
      sections.push(`${month.month},${month.income?.toFixed(2) || '0.00'},${month.expenses?.toFixed(2) || '0.00'},${net.toFixed(2)}`);
    });
    sections.push('');

    // Account balances
    sections.push('=== ACCOUNT BALANCES ===');
    sections.push('Account,Type,Balance');
    analytics.accountBalances?.forEach((acc: any) => {
      sections.push(`${this.escapeCSV(acc.name || '')},${acc.type || ''},${acc.balance?.toFixed(2) || '0.00'}`);
    });

    return sections.join('\n');
  }

  private static escapeCSV(str: string): string {
    if (!str) return '';
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private static calculateTransactionSummary(data: any[]): object {
    const totalIncome = data.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const totalExpenses = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

    return {
      totalTransactions: data.length,
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses,
    };
  }

  private static calculateBudgetSummary(data: any[]): object {
    const totalBudgeted = data.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalSpent = data.reduce((sum, b) => sum + (b.spent || 0), 0);
    const overBudget = data.filter(b => (b.spent || 0) > (b.amount || 0)).length;

    return {
      totalBudgets: data.length,
      totalBudgeted,
      totalSpent,
      remaining: totalBudgeted - totalSpent,
      overBudgetCount: overBudget,
    };
  }

  private static calculateGoalsSummary(data: any[]): object {
    const totalGoals = data.length;
    const completedGoals = data.filter(g => g.status === 'completed').length;
    const totalTarget = data.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const totalSaved = data.reduce((sum, g) => sum + (g.currentAmount || 0), 0);

    return {
      totalGoals,
      completedGoals,
      activeGoals: totalGoals - completedGoals,
      totalTarget,
      totalSaved,
      overallProgress: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
    };
  }
}
