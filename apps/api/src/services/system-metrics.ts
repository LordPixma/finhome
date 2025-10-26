import { count, gte } from 'drizzle-orm';
import { getDb, users, tenants, transactions, accounts, securityIncidents, globalAdminActions } from '../db';
import { randomUUID } from 'node:crypto';
import type { AppContext } from '../types';

/**
 * Metric Types
 */
export enum MetricType {
  API_USAGE = 'api_usage',
  PERFORMANCE = 'performance',
  ERROR_RATE = 'error_rate',
  RESOURCE_UTILIZATION = 'resource_utilization',
  USER_ACTIVITY = 'user_activity',
  SYSTEM_HEALTH = 'system_health'
}

/**
 * Alert Severity Levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Alert Status
 */
export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved'
}

/**
 * System Metrics & Monitoring Service
 * Comprehensive monitoring with performance metrics, API analytics, and alerting
 */
export class SystemMetricsService {
  /**
   * Record API usage metrics
   */
  static async recordAPIUsage(c: AppContext, metrics: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    tenantId?: string;
    userId?: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    
    // Store in KV for real-time metrics (sliding window)
    const timestamp = Date.now();
    const key = `api_usage:${timestamp}:${randomUUID()}`;
    
    await c.env.CACHE.put(key, JSON.stringify({
      ...metrics,
      timestamp
    }), {
      expirationTtl: 86400 // 24 hours
    });

    // Aggregate hourly stats
    const hourKey = `api_hourly:${Math.floor(timestamp / 3600000)}`;
    const existing = await c.env.CACHE.get(hourKey);
    const hourlyStats: any = existing ? JSON.parse(existing) : {
      totalRequests: 0,
      totalResponseTime: 0,
      statusCodes: {},
      endpoints: {},
      errors: 0
    };

    hourlyStats.totalRequests++;
    hourlyStats.totalResponseTime += metrics.responseTime;
    hourlyStats.statusCodes[metrics.statusCode] = (hourlyStats.statusCodes[metrics.statusCode] || 0) + 1;
    hourlyStats.endpoints[metrics.endpoint] = (hourlyStats.endpoints[metrics.endpoint] || 0) + 1;
    
    if (metrics.statusCode >= 400) {
      hourlyStats.errors++;
    }

    await c.env.CACHE.put(hourKey, JSON.stringify(hourlyStats), {
      expirationTtl: 7 * 86400 // 7 days
    });

    return { success: true };
  }

  /**
   * Get API usage analytics
   */
  static async getAPIAnalytics(c: AppContext, timeRange: {
    startDate: string;
    endDate: string;
  }) {
    const startTime = new Date(timeRange.startDate).getTime();
    const endTime = new Date(timeRange.endDate).getTime();
    
    // Get hourly aggregated data
    const hourlyData: any[] = [];
    const currentHour = Math.floor(startTime / 3600000);
    const endHour = Math.floor(endTime / 3600000);

    for (let hour = currentHour; hour <= endHour; hour++) {
      const hourKey = `api_hourly:${hour}`;
      const data = await c.env.CACHE.get(hourKey);
      if (data) {
        hourlyData.push({
          hour: hour * 3600000,
          ...JSON.parse(data)
        });
      }
    }

    // Calculate summary metrics
    const totalRequests = hourlyData.reduce((sum, h) => sum + h.totalRequests, 0);
    const totalResponseTime = hourlyData.reduce((sum, h) => sum + h.totalResponseTime, 0);
    const totalErrors = hourlyData.reduce((sum, h) => sum + h.errors, 0);
    
    const avgResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    // Aggregate status codes and endpoints
    const statusCodes: any = {};
    const endpoints: any = {};
    
    hourlyData.forEach(h => {
      Object.entries(h.statusCodes || {}).forEach(([code, count]) => {
        statusCodes[code] = (statusCodes[code] || 0) + (count as number);
      });
      
      Object.entries(h.endpoints || {}).forEach(([endpoint, count]) => {
        endpoints[endpoint] = (endpoints[endpoint] || 0) + (count as number);
      });
    });

    return {
      summary: {
        totalRequests,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        totalErrors
      },
      hourlyData,
      statusCodes,
      topEndpoints: Object.entries(endpoints)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count }))
    };
  }

  /**
   * Get system performance metrics
   */
  static async getPerformanceMetrics(c: AppContext) {
    
    // Database performance metrics
    const dbMetrics = await this.getDatabaseMetrics(c);
    
    // Get recent API performance from KV
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Get recent response times
    let recentMetrics: any[] = [];
    const keys = await c.env.CACHE.list({ prefix: 'api_usage:' });
    
    for (const key of keys.keys.slice(0, 100)) { // Sample recent metrics
      const data = await c.env.CACHE.get(key.name);
      if (data) {
        const metric = JSON.parse(data);
        if (metric.timestamp > oneHourAgo) {
          recentMetrics.push(metric);
        }
      }
    }

    // Calculate performance metrics
    const responseTimes = recentMetrics.map(m => m.responseTime).filter(rt => rt > 0);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    const p95ResponseTime = responseTimes.length > 0
      ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]
      : 0;

    return {
      database: dbMetrics,
      api: {
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
        requestsLastHour: recentMetrics.length,
        errorsLastHour: recentMetrics.filter(m => m.statusCode >= 400).length
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get database performance metrics
   */
  static async getDatabaseMetrics(c: AppContext) {
    const db = getDb(c.env.DB);
    
    const [
      totalUsers,
      totalTenants,
      totalTransactions,
      totalAccounts,
      recentTransactions,
      recentUsers
    ] = await Promise.all([
      db.select({ count: count() }).from(users).get(),
      db.select({ count: count() }).from(tenants).get(),
      db.select({ count: count() }).from(transactions).get(),
      db.select({ count: count() }).from(accounts).get(),
      
      // Recent activity (last 24 hours)
      db.select({ count: count() })
        .from(transactions)
        .where(gte(transactions.createdAt, new Date(Date.now() - 86400000)))
        .get(),
      
      db.select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, new Date(Date.now() - 86400000)))
        .get()
    ]);

    return {
      totalRecords: {
        users: totalUsers?.count || 0,
        tenants: totalTenants?.count || 0,
        transactions: totalTransactions?.count || 0,
        accounts: totalAccounts?.count || 0
      },
      recentActivity: {
        transactionsLast24h: recentTransactions?.count || 0,
        usersLast24h: recentUsers?.count || 0
      }
    };
  }

  /**
   * Get error tracking metrics
   */
  static async getErrorMetrics(c: AppContext, timeRange: {
    startDate: string;
    endDate: string;
  }) {
    const startTime = new Date(timeRange.startDate).getTime();
    const endTime = new Date(timeRange.endDate).getTime();
    
    // Get error data from KV
    const errorData: any[] = [];
    const keys = await c.env.CACHE.list({ prefix: 'api_usage:' });
    
    for (const key of keys.keys.slice(0, 1000)) { // Sample error data
      const data = await c.env.CACHE.get(key.name);
      if (data) {
        const metric = JSON.parse(data);
        if (metric.timestamp >= startTime && 
            metric.timestamp <= endTime && 
            metric.statusCode >= 400) {
          errorData.push(metric);
        }
      }
    }

    // Group errors by status code and endpoint
    const errorsByStatus: any = {};
    const errorsByEndpoint: any = {};
    const errorsByHour: any = {};

    errorData.forEach(error => {
      // By status code
      errorsByStatus[error.statusCode] = (errorsByStatus[error.statusCode] || 0) + 1;
      
      // By endpoint
      errorsByEndpoint[error.endpoint] = (errorsByEndpoint[error.endpoint] || 0) + 1;
      
      // By hour
      const hour = Math.floor(error.timestamp / 3600000);
      errorsByHour[hour] = (errorsByHour[hour] || 0) + 1;
    });

    return {
      totalErrors: errorData.length,
      errorsByStatus,
      topErrorEndpoints: Object.entries(errorsByEndpoint)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count })),
      errorsByHour: Object.entries(errorsByHour)
        .map(([hour, count]) => ({ 
          hour: parseInt(hour) * 3600000, 
          count 
        }))
        .sort((a, b) => a.hour - b.hour)
    };
  }

  /**
   * Get resource utilization metrics
   */
  static async getResourceMetrics(c: AppContext) {
    // Since we're on Cloudflare Workers, we'll focus on database and KV usage

    // Database usage estimation
    const [
      storageStats,
      kvStats
    ] = await Promise.all([
      // Get table sizes estimation
      this.getStorageEstimation(c),
      
      // Get KV usage estimation
      this.getKVUsage(c)
    ]);

    return {
      database: storageStats,
      keyValue: kvStats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Estimate database storage usage
   */
  static async getStorageEstimation(c: AppContext) {
    const db = getDb(c.env.DB);

    const [
      userCount,
      tenantCount,
      transactionCount,
      accountCount,
      securityIncidentCount,
      adminActionCount
    ] = await Promise.all([
      db.select({ count: count() }).from(users).get(),
      db.select({ count: count() }).from(tenants).get(),
      db.select({ count: count() }).from(transactions).get(),
      db.select({ count: count() }).from(accounts).get(),
      db.select({ count: count() }).from(securityIncidents).get(),
      db.select({ count: count() }).from(globalAdminActions).get()
    ]);

    // Rough estimation of storage (in KB)
    const estimatedStorage = {
      users: (userCount?.count || 0) * 2, // ~2KB per user
      tenants: (tenantCount?.count || 0) * 1, // ~1KB per tenant
      transactions: (transactionCount?.count || 0) * 0.5, // ~0.5KB per transaction
      accounts: (accountCount?.count || 0) * 0.3, // ~0.3KB per account
      securityIncidents: (securityIncidentCount?.count || 0) * 1.5, // ~1.5KB per incident
      adminActions: (adminActionCount?.count || 0) * 0.8 // ~0.8KB per action
    };

    const totalStorageKB = Object.values(estimatedStorage).reduce((sum, size) => sum + size, 0);

    return {
      tables: estimatedStorage,
      totalStorageKB: Math.round(totalStorageKB),
      totalStorageMB: Math.round(totalStorageKB / 1024 * 100) / 100
    };
  }

  /**
   * Get KV usage estimation
   */
  static async getKVUsage(c: AppContext) {
    const [sessionsKeys, cacheKeys] = await Promise.all([
      c.env.SESSIONS.list(),
      c.env.CACHE.list()
    ]);

    return {
      sessions: {
        keyCount: sessionsKeys.keys.length,
        estimatedSizeKB: sessionsKeys.keys.length * 2 // ~2KB per session
      },
      cache: {
        keyCount: cacheKeys.keys.length,
        estimatedSizeKB: cacheKeys.keys.length * 1 // ~1KB per cache entry
      }
    };
  }

  /**
   * Create system alert
   */
  static async createAlert(c: AppContext, alert: {
    type: string;
    severity: AlertSeverity;
    title: string;
    description: string;
    metadata?: Record<string, any>;
  }) {
    const alertId = randomUUID();
    const alertData = {
      id: alertId,
      ...alert,
      status: AlertStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
      resolvedAt: null
    };

    // Store alert in KV
    await c.env.CACHE.put(`alert:${alertId}`, JSON.stringify(alertData), {
      expirationTtl: 30 * 86400 // 30 days
    });

    // Add to active alerts index
    const activeAlerts = await c.env.CACHE.get('alerts:active') || '[]';
    const alerts = JSON.parse(activeAlerts);
    alerts.push(alertId);
    
    await c.env.CACHE.put('alerts:active', JSON.stringify(alerts), {
      expirationTtl: 30 * 86400
    });

    return { alertId, message: 'Alert created successfully' };
  }

  /**
   * Get active alerts
   */
  static async getActiveAlerts(c: AppContext) {
    const activeAlertIds = await c.env.CACHE.get('alerts:active');
    if (!activeAlertIds) {
      return [];
    }

    const alertIds = JSON.parse(activeAlertIds);
    const alerts: any[] = [];

    for (const alertId of alertIds) {
      const alertData = await c.env.CACHE.get(`alert:${alertId}`);
      if (alertData) {
        const alert = JSON.parse(alertData);
        if (alert.status === AlertStatus.ACTIVE) {
          alerts.push(alert);
        }
      }
    }

    return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Acknowledge alert
   */
  static async acknowledgeAlert(c: AppContext, alertId: string) {
    const alertData = await c.env.CACHE.get(`alert:${alertId}`);
    if (!alertData) {
      throw new Error('Alert not found');
    }

    const alert = JSON.parse(alertData);
    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date().toISOString();

    await c.env.CACHE.put(`alert:${alertId}`, JSON.stringify(alert), {
      expirationTtl: 30 * 86400
    });

    return { message: 'Alert acknowledged successfully' };
  }

  /**
   * Resolve alert
   */
  static async resolveAlert(c: AppContext, alertId: string) {
    const alertData = await c.env.CACHE.get(`alert:${alertId}`);
    if (!alertData) {
      throw new Error('Alert not found');
    }

    const alert = JSON.parse(alertData);
    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date().toISOString();

    await c.env.CACHE.put(`alert:${alertId}`, JSON.stringify(alert), {
      expirationTtl: 30 * 86400
    });

    // Remove from active alerts
    const activeAlerts = await c.env.CACHE.get('alerts:active') || '[]';
    const alerts = JSON.parse(activeAlerts);
    const updatedAlerts = alerts.filter(id => id !== alertId);
    
    await c.env.CACHE.put('alerts:active', JSON.stringify(updatedAlerts), {
      expirationTtl: 30 * 86400
    });

    return { message: 'Alert resolved successfully' };
  }

  /**
   * Check system health and create alerts if needed
   */
  static async performHealthCheck(c: AppContext) {
    const healthChecks: any[] = [];

    try {
      // Check database connectivity
      const db = getDb(c.env.DB);
      const dbCheck = await db.select({ count: count() }).from(users).get();
      healthChecks.push({
        name: 'Database',
        status: 'healthy',
        responseTime: Date.now() - Date.now(), // Would be measured properly
        details: { userCount: dbCheck?.count || 0 }
      });
    } catch (error) {
      healthChecks.push({
        name: 'Database',
        status: 'unhealthy',
        error: error.message
      });

      // Create critical alert
      await this.createAlert(c, {
        type: 'database_connectivity',
        severity: AlertSeverity.CRITICAL,
        title: 'Database Connectivity Issue',
        description: `Database connection failed: ${error.message}`,
        metadata: { error: error.message }
      });
    }

    try {
      // Check KV connectivity
      await c.env.CACHE.get('health_check');
      healthChecks.push({
        name: 'Cache (KV)',
        status: 'healthy'
      });
    } catch (error) {
      healthChecks.push({
        name: 'Cache (KV)',
        status: 'unhealthy',
        error: error.message
      });

      await this.createAlert(c, {
        type: 'kv_connectivity',
        severity: AlertSeverity.ERROR,
        title: 'KV Storage Issue',
        description: `KV storage connection failed: ${error.message}`,
        metadata: { error: error.message }
      });
    }

    const overallStatus = healthChecks.every(check => check.status === 'healthy') 
      ? 'healthy' 
      : 'unhealthy';

    return {
      status: overallStatus,
      checks: healthChecks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get comprehensive system dashboard data
   */
  static async getSystemDashboard(c: AppContext) {
    const [
      performanceMetrics,
      healthCheck,
      activeAlerts,
      apiAnalytics,
      resourceMetrics
    ] = await Promise.all([
      this.getPerformanceMetrics(c),
      this.performHealthCheck(c),
      this.getActiveAlerts(c),
      this.getAPIAnalytics(c, {
        startDate: new Date(Date.now() - 24 * 3600000).toISOString(),
        endDate: new Date().toISOString()
      }),
      this.getResourceMetrics(c)
    ]);

    const alerts: any[] = activeAlerts as any[];

    return {
      health: healthCheck,
      performance: performanceMetrics,
      alerts: {
        active: alerts,
        criticalCount: alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
        warningCount: alerts.filter(a => a.severity === AlertSeverity.WARNING).length
      },
      api: apiAnalytics,
      resources: resourceMetrics,
      timestamp: new Date().toISOString()
    };
  }
}