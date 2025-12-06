'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import {
  HealthScoreGauge,
  ScoreBreakdownCard,
  HealthInsightsPanel,
  ScoreHistoryChart
} from '@/components/financial-health';
import {
  ArrowPathIcon,
  HeartIcon,
  ClockIcon,
  UserCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface FinancialHealthData {
  score: {
    id: string;
    overallScore: number;
    category: 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'critical';
    breakdown: any;
    insights: string[];
    recommendations: string[];
    calculatedAt: string;
  } | null;
  profile: any;
  history: any[];
  insights: any[];
  debts: {
    total: number;
    count: number;
    items: any[];
  };
}

export default function FinancialHealthPage() {
  const [data, setData] = useState<FinancialHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.financialHealth.getSummary() as any;
      if (response.success) {
        setData(response.data);
      } else {
        throw new Error('Failed to load financial health data');
      }
    } catch (err) {
      console.error('Error loading financial health:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await api.financialHealth.calculateScore();
      await loadData();
    } catch (err) {
      console.error('Error recalculating score:', err);
      setError('Failed to recalculate score');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleDismissInsight = async (id: string) => {
    try {
      await api.financialHealth.updateInsightStatus(id, { isDismissed: true });
      await loadData();
    } catch (err) {
      console.error('Error dismissing insight:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.financialHealth.updateInsightStatus(id, { isRead: true });
    } catch (err) {
      console.error('Error marking insight as read:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading your financial health...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h2>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <HeartIcon className="w-7 h-7 text-red-500" />
                Financial Health Score
              </h1>
              <p className="text-gray-500 mt-1">
                Your comprehensive financial wellness assessment
              </p>
            </div>
            <div className="flex items-center gap-3">
              {data?.score?.calculatedAt && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <ClockIcon className="w-4 h-4" />
                  Updated {formatDate(data.score.calculatedAt)}
                </div>
              )}
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                {isRecalculating ? 'Calculating...' : 'Recalculate'}
              </button>
            </div>
          </div>

          {/* Main Score Section */}
          {data?.score ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Gauge */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Score</h2>
                  <HealthScoreGauge
                    score={data.score.overallScore}
                    category={data.score.category}
                    size="lg"
                  />
                  <p className="text-sm text-gray-500 mt-4 text-center max-w-xs">
                    Your financial health score is calculated based on 5 key metrics
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
                  <p className="text-emerald-100 text-sm mb-1">Profile Completeness</p>
                  <p className="text-3xl font-bold">{data.profile?.profileCompleteness || 0}%</p>
                  <p className="text-emerald-100 text-xs mt-2">
                    Complete your profile for more accurate insights
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                  <p className="text-blue-100 text-sm mb-1">Score Trend</p>
                  <p className="text-3xl font-bold">
                    {data.history.length > 1
                      ? (data.history[data.history.length - 1]?.delta > 0 ? '+' : '') +
                        (data.history[data.history.length - 1]?.delta || 0)
                      : 'New'}
                  </p>
                  <p className="text-blue-100 text-xs mt-2">
                    {data.history.length > 1 ? 'Points from last month' : 'Start tracking your progress'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                  <p className="text-purple-100 text-sm mb-1">Active Insights</p>
                  <p className="text-3xl font-bold">{data.insights.length}</p>
                  <p className="text-purple-100 text-xs mt-2">
                    AI-generated recommendations for you
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
                  <p className="text-orange-100 text-sm mb-1">Total Debt</p>
                  <p className="text-3xl font-bold">{formatCurrency(data.debts.total)}</p>
                  <p className="text-orange-100 text-xs mt-2">
                    Across {data.debts.count} tracked accounts
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8 text-center">
              <HeartIcon className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Calculate Your First Score</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                We need to analyze your financial data to generate your health score. Click below to start.
              </p>
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isRecalculating ? 'Calculating...' : 'Calculate My Score'}
              </button>
            </div>
          )}

          {/* Score Breakdown */}
          {data?.score?.breakdown && (
            <ScoreBreakdownCard breakdown={data.score.breakdown} />
          )}

          {/* History Chart */}
          {data?.history && data.history.length > 0 && (
            <ScoreHistoryChart
              history={data.history}
              currentScore={data.score?.overallScore || 0}
            />
          )}

          {/* Insights and Recommendations */}
          {((data?.insights?.length ?? 0) > 0 || (data?.score?.recommendations?.length ?? 0) > 0) && (
            <HealthInsightsPanel
              insights={data?.insights ?? []}
              recommendations={data?.score?.recommendations ?? []}
              onDismiss={handleDismissInsight}
              onMarkRead={handleMarkRead}
            />
          )}

          {/* Profile Completion Prompt */}
          {data?.profile && data.profile.profileCompleteness < 50 && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Complete Your Financial Profile</h3>
                  <p className="text-gray-600 mt-1">
                    Your profile is only {data.profile.profileCompleteness}% complete. Add more information about your
                    income, debts, and financial goals to get more accurate insights and recommendations.
                  </p>
                  <button
                    onClick={() => window.location.href = '/dashboard/settings'}
                    className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                  >
                    Complete Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Debt Overview */}
          {data?.debts && data.debts.items.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracked Debts</h3>
              <div className="space-y-3">
                {data.debts.items.map((debt: any) => (
                  <div key={debt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{debt.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{debt.type.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(debt.currentBalance)}</p>
                      {debt.interestRate && (
                        <p className="text-sm text-gray-500">{(debt.interestRate * 100).toFixed(1)}% APR</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
