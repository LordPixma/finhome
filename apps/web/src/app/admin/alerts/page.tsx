'use client';

import { useState, useEffect } from 'react';
import { 
  BellIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Alert {
  id: string;
  type: 'system' | 'security' | 'performance' | 'user' | 'billing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  title: string;
  message: string;
  source: string;
  tenantId?: string;
  tenantName?: string;
  userId?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
  metadata?: Record<string, any>;
}

interface AlertRule {
  id: string;
  name: string;
  type: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  recipients: string[];
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'system',
    severity: 'critical',
    status: 'active',
    title: 'High API Error Rate',
    message: 'API error rate has exceeded 5% threshold for the last 10 minutes',
    source: 'System Monitor',
    createdAt: '2024-01-22T14:30:00Z',
    updatedAt: '2024-01-22T14:30:00Z',
    metadata: { errorRate: 7.3, threshold: 5.0 }
  },
  {
    id: '2',
    type: 'security',
    severity: 'high',
    status: 'acknowledged',
    title: 'Multiple Failed Login Attempts',
    message: 'User john.doe@acme.corp has 15 failed login attempts in 10 minutes',
    source: 'Security Monitor',
    tenantId: '1',
    tenantName: 'Acme Corporation',
    userId: '1',
    userEmail: 'john.doe@acme.corp',
    createdAt: '2024-01-22T13:15:00Z',
    updatedAt: '2024-01-22T13:45:00Z',
    acknowledgedBy: 'admin@finhome360.com'
  },
  {
    id: '3',
    type: 'performance',
    severity: 'medium',
    status: 'resolved',
    title: 'High Response Time',
    message: 'Average API response time exceeded 500ms for 5 minutes',
    source: 'Performance Monitor',
    createdAt: '2024-01-22T12:00:00Z',
    updatedAt: '2024-01-22T12:30:00Z',
    resolvedAt: '2024-01-22T12:30:00Z',
    metadata: { avgResponseTime: 650, threshold: 500 }
  },
  {
    id: '4',
    type: 'user',
    severity: 'low',
    status: 'active',
    title: 'New User Registration Spike',
    message: '50+ new user registrations in the last hour (normal: 10-20)',
    source: 'User Analytics',
    createdAt: '2024-01-22T11:30:00Z',
    updatedAt: '2024-01-22T11:30:00Z',
    metadata: { newUsers: 53, normalRange: '10-20' }
  }
];

const mockAlertRules: AlertRule[] = [
  {
    id: '1',
    name: 'High Error Rate',
    type: 'system',
    condition: 'error_rate > threshold',
    threshold: 5,
    enabled: true,
    recipients: ['admin@finhome360.com', 'alerts@finhome360.com']
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

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved' | 'dismissed'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'security' | 'performance' | 'user' | 'billing'>('all');
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules'>('alerts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setAlerts(mockAlerts);
      setAlertRules(mockAlertRules);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesType = typeFilter === 'all' || alert.type === typeFilter;
    return matchesStatus && matchesSeverity && matchesType;
  });

  const handleAcknowledgeAlert = (alert: Alert) => {
    if (confirm(`Acknowledge alert: ${alert.title}?`)) {
      alert.status = 'acknowledged';
      alert.acknowledgedBy = 'current-admin@finhome360.com';
      setAlerts([...alerts]);
    }
  };

  const handleResolveAlert = (alert: Alert) => {
    if (confirm(`Mark alert as resolved: ${alert.title}?`)) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      setAlerts([...alerts]);
    }
  };

  const handleDismissAlert = (alert: Alert) => {
    if (confirm(`Dismiss alert: ${alert.title}?`)) {
      alert.status = 'dismissed';
      setAlerts([...alerts]);
    }
  };

  const handleViewAlert = (alertItem: Alert) => {
    alert(`Alert Details:\n\n${JSON.stringify(alertItem, null, 2)}`);
  };

  const handleToggleRule = (rule: AlertRule) => {
    rule.enabled = !rule.enabled;
    setAlertRules([...alertRules]);
    alert(`Rule "${rule.name}" ${rule.enabled ? 'enabled' : 'disabled'}`);
  };

  const getSeverityBadge = (severity: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (severity) {
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'high':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case 'active':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'acknowledged':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'resolved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'dismissed':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'security':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'performance':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'user':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'billing':
        return <InformationCircleIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alerts & Notifications</h1>
          <p className="mt-2 text-gray-600">
            Monitor and manage system alerts, security notifications, and alert rules
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'alerts'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Alerts ({alerts.filter(a => a.status === 'active').length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rules'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Alert Rules ({alertRules.length})
          </button>
        </nav>
      </div>

      {activeTab === 'alerts' && (
        <>
          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                >
                  <option value="all">All Types</option>
                  <option value="system">System</option>
                  <option value="security">Security</option>
                  <option value="performance">Performance</option>
                  <option value="user">User</option>
                  <option value="billing">Billing</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BellIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Alerts</dt>
                      <dd className="text-lg font-medium text-gray-900">{alerts.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-2 h-2 bg-red-400 rounded-full"></div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {alerts.filter(a => a.status === 'active').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-2 h-2 bg-red-600 rounded-full"></div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Critical</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {alerts.filter(a => a.severity === 'critical').length}
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
                    <CheckCircleIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {alerts.filter(a => a.status === 'resolved').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts List */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <div key={alert.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getTypeIcon(alert.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{alert.title}</h3>
                            <span className={getSeverityBadge(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className={getStatusBadge(alert.status)}>
                              {alert.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{alert.message}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                            <div>
                              <span className="font-medium">Source:</span> {alert.source}
                            </div>
                            {alert.tenantName && (
                              <div>
                                <span className="font-medium">Tenant:</span> {alert.tenantName}
                              </div>
                            )}
                            {alert.userEmail && (
                              <div>
                                <span className="font-medium">User:</span> {alert.userEmail}
                              </div>
                            )}
                            {alert.acknowledgedBy && (
                              <div>
                                <span className="font-medium">Acknowledged by:</span> {alert.acknowledgedBy}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center mt-3 text-xs text-gray-400">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            Created: {new Date(alert.createdAt).toLocaleString()}
                            {alert.resolvedAt && (
                              <>
                                {' • '}
                                <CheckCircleIcon className="h-4 w-4 mr-1 ml-2" />
                                Resolved: {new Date(alert.resolvedAt).toLocaleString()}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewAlert(alert)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </button>
                        {alert.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleAcknowledgeAlert(alert)}
                              className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                            >
                              Acknowledge
                            </button>
                            <button
                              onClick={() => handleResolveAlert(alert)}
                              className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Resolve
                            </button>
                          </>
                        )}
                        {alert.status !== 'dismissed' && (
                          <button
                            onClick={() => handleDismissAlert(alert)}
                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'rules' && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Alert Rules</h3>
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Create Rule
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rule Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Threshold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alertRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {rule.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">{rule.condition}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{rule.threshold}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rule.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{rule.recipients.length} recipients</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleToggleRule(rule)}
                          className={`text-sm ${rule.enabled ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          {rule.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}