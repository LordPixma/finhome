'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { api } from '@/lib/api';
import type { CategorizationStats } from '@finhome360/shared';

export function CategorizationStatsWidget() {
  const [stats, setStats] = useState<CategorizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCategorizationStats();
      if (response.success && response.data) {
        setStats(response.data as CategorizationStats);
      } else {
        // Handle case where API returns success but no data
        setError('No categorization data available');
      }
    } catch (err) {
      console.error('Categorization stats error:', err);
      // Provide more helpful error messages
      if (err instanceof Error) {
        if (err.message.includes('not found')) {
          setError('API endpoint not available. Please ensure the latest API version is deployed.');
        } else if (err.message.includes('unauthorized') || err.message.includes('401')) {
          setError('Authentication required. Please log in again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load categorization stats');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>AI Categorization Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">AI Categorization Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error || 'Failed to load stats'}</p>
          <button
            onClick={loadStats}
            className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no transactions
  if (stats.totalTransactions === 0) {
    return (
      <Card className="border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="text-indigo-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            AI Categorization Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <p className="text-gray-600 mb-2">No transactions yet</p>
            <p className="text-sm text-gray-500">Add some transactions to see AI categorization statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ratePercent = Math.round(stats.categorizationRate * 100);
  const rateColor = ratePercent >= 80 ? 'text-green-600' : ratePercent >= 50 ? 'text-yellow-600' : 'text-red-600';
  const progressColor = ratePercent >= 80 ? 'bg-green-500' : ratePercent >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <Card className="border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-indigo-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            AI Categorization Stats
          </CardTitle>
          <button
            onClick={loadStats}
            className="p-1 hover:bg-indigo-100 rounded-full transition-colors"
            title="Refresh stats"
          >
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-100">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
            <p className="text-sm text-gray-600 mb-1">Categorized</p>
            <p className="text-2xl font-bold text-green-600">{stats.categorizedTransactions}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-red-100">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-red-600">{stats.uncategorizedTransactions}</p>
          </div>
        </div>

        {/* Categorization Rate */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Categorization Rate</span>
            <span className={`text-2xl font-bold ${rateColor}`}>{ratePercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${progressColor} transition-all duration-500`}
              style={{ width: `${ratePercent}%` }}
            />
          </div>
          {stats.uncategorizedTransactions > 0 && (
            <p className="text-xs text-gray-600 mt-2">
              {stats.uncategorizedTransactions} transaction{stats.uncategorizedTransactions !== 1 ? 's' : ''} need{stats.uncategorizedTransactions === 1 ? 's' : ''} categorization
            </p>
          )}
        </div>

        {/* Top Merchants */}
        {stats.topMerchants.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              Top Merchants
            </h4>
            <div className="space-y-2">
              {stats.topMerchants.slice(0, 5).map((merchant, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{merchant.merchant}</p>
                      <p className="text-xs text-gray-600">{merchant.category}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {merchant.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Learning Status */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <div>
              <h4 className="font-semibold mb-1">AI Learning Active</h4>
              <p className="text-sm text-indigo-100">
                The AI learns from your categorization patterns and improves accuracy over time.
                {stats.categorizedTransactions >= 50 && ' Great progress! 🎉'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
