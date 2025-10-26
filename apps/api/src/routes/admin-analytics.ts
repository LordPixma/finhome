import { Hono } from 'hono';
import { z } from 'zod';

import { AnalyticsService } from '../services/analytics';
import { validateRequest } from '../middleware/validation';
import { globalAdminMiddleware } from '../middleware/global-admin';
import { getDb, tenants } from '../db';
import type { AppContext } from '../types';

const adminAnalyticsRouter = new Hono<{ Bindings: any; Variables: any }>();

// Schema definitions
const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
});

const generateAnalyticsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
});

const topTenantsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  metric: z.enum(['transactions', 'amount', 'users']).optional().default('transactions'),
  limit: z.number().int().min(1).max(50).optional().default(10)
});

/**
 * GET /api/admin/analytics/tenants
 * Get list of all tenants with basic info
 */
adminAnalyticsRouter.get('/tenants', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const db = getDb(c.env.DB);
    
    const allTenants = await db.select({
      id: tenants.id,
      name: tenants.name,
      subdomain: tenants.subdomain,
      createdAt: tenants.createdAt
    }).from(tenants);

    return c.json({
      success: true,
      data: allTenants
    });

  } catch (error) {
    console.error('Error fetching tenants:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tenants' } 
    }, 500);
  }
});

/**
 * GET /api/admin/analytics/tenant/:tenantId/summary
 * Get comprehensive summary for a specific tenant
 */
adminAnalyticsRouter.get('/tenant/:tenantId/summary', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const tenantId = c.req.param('tenantId');
    
    const summary = await AnalyticsService.getTenantSummary(c, tenantId);

    return c.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching tenant summary:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tenant summary' } 
    }, 500);
  }
});

/**
 * POST /api/admin/analytics/tenant/:tenantId/analytics
 * Get tenant analytics for a date range
 */
adminAnalyticsRouter.post('/tenant/:tenantId/analytics', 
  globalAdminMiddleware, 
  validateRequest(dateRangeSchema), 
  async (c: AppContext) => {
    try {
      const tenantId = c.req.param('tenantId');
      const { startDate, endDate } = c.get('validatedData');
      
      const analytics = await AnalyticsService.getTenantAnalytics(c, tenantId, startDate, endDate);

      return c.json({
        success: true,
        data: {
          tenantId,
          startDate,
          endDate,
          analytics
        }
      });

    } catch (error) {
      console.error('Error fetching tenant analytics:', error);
      return c.json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tenant analytics' } 
      }, 500);
    }
  }
);

/**
 * POST /api/admin/analytics/global
 * Get global analytics across all tenants
 */
adminAnalyticsRouter.post('/global', 
  globalAdminMiddleware, 
  validateRequest(dateRangeSchema), 
  async (c: AppContext) => {
    try {
      const { startDate, endDate } = c.get('validatedData');
      
      const analytics = await AnalyticsService.getGlobalAnalytics(c, startDate, endDate);

      return c.json({
        success: true,
        data: {
          startDate,
          endDate,
          analytics
        }
      });

    } catch (error) {
      console.error('Error fetching global analytics:', error);
      return c.json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch global analytics' } 
      }, 500);
    }
  }
);

/**
 * POST /api/admin/analytics/top-tenants
 * Get top performing tenants by various metrics
 */
adminAnalyticsRouter.post('/top-tenants', 
  globalAdminMiddleware, 
  validateRequest(topTenantsSchema), 
  async (c: AppContext) => {
    try {
      const { startDate, endDate, metric, limit } = c.get('validatedData');
      
      const topTenants = await AnalyticsService.getTopTenants(c, startDate, endDate, metric, limit);

      return c.json({
        success: true,
        data: {
          startDate,
          endDate,
          metric,
          limit,
          tenants: topTenants
        }
      });

    } catch (error) {
      console.error('Error fetching top tenants:', error);
      return c.json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch top tenants' } 
      }, 500);
    }
  }
);

/**
 * POST /api/admin/analytics/generate
 * Generate analytics for all tenants for a specific date
 */
adminAnalyticsRouter.post('/generate', 
  globalAdminMiddleware, 
  validateRequest(generateAnalyticsSchema), 
  async (c: AppContext) => {
    try {
      const { date } = c.get('validatedData');
      
      const results = await AnalyticsService.generateAllTenantAnalytics(c, date);
      
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      return c.json({
        success: true,
        data: {
          date,
          processed: results.length,
          successful: successCount,
          failed: errorCount,
          results
        }
      });

    } catch (error) {
      console.error('Error generating analytics:', error);
      return c.json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate analytics' } 
      }, 500);
    }
  }
);

/**
 * POST /api/admin/analytics/export
 * Export analytics data in CSV format
 */
adminAnalyticsRouter.post('/export', 
  globalAdminMiddleware, 
  validateRequest(dateRangeSchema), 
  async (c: AppContext) => {
    try {
      const { startDate, endDate } = c.get('validatedData');
      
      // Get all tenant analytics for the date range
      const analytics = await AnalyticsService.getGlobalAnalytics(c, startDate, endDate);
      
      // Convert to CSV format
      const headers = ['Date', 'Total Active Users', 'Total Transactions', 'Total Amount', 'Total API Requests', 'Total Storage Used'];
      const csvRows = [headers.join(',')];
      
      for (const row of analytics) {
        csvRows.push([
          row.date,
          row.totalActiveUsers,
          row.totalTransactions,
          row.totalAmount.toFixed(2),
          row.totalApiRequests,
          row.totalStorageUsed
        ].join(','));
      }
      
      const csvContent = csvRows.join('\n');
      
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${startDate}-to-${endDate}.csv"`
        }
      });

    } catch (error) {
      console.error('Error exporting analytics:', error);
      return c.json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to export analytics' } 
      }, 500);
    }
  }
);

/**
 * GET /api/admin/analytics/dashboard
 * Get dashboard summary with key metrics
 */
adminAnalyticsRouter.get('/dashboard', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    // Get multiple metrics for the dashboard
    const [globalAnalytics, topTenantsByTransactions, topTenantsByAmount] = await Promise.all([
      AnalyticsService.getGlobalAnalytics(c, thirtyDaysAgoStr, today),
      AnalyticsService.getTopTenants(c, thirtyDaysAgoStr, today, 'transactions', 5),
      AnalyticsService.getTopTenants(c, thirtyDaysAgoStr, today, 'amount', 5)
    ]);

    // Calculate totals
    const totals = globalAnalytics.reduce((acc, curr) => ({
      totalActiveUsers: acc.totalActiveUsers + curr.totalActiveUsers,
      totalTransactions: acc.totalTransactions + curr.totalTransactions,
      totalAmount: acc.totalAmount + curr.totalAmount,
      totalApiRequests: acc.totalApiRequests + curr.totalApiRequests,
      totalStorageUsed: acc.totalStorageUsed + curr.totalStorageUsed
    }), {
      totalActiveUsers: 0,
      totalTransactions: 0,
      totalAmount: 0,
      totalApiRequests: 0,
      totalStorageUsed: 0
    });

    return c.json({
      success: true,
      data: {
        period: { startDate: thirtyDaysAgoStr, endDate: today },
        totals,
        dailyAnalytics: globalAnalytics.slice(0, 7), // Last 7 days
        topTenantsByTransactions,
        topTenantsByAmount
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard data' } 
    }, 500);
  }
});

export { adminAnalyticsRouter };