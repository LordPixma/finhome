import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { ExportService, ExportFormat } from '../services/export.service';
import type { Env } from '../types';

const router = new Hono<Env>();

// Apply auth middleware to all routes
router.use('/*', authMiddleware);

/**
 * Export transactions
 * GET /export/transactions?format=csv&startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/transactions', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const query = c.req.query();

    const format = (query.format as ExportFormat) || 'csv';
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    const accountId = query.accountId;
    const categoryId = query.categoryId;

    const result = await ExportService.exportTransactions(c, tenantId, {
      format,
      startDate,
      endDate,
      accountId,
      categoryId,
    });

    if (format === 'csv') {
      return new Response(result.data as string, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    } else if (format === 'json') {
      return new Response(result.data as string, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    } else {
      // PDF format returns JSON data for frontend PDF generation
      return c.json({ success: true, data: result.data });
    }
  } catch (error: any) {
    console.error('Error exporting transactions:', error);
    return c.json(
      {
        success: false,
        error: { code: 'EXPORT_ERROR', message: 'Failed to export transactions' },
      },
      500
    );
  }
});

/**
 * Export budgets
 * GET /export/budgets?format=csv&startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/budgets', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const query = c.req.query();

    const format = (query.format as ExportFormat) || 'csv';
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const result = await ExportService.exportBudgets(c, tenantId, {
      format,
      startDate,
      endDate,
    });

    if (format === 'csv') {
      return new Response(result.data as string, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    } else if (format === 'json') {
      return new Response(result.data as string, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    } else {
      return c.json({ success: true, data: result.data });
    }
  } catch (error: any) {
    console.error('Error exporting budgets:', error);
    return c.json(
      {
        success: false,
        error: { code: 'EXPORT_ERROR', message: 'Failed to export budgets' },
      },
      500
    );
  }
});

/**
 * Export goals
 * GET /export/goals?format=csv&includeContributions=true
 */
router.get('/goals', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const query = c.req.query();

    const format = (query.format as ExportFormat) || 'csv';
    const includeContributions = query.includeContributions === 'true';

    const result = await ExportService.exportGoals(c, tenantId, {
      format,
      includeContributions,
    });

    if (format === 'csv') {
      return new Response(result.data as string, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    } else if (format === 'json') {
      return new Response(result.data as string, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    } else {
      return c.json({ success: true, data: result.data });
    }
  } catch (error: any) {
    console.error('Error exporting goals:', error);
    return c.json(
      {
        success: false,
        error: { code: 'EXPORT_ERROR', message: 'Failed to export goals' },
      },
      500
    );
  }
});

/**
 * Export analytics
 * GET /export/analytics?format=csv&startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/analytics', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const query = c.req.query();

    const format = (query.format as ExportFormat) || 'csv';
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const result = await ExportService.exportAnalytics(c, tenantId, {
      format,
      startDate,
      endDate,
    });

    if (format === 'csv') {
      return new Response(result.data as string, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    } else if (format === 'json') {
      return new Response(result.data as string, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    } else {
      return c.json({ success: true, data: result.data });
    }
  } catch (error: any) {
    console.error('Error exporting analytics:', error);
    return c.json(
      {
        success: false,
        error: { code: 'EXPORT_ERROR', message: 'Failed to export analytics' },
      },
      500
    );
  }
});

/**
 * Full data export
 * GET /export/all?format=json&startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/all', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const query = c.req.query();

    const format = (query.format as ExportFormat) || 'json';
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const result = await ExportService.exportAll(c, tenantId, {
      format,
      startDate,
      endDate,
    });

    if (format === 'csv') {
      return new Response(result.data as string, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    } else if (format === 'json') {
      return new Response(result.data as string, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
    } else {
      return c.json({ success: true, data: result.data });
    }
  } catch (error: any) {
    console.error('Error exporting all data:', error);
    return c.json(
      {
        success: false,
        error: { code: 'EXPORT_ERROR', message: 'Failed to export data' },
      },
      500
    );
  }
});

export default router;
