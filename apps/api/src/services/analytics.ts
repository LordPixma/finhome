import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import { getDb, tenants, users, transactions, accounts, tenantAnalytics } from '../db';
import type { AppContext } from '../types';

/**
 * Analytics Service for Tenant Reporting
 * Provides comprehensive tenant metrics and analytics
 */
export class AnalyticsService {
  /**
   * Generate daily analytics for a specific tenant
   */
  static async generateTenantAnalytics(c: AppContext, tenantId: string, date: string) {
    const db = getDb(c.env.DB);
    
    // Get total user count for this tenant (approximation of active users)
    const activeUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .get();

    const activeUsers = activeUsersResult?.count || 0;

    // Get total transactions for the day
    const transactionStatsResult = await db
      .select({ 
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(abs(${transactions.amount}))`
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(and(
        eq(accounts.tenantId, tenantId),
        sql`date(${transactions.date}) = ${date}`
      ))
      .get();

    const totalTransactions = transactionStatsResult?.count || 0;
    const totalAmount = transactionStatsResult?.totalAmount || 0.0;

    // For now, set API requests and storage to 0 - we can enhance this later
    const apiRequests = 0;
    const storageUsed = 0;

    return {
      tenantId,
      date,
      activeUsers,
      totalTransactions,
      totalAmount,
      apiRequests,
      storageUsed,
      createdAt: new Date()
    };
  }

  /**
   * Store analytics data in the database
   */
  static async storeTenantAnalytics(c: AppContext, analyticsData: any) {
    const db = getDb(c.env.DB);
    
    // Check if analytics for this tenant/date already exists
    const existing = await db
      .select()
      .from(tenantAnalytics)
      .where(and(
        eq(tenantAnalytics.tenantId, analyticsData.tenantId),
        eq(tenantAnalytics.date, analyticsData.date)
      ))
      .get();

    if (existing) {
      // Update existing record
      return await db
        .update(tenantAnalytics)
        .set({
          activeUsers: analyticsData.activeUsers,
          totalTransactions: analyticsData.totalTransactions,
          totalAmount: analyticsData.totalAmount,
          apiRequests: analyticsData.apiRequests,
          storageUsed: analyticsData.storageUsed
        })
        .where(and(
          eq(tenantAnalytics.tenantId, analyticsData.tenantId),
          eq(tenantAnalytics.date, analyticsData.date)
        ));
    } else {
      // Insert new record
      return await db.insert(tenantAnalytics).values({
        id: crypto.randomUUID(),
        ...analyticsData
      });
    }
  }

  /**
   * Get tenant analytics for a date range
   */
  static async getTenantAnalytics(c: AppContext, tenantId: string, startDate: string, endDate: string) {
    const db = getDb(c.env.DB);
    
    return await db
      .select()
      .from(tenantAnalytics)
      .where(and(
        eq(tenantAnalytics.tenantId, tenantId),
        gte(tenantAnalytics.date, startDate),
        lte(tenantAnalytics.date, endDate)
      ))
      .orderBy(desc(tenantAnalytics.date));
  }

  /**
   * Get aggregated analytics across all tenants
   */
  static async getGlobalAnalytics(c: AppContext, startDate: string, endDate: string) {
    const db = getDb(c.env.DB);
    
    return await db
      .select({
        date: tenantAnalytics.date,
        totalActiveUsers: sql<number>`sum(${tenantAnalytics.activeUsers})`,
        totalTransactions: sql<number>`sum(${tenantAnalytics.totalTransactions})`,
        totalAmount: sql<number>`sum(${tenantAnalytics.totalAmount})`,
        totalApiRequests: sql<number>`sum(${tenantAnalytics.apiRequests})`,
        totalStorageUsed: sql<number>`sum(${tenantAnalytics.storageUsed})`
      })
      .from(tenantAnalytics)
      .where(and(
        gte(tenantAnalytics.date, startDate),
        lte(tenantAnalytics.date, endDate)
      ))
      .groupBy(tenantAnalytics.date)
      .orderBy(desc(tenantAnalytics.date));
  }

  /**
   * Get top tenants by various metrics
   */
  static async getTopTenants(c: AppContext, startDate: string, endDate: string, metric: 'transactions' | 'amount' | 'users' = 'transactions', limit: number = 10) {
    const db = getDb(c.env.DB);
    
    let orderByColumn;
    let selectColumn;
    
    switch (metric) {
      case 'amount':
        orderByColumn = sql<number>`sum(${tenantAnalytics.totalAmount})`;
        selectColumn = { metricValue: sql<number>`sum(${tenantAnalytics.totalAmount})` };
        break;
      case 'users':
        orderByColumn = sql<number>`sum(${tenantAnalytics.activeUsers})`;
        selectColumn = { metricValue: sql<number>`sum(${tenantAnalytics.activeUsers})` };
        break;
      default:
        orderByColumn = sql<number>`sum(${tenantAnalytics.totalTransactions})`;
        selectColumn = { metricValue: sql<number>`sum(${tenantAnalytics.totalTransactions})` };
    }

    return await db
      .select({
        tenantId: tenantAnalytics.tenantId,
        tenantName: tenants.name,
        ...selectColumn
      })
      .from(tenantAnalytics)
      .innerJoin(tenants, eq(tenants.id, tenantAnalytics.tenantId))
      .where(and(
        gte(tenantAnalytics.date, startDate),
        lte(tenantAnalytics.date, endDate)
      ))
      .groupBy(tenantAnalytics.tenantId, tenants.name)
      .orderBy(desc(orderByColumn))
      .limit(limit);
  }

  /**
   * Get tenant summary statistics
   */
  static async getTenantSummary(c: AppContext, tenantId: string) {
    const db = getDb(c.env.DB);
    
    // Get basic tenant info
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .get();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get user count
    const userCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .get();

    // Get account count
    const accountCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId))
      .get();

    // Get transaction count and total amount (all time)
    const transactionStatsResult = await db
      .select({ 
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(abs(${transactions.amount}))`
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(eq(accounts.tenantId, tenantId))
      .get();

    // Get recent analytics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAnalytics = await this.getTenantAnalytics(
      c, 
      tenantId, 
      thirtyDaysAgo.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );

    return {
      tenant,
      userCount: userCountResult?.count || 0,
      accountCount: accountCountResult?.count || 0,
      totalTransactions: transactionStatsResult?.count || 0,
      totalAmount: transactionStatsResult?.totalAmount || 0,
      recentAnalytics
    };
  }

  /**
   * Generate and store analytics for all tenants for a specific date
   */
  static async generateAllTenantAnalytics(c: AppContext, date: string) {
    const db = getDb(c.env.DB);
    
    // Get all tenants
    const allTenants = await db.select().from(tenants);
    
    const results: Array<{ tenantId: string; status: string; error?: string }> = [];
    
    for (const tenant of allTenants) {
      try {
        const analyticsData = await this.generateTenantAnalytics(c, tenant.id, date);
        await this.storeTenantAnalytics(c, analyticsData);
        results.push({ tenantId: tenant.id, status: 'success' });
      } catch (error) {
        console.error(`Failed to generate analytics for tenant ${tenant.id}:`, error);
        results.push({ tenantId: tenant.id, status: 'error', error: error.message });
      }
    }
    
    return results;
  }
}