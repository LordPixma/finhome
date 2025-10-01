'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';

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

  useEffect(() => {
    loadDashboardData();
  }, []);

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

        // Calculate monthly totals (current month)
        const now = Date.now() / 1000;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const monthStart = startOfMonth.getTime() / 1000;

        const thisMonthTransactions = allTransactions.filter((t: Transaction) => t.date >= monthStart && t.date <= now);
        
        const income = thisMonthTransactions
          .filter((t: Transaction) => t.type === 'income')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
        
        const expenses = thisMonthTransactions
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your financial overview.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Balance */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-blue-100 text-sm font-medium">Total Balance</p>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
            <p className="text-blue-100 text-sm mt-2">{accounts.length} accounts</p>
          </div>

          {/* Monthly Income */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Monthly Income</p>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(monthlyIncome)}</p>
            <p className="text-gray-500 text-sm mt-2">This month</p>
          </div>

          {/* Monthly Expenses */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Monthly Expenses</p>
              <span className="text-2xl">📉</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(monthlyExpenses)}</p>
            <p className="text-gray-500 text-sm mt-2">This month</p>
          </div>

          {/* Net Savings */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Net Savings</p>
              <span className="text-2xl">🎯</span>
            </div>
            <p className={`text-3xl font-bold ${monthlyIncome - monthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(monthlyIncome - monthlyExpenses)}
            </p>
            <p className="text-gray-500 text-sm mt-2">This month</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Accounts */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Accounts</h2>
              <a href="/dashboard/accounts" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all →
              </a>
            </div>
            
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No accounts yet</p>
                <a
                  href="/dashboard/accounts"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add your first account
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl mr-4">
                        {account.type === 'checking' ? '🏦' : account.type === 'savings' ? '💰' : account.type === 'credit' ? '💳' : '💵'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{account.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{account.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
              <a href="/dashboard/transactions" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all →
              </a>
            </div>
            
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No transactions yet</p>
                <a
                  href="/dashboard/transactions"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add your first transaction
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center flex-1">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl mr-3">
                        {transaction.category?.icon || '💰'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
                        <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`text-lg font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/dashboard/transactions"
              className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-3xl mb-2">💸</span>
              <span className="text-sm font-medium text-gray-900">Add Transaction</span>
            </a>
            <a
              href="/dashboard/budgets"
              className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-3xl mb-2">🎯</span>
              <span className="text-sm font-medium text-gray-900">Set Budget</span>
            </a>
            <a
              href="/dashboard/bill-reminders"
              className="flex flex-col items-center justify-center p-6 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <span className="text-3xl mb-2">🔔</span>
              <span className="text-sm font-medium text-gray-900">Add Reminder</span>
            </a>
            <a
              href="/dashboard/import"
              className="flex flex-col items-center justify-center p-6 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <span className="text-3xl mb-2">📥</span>
              <span className="text-sm font-medium text-gray-900">Import File</span>
            </a>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
