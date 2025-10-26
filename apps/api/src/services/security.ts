import { eq, desc, and, gte, lte, like } from 'drizzle-orm';
import { getDb, securityIncidents, globalAdminActions, users, tenants } from '../db';
import { randomUUID } from 'node:crypto';
import type { AppContext } from '../types';

/**
 * Security Incident Types
 */
export enum IncidentType {
  FAILED_LOGIN = 'failed_login',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH = 'data_breach',
  MALWARE_DETECTED = 'malware_detected',
  POLICY_VIOLATION = 'policy_violation',
  SYSTEM_INTRUSION = 'system_intrusion',
  ACCOUNT_COMPROMISE = 'account_compromise',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  API_ABUSE = 'api_abuse'
}

/**
 * Incident Severity Levels
 */
export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Incident Status
 */
export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  FALSE_POSITIVE = 'false_positive'
}

/**
 * Security & Incident Management Service
 * Provides comprehensive security monitoring and incident tracking
 */
export class SecurityService {
  /**
   * Log a security incident
   */
  static async logIncident(c: AppContext, incident: {
    type: IncidentType;
    severity: IncidentSeverity;
    description: string;
    tenantId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }) {
    const db = getDb(c.env.DB);
    
    const incidentId = randomUUID();
    
    await db.insert(securityIncidents).values({
      id: incidentId,
      type: incident.type,
      severity: incident.severity,
      status: IncidentStatus.OPEN,
      description: incident.description,
      tenantId: incident.tenantId || null,
      userId: incident.userId || null,
      metadata: incident.metadata ? JSON.stringify(incident.metadata) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Auto-escalate critical incidents
    if (incident.severity === IncidentSeverity.CRITICAL) {
      await this.escalateIncident(c, incidentId, 'Auto-escalated due to critical severity');
    }

    return { incidentId, message: 'Security incident logged successfully' };
  }

  /**
   * Get all security incidents
   */
  static async getAllIncidents(c: AppContext) {
    const db = getDb(c.env.DB);
    
    return await db
      .select()
      .from(securityIncidents)
      .orderBy(desc(securityIncidents.createdAt));
  }

  /**
   * Get incidents by severity
   */
  static async getIncidentsBySeverity(c: AppContext, severity: IncidentSeverity) {
    const db = getDb(c.env.DB);
    
    return await db
      .select()
      .from(securityIncidents)
      .where(eq(securityIncidents.severity, severity))
      .orderBy(desc(securityIncidents.createdAt));
  }

  /**
   * Get incidents by status
   */
  static async getIncidentsByStatus(c: AppContext, status: IncidentStatus) {
    const db = getDb(c.env.DB);
    
    return await db
      .select()
      .from(securityIncidents)
      .where(eq(securityIncidents.status, status))
      .orderBy(desc(securityIncidents.createdAt));
  }

  /**
   * Get detailed incident information
   */
  static async getIncidentDetails(c: AppContext, incidentId: string) {
    const db = getDb(c.env.DB);

    const incident = await db
      .select()
      .from(securityIncidents)
      .where(eq(securityIncidents.id, incidentId))
      .get();

    if (!incident) {
      throw new Error('Incident not found');
    }

    // Get related tenant info if applicable
    let tenantInfo: any = null;
    if (incident.tenantId) {
      tenantInfo = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, incident.tenantId))
        .get();
    }

    // Get related user info if applicable
    let userInfo: any = null;
    if (incident.userId) {
      userInfo = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, incident.userId))
        .get();
    }

    return {
      ...incident,
      metadata: incident.metadata ? JSON.parse(incident.metadata) : null,
      tenant: tenantInfo,
      user: userInfo
    };
  }

  /**
   * Update incident status
   */
  static async updateIncidentStatus(c: AppContext, incidentId: string, status: IncidentStatus, _notes?: string) {
    const db = getDb(c.env.DB);

    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (status === IncidentStatus.RESOLVED || status === IncidentStatus.CLOSED) {
      updateData.resolvedAt = new Date();
    }

    await db
      .update(securityIncidents)
      .set(updateData)
      .where(eq(securityIncidents.id, incidentId));

    return { message: 'Incident status updated successfully' };
  }

  /**
   * Escalate an incident
   */
  static async escalateIncident(c: AppContext, incidentId: string, reason: string) {
    const db = getDb(c.env.DB);

    // Update incident to investigating status
    await db
      .update(securityIncidents)
      .set({
        status: IncidentStatus.INVESTIGATING,
        updatedAt: new Date()
      })
      .where(eq(securityIncidents.id, incidentId));

    // In a real implementation, this would trigger notifications to security team
    console.log(`SECURITY ALERT: Incident ${incidentId} escalated - ${reason}`);

    return { message: 'Incident escalated successfully' };
  }

  /**
   * Get security metrics and statistics
   */
  static async getSecurityMetrics(c: AppContext, days: number = 30) {
    const db = getDb(c.env.DB);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all incidents in the date range
    const allIncidents = await db
      .select()
      .from(securityIncidents)
      .where(gte(securityIncidents.createdAt, startDate));

    // Calculate statistics
    const total = allIncidents.length;
    const bySeverity = this.groupBy(allIncidents, 'severity');
    const byStatus = this.groupBy(allIncidents, 'status');
    const byType = this.groupBy(allIncidents, 'type');

    // Calculate resolution rate
    const resolved = allIncidents.filter(i => ['resolved', 'closed'].includes(i.status)).length;
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 100;

    // Calculate average resolution time for resolved incidents
    const resolvedIncidents = allIncidents.filter(i => i.resolvedAt);
    let avgResolutionTime = 0;
    if (resolvedIncidents.length > 0) {
      const totalTime = resolvedIncidents.reduce((sum, incident) => {
        const hours = (new Date(incident.resolvedAt!).getTime() - new Date(incident.createdAt).getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgResolutionTime = totalTime / resolvedIncidents.length;
    }

    return {
      period: { days, startDate: startDate.toISOString().split('T')[0] },
      summary: {
        total,
        open: byStatus.open || 0,
        investigating: byStatus.investigating || 0,
        resolved: byStatus.resolved || 0,
        closed: byStatus.closed || 0,
        resolutionRate: Math.round(resolutionRate * 100) / 100,
        avgResolutionTimeHours: Math.round(avgResolutionTime * 100) / 100
      },
      bySeverity,
      byType,
      recent: allIncidents.slice(0, 10) // Most recent 10 incidents
    };
  }

  /**
   * Get audit log (from global admin actions)
   */
  static async getAuditLog(c: AppContext, limit: number = 50) {
    const db = getDb(c.env.DB);

    return await db
      .select()
      .from(globalAdminActions)
      .orderBy(desc(globalAdminActions.createdAt))
      .limit(limit);
  }

  /**
   * Search incidents by description
   */
  static async searchIncidents(c: AppContext, searchTerm: string) {
    const db = getDb(c.env.DB);
    
    return await db
      .select()
      .from(securityIncidents)
      .where(like(securityIncidents.description, `%${searchTerm}%`))
      .orderBy(desc(securityIncidents.createdAt));
  }

  /**
   * Get incidents for a specific tenant
   */
  static async getTenantIncidents(c: AppContext, tenantId: string) {
    const db = getDb(c.env.DB);
    
    return await db
      .select()
      .from(securityIncidents)
      .where(eq(securityIncidents.tenantId, tenantId))
      .orderBy(desc(securityIncidents.createdAt));
  }

  /**
   * Generate security compliance report
   */
  static async generateComplianceReport(c: AppContext, startDate: string, endDate: string) {
    const db = getDb(c.env.DB);

    // Get incidents in date range
    const incidents = await db
      .select()
      .from(securityIncidents)
      .where(and(
        gte(securityIncidents.createdAt, new Date(startDate)),
        lte(securityIncidents.createdAt, new Date(endDate))
      ));

    // Get admin actions in date range
    const adminActions = await db
      .select()
      .from(globalAdminActions)
      .where(and(
        gte(globalAdminActions.createdAt, new Date(startDate)),
        lte(globalAdminActions.createdAt, new Date(endDate))
      ));

    // Calculate metrics
    const totalIncidents = incidents.length;
    const criticalIncidents = incidents.filter(i => i.severity === IncidentSeverity.CRITICAL).length;
    const resolvedIncidents = incidents.filter(i => ['resolved', 'closed'].includes(i.status)).length;
    const resolutionRate = totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 100;

    const report = {
      reportPeriod: { startDate, endDate },
      summary: {
        totalIncidents,
        criticalIncidents,
        resolvedIncidents,
        resolutionRate: Math.round(resolutionRate * 100) / 100,
        totalAdminActions: adminActions.length
      },
      incidentsByType: this.groupBy(incidents, 'type'),
      incidentsBySeverity: this.groupBy(incidents, 'severity'),
      incidentsByStatus: this.groupBy(incidents, 'status'),
      complianceScore: this.calculateComplianceScore(incidents, resolutionRate)
    };

    return report;
  }

  /**
   * Detect suspicious patterns in recent activity
   */
  static async detectSuspiciousActivity(c: AppContext) {
    const db = getDb(c.env.DB);
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const suspiciousPatterns: any[] = [];

    // Get recent incidents
    const recentIncidents = await db
      .select()
      .from(securityIncidents)
      .where(gte(securityIncidents.createdAt, oneHourAgo));

    // Pattern 1: Multiple failed login attempts
    const failedLogins = recentIncidents.filter(i => i.type === IncidentType.FAILED_LOGIN);
    if (failedLogins.length >= 5) {
      suspiciousPatterns.push({
        type: 'brute_force_attempt',
        description: `${failedLogins.length} failed login attempts in the last hour`,
        severity: IncidentSeverity.HIGH,
        count: failedLogins.length
      });
    }

    // Pattern 2: High volume of incidents from single tenant
    const tenantIncidents = this.groupBy(recentIncidents.filter(i => i.tenantId), 'tenantId');
    for (const [tenantId, count] of Object.entries(tenantIncidents)) {
      if (count >= 5) {
        suspiciousPatterns.push({
          type: 'tenant_anomaly',
          description: `${count} security incidents from tenant ${tenantId} in the last hour`,
          severity: IncidentSeverity.MEDIUM,
          tenantId,
          count
        });
      }
    }

    return suspiciousPatterns;
  }

  /**
   * Helper method to group items by a field
   */
  private static groupBy(items: any[], field: string): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const item of items) {
      const key = item[field] || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
    }
    return groups;
  }

  /**
   * Calculate a compliance score based on various factors
   */
  private static calculateComplianceScore(incidents: any[], resolutionRate: number): number {
    let score = 100;

    // Deduct points for unresolved critical incidents
    const criticalUnresolved = incidents.filter(i => 
      i.severity === IncidentSeverity.CRITICAL && 
      !['resolved', 'closed'].includes(i.status)
    ).length;
    score -= criticalUnresolved * 10;

    // Deduct points for poor resolution rate
    if (resolutionRate < 90) score -= (90 - resolutionRate) * 0.5;

    return Math.max(0, Math.round(score));
  }

  /**
   * Get dashboard summary for security overview
   */
  static async getSecurityDashboard(c: AppContext) {
    const db = getDb(c.env.DB);
    
    // Get recent incidents (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentIncidents = await db
      .select()
      .from(securityIncidents)
      .where(gte(securityIncidents.createdAt, sevenDaysAgo))
      .orderBy(desc(securityIncidents.createdAt));

    // Get critical open incidents
    const criticalOpen = await db
      .select()
      .from(securityIncidents)
      .where(and(
        eq(securityIncidents.severity, IncidentSeverity.CRITICAL),
        eq(securityIncidents.status, IncidentStatus.OPEN)
      ));

    // Get recent admin actions (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentActions = await db
      .select()
      .from(globalAdminActions)
      .where(gte(globalAdminActions.createdAt, oneDayAgo))
      .orderBy(desc(globalAdminActions.createdAt))
      .limit(10);

    const metrics = await this.getSecurityMetrics(c, 7);
    const suspiciousActivity = await this.detectSuspiciousActivity(c);

    return {
      summary: {
        totalIncidents: recentIncidents.length,
        criticalOpen: criticalOpen.length,
        recentActions: recentActions.length,
        suspiciousPatterns: suspiciousActivity.length
      },
      recentIncidents: recentIncidents.slice(0, 5),
      criticalIncidents: criticalOpen,
      recentActions,
      metrics,
      suspiciousActivity
    };
  }
}