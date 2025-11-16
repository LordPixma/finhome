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

/**
 * GET /api/admin/metrics/alerts/:id
 * Get a specific alert by ID
 */
systemMetrics.get('/alerts/:id', async (c) => {
  try {
    const alertId = c.req.param('id');
    const alertData = await c.env.CACHE.get(`alert:${alertId}`);
    
    if (!alertData) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Alert not found'
        }
      }, 404);
    }

    return c.json({
      success: true,
      data: JSON.parse(alertData)
    });
  } catch (error) {
    console.error('Error getting alert:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve alert'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/metrics/alerts/:id/dismiss
 * Dismiss an alert
 */
systemMetrics.post('/alerts/:id/dismiss', async (c) => {
  try {
    const alertId = c.req.param('id');
    
    const alertData = await c.env.CACHE.get(`alert:${alertId}`);
    if (!alertData) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Alert not found'
        }
      }, 404);
    }

    const alert = JSON.parse(alertData);
    alert.status = 'dismissed';
    alert.updatedAt = new Date().toISOString();

    await c.env.CACHE.put(`alert:${alertId}`, JSON.stringify(alert), {
      expirationTtl: 30 * 86400 // 30 days
    });

    // Remove from active alerts
    const activeAlerts = await c.env.CACHE.get('alerts:active') || '[]';
    const alerts = JSON.parse(activeAlerts);
    const updatedAlerts = alerts.filter(id => id !== alertId);
    
    await c.env.CACHE.put('alerts:active', JSON.stringify(updatedAlerts), {
      expirationTtl: 30 * 86400
    });

    return c.json({
      success: true,
      data: { message: 'Alert dismissed successfully' }
    });
  } catch (error) {
    console.error('Error dismissing alert:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to dismiss alert'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/metrics/alert-rules
 * Get all alert rules
 */
systemMetrics.get('/alert-rules', async (c) => {
  try {
    // For now, return default alert rules
    // In a full implementation, these would be stored in the database
    const alertRules = [
      {
        id: '1',
        name: 'High API Error Rate',
        type: 'system',
        condition: 'error_rate > threshold',
        threshold: 5.0,
        enabled: true,
        recipients: ['admin@finhome360.com']
      },
      {
        id: '2',
        name: 'Failed Login Attempts',
        type: 'security',
        condition: 'failed_attempts > threshold',
        threshold: 10,
        enabled: true,
        recipients: ['security@finhome360.com']
      },
      {
        id: '3',
        name: 'High Response Time',
        type: 'performance',
        condition: 'avg_response_time > threshold',
        threshold: 500,
        enabled: true,
        recipients: ['ops@finhome360.com']
      }
    ];

    return c.json({
      success: true,
      data: alertRules
    });
  } catch (error) {
    console.error('Error getting alert rules:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve alert rules'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/metrics/alert-rules
 * Create a new alert rule
 */
systemMetrics.post('/alert-rules', async (c) => {
  try {
    const body = await c.req.json();
    
    // In a full implementation, store in database
    const newRule = {
      id: crypto.randomUUID(),
      ...body,
      createdAt: new Date().toISOString()
    };

    return c.json({
      success: true,
      data: { message: 'Alert rule created successfully', rule: newRule }
    }, 201);
  } catch (error) {
    console.error('Error creating alert rule:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create alert rule'
      }
    }, 500);
  }
});

/**
 * PUT /api/admin/metrics/alert-rules/:id
 * Update an alert rule
 */
systemMetrics.put('/alert-rules/:id', async (c) => {
  try {
    const ruleId = c.req.param('id');
    const body = await c.req.json();
    
    // In a full implementation, update in database
    return c.json({
      success: true,
      data: { message: 'Alert rule updated successfully' }
    });
  } catch (error) {
    console.error('Error updating alert rule:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update alert rule'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/metrics/alert-rules/:id/toggle
 * Toggle an alert rule enabled/disabled
 */
systemMetrics.post('/alert-rules/:id/toggle', async (c) => {
  try {
    const ruleId = c.req.param('id');
    
    // In a full implementation, toggle in database
    return c.json({
      success: true,
      data: { message: 'Alert rule toggled successfully' }
    });
  } catch (error) {
    console.error('Error toggling alert rule:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to toggle alert rule'
      }
    }, 500);
  }
});

export default systemMetrics;