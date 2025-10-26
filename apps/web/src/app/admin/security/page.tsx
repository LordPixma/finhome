'use client';

import { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  ShieldExclamationIcon, 
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';

interface SecurityIncident {
  id: string;
  type: 'login_failure' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access' | 'malware_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  title: string;
  description: string;
  affectedUser?: string;
  affectedTenant?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  assignedTo?: string;
}

const mockIncidents: SecurityIncident[] = [
  {
    id: '1',
    type: 'login_failure',
    severity: 'medium',
    status: 'open',
    title: 'Multiple Failed Login Attempts',
    description: 'User john.doe@acme.corp has 15 failed login attempts in the last 10 minutes',
    affectedUser: 'john.doe@acme.corp',
    affectedTenant: 'Acme Corporation',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    createdAt: '2024-01-22T14:30:00Z',
    updatedAt: '2024-01-22T14:30:00Z'
  },
  {
    id: '2',
    type: 'suspicious_activity',
    severity: 'high',
    status: 'investigating',
    title: 'Unusual API Access Pattern',
    description: 'API endpoints accessed from multiple countries within 5 minutes',
    affectedTenant: 'TechStart Inc',
    ipAddress: '203.0.113.195',
    createdAt: '2024-01-22T10:15:00Z',
    updatedAt: '2024-01-22T12:30:00Z',
    assignedTo: 'Security Team'
  },
  {
    id: '3',
    type: 'unauthorized_access',
    severity: 'critical',
    status: 'resolved',
    title: 'Admin Panel Access from Unknown Device',
    description: 'Admin panel accessed from unrecognized device without MFA',
    affectedUser: 'admin@globalfinance.com',
    affectedTenant: 'Global Finance Ltd',
    ipAddress: '198.51.100.42',
    createdAt: '2024-01-21T08:45:00Z',
    updatedAt: '2024-01-21T16:20:00Z',
    resolvedAt: '2024-01-21T16:20:00Z',
    assignedTo: 'Admin'
  }
];

export default function SecurityPage() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'investigating' | 'resolved' | 'false_positive'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'login_failure' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access' | 'malware_detected'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setIncidents(mockIncidents);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const filteredIncidents = incidents.filter(incident => {
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    const matchesType = typeFilter === 'all' || incident.type === typeFilter;
    return matchesStatus && matchesSeverity && matchesType;
  });

  const handleViewIncident = (incident: SecurityIncident) => {
    alert(`View incident details for: ${incident.title}`);
  };

  const handleResolveIncident = (incident: SecurityIncident) => {
    if (confirm(`Mark incident "${incident.title}" as resolved?`)) {
      alert(`Incident marked as resolved`);
    }
  };

  const handleAssignIncident = (incident: SecurityIncident) => {
    const assignee = prompt('Assign to:');
    if (assignee) {
      alert(`Incident assigned to ${assignee}`);
    }
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
      case 'open':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'investigating':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'resolved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'false_positive':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'login_failure':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'suspicious_activity':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'unauthorized_access':
        return <ShieldExclamationIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
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
          <h1 className="text-3xl font-bold text-gray-900">Security & Incidents</h1>
          <p className="mt-2 text-gray-600">
            Monitor and manage security incidents and threats across the platform
          </p>
        </div>
      </div>

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
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
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
              <option value="login_failure">Login Failure</option>
              <option value="suspicious_activity">Suspicious Activity</option>
              <option value="unauthorized_access">Unauthorized Access</option>
              <option value="data_breach">Data Breach</option>
              <option value="malware_detected">Malware Detected</option>
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
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Incidents</dt>
                  <dd className="text-lg font-medium text-gray-900">{incidents.length}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Open</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {incidents.filter(i => i.status === 'open').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full"></div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Investigating</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {incidents.filter(i => i.status === 'investigating').length}
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
                    {incidents.filter(i => i.status === 'resolved').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {filteredIncidents.map((incident) => (
              <div key={incident.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(incident.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{incident.title}</h3>
                        <span className={getSeverityBadge(incident.severity)}>
                          {incident.severity.toUpperCase()}
                        </span>
                        <span className={getStatusBadge(incident.status)}>
                          {incident.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{incident.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                        {incident.affectedUser && (
                          <div>
                            <span className="font-medium">Affected User:</span> {incident.affectedUser}
                          </div>
                        )}
                        {incident.affectedTenant && (
                          <div>
                            <span className="font-medium">Tenant:</span> {incident.affectedTenant}
                          </div>
                        )}
                        {incident.ipAddress && (
                          <div>
                            <span className="font-medium">IP Address:</span> {incident.ipAddress}
                          </div>
                        )}
                        {incident.assignedTo && (
                          <div>
                            <span className="font-medium">Assigned to:</span> {incident.assignedTo}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center mt-3 text-xs text-gray-400">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        Created: {new Date(incident.createdAt).toLocaleString()}
                        {incident.resolvedAt && (
                          <>
                            {' • '}
                            <CheckCircleIcon className="h-4 w-4 mr-1 ml-2" />
                            Resolved: {new Date(incident.resolvedAt).toLocaleString()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewIncident(incident)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </button>
                    {incident.status !== 'resolved' && (
                      <>
                        <button
                          onClick={() => handleAssignIncident(incident)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => handleResolveIncident(incident)}
                          className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Resolve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}