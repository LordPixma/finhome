'use client';

import { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  UsersIcon, 
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  overview: {
    totalTenants: number;
    totalUsers: number;
    totalTransactions: number;
    totalRevenue: number;
    monthlyGrowth: {
      tenants: number;
      users: number;
      transactions: number;
      revenue: number;
    };
  };
  tenantAnalytics: {
    topTenants: Array<{
      id: string;
      name: string;
      userCount: number;
      transactionCount: number;
      revenue: number;
    }>;
    tenantsByPlan: {
      free: number;
      basic: number;
      premium: number;
      enterprise: number;
    };
  };
  userActivity: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    newUsers: number;
    churnRate: number;
  };
  usage: {
    apiCalls: number;
    storageUsed: number;
    bandwidthUsed: number;
    averageSessionDuration: number;
  };
}

const mockAnalytics: AnalyticsData = {
  overview: {
    totalTenants: 1234,
    totalUsers: 15678,
    totalTransactions: 456789,
    totalRevenue: 125000,
    monthlyGrowth: {
      tenants: 12.5,
      users: 18.3,
      transactions: 25.7,
      revenue: 22.1
    }
  },
  tenantAnalytics: {
    topTenants: [
      { id: '1', name: 'Acme Corporation', userCount: 245, transactionCount: 5432, revenue: 15000 },
      { id: '2', name: 'TechStart Inc', userCount: 189, transactionCount: 3456, revenue: 12000 },
      { id: '3', name: 'Global Finance Ltd', userCount: 167, transactionCount: 2987, revenue: 9500 },
      { id: '4', name: 'Innovation Labs', userCount: 134, transactionCount: 2234, revenue: 8200 },
      { id: '5', name: 'Digital Solutions', userCount: 123, transactionCount: 1876, revenue: 7100 }
    ],
    tenantsByPlan: {
      free: 456,
      basic: 567,
      premium: 189,
      enterprise: 22
    }
  },
  userActivity: {
    dailyActiveUsers: 8932,
    weeklyActiveUsers: 12456,
    monthlyActiveUsers: 14567,
    newUsers: 234,
    churnRate: 3.2
  },
  usage: {
    apiCalls: 2456789,
    storageUsed: 1.2, // TB
    bandwidthUsed: 3.4, // TB
    averageSessionDuration: 18.5 // minutes
  }
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setAnalytics(mockAnalytics);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeRange]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTrendIcon = (value: number) => {
    return value >= 0 ? (
      <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
    ) : (
      <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
    );
  };

  const getTrendColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return <div>No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Platform insights, tenant analytics, and usage statistics
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Tenants</dt>
                  <dd className="flex items-center">
                    <div className="text-lg font-medium text-gray-900">
                      {formatNumber(analytics.overview.totalTenants)}
                    </div>
                    <div className={`ml-2 flex items-center text-sm ${getTrendColor(analytics.overview.monthlyGrowth.tenants)}`}>
                      {getTrendIcon(analytics.overview.monthlyGrowth.tenants)}
                      <span className="ml-1">{Math.abs(analytics.overview.monthlyGrowth.tenants)}%</span>
                    </div>
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
                <UsersIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="flex items-center">
                    <div className="text-lg font-medium text-gray-900">
                      {formatNumber(analytics.overview.totalUsers)}
                    </div>
                    <div className={`ml-2 flex items-center text-sm ${getTrendColor(analytics.overview.monthlyGrowth.users)}`}>
                      {getTrendIcon(analytics.overview.monthlyGrowth.users)}
                      <span className="ml-1">{Math.abs(analytics.overview.monthlyGrowth.users)}%</span>
                    </div>
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
                <ChartBarIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Transactions</dt>
                  <dd className="flex items-center">
                    <div className="text-lg font-medium text-gray-900">
                      {formatNumber(analytics.overview.totalTransactions)}
                    </div>
                    <div className={`ml-2 flex items-center text-sm ${getTrendColor(analytics.overview.monthlyGrowth.transactions)}`}>
                      {getTrendIcon(analytics.overview.monthlyGrowth.transactions)}
                      <span className="ml-1">{Math.abs(analytics.overview.monthlyGrowth.transactions)}%</span>
                    </div>
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
                <CurrencyDollarIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="flex items-center">
                    <div className="text-lg font-medium text-gray-900">
                      {formatCurrency(analytics.overview.totalRevenue)}
                    </div>
                    <div className={`ml-2 flex items-center text-sm ${getTrendColor(analytics.overview.monthlyGrowth.revenue)}`}>
                      {getTrendIcon(analytics.overview.monthlyGrowth.revenue)}
                      <span className="ml-1">{Math.abs(analytics.overview.monthlyGrowth.revenue)}%</span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Activity */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full"></div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Daily Active</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(analytics.userActivity.dailyActiveUsers)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full"></div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Weekly Active</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(analytics.userActivity.weeklyActiveUsers)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-2 h-2 bg-purple-400 rounded-full"></div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Active</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(analytics.userActivity.monthlyActiveUsers)}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">New Users</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(analytics.userActivity.newUsers)}
                  </dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Churn Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {analytics.userActivity.churnRate}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Tenants & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tenants */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Tenants</h3>
            <div className="space-y-3">
              {analytics.tenantAnalytics.topTenants.map((tenant, index) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-600">#{index + 1}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-xs text-gray-500">
                        {tenant.userCount} users • {formatNumber(tenant.transactionCount)} transactions
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(tenant.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Tenants by Plan</h3>
            <div className="space-y-4">
              {Object.entries(analytics.tenantAnalytics.tenantsByPlan).map(([plan, count]) => (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">{plan}</span>
                    <span className="text-sm text-gray-500">{count} tenants</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        plan === 'enterprise' ? 'bg-purple-600' :
                        plan === 'premium' ? 'bg-blue-600' :
                        plan === 'basic' ? 'bg-green-600' : 'bg-gray-400'
                      }`} 
                      style={{ width: `${(count / analytics.overview.totalTenants) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Usage Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(analytics.usage.apiCalls)}
              </div>
              <div className="text-sm text-gray-500">API Calls</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {analytics.usage.storageUsed.toFixed(1)} TB
              </div>
              <div className="text-sm text-gray-500">Storage Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {analytics.usage.bandwidthUsed.toFixed(1)} TB
              </div>
              <div className="text-sm text-gray-500">Bandwidth Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {analytics.usage.averageSessionDuration.toFixed(1)} min
              </div>
              <div className="text-sm text-gray-500">Avg Session</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Growth Trends</h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Growth Trend Charts</h3>
              <p className="mt-1 text-sm text-gray-500">
                Chart components would be integrated here showing tenant, user, and revenue growth over time
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}