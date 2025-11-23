'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategorizationStatsWidget } from '@/components/ai';
import StatCard from '@/components/StatCard';
import { DashboardTour } from '@/components/tour/DashboardTour';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ScaleIcon,
  CreditCardIcon,
  PlusIcon,
  ChartBarIcon,
  BellIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: number;
  category: {
    name: string;
    icon: string;
  };
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [timeRange, setTimeRange] = useState<'30days' | 'alltime'>('30days');
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());
  const [userSettings, setUserSettings] = useState<{currency: string; currencySymbol: string; dashboardTourCompleted?: boolean} | null>(null);
  const [runTour, setRunTour] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load user settings for currency
      try {
        const settingsRes = await api.getSettings() as any;
        if (settingsRes.success && settingsRes.data) {
          setUserSettings({
            currency: settingsRes.data.currency || 'GBP',
            currencySymbol: settingsRes.data.currencySymbol || '£',
            dashboardTourCompleted: settingsRes.data.dashboardTourCompleted || false
          });

          // Start tour if not completed
          if (!settingsRes.data.dashboardTourCompleted) {
            setTimeout(() => setRunTour(true), 1000);
          }
        }
      } catch (error) {
        console.error('Failed to load user settings:', error);
        // Use defaults if settings fail to load
        setUserSettings({ currency: 'GBP', currencySymbol: '£', dashboardTourCompleted: false });
      }

      // Load accounts
      const accountsRes = await api.getAccounts() as any;
      if (accountsRes.success) {
        const accountsList = accountsRes.data;
        setAccounts(accountsList);
        
        // Calculate total balance
        const total = accountsList.reduce((sum: number, acc: Account) => sum + acc.balance, 0);
        setTotalBalance(total);
      }

      // Load recent transactions
      const transactionsRes = await api.getTransactions() as any;
      if (transactionsRes.success) {
        const allTransactions = transactionsRes.data;
        
        // Get last 5 transactions
        const recent = allTransactions.slice(0, 5);
        setRecentTransactions(recent);

        // Calculate totals based on selected time range
        const now = Date.now() / 1000;
        let filteredTransactions = allTransactions;

        if (timeRange === '30days') {
          const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
          filteredTransactions = allTransactions.filter((t: Transaction) => 
            t.date >= thirtyDaysAgo && t.date <= now
          );
        }
        // For 'alltime', use all transactions (no filtering)
        
        const income = filteredTransactions
          .filter((t: Transaction) => t.type === 'income')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
        
        const expenses = filteredTransactions
          .filter((t: Transaction) => t.type === 'expense')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        setMonthlyIncome(income);
        setMonthlyExpenses(expenses);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const syncAccount = async (accountId: string) => {
    try {
      setSyncingAccounts(prev => new Set(prev).add(accountId));
      const response = await api.syncAccount(accountId) as any;

      if (response.success) {
        await loadDashboardData();
        console.log('Account synced successfully');
      } else {
        console.error('Failed to sync account:', response.error);
      }
    } catch (error) {
      console.error('Error syncing account:', error);
    } finally {
      setSyncingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    }
  };

  const handleTourFinish = async () => {
    setRunTour(false);
    try {
      await api.updateSettings({ dashboardTourCompleted: true });
    } catch (error) {
      console.error('Failed to update tour status:', error);
    }
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
        {/* Modern Header with Subtle Gradient */}
        <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 -mx-6 -mt-6 px-6 pt-8 pb-10 mb-6 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Financial Overview</h1>
              <p className="text-gray-600 text-base">Track your accounts, transactions, and financial health</p>
            </div>

            {/* Time Range Toggle - Modern Design */}
            <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-200/80">
              <button
                onClick={() => setTimeRange('30days')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  timeRange === '30days'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setTimeRange('alltime')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  timeRange === 'alltime'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Professional Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger" data-tour="monthly-summary">
          {/* Total Balance - Primary Gradient */}
          <StatCard
            title="Total Balance"
            value={formatCurrency(totalBalance, userSettings?.currency, userSettings?.currencySymbol)}
            subtitle={`${accounts.length} accounts`}
            icon={<CurrencyDollarIcon className="w-6 h-6 text-white" />}
            variant="primary"
            className="col-span-1"
          />

          {/* Monthly Income - Success */}
          <StatCard
            title="Income"
            value={formatCurrency(monthlyIncome, userSettings?.currency, userSettings?.currencySymbol)}
            subtitle={timeRange === '30days' ? 'Last 30 days' : 'All time'}
            icon={<ArrowTrendingUpIcon className="w-6 h-6 text-success-600" />}
            variant="success"
            className="col-span-1"
          />

          {/* Monthly Expenses - Error */}
          <StatCard
            title="Expenses"
            value={formatCurrency(monthlyExpenses, userSettings?.currency, userSettings?.currencySymbol)}
            subtitle={timeRange === '30days' ? 'Last 30 days' : 'All time'}
            icon={<ArrowTrendingDownIcon className="w-6 h-6 text-error-600" />}
            variant="error"
            className="col-span-1"
          />

          {/* Net Savings - Warning */}
          <StatCard
            title="Net Savings"
            value={formatCurrency(monthlyIncome - monthlyExpenses, userSettings?.currency, userSettings?.currencySymbol)}
            subtitle={timeRange === '30days' ? 'Last 30 days' : 'All time'}
            icon={<ScaleIcon className="w-6 h-6 text-warning-600" />}
            variant={monthlyIncome - monthlyExpenses >= 0 ? 'success' : 'error'}
            className="col-span-1"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Accounts Section - Modern Banking Design */}
          <div className="lg:col-span-2" data-tour="accounts-section">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-7 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-7">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Accounts</h2>
                  <p className="text-sm text-gray-500 mt-1.5">Manage your connected financial accounts</p>
                </div>
                <div className="flex items-center gap-3">
                  {accounts.length > 0 && (
                    <button
                      data-tour="sync-all-btn"
                      onClick={() => accounts.forEach(account => syncAccount(account.id))}
                      disabled={syncingAccounts.size > 0}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        syncingAccounts.size > 0
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 hover:border-primary-300'
                      }`}
                      title="Sync all bank-linked accounts"
                    >
                      <ArrowPathIcon
                        className={`w-4 h-4 ${
                          syncingAccounts.size > 0 ? 'animate-spin' : ''
                        }`}
                      />
                      Sync All
                    </button>
                  )}
                  <a
                    href="/dashboard/accounts"
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1 transition-colors"
                    data-tour="add-account-btn"
                  >
                    View all
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            
            {accounts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <CurrencyDollarIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-6">No accounts connected yet</p>
                <a
                  href="/dashboard/accounts"
                  className="btn-primary"
                  data-tour="add-account-btn"
                >
                  Add your first account
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account, index) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-card hover:border-gray-200 transition-all duration-200 animate-slide-in"
                    style={{ '--index': index } as any}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-sm text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {account.name[0]?.toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="font-semibold text-gray-900 text-sm truncate" title={account.name}>
                          {account.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{account.type} Account</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-base font-bold tabular-nums ${
                          account.balance >= 0 ? 'text-gray-900' : 'text-error-600'
                        }`}>
                          {formatCurrency(account.balance, userSettings?.currency, userSettings?.currencySymbol)}
                        </p>
                      </div>
                      <button
                        onClick={() => syncAccount(account.id)}
                        disabled={syncingAccounts.has(account.id)}
                        className={`p-2.5 rounded-lg border transition-all duration-200 ${
                          syncingAccounts.has(account.id)
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                            : 'border-primary-200 bg-primary-50 hover:bg-primary-100 hover:border-primary-300'
                        }`}
                        title="Sync account from bank"
                      >
                        <ArrowPathIcon
                          className={`w-4 h-4 text-primary-600 ${
                            syncingAccounts.has(account.id) ? 'animate-spin' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions - Modern Compact Design */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 hover:shadow-lg transition-all duration-300">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-1.5 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <PlusIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  Quick Actions
                </h2>
                <p className="text-sm text-gray-500">Manage your finances</p>
              </div>

              <div className="space-y-2.5">
                <a
                  href="/dashboard/transactions"
                  className="group flex items-center p-3.5 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:shadow-sm transition-all duration-200 w-full"
                  data-tour="add-transaction-btn"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-100 to-green-100 group-hover:from-emerald-200 group-hover:to-green-200 flex items-center justify-center transition-all shadow-sm">
                    <PlusIcon className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="ml-3.5">
                    <h3 className="text-sm font-bold text-gray-900">Add Transaction</h3>
                    <p className="text-xs text-gray-500">Record income or expense</p>
                  </div>
                </a>

                <a
                  href="/dashboard/budgets"
                  className="group flex items-center p-3.5 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:shadow-sm transition-all duration-200 w-full"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 group-hover:from-amber-200 group-hover:to-yellow-200 flex items-center justify-center transition-all shadow-sm">
                    <ChartBarIcon className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="ml-3.5">
                    <h3 className="text-sm font-bold text-gray-900">Set Budget</h3>
                    <p className="text-xs text-gray-500">Plan your spending</p>
                  </div>
                </a>

                <a
                  href="/dashboard/bill-reminders"
                  className="group flex items-center p-3.5 rounded-xl border border-gray-200 hover:border-rose-300 hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 hover:shadow-sm transition-all duration-200 w-full"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-100 to-pink-100 group-hover:from-rose-200 group-hover:to-pink-200 flex items-center justify-center transition-all shadow-sm">
                    <BellIcon className="w-5 h-5 text-rose-700" />
                  </div>
                  <div className="ml-3.5">
                    <h3 className="text-sm font-bold text-gray-900">Add Reminder</h3>
                    <p className="text-xs text-gray-500">Never miss bills</p>
                  </div>
                </a>

                <a
                  href="/dashboard/import"
                  className="group flex items-center p-3.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-sm transition-all duration-200 w-full"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200 flex items-center justify-center transition-all shadow-sm">
                    <ArrowUpTrayIcon className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="ml-3.5">
                    <h3 className="text-sm font-bold text-gray-900">Import File</h3>
                    <p className="text-xs text-gray-500">Upload statements</p>
                  </div>
                </a>
              </div>
            </div>

            {/* AI Categorization Stats - Now below Quick Actions */}
            <div data-tour="spending-insights">
              <CategorizationStatsWidget />
            </div>
          </div>
        </div>

        {/* Recent Transactions - Full Width Modern Design */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-7 hover:shadow-lg transition-all duration-300 mb-6" data-tour="recent-transactions">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Recent Transactions</h2>
              <p className="text-sm text-gray-500 mt-1.5">Your latest financial activity</p>
            </div>
            <a href="/dashboard/transactions" className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1 transition-colors">
              View all 
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <CreditCardIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-6">No transactions yet</p>
              <a
                href="/dashboard/transactions"
                className="btn-primary"
              >
                Add your first transaction
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-card hover:border-gray-200 transition-all duration-200 animate-slide-in"
                  style={{ '--index': index } as any}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                      transaction.type === 'income'
                        ? 'bg-gradient-to-br from-success-50 to-success-100 text-success-600 border border-success-200'
                        : 'bg-gradient-to-br from-error-50 to-error-100 text-error-600 border border-error-200'
                    }`}>
                      {transaction.type === 'income' ? (
                        <ArrowTrendingUpIcon className="w-5 h-5" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-semibold text-gray-900 text-sm truncate" title={transaction.description}>
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className="whitespace-nowrap">{formatDate(transaction.date)}</span>
                        {transaction.category?.name && (
                          <>
                            <span>•</span>
                            <span className="italic truncate">{transaction.category.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-sm tabular-nums ${
                      transaction.type === 'income' ? 'text-success-700' : 'text-error-700'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, userSettings?.currency, userSettings?.currencySymbol)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        </div>
      </DashboardLayout>
      <DashboardTour run={runTour} onFinish={handleTourFinish} />
    </ProtectedRoute>
  );
}
