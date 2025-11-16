'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch real data from API
        const [tenantsResponse, usersResponse] = await Promise.all([
          api.admin.getTenants(),
          api.admin.getUsers(),
        ]);
        
        console.log('Tenants response:', tenantsResponse);
        console.log('Users response:', usersResponse);
        
        // Calculate stats from the actual data
        const tenantData = Array.isArray(tenantsResponse.data) ? tenantsResponse.data : [];
        const userData = Array.isArray(usersResponse.data) ? usersResponse.data : [];
        
        const calculatedStats: PlatformStats = {
          totalTenants: tenantData.length,
          totalUsers: userData.length,
          totalGlobalAdmins: userData.filter((u: any) => u.role === 'super_admin').length,
          recentTenants: tenantData.filter((t: any) => {
            const created = new Date(t.createdAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return created > thirtyDaysAgo;
          }).length,
          recentUsers: userData.filter((u: any) => {
            const created = new Date(u.createdAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return created > thirtyDaysAgo;
          }).length,
        };

        setStats(calculatedStats);
        setTenants(tenantData);
        
        // Convert user data to the expected format
        const formattedUsers: User[] = userData.map((user: any) => ({
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          role: user.role,
          isGlobalAdmin: user.role === 'super_admin',
          tenantName: user.tenantName || 'Unknown',
          subdomain: user.subdomain || 'unknown',
          createdAt: user.createdAt,
        }));
        
        setUsers(formattedUsers);
        
        // Set empty audit log for now (can be implemented later with proper admin audit endpoint)
        setAuditLog([]);      } catch (err: any) {
        setError(`Failed to fetch admin data: ${err.message}`);
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

  const handleMakeGlobalAdmin = async (_userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to make ${userName} a global admin?`)) {
      return;
    }

    try {
      // For now, this would need to be implemented in the admin API
      // await api.admin.makeUserGlobalAdmin(userId);
      alert(`Global admin promotion feature not yet implemented for regular admin interface`);
    } catch (error: any) {
      alert(`Failed to make user global admin: ${error.message}`);
    }
  };  const handleViewTenantDetails = (tenant: Tenant) => {
    alert(`Viewing details for ${tenant.name} - This would open a detailed view`);
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
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => handleViewTenantDetails(tenant)}
                    >
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
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleMakeGlobalAdmin(user.id, user.name)}
                      >
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