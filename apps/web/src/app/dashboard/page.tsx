'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategorizationStatsWidget } from '@/components/ai';
import StatCard from '@/components/StatCard';
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

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
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
        {/* Professional Header with Gradient Background */}
        <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 -mx-6 -mt-6 px-6 pt-6 pb-8 mb-8 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here's your financial overview.</p>
            </div>
            
            {/* Time Range Toggle */}
            <div className="flex gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => setTimeRange('30days')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  timeRange === '30days'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setTimeRange('alltime')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  timeRange === 'alltime'
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Professional Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger">
          {/* Total Balance - Primary Gradient */}
          <StatCard
            title="Total Balance"
            value={formatCurrency(totalBalance)}
            subtitle={`${accounts.length} accounts`}
            icon={<CurrencyDollarIcon className="w-6 h-6 text-white" />}
            variant="primary"
            className="col-span-1"
          />

          {/* Monthly Income - Success */}
          <StatCard
            title="Income"
            value={formatCurrency(monthlyIncome)}
            subtitle={timeRange === '30days' ? 'Last 30 days' : 'All time'}
            icon={<ArrowTrendingUpIcon className="w-6 h-6 text-success-600" />}
            variant="success"
            className="col-span-1"
          />

          {/* Monthly Expenses - Error */}
          <StatCard
            title="Expenses"
            value={formatCurrency(monthlyExpenses)}
            subtitle={timeRange === '30days' ? 'Last 30 days' : 'All time'}
            icon={<ArrowTrendingDownIcon className="w-6 h-6 text-error-600" />}
            variant="error"
            className="col-span-1"
          />

          {/* Net Savings - Warning */}
          <StatCard
            title="Net Savings"
            value={formatCurrency(monthlyIncome - monthlyExpenses)}
            subtitle={timeRange === '30days' ? 'Last 30 days' : 'All time'}
            icon={<ScaleIcon className="w-6 h-6 text-warning-600" />}
            variant={monthlyIncome - monthlyExpenses >= 0 ? 'success' : 'error'}
            className="col-span-1"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Accounts Section - Enhanced Design */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 hover:shadow-card-hover transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Accounts</h2>
                  <p className="text-sm text-gray-600 mt-1">Your financial accounts overview</p>
                </div>
                <a href="/dashboard/accounts" className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1 transition-colors">
                  View all 
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
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
                >
                  Add your first account
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account, index) => (
                  <div 
                    key={account.id} 
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:shadow-card transition-all duration-200 animate-slide-in"
                    style={{ '--index': index } as any}
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 shadow-card text-white flex items-center justify-center font-semibold text-lg mr-4">
                        {account.name[0]?.toUpperCase() || 'A'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-base">{account.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{account.type} Account</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold tabular-nums ${
                        account.balance >= 0 ? 'text-gray-900' : 'text-error-600'
                      }`}>
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Quick Actions - Moved to right side */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <div className="p-1.5 bg-primary-100 rounded-lg">
                    <PlusIcon className="w-4 h-4 text-primary-600" />
                  </div>
                  Quick Actions
                </h2>
                <p className="text-sm text-gray-600">Common tasks to manage your finances</p>
              </div>
              
              <div className="space-y-3">
                <a
                  href="/dashboard/transactions"
                  className="group flex items-center p-4 rounded-lg border border-gray-200 hover:border-success-300 hover:bg-success-50 transition-all duration-200 w-full"
                >
                  <div className="w-10 h-10 rounded-lg bg-success-100 group-hover:bg-success-200 flex items-center justify-center transition-colors">
                    <PlusIcon className="w-5 h-5 text-success-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-base font-semibold text-gray-900">Add Transaction</h3>
                    <p className="text-sm text-gray-600">Record income or expense</p>
                  </div>
                </a>
                
                <a
                  href="/dashboard/budgets"
                  className="group flex items-center p-4 rounded-lg border border-gray-200 hover:border-warning-300 hover:bg-warning-50 transition-all duration-200 w-full"
                >
                  <div className="w-10 h-10 rounded-lg bg-warning-100 group-hover:bg-warning-200 flex items-center justify-center transition-colors">
                    <ChartBarIcon className="w-5 h-5 text-warning-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-base font-semibold text-gray-900">Set Budget</h3>
                    <p className="text-sm text-gray-600">Plan your spending</p>
                  </div>
                </a>
                
                <a
                  href="/dashboard/bill-reminders"
                  className="group flex items-center p-4 rounded-lg border border-gray-200 hover:border-error-300 hover:bg-error-50 transition-all duration-200 w-full"
                >
                  <div className="w-10 h-10 rounded-lg bg-error-100 group-hover:bg-error-200 flex items-center justify-center transition-colors">
                    <BellIcon className="w-5 h-5 text-error-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-base font-semibold text-gray-900">Add Reminder</h3>
                    <p className="text-sm text-gray-600">Never miss bills</p>
                  </div>
                </a>
                
                <a
                  href="/dashboard/import"
                  className="group flex items-center p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 w-full"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-100 group-hover:bg-primary-200 flex items-center justify-center transition-colors">
                    <ArrowUpTrayIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-base font-semibold text-gray-900">Import File</h3>
                    <p className="text-sm text-gray-600">Upload statements</p>
                  </div>
                </a>
              </div>
            </div>

            {/* AI Categorization Stats - Now below Quick Actions */}
            <div>
              <CategorizationStatsWidget />
            </div>
          </div>
        </div>

        {/* Recent Transactions - Full Width */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 hover:shadow-card-hover transition-shadow duration-300 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Recent Transactions</h2>
              <p className="text-sm text-gray-600 mt-1">Your latest financial activity</p>
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
                  className="flex items-center p-4 border border-gray-100 rounded-xl hover:shadow-card transition-all duration-200 animate-slide-in"
                  style={{ '--index': index } as any}
                >
                  <div className="flex items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shadow-sm ${
                      transaction.type === 'income' 
                        ? 'bg-success-50 text-success-600'
                        : 'bg-error-50 text-error-600'
                    }`}>
                      {transaction.type === 'income' ? <ArrowTrendingUpIcon className="w-5 h-5" /> : <ArrowTrendingDownIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate" title={transaction.description}>
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span>{formatDate(transaction.date)}</span>
                        {transaction.category?.name && (
                          <>
                            <span>•</span>
                            <span className="italic">{transaction.category.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className={`currency ${transaction.type === 'income' ? 'currency-positive' : 'currency-negative'}`}>
                      {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
