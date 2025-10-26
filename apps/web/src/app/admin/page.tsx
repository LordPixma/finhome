'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface PlatformStats {
  totalTenants: number;
  totalUsers: number;
  totalGlobalAdmins: number;
  recentTenants: number;
  recentUsers: number;
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isGlobalAdmin: boolean;
  tenantName: string;
  subdomain: string;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
  adminName: string;
  adminEmail: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'users' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock API calls for now - would need proper global admin auth
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Mock data for demonstration
        setStats({
          totalTenants: 42,
          totalUsers: 156,
          totalGlobalAdmins: 3,
          recentTenants: 8,
          recentUsers: 23,
        });
        
        setTenants([
          {
            id: '1',
            name: 'Acme Corp',
            subdomain: 'acme',
            createdAt: '2024-10-20T10:00:00Z',
          },
          {
            id: '2',
            name: 'TechStart Inc',
            subdomain: 'techstart',
            createdAt: '2024-10-19T14:30:00Z',
          },
        ]);
        
        setUsers([
          {
            id: '1',
            email: 'admin@acme.com',
            name: 'John Smith',
            role: 'admin',
            isGlobalAdmin: false,
            tenantName: 'Acme Corp',
            subdomain: 'acme',
            createdAt: '2024-10-20T10:05:00Z',
          },
          {
            id: '2',
            email: 'global@finhome360.com',
            name: 'Global Admin',
            role: 'admin',
            isGlobalAdmin: true,
            tenantName: '',
            subdomain: '',
            createdAt: '2024-10-01T09:00:00Z',
          },
        ]);
        
        setAuditLog([
          {
            id: '1',
            action: 'view_stats',
            targetType: 'system',
            targetId: '',
            details: '{}',
            ipAddress: '192.168.1.1',
            createdAt: '2024-10-26T12:00:00Z',
            adminName: 'Global Admin',
            adminEmail: 'global@finhome360.com',
          },
        ]);
        
      } catch (err) {
        setError('Failed to fetch admin data');
        console.error('Admin fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <h3 className="font-medium">Error Loading Admin Data</h3>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'tenants', name: 'Tenants' },
            { id: 'users', name: 'Users' },
            { id: 'audit', name: 'Audit Log' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Tenants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTenants}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Global Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalGlobalAdmins}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">New Tenants (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.recentTenants}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">New Users (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.recentUsers}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tenants Tab */}
      {activeTab === 'tenants' && (
        <Card>
          <CardHeader>
            <CardTitle>Tenant Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{tenant.name}</h3>
                    <p className="text-sm text-gray-600">{tenant.subdomain}.finhome360.com</p>
                    <p className="text-xs text-gray-500">Created: {formatDate(tenant.createdAt)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="secondary" size="sm">
                      View Details
                    </Button>
                    <Button variant="danger" size="sm">
                      Suspend
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{user.name}</h3>
                      {user.isGlobalAdmin && (
                        <Badge variant="destructive">Global Admin</Badge>
                      )}
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    {user.tenantName && (
                      <p className="text-xs text-gray-500">
                        Tenant: {user.tenantName} ({user.subdomain})
                      </p>
                    )}
                    <p className="text-xs text-gray-500">Created: {formatDate(user.createdAt)}</p>
                  </div>
                  <div className="flex space-x-2">
                    {!user.isGlobalAdmin && (
                      <Button variant="secondary" size="sm">
                        Make Global Admin
                      </Button>
                    )}
                    <Button variant="danger" size="sm">
                      Suspend
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditLog.map((entry) => (
                <div key={entry.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{entry.action}</Badge>
                        <span className="text-sm text-gray-600">{entry.targetType}</span>
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {entry.adminName} ({entry.adminEmail})
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(entry.createdAt)} • IP: {entry.ipAddress}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}