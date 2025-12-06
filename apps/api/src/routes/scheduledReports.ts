import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getDb } from '../db';
import { ScheduledReportsService, CreateScheduledReportInput, UpdateScheduledReportInput } from '../services/scheduledReports.service';
import type { Env } from '../types';

const scheduledReportsRouter = new Hono<Env>();

// Apply auth middleware to all routes
scheduledReportsRouter.use('*', authMiddleware);

// Get all scheduled reports for the user
scheduledReportsRouter.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const tenantId = c.get('tenantId')!;
  const userId = c.get('userId')!;

  try {
    const service = new ScheduledReportsService(db);
    const reports = await service.getUserScheduledReports(tenantId, userId);

    return c.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    return c.json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch scheduled reports' },
    }, 500);
  }
});

// Get a specific scheduled report
scheduledReportsRouter.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const tenantId = c.get('tenantId')!;
  const reportId = c.req.param('id');

  try {
    const service = new ScheduledReportsService(db);
    const report = await service.getScheduledReport(tenantId, reportId);

    if (!report) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scheduled report not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error fetching scheduled report:', error);
    return c.json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch scheduled report' },
    }, 500);
  }
});

// Get run history for a scheduled report
scheduledReportsRouter.get('/:id/history', async (c) => {
  const db = getDb(c.env.DB);
  const tenantId = c.get('tenantId')!;
  const reportId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '10', 10);

  try {
    const service = new ScheduledReportsService(db);
    const history = await service.getRunHistory(tenantId, reportId, limit);

    return c.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching run history:', error);
    return c.json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch run history' },
    }, 500);
  }
});

// Create a new scheduled report
scheduledReportsRouter.post('/', async (c) => {
  const db = getDb(c.env.DB);
  const tenantId = c.get('tenantId')!;
  const userId = c.get('userId')!;

  try {
    const body = await c.req.json<CreateScheduledReportInput>();

    // Validate required fields
    if (!body.name || !body.reportType || !body.frequency || !body.deliveryEmail) {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
      }, 400);
    }

    // Validate frequency-specific fields
    if (body.frequency === 'weekly' && body.dayOfWeek === undefined) {
      body.dayOfWeek = 1; // Default to Monday
    }
    if (body.frequency === 'monthly' && body.dayOfMonth === undefined) {
      body.dayOfMonth = 1; // Default to 1st of month
    }

    const service = new ScheduledReportsService(db);
    const report = await service.createScheduledReport(tenantId, userId, body);

    return c.json({
      success: true,
      data: report,
    }, 201);
  } catch (error) {
    console.error('Error creating scheduled report:', error);
    return c.json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Failed to create scheduled report' },
    }, 500);
  }
});

// Update a scheduled report
scheduledReportsRouter.put('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const tenantId = c.get('tenantId')!;
  const reportId = c.req.param('id');

  try {
    const body = await c.req.json<UpdateScheduledReportInput>();

    const service = new ScheduledReportsService(db);
    const report = await service.updateScheduledReport(tenantId, reportId, body);

    if (!report) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scheduled report not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    return c.json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Failed to update scheduled report' },
    }, 500);
  }
});

// Toggle enabled status
scheduledReportsRouter.patch('/:id/toggle', async (c) => {
  const db = getDb(c.env.DB);
  const tenantId = c.get('tenantId')!;
  const reportId = c.req.param('id');

  try {
    const body = await c.req.json<{ isEnabled: boolean }>();

    const service = new ScheduledReportsService(db);
    const report = await service.toggleEnabled(tenantId, reportId, body.isEnabled);

    if (!report) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scheduled report not found' },
      }, 404);
    }

    return c.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error toggling scheduled report:', error);
    return c.json({
      success: false,
      error: { code: 'TOGGLE_ERROR', message: 'Failed to toggle scheduled report' },
    }, 500);
  }
});

// Delete a scheduled report
scheduledReportsRouter.delete('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const tenantId = c.get('tenantId')!;
  const reportId = c.req.param('id');

  try {
    const service = new ScheduledReportsService(db);
    await service.deleteScheduledReport(tenantId, reportId);

    return c.json({
      success: true,
      message: 'Scheduled report deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    return c.json({
      success: false,
      error: { code: 'DELETE_ERROR', message: 'Failed to delete scheduled report' },
    }, 500);
  }
});

export default scheduledReportsRouter;
