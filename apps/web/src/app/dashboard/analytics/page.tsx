'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { ExportButton } from '@/components/export';
import { formatCurrency } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { InsightsWidget } from '@/components/InsightsWidget';
import { TrendsWidget } from '@/components/TrendsWidget';
import PredictiveAnalytics, { type ForecastResult } from '@/lib/predictiveAnalytics';

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

const ChartsBundle = dynamic(() => import('./ChartsBundle').then(m => m.ChartsBundle), { ssr: false, loading: () => <div className="text-sm text-gray-500">Loading charts…</div> });

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  const [forecast, setForecast] = useState<ForecastResult | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const response = await api.getTransactions() as any;
      if (response.success) {
        const transactionData = response.data;
        setTransactions(transactionData);
        
        // Generate predictive analytics
        const analytics = new PredictiveAnalytics(transactionData);
        const forecastData = analytics.generateForecast(6);
        setForecast(forecastData);
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

  // This variable is no longer needed as we use interactive charts

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
            <ExportButton dataType="analytics" variant="secondary" />
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

        {/* Enhanced Analytics Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Trends Widget */}
          {forecast && (
            <TrendsWidget trends={forecast.trends} />
          )}

          {/* Insights Widget */}
          {forecast && (
            <InsightsWidget insights={forecast.insights} className="lg:col-span-2" />
          )}
        </div>

        {/* Charts dynamically loaded client-side to reduce server bundle size */}
        <ChartsBundle 
          forecast={forecast}
          monthlyData={monthlyData}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
        />

        {/* Advanced Analytics Summary */}
        {forecast && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">🎯</span> Analytics Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Prediction Confidence */}
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  🔮 Forecast Accuracy
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-blue-500 rounded-full transition-all"
                        style={{ width: `${forecast.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">
                    {(forecast.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Based on {monthlyData.length} months of data
                </p>
              </div>

              {/* Top Insights Count */}
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  💡 Active Insights
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-orange-600">
                    {forecast.insights.filter(i => i.type === 'warning').length}
                  </span>
                  <div className="text-xs">
                    <div className="text-orange-600 font-medium">Warnings</div>
                    <div className="text-green-600">
                      {forecast.insights.filter(i => i.type === 'positive').length} Positive
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Range */}
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  📅 Analysis Period
                </h3>
                <div className="text-sm text-gray-700">
                  <div className="font-medium">
                    {dateRange === '3m' ? '3 Months' : 
                     dateRange === '6m' ? '6 Months' : 
                     dateRange === '1y' ? '1 Year' : 'All Time'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {filteredTransactions.length} transactions
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
