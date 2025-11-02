'use client';

import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { CategorizationStats } from '@finhome360/shared';
import {
  ChartBarIcon,
  ArrowPathIcon,
  PlusIcon,
  LightBulbIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';

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
      
      // For now, show mock data instead of errors during development
      if (process.env.NODE_ENV === 'development') {
        // Show demo data instead of error
        setStats({
          totalTransactions: 156,
          categorizedTransactions: 142,
          uncategorizedTransactions: 14,
          categorizationRate: 0.91,
          topMerchants: [
            { merchant: 'Starbucks', count: 12, category: 'Dining' },
            { merchant: 'Amazon', count: 8, category: 'Shopping' },
            { merchant: 'Shell', count: 6, category: 'Transportation' }
          ]
        });
        return;
      }
      
      // Provide more helpful error messages for production
      if (err instanceof Error) {
        if (err.message.includes('not found') || err.message.includes('404')) {
          setError('API endpoint not available. Please ensure the latest API version is deployed.');
        } else if (err.message.includes('unauthorized') || err.message.includes('401')) {
          setError('Authentication required. Please log in again.');
        } else if (err.message.includes('Failed to fetch')) {
          setError('Network error. Please check your connection.');
        } else {
          setError('Unable to load categorization data at this time.');
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
      <div className="card animate-pulse">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-gray-200 rounded-lg"></div>
              <div className="h-20 bg-gray-200 rounded-lg"></div>
              <div className="h-20 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="card border-error-200 bg-error-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-error-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-error-600" />
            </div>
            <h3 className="text-xl font-semibold text-error-800">AI Categorization Stats</h3>
          </div>
          <p className="text-error-600 mb-4">{error || 'Failed to load stats'}</p>
          <button
            onClick={loadStats}
            className="btn-secondary text-error-700 hover:text-error-900 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no transactions
  if (stats.totalTransactions === 0) {
    return (
      <div className="card">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">AI Categorization Stats</h3>
          </div>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
              <PlusIcon className="w-8 h-8 text-primary-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h4>
            <p className="text-gray-600">Add some transactions to see AI categorization statistics</p>
          </div>
        </div>
      </div>
    );
  }

  const ratePercent = Math.round(stats.categorizationRate * 100);
  const rateColor = ratePercent >= 80 ? 'text-green-600' : ratePercent >= 50 ? 'text-yellow-600' : 'text-red-600';
  const progressColor = ratePercent >= 80 ? 'bg-green-500' : ratePercent >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">AI Categorization Stats</h3>
          </div>
          <button
            onClick={loadStats}
            className="p-2 hover:bg-primary-50 rounded-lg transition-colors group"
            title="Refresh stats"
          >
            <ArrowPathIcon className="w-5 h-5 text-primary-600 group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-25 rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-shadow">
              <p className="text-sm text-gray-500 mb-1 font-medium">Total</p>
              <p className="text-2xl font-bold text-gray-900 font-mono">{stats.totalTransactions}</p>
            </div>
            <div className="bg-success-25 rounded-xl p-4 border border-success-200 hover:shadow-sm transition-shadow">
              <p className="text-sm text-success-600 mb-1 font-medium">Categorized</p>
              <p className="text-2xl font-bold text-success-700 font-mono">{stats.categorizedTransactions}</p>
            </div>
            <div className="bg-warning-25 rounded-xl p-4 border border-warning-200 hover:shadow-sm transition-shadow">
              <p className="text-sm text-warning-600 mb-1 font-medium">Pending</p>
              <p className="text-2xl font-bold text-warning-700 font-mono">{stats.uncategorizedTransactions}</p>
            </div>
          </div>

          {/* Categorization Rate */}
          <div className="bg-primary-25 rounded-xl p-5 border border-primary-200 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ChartPieIcon className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-semibold text-primary-700">Categorization Rate</span>
              </div>
              <span className={`text-2xl font-bold font-mono ${rateColor}`}>{ratePercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full ${progressColor} transition-all duration-700 ease-out`}
                style={{ width: `${ratePercent}%` }}
              />
            </div>
            {stats.uncategorizedTransactions > 0 && (
              <p className="text-xs text-gray-600 mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-warning-500 rounded-full"></span>
                {stats.uncategorizedTransactions} transaction{stats.uncategorizedTransactions !== 1 ? 's' : ''} need{stats.uncategorizedTransactions === 1 ? 's' : ''} categorization
              </p>
            )}
          </div>

          {/* Top Merchants */}
          {stats.topMerchants.length > 0 && (
            <div className="bg-gray-25 rounded-xl p-5 border border-gray-100 hover:shadow-sm transition-shadow">
              <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-primary-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                Top Merchants
              </h4>
              <div className="space-y-3">
                {stats.topMerchants.slice(0, 5).map((merchant, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-gray-50 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{merchant.merchant}</p>
                        <p className="text-xs text-gray-500 font-medium">{merchant.category}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-bold border border-primary-200">
                      {merchant.count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Learning Status */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <LightBulbIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-lg">AI Learning Active</h4>
                <p className="text-sm text-primary-100 leading-relaxed">
                  The AI learns from your categorization patterns and improves accuracy over time.
                  {stats.categorizedTransactions >= 50 && (
                    <span className="block mt-2 font-semibold text-white">
                      Great progress! Keep it up! 🚀
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
