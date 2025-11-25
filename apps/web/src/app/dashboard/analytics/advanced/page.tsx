'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { InteractiveChart } from '@/components/InteractiveChart';
import {
  ChartBarIcon,
  BanknotesIcon,
  ClockIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface AccountPerformance {
  accountId: string;
  accountName: string;
  accountType: string;
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
  avgTransaction: number;
  netCashflow: number;
}

interface TopMerchant {
  description: string;
  categoryName: string;
  transactionCount: number;
  totalAmount: number;
  avgAmount: number;
}

interface VelocityData {
  byDayOfWeek: Array<{
    dayOfWeek: number;
    dayName: string;
    transactionCount: number;
    totalAmount: number;
    avgAmount: number;
  }>;
  byHourOfDay: Array<{
    hour: number;
    transactionCount: number;
    totalAmount: number;
  }>;
}

interface ComparativeData {
  period: string;
  startDate: string;
  endDate: string;
  stats: {
    totalIncome: number;
    totalExpenses: number;
    transactionCount: number;
    avgTransaction: number;
    netCashflow: number;
  };
  topCategories: Array<{
    categoryName: string;
    totalAmount: number;
  }>;
}

export default function AdvancedAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [accountPerformance, setAccountPerformance] = useState<AccountPerformance[]>([]);
  const [topMerchants, setTopMerchants] = useState<TopMerchant[]>([]);
  const [velocityData, setVelocityData] = useState<VelocityData | null>(null);
  const [comparativeData, setComparativeData] = useState<ComparativeData[]>([]);
  const [dateRange, setDateRange] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  const [comparativePeriod, setComparativePeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, comparativePeriod]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      default:
        return { startDate: undefined, endDate: undefined };
    }

    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    };
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const { startDate, endDate } = getDateRange();

      const [accountPerfResponse, merchantsResponse, velocityResponse, comparativeResponse] = await Promise.all([
        api.getAccountPerformance(startDate, endDate),
        api.getTopMerchants(10, startDate, endDate),
        api.getTransactionVelocity(startDate, endDate),
        api.getComparativeAnalytics(comparativePeriod, 6),
      ]);

      if (accountPerfResponse.success) {
        setAccountPerformance(accountPerfResponse.data as AccountPerformance[]);
      }

      if (merchantsResponse.success) {
        setTopMerchants(merchantsResponse.data as TopMerchant[]);
      }

      if (velocityResponse.success) {
        setVelocityData(velocityResponse.data as VelocityData);
      }

      if (comparativeResponse.success) {
        setComparativeData(comparativeResponse.data as ComparativeData[]);
      }
    } catch (error) {
      console.error('Failed to load advanced analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/20 -mx-6 -mt-6 px-6 pt-8 pb-10 mb-8 border-b border-gray-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-lg">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Advanced Analytics</h1>
              </div>
              <p className="text-gray-600">Deep insights into your financial patterns and trends</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                {(['3m', '6m', '1y', 'all'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      dateRange === range
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range === '3m' ? '3M' : range === '6m' ? '6M' : range === '1y' ? '1Y' : 'All'}
                  </button>
                ))}
              </div>
              <Button onClick={handleRefresh} icon={<ArrowPathIcon className="w-4 h-4" />}>
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Account Performance Section */}
        <div className="mb-8">
          <Card>
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                  <BanknotesIcon className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle>Account Performance</CardTitle>
              </div>
              <p className="text-sm text-gray-500 mt-2">Compare financial activity across all accounts</p>
            </CardHeader>
            <CardContent className="p-6">
              {accountPerformance.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No account data available</p>
              ) : (
                <div className="space-y-4">
                  {accountPerformance.map((account) => (
                    <div
                      key={account.accountId}
                      className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{account.accountName}</h3>
                          <p className="text-sm text-gray-500">{account.accountType}</p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${
                              account.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(account.netCashflow)}
                          </p>
                          <p className="text-xs text-gray-500">Net Cashflow</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Income</p>
                          <p className="font-semibold text-green-600">{formatCurrency(account.totalIncome)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Expenses</p>
                          <p className="font-semibold text-red-600">{formatCurrency(account.totalExpenses)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Transactions</p>
                          <p className="font-semibold text-gray-900">{account.transactionCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Avg Transaction</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(account.avgTransaction)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Merchants Section */}
        <div className="mb-8">
          <Card>
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                  <ShoppingBagIcon className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle>Top Merchants</CardTitle>
              </div>
              <p className="text-sm text-gray-500 mt-2">Most frequent transaction partners</p>
            </CardHeader>
            <CardContent className="p-6">
              {topMerchants.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No merchant data available</p>
              ) : (
                <div className="space-y-3">
                  {topMerchants.map((merchant, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{merchant.description}</p>
                          <p className="text-xs text-gray-500">{merchant.categoryName || 'Uncategorized'}</p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-gray-900">{formatCurrency(merchant.totalAmount)}</p>
                        <p className="text-xs text-gray-500">{merchant.transactionCount} transactions</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction Velocity Section */}
        {velocityData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
                    <ClockIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <CardTitle>Spending by Day of Week</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <InteractiveChart
                  title="Day of Week Analysis"
                  data={velocityData.byDayOfWeek.map((day) => ({
                    name: day.dayName,
                    value: day.totalAmount,
                    count: day.transactionCount,
                  }))}
                  type="bar"
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg">
                    <ClockIcon className="w-5 h-5 text-pink-600" />
                  </div>
                  <CardTitle>Transaction Distribution by Hour</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <InteractiveChart
                  title="Hour of Day Analysis"
                  data={velocityData.byHourOfDay.map((hour) => ({
                    name: `${hour.hour}:00`,
                    value: hour.totalAmount,
                    count: hour.transactionCount,
                  }))}
                  type="area"
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Comparative Analysis Section */}
        <div className="mb-8">
          <Card>
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg">
                      <ArrowTrendingUpIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <CardTitle>Period-over-Period Comparison</CardTitle>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Compare financial metrics across time periods</p>
                </div>
                <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                  {(['month', 'quarter', 'year'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setComparativePeriod(period)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        comparativePeriod === period
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {comparativeData.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No comparative data available</p>
              ) : (
                <div className="space-y-4">
                  {comparativeData.map((period, index) => {
                    const prevPeriod = comparativeData[index + 1];
                    const incomeChange = prevPeriod
                      ? ((period.stats.totalIncome - prevPeriod.stats.totalIncome) / prevPeriod.stats.totalIncome) * 100
                      : 0;
                    const expenseChange = prevPeriod
                      ? ((period.stats.totalExpenses - prevPeriod.stats.totalExpenses) / prevPeriod.stats.totalExpenses) *
                        100
                      : 0;

                    return (
                      <div
                        key={period.period}
                        className="p-4 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-lg border border-indigo-200/50"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-lg text-gray-900">{period.period}</h3>
                          <p
                            className={`text-xl font-bold ${
                              period.stats.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(period.stats.netCashflow)}
                          </p>
                        </div>
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Income</p>
                            <p className="font-semibold text-green-600">{formatCurrency(period.stats.totalIncome)}</p>
                            {prevPeriod && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                {incomeChange >= 0 ? (
                                  <ArrowTrendingUpIcon className="w-3 h-3 text-green-600" />
                                ) : (
                                  <ArrowTrendingDownIcon className="w-3 h-3 text-red-600" />
                                )}
                                {Math.abs(incomeChange).toFixed(1)}%
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Expenses</p>
                            <p className="font-semibold text-red-600">{formatCurrency(period.stats.totalExpenses)}</p>
                            {prevPeriod && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                {expenseChange >= 0 ? (
                                  <ArrowTrendingUpIcon className="w-3 h-3 text-red-600" />
                                ) : (
                                  <ArrowTrendingDownIcon className="w-3 h-3 text-green-600" />
                                )}
                                {Math.abs(expenseChange).toFixed(1)}%
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Transactions</p>
                            <p className="font-semibold text-gray-900">{period.stats.transactionCount}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Avg Transaction</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(period.stats.avgTransaction)}</p>
                          </div>
                        </div>
                        {period.topCategories.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">Top Categories</p>
                            <div className="flex flex-wrap gap-2">
                              {period.topCategories.map((cat, catIndex) => (
                                <div key={catIndex} className="px-2 py-1 bg-white rounded-md text-xs">
                                  <span className="font-medium">{cat.categoryName || 'Uncategorized'}</span>
                                  <span className="text-gray-500 ml-1">{formatCurrency(cat.totalAmount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
