import { Hono } from 'hono';
import { SystemMetricsService, AlertSeverity } from '../services/system-metrics';
import { z } from 'zod';
import { globalAdminMiddleware } from '../middleware/global-admin';
import type { AppContext } from '../types';

const systemMetrics = new Hono<{ Bindings: any; Variables: any }>();

// Global admin only middleware
systemMetrics.use('/*', globalAdminMiddleware);

// Validation schemas
const timeRangeSchema = z.object({
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid start date format'
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid end date format'
  })
});

const createAlertSchema = z.object({
  type: z.string().min(1, 'Alert type is required'),
  severity: z.nativeEnum(AlertSeverity),
  title: z.string().min(1, 'Alert title is required'),
  description: z.string().min(1, 'Alert description is required'),
  metadata: z.record(z.any()).optional()
});

/**
 * POST /api/admin/metrics/usage
 * Record API usage metrics (internal endpoint)
 */
systemMetrics.post('/usage', async (c) => {
  try {
    const body = await c.req.json();
    
    const result = await SystemMetricsService.recordAPIUsage(c as AppContext, {
      endpoint: body.endpoint,
      method: body.method,
      statusCode: body.statusCode,
      responseTime: body.responseTime,
      tenantId: body.tenantId,
      userId: body.userId,
      userAgent: body.userAgent,
      ipAddress: body.ipAddress
    });

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error recording API usage:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to record API usage'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/metrics/api-analytics
 * Get API usage analytics
 */
systemMetrics.post('/api-analytics', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = timeRangeSchema.parse(body);
    
    const analytics = await SystemMetricsService.getAPIAnalytics(c as AppContext, validatedData);

    return c.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, 400);
    }

    console.error('Error getting API analytics:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve API analytics'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/metrics/performance
 * Get system performance metrics
 */
systemMetrics.get('/performance', async (c) => {
  try {
    const metrics = await SystemMetricsService.getPerformanceMetrics(c as AppContext);

    return c.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve performance metrics'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/metrics/errors
 * Get error tracking metrics
 */
systemMetrics.post('/errors', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = timeRangeSchema.parse(body);
    
    const errorMetrics = await SystemMetricsService.getErrorMetrics(c as AppContext, validatedData);

    return c.json({
      success: true,
      data: errorMetrics
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, 400);
    }

    console.error('Error getting error metrics:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve error metrics'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/metrics/resources
 * Get resource utilization metrics
 */
systemMetrics.get('/resources', async (c) => {
  try {
    const metrics = await SystemMetricsService.getResourceMetrics(c as AppContext);

    return c.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting resource metrics:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve resource metrics'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/metrics/health
 * Perform system health check
 */
systemMetrics.get('/health', async (c) => {
  try {
    const healthCheck = await SystemMetricsService.performHealthCheck(c as AppContext);

    return c.json({
      success: true,
      data: healthCheck
    });
  } catch (error) {
    console.error('Error performing health check:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to perform health check'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/metrics/dashboard
 * Get comprehensive system dashboard data
 */
systemMetrics.get('/dashboard', async (c) => {
  try {
    const dashboard = await SystemMetricsService.getSystemDashboard(c as AppContext);

    return c.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Error getting system dashboard:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve system dashboard'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/metrics/alerts
 * Create a system alert
 */
systemMetrics.post('/alerts', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createAlertSchema.parse(body);
    
    const result = await SystemMetricsService.createAlert(c as AppContext, validatedData);

    return c.json({
      success: true,
      data: result
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, 400);
    }

    console.error('Error creating alert:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create alert'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/metrics/alerts
 * Get active alerts
 */
systemMetrics.get('/alerts', async (c) => {
  try {
    const alerts = await SystemMetricsService.getActiveAlerts(c as AppContext);

    return c.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error getting active alerts:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve active alerts'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/metrics/alerts/:id/acknowledge
 * Acknowledge an alert
 */
systemMetrics.post('/alerts/:id/acknowledge', async (c) => {
  try {
    const alertId = c.req.param('id');
    
    const result = await SystemMetricsService.acknowledgeAlert(c as AppContext, alertId);

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to acknowledge alert'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/metrics/alerts/:id/resolve
 * Resolve an alert
 */
systemMetrics.post('/alerts/:id/resolve', async (c) => {
  try {
    const alertId = c.req.param('id');
    
    const result = await SystemMetricsService.resolveAlert(c as AppContext, alertId);

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to resolve alert'
      }
    }, 500);
  }
});

export default systemMetrics;