import { Hono } from 'hono';
import { SecurityService, IncidentSeverity, IncidentStatus, IncidentType } from '../services/security';
import { z } from 'zod';
import { globalAdminMiddleware } from '../middleware/global-admin';
import type { AppContext } from '../types';

const security = new Hono<{ Bindings: any; Variables: any }>();

// Global admin only middleware
security.use('/*', globalAdminMiddleware);

// Validation schemas
const createIncidentSchema = z.object({
  type: z.nativeEnum(IncidentType),
  severity: z.nativeEnum(IncidentSeverity),
  description: z.string().min(1).max(1000),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const updateIncidentSchema = z.object({
  status: z.nativeEnum(IncidentStatus),
  notes: z.string().optional()
});

const complianceReportSchema = z.object({
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid start date format'
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid end date format'
  })
});

/**
 * GET /api/admin/security/incidents
 * Get all security incidents with optional filters
 */
security.get('/incidents', async (c) => {
  try {
    // For now, get all incidents - we'll implement filtering later
    const incidents = await SecurityService.getAllIncidents(c as AppContext);

    return c.json({
      success: true,
      data: incidents
    });
  } catch (error) {
    console.error('Error getting security incidents:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve security incidents'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/security/incidents
 * Create a new security incident
 */
security.post('/incidents', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createIncidentSchema.parse(body);
    
    const incident = await SecurityService.logIncident(c as AppContext, {
      type: validatedData.type,
      severity: validatedData.severity,
      description: validatedData.description,
      tenantId: validatedData.tenantId,
      userId: validatedData.userId,
      metadata: validatedData.metadata
    });

    return c.json({
      success: true,
      data: incident
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

    console.error('Error creating security incident:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create security incident'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/security/incidents/:id
 * Get a specific security incident with details
 */
security.get('/incidents/:id', async (c) => {
  try {
    const incidentId = c.req.param('id');
    const incident = await SecurityService.getIncidentDetails(c as AppContext, incidentId);

    if (!incident) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Security incident not found'
        }
      }, 404);
    }

    return c.json({
      success: true,
      data: incident
    });
  } catch (error) {
    console.error('Error getting security incident details:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve security incident details'
      }
    }, 500);
  }
});

/**
 * PATCH /api/admin/security/incidents/:id
 * Update incident status
 */
security.patch('/incidents/:id', async (c) => {
  try {
    const incidentId = c.req.param('id');
    const body = await c.req.json();
    const validatedData = updateIncidentSchema.parse(body);
    
    const updated = await SecurityService.updateIncidentStatus(
      c as AppContext,
      incidentId,
      validatedData.status,
      validatedData.notes
    );

    return c.json({
      success: true,
      data: updated
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

    console.error('Error updating security incident:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update security incident'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/security/incidents/:id/escalate
 * Escalate an incident
 */
security.post('/incidents/:id/escalate', async (c) => {
  try {
    const incidentId = c.req.param('id');
    
    const escalated = await SecurityService.escalateIncident(c as AppContext, incidentId, IncidentSeverity.CRITICAL);

    return c.json({
      success: true,
      data: escalated
    });
  } catch (error) {
    console.error('Error escalating security incident:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to escalate security incident'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/security/incidents/search/:term
 * Search incidents by description
 */
security.get('/incidents/search/:term', async (c) => {
  try {
    const searchTerm = c.req.param('term');
    
    const incidents = await SecurityService.searchIncidents(c as AppContext, searchTerm);

    return c.json({
      success: true,
      data: incidents
    });
  } catch (error) {
    console.error('Error searching security incidents:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search security incidents'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/security/metrics
 * Get security metrics dashboard data
 */
security.get('/metrics', async (c) => {
  try {
    const metrics = await SecurityService.getSecurityMetrics(c as AppContext);

    return c.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting security metrics:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve security metrics'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/security/audit-log
 * Get audit log entries
 */
security.get('/audit-log', async (c) => {
  try {
    const { limit = '50' } = c.req.query();
    
    const auditLog = await SecurityService.getAuditLog(c as AppContext, parseInt(limit));

    return c.json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    console.error('Error getting audit log:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve audit log'
      }
    }, 500);
  }
});

/**
 * POST /api/admin/security/compliance/report
 * Generate compliance report
 */
security.post('/compliance/report', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = complianceReportSchema.parse(body);
    
    const report = await SecurityService.generateComplianceReport(
      c as AppContext,
      validatedData.startDate,
      validatedData.endDate
    );

    return c.json({
      success: true,
      data: report
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

    console.error('Error generating compliance report:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate compliance report'
      }
    }, 500);
  }
});

/**
 * GET /api/admin/security/suspicious-activity
 * Detect and return suspicious activity patterns
 */
security.get('/suspicious-activity', async (c) => {
  try {
    const suspiciousActivity = await SecurityService.detectSuspiciousActivity(c as AppContext);

    return c.json({
      success: true,
      data: suspiciousActivity
    });
  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to detect suspicious activity'
      }
    }, 500);
  }
});

export default security;