'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  id: string;
  amount: number;
  date: number;
  type: 'income' | 'expense';
  categoryId: string;
  category?: {
    name: string;
    color?: string;
  };
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface CategoryData {
  categoryId: string;
  categoryName: string;
  amount: number;
  color?: string;
  percentage: number;
}

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'3m' | '6m' | '1y' | 'all'>('6m');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const response = await api.getTransactions() as any;
      if (response.success) {
        setTransactions(response.data);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter transactions by date range
  const getFilteredTransactions = () => {
    const now = Date.now();
    let startDate = 0;

    switch (dateRange) {
      case '3m':
        startDate = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case '6m':
        startDate = now - 180 * 24 * 60 * 60 * 1000;
        break;
      case '1y':
        startDate = now - 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        startDate = 0;
    }

    return transactions.filter((t) => t.date >= startDate);
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate monthly trends
  const getMonthlyData = (): MonthlyData[] => {
    const monthlyMap: Record<string, MonthlyData> = {};

    filteredTransactions.forEach((t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthLabel, income: 0, expense: 0 };
      }

      if (t.type === 'income') {
        monthlyMap[monthKey].income += Math.abs(t.amount);
      } else {
        monthlyMap[monthKey].expense += Math.abs(t.amount);
      }
    });

    return Object.values(monthlyMap).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Calculate category breakdown
  const getCategoryBreakdown = (type: 'income' | 'expense'): CategoryData[] => {
    const categoryMap: Record<string, { name: string; amount: number; color?: string }> = {};

    filteredTransactions
      .filter((t) => t.type === type)
      .forEach((t) => {
        const catId = t.categoryId;
        const catName = t.category?.name || 'Uncategorized';
        const catColor = t.category?.color;

        if (!categoryMap[catId]) {
          categoryMap[catId] = { name: catName, amount: 0, color: catColor };
        }
        categoryMap[catId].amount += Math.abs(t.amount);
      });

    const total = Object.values(categoryMap).reduce((sum, cat) => sum + cat.amount, 0);

    return Object.entries(categoryMap)
      .map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        amount: data.amount,
        color: data.color,
        percentage: total > 0 ? (data.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const monthlyData = getMonthlyData();
  const expenseCategories = getCategoryBreakdown('expense');
  const incomeCategories = getCategoryBreakdown('income');

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Calculate max values for chart scaling
  const maxMonthlyAmount = Math.max(
    ...monthlyData.map((m) => Math.max(m.income, m.expense)),
    1
  );

  const handleExport = () => {
    const csvContent = [
      ['Month', 'Income', 'Expense', 'Net'],
      ...monthlyData.map((m) => [
        m.month,
        m.income.toFixed(2),
        m.expense.toFixed(2),
        (m.income - m.expense).toFixed(2),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">Insights into your financial health</p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
              {(['3m', '6m', '1y', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range === '3m' ? '3 Months' : range === '6m' ? '6 Months' : range === '1y' ? '1 Year' : 'All Time'}
                </button>
              ))}
            </div>
            <Button onClick={handleExport} icon="📥">
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                💰
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl">
                💸
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Net Savings</p>
                <p className={`text-2xl font-bold ${netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netSavings)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                📊
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Savings Rate</p>
                <p className={`text-2xl font-bold ${savingsRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {savingsRate.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                🎯
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Trends Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Monthly Trends</h2>
          {monthlyData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No transaction data available for the selected period
            </div>
          ) : (
            <div className="space-y-4">
              {monthlyData.map((month, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 w-24">{month.month}</span>
                    <div className="flex gap-6 text-sm">
                      <span className="text-green-600 font-semibold">↑ {formatCurrency(month.income)}</span>
                      <span className="text-red-600 font-semibold">↓ {formatCurrency(month.expense)}</span>
                      <span className={`font-semibold ${month.income - month.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        = {formatCurrency(month.income - month.expense)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 h-10">
                    <div className="flex-1 relative">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-lg transition-all"
                        style={{ height: `${(month.income / maxMonthlyAmount) * 100}%` }}
                      />
                    </div>
                    <div className="flex-1 relative">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-red-500 rounded-lg transition-all"
                        style={{ height: `${(month.expense / maxMonthlyAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Expense Categories */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Expense Breakdown</h2>
            {expenseCategories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No expense data available</div>
            ) : (
              <div className="space-y-4">
                {expenseCategories.map((cat, index) => (
                  <div key={cat.categoryId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">{cat.categoryName}</span>
                        <span className="text-xs text-gray-500">({cat.percentage.toFixed(1)}%)</span>
                      </div>
                      <span className="font-semibold text-gray-900">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color || `hsl(${(index * 360) / expenseCategories.length}, 70%, 60%)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Income Categories */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Income Breakdown</h2>
            {incomeCategories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No income data available</div>
            ) : (
              <div className="space-y-4">
                {incomeCategories.map((cat, index) => (
                  <div key={cat.categoryId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">{cat.categoryName}</span>
                        <span className="text-xs text-gray-500">({cat.percentage.toFixed(1)}%)</span>
                      </div>
                      <span className="font-semibold text-gray-900">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color || `hsl(${120 + (index * 360) / incomeCategories.length}, 70%, 60%)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span> Financial Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-2">Top Expense Category</h3>
              {expenseCategories.length > 0 ? (
                <p className="text-gray-700">
                  <span className="font-bold text-red-600">{expenseCategories[0].categoryName}</span> accounts for{' '}
                  <span className="font-bold">{expenseCategories[0].percentage.toFixed(1)}%</span> of your expenses (
                  {formatCurrency(expenseCategories[0].amount)})
                </p>
              ) : (
                <p className="text-gray-500">No expense data available</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-2">Savings Performance</h3>
              {savingsRate >= 20 ? (
                <p className="text-gray-700">
                  <span className="text-green-600 font-bold">Excellent!</span> You're saving{' '}
                  <span className="font-bold">{savingsRate.toFixed(1)}%</span> of your income.
                </p>
              ) : savingsRate >= 10 ? (
                <p className="text-gray-700">
                  <span className="text-yellow-600 font-bold">Good progress!</span> You're saving{' '}
                  <span className="font-bold">{savingsRate.toFixed(1)}%</span>. Aim for 20%+.
                </p>
              ) : savingsRate >= 0 ? (
                <p className="text-gray-700">
                  <span className="text-orange-600 font-bold">Room to improve.</span> You're saving only{' '}
                  <span className="font-bold">{savingsRate.toFixed(1)}%</span>. Try to reduce expenses.
                </p>
              ) : (
                <p className="text-gray-700">
                  <span className="text-red-600 font-bold">Warning!</span> You're spending more than you earn.
                  Consider reviewing your budget.
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-2">Monthly Average</h3>
              {monthlyData.length > 0 ? (
                <p className="text-gray-700">
                  Average monthly expense:{' '}
                  <span className="font-bold text-red-600">
                    {formatCurrency(
                      monthlyData.reduce((sum, m) => sum + m.expense, 0) / monthlyData.length
                    )}
                  </span>
                </p>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-2">Transaction Count</h3>
              <p className="text-gray-700">
                You've made <span className="font-bold text-blue-600">{filteredTransactions.length}</span>{' '}
                transactions in this period.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
