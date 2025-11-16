'use client';

import { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ClockIcon, 
  CpuChipIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';

interface SystemMetrics {
  health: {
    status: 'healthy' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
      details?: any;
    }>;
    timestamp: string;
  };
  performance: {
    database: {
      totalRecords: {
        users: number;
        tenants: number;
        transactions: number;
        accounts: number;
      };
      recentActivity: {
        transactionsLast24h: number;
        usersLast24h: number;
      };
    };
    api: {
      avgResponseTime: number;
      p95ResponseTime: number;
      requestsLastHour: number;
      errorsLastHour: number;
    };
    timestamp: string;
  };
  apiUsage: {
    summary: {
      totalRequests: number;
      avgResponseTime: number;
      errorRate: number;
      totalErrors: number;
    };
    hourlyData: Array<{
      hour: number;
      totalRequests: number;
      totalResponseTime: number;
      statusCodes: Record<string, number>;
      endpoints: Record<string, number>;
      errors: number;
    }>;
    statusCodes: Record<string, number>;
    topEndpoints: Array<{
      endpoint: string;
      count: number;
    }>;
  };
  errors: {
    totalErrors: number;
    errorsByStatus: Record<string, number>;
    topErrorEndpoints: Array<{
      endpoint: string;
      count: number;
    }>;
    errorsByHour: Array<{
      hour: number;
      count: number;
    }>;
  };
  resources: {
    database: {
      tables: Record<string, number>;
      totalStorageKB: number;
      totalStorageMB: number;
    };
    keyValue: {
      sessions: {
        keyCount: number;
        estimatedSizeKB: number;
      };
      cache: {
        keyCount: number;
        estimatedSizeKB: number;
      };
    };
    timestamp: string;
  };
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // Calculate time range based on selected timeRange
      const getTimeRangeForAPI = () => {
        const end = new Date();
        const start = new Date();
        
        switch (timeRange) {
          case '1h':
            start.setHours(start.getHours() - 1);
            break;
          case '24h':
            start.setDate(start.getDate() - 1);
            break;
          case '7d':
            start.setDate(start.getDate() - 7);
            break;
          case '30d':
            start.setDate(start.getDate() - 30);
            break;
          default:
            start.setDate(start.getDate() - 1); // Default to 24h
        }
        
        return {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        };
      };

      const timeRangeParams = getTimeRangeForAPI();

      const [healthResponse, apiUsageResponse, performanceResponse, errorsResponse, resourcesResponse] = await Promise.all([
        api.admin.getHealthCheck(),
        api.admin.getAPIUsage(timeRangeParams),
        api.admin.getPerformanceMetrics(),
        api.admin.getErrorMetrics(timeRangeParams),
        api.admin.getResourceMetrics()
      ]);

      // Combine all the data into our expected format
      const combinedMetrics: SystemMetrics = {
        health: healthResponse.data as SystemMetrics['health'],
        apiUsage: apiUsageResponse.data as SystemMetrics['apiUsage'],
        performance: performanceResponse.data as SystemMetrics['performance'],
        errors: errorsResponse.data as SystemMetrics['errors'],
        resources: resourcesResponse.data as SystemMetrics['resources']
      };

      setMetrics(combinedMetrics);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError('Failed to load system metrics. Please try again.');
      
      // Set empty/default metrics structure for display
      setMetrics({
        health: {
          status: 'unhealthy',
          checks: [],
          timestamp: new Date().toISOString()
        },
        apiUsage: {
          summary: { totalRequests: 0, avgResponseTime: 0, errorRate: 0, totalErrors: 0 },
          hourlyData: [],
          statusCodes: {},
          topEndpoints: []
        },
        performance: {
          database: {
            totalRecords: { users: 0, tenants: 0, transactions: 0, accounts: 0 },
            recentActivity: { transactionsLast24h: 0, usersLast24h: 0 }
          },
          api: {
            avgResponseTime: 0,
            p95ResponseTime: 0,
            requestsLastHour: 0,
            errorsLastHour: 0
          },
          timestamp: new Date().toISOString()
        },
        errors: {
          totalErrors: 0,
          errorsByStatus: {},
          topErrorEndpoints: [],
          errorsByHour: []
        },
        resources: {
          database: {
            tables: {},
            totalStorageKB: 0,
            totalStorageMB: 0
          },
          keyValue: {
            sessions: { keyCount: 0, estimatedSizeKB: 0 },
            cache: { keyCount: 0, estimatedSizeKB: 0 }
          },
          timestamp: new Date().toISOString()
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-refresh metrics
    const interval = setInterval(() => {
      fetchMetrics();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval, timeRange]);

  const getHealthBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case 'healthy':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'unhealthy':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'degraded':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'down':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Metrics & Monitoring</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
          <button 
            onClick={() => fetchMetrics()} 
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return <div>No metrics data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Metrics & Monitoring</h1>
          <p className="mt-2 text-gray-600">
            Real-time system performance, API usage, and health monitoring
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Refresh Interval</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            >
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">System Health</h3>
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              {getHealthIcon(metrics.health.status)}
              <span className={getHealthBadge(metrics.health.status)}>
                Overall Status: {metrics.health.status.charAt(0).toUpperCase() + metrics.health.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.health.checks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getHealthIcon(check.status)}
                  <div>
                    <div className="text-sm font-medium text-gray-900">{check.name}</div>
                    <span className={getHealthBadge(check.status)}>
                      {check.status.charAt(0).toUpperCase() + check.status.slice(1)}
                    </span>
                    {check.responseTime && (
                      <div className="text-xs text-gray-500">{check.responseTime}ms</div>
                    )}
                    {check.error && (
                      <div className="text-xs text-red-600 mt-1">{check.error}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API Usage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Requests</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(metrics.apiUsage.summary.totalRequests)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Response Time</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics.apiUsage.summary.avgResponseTime}ms
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CpuChipIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">P95 Response Time</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics.performance.api.p95ResponseTime}ms
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Error Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics.apiUsage.summary.errorRate.toFixed(2)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">System Performance</h3>
          
          {/* Database Metrics */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">Database Records</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{formatNumber(metrics.performance.database.totalRecords.users)}</div>
                <div className="text-sm text-gray-600">Users</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatNumber(metrics.performance.database.totalRecords.tenants)}</div>
                <div className="text-sm text-gray-600">Tenants</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{formatNumber(metrics.performance.database.totalRecords.transactions)}</div>
                <div className="text-sm text-gray-600">Transactions</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{formatNumber(metrics.performance.database.totalRecords.accounts)}</div>
                <div className="text-sm text-gray-600">Accounts</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">Recent Activity (24h)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <div className="text-lg font-medium text-gray-900">{formatNumber(metrics.performance.database.recentActivity.transactionsLast24h)}</div>
                  <div className="text-sm text-gray-500">New Transactions</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-lg font-medium text-gray-900">{formatNumber(metrics.performance.database.recentActivity.usersLast24h)}</div>
                  <div className="text-sm text-gray-500">New Users</div>
                </div>
              </div>
            </div>
          </div>

          {/* API Performance */}
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-3">API Performance</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{metrics.performance.api.avgResponseTime}ms</div>
                <div className="text-sm text-gray-600">Avg Response</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{metrics.performance.api.p95ResponseTime}ms</div>
                <div className="text-sm text-gray-600">95th Percentile</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatNumber(metrics.performance.api.requestsLastHour)}</div>
                <div className="text-sm text-gray-600">Requests/Hour</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{formatNumber(metrics.performance.api.errorsLastHour)}</div>
                <div className="text-sm text-gray-600">Errors/Hour</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Summary */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Error Analysis ({timeRange})</h3>
          
          {/* Error Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 overflow-hidden rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Errors</dt>
                  <dd className="text-lg font-medium text-gray-900">{metrics.errors.totalErrors}</dd>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 overflow-hidden rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-2 h-2 bg-orange-400 rounded-full"></div>
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500 truncate">4xx Errors</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {Object.entries(metrics.errors.errorsByStatus)
                      .filter(([status]) => status.startsWith('4'))
                      .reduce((sum, [, count]) => sum + count, 0)}
                  </dd>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 overflow-hidden rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-2 h-2 bg-red-400 rounded-full"></div>
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500 truncate">5xx Errors</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {Object.entries(metrics.errors.errorsByStatus)
                      .filter(([status]) => status.startsWith('5'))
                      .reduce((sum, [, count]) => sum + count, 0)}
                  </dd>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 overflow-hidden rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg/Hour</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics.errors.errorsByHour.length > 0 
                      ? Math.round(metrics.errors.totalErrors / metrics.errors.errorsByHour.length)
                      : 0}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Top Error Endpoints */}
          {metrics.errors.topErrorEndpoints.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-3">Top Error Endpoints</h4>
              <div className="space-y-2">
                {metrics.errors.topErrorEndpoints.slice(0, 5).map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                    <span className="text-sm font-mono text-gray-600">{endpoint.endpoint}</span>
                    <span className="text-sm font-medium text-red-600">{endpoint.count} errors</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {metrics.errors.totalErrors === 0 && (
            <div className="text-center py-8">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Errors Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No errors recorded in the selected time range.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resources & Storage */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Resource Utilization</h3>
          
          {/* Database Storage */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">Database Storage</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{metrics.resources.database.totalStorageMB} MB</div>
                <div className="text-sm text-gray-600">Total Storage</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{metrics.resources.database.totalStorageKB} KB</div>
                <div className="text-sm text-gray-600">Raw Storage</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(metrics.resources.database.tables).length}
                </div>
                <div className="text-sm text-gray-600">Tables</div>
              </div>
            </div>

            {/* Storage by table */}
            {Object.keys(metrics.resources.database.tables).length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Storage by Table (KB)</h5>
                <div className="space-y-2">
                  {Object.entries(metrics.resources.database.tables)
                    .sort(([,a], [,b]) => b - a)
                    .map(([table, sizeKB]) => (
                    <div key={table} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600 capitalize">{table}</span>
                      <span className="text-sm font-medium">{sizeKB.toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KV Storage */}
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-3">Key-Value Storage</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Sessions</span>
                  <span className="text-sm text-gray-500">{metrics.resources.keyValue.sessions.keyCount} keys</span>
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {metrics.resources.keyValue.sessions.estimatedSizeKB} KB
                </div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Cache</span>
                  <span className="text-sm text-gray-500">{metrics.resources.keyValue.cache.keyCount} keys</span>
                </div>
                <div className="text-lg font-bold text-green-600">
                  {metrics.resources.keyValue.cache.estimatedSizeKB} KB
                </div>
              </div>
            </div>
          </div>

          {/* API Usage Summary */}
          {metrics.apiUsage.topEndpoints.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-800 mb-3">Top API Endpoints ({timeRange})</h4>
              <div className="space-y-2">
                {metrics.apiUsage.topEndpoints.slice(0, 8).map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                    <span className="text-sm font-mono text-gray-600">{endpoint.endpoint}</span>
                    <span className="text-sm font-medium text-blue-600">{formatNumber(endpoint.count)} requests</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}