'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  ShieldCheckIcon, 
  ShieldExclamationIcon, 
  KeyIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface MFAStatus {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantName: string;
  mfaEnabled: boolean;
  mfaMethod?: 'app' | 'sms' | 'email';
  backupCodes: number;
  lastMFASetup?: string;
  lastMFAUsed?: string;
  failedAttempts: number;
}

interface MFASettings {
  enforceMFA: boolean;
  allowedMethods: string[];
  maxFailedAttempts: number;
  backupCodesRequired: boolean;
  gracePeriodDays: number;
}



export default function MFAPage() {
  const [mfaUsers, setMfaUsers] = useState<MFAStatus[]>([]);
  const [mfaSettings, setMfaSettings] = useState<MFASettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mfaFilter, setMfaFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMFAData();
  }, []);

  const fetchMFAData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersResponse, settingsResponse] = await Promise.all([
        api.admin.getMFAUsers(),
        api.admin.getMFASettings()
      ]);

      if (usersResponse.success && settingsResponse.success) {
        setMfaUsers((usersResponse.data as MFAStatus[]) || []);
        setMfaSettings((settingsResponse.data as MFASettings) || null);
      } else {
        setError('Failed to load MFA data');
      }
    } catch (err) {
      console.error('MFA fetch error:', err);
      setError('Failed to load MFA data');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = mfaUsers.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMFA = mfaFilter === 'all' || 
                      (mfaFilter === 'enabled' && user.mfaEnabled) ||
                      (mfaFilter === 'disabled' && !user.mfaEnabled);
    
    return matchesSearch && matchesMFA;
  });

  const handleEnableMFA = async (user: MFAStatus) => {
    if (confirm(`Enable MFA for ${user.firstName} ${user.lastName}?`)) {
      try {
        const response = await api.admin.enableUserMFA(user.userId);
        if (response.success) {
          alert(`MFA setup initiated for ${user.firstName} ${user.lastName}`);
          fetchMFAData(); // Refresh data
        } else {
          alert('Failed to enable MFA');
        }
      } catch (err) {
        console.error('Enable MFA error:', err);
        alert('Failed to enable MFA');
      }
    }
  };

  const handleDisableMFA = async (user: MFAStatus) => {
    if (confirm(`Disable MFA for ${user.firstName} ${user.lastName}? This will reduce account security.`)) {
      try {
        const response = await api.admin.disableUserMFA(user.userId);
        if (response.success) {
          alert(`MFA has been disabled for ${user.firstName} ${user.lastName}`);
          fetchMFAData(); // Refresh data
        } else {
          alert('Failed to disable MFA');
        }
      } catch (err) {
        console.error('Disable MFA error:', err);
        alert('Failed to disable MFA');
      }
    }
  };

  const handleResetMFA = async (user: MFAStatus) => {
    if (confirm(`Reset MFA for ${user.firstName} ${user.lastName}? They will need to set it up again.`)) {
      try {
        const response = await api.admin.resetUserMFA(user.userId);
        if (response.success) {
          alert(`MFA has been reset for ${user.firstName} ${user.lastName}`);
          fetchMFAData(); // Refresh data
        } else {
          alert('Failed to reset MFA');
        }
      } catch (err) {
        console.error('Reset MFA error:', err);
        alert('Failed to reset MFA');
      }
    }
  };

  const handleGenerateBackupCodes = async (user: MFAStatus) => {
    if (confirm(`Generate new backup codes for ${user.firstName} ${user.lastName}?`)) {
      try {
        const response = await api.admin.generateBackupCodes(user.userId);
        if (response.success) {
          alert(`New backup codes generated for ${user.firstName} ${user.lastName}`);
          fetchMFAData(); // Refresh data
        } else {
          alert('Failed to generate backup codes');
        }
      } catch (err) {
        console.error('Generate backup codes error:', err);
        alert('Failed to generate backup codes');
      }
    }
  };

  const handleUpdateSettings = async () => {
    if (!mfaSettings) return;
    
    try {
      const response = await api.admin.updateMFASettings(mfaSettings);
      if (response.success) {
        alert('MFA settings updated successfully');
      } else {
        alert('Failed to update MFA settings');
      }
    } catch (err) {
      console.error('Update settings error:', err);
      alert('Failed to update MFA settings');
    }
  };

  const getMFAMethodBadge = (method?: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (method) {
      case 'app':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'sms':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'email':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getMFAIcon = (enabled: boolean, method?: string) => {
    if (!enabled) {
      return <ShieldExclamationIcon className="h-5 w-5 text-red-500" />;
    }
    
    switch (method) {
      case 'app':
        return <DevicePhoneMobileIcon className="h-5 w-5 text-blue-500" />;
      case 'sms':
        return <DevicePhoneMobileIcon className="h-5 w-5 text-green-500" />;
      case 'email':
        return <KeyIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <ShieldCheckIcon className="h-5 w-5 text-green-500" />;
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Multi-Factor Authentication</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
          <button 
            onClick={() => fetchMFAData()} 
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!mfaSettings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multi-Factor Authentication</h1>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-500">No MFA settings available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multi-Factor Authentication</h1>
          <p className="mt-2 text-gray-600">
            Manage MFA settings and monitor user authentication security across the platform
          </p>
        </div>
      </div>

      {/* MFA Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Global MFA Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enforce MFA</label>
                  <p className="text-xs text-gray-500">Require all users to enable MFA</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={mfaSettings.enforceMFA}
                    onChange={(e) => setMfaSettings({ ...mfaSettings, enforceMFA: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Backup Codes Required</label>
                  <p className="text-xs text-gray-500">Users must generate backup codes</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={mfaSettings.backupCodesRequired}
                    onChange={(e) => setMfaSettings({ ...mfaSettings, backupCodesRequired: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Failed Attempts</label>
                <input
                  type="number"
                  value={mfaSettings.maxFailedAttempts}
                  onChange={(e) => setMfaSettings({ ...mfaSettings, maxFailedAttempts: Number(e.target.value) })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (Days)</label>
                <input
                  type="number"
                  value={mfaSettings.gracePeriodDays}
                  onChange={(e) => setMfaSettings({ ...mfaSettings, gracePeriodDays: Number(e.target.value) })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={handleUpdateSettings}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Update Settings
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <select
              value={mfaFilter}
              onChange={(e) => setMfaFilter(e.target.value as any)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            >
              <option value="all">All Users</option>
              <option value="enabled">MFA Enabled</option>
              <option value="disabled">MFA Disabled</option>
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
                <ShieldCheckIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">MFA Enabled</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {mfaUsers.filter(u => u.mfaEnabled).length}
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
                <ShieldExclamationIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">MFA Disabled</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {mfaUsers.filter(u => !u.mfaEnabled).length}
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
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed Attempts</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {mfaUsers.reduce((sum, u) => sum + u.failedAttempts, 0)}
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
                <CheckCircleIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Compliance Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {Math.round((mfaUsers.filter(u => u.mfaEnabled).length / mfaUsers.length) * 100)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MFA Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Backup Codes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Failed Attempts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            {getMFAIcon(user.mfaEnabled, user.mfaMethod)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.tenantName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.mfaEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.mfaMethod ? (
                        <span className={getMFAMethodBadge(user.mfaMethod)}>
                          {user.mfaMethod.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.backupCodes}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${user.failedAttempts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {user.failedAttempts}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastMFAUsed 
                        ? new Date(user.lastMFAUsed).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {user.mfaEnabled ? (
                          <>
                            <button
                              onClick={() => handleResetMFA(user)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Reset
                            </button>
                            <button
                              onClick={() => handleGenerateBackupCodes(user)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Backup Codes
                            </button>
                            <button
                              onClick={() => handleDisableMFA(user)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Disable
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEnableMFA(user)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Enable MFA
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}