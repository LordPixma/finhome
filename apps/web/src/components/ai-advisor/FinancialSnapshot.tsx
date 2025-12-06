'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  HeartIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface FinancialSnapshotData {
  healthScore: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: {
    total: number;
    rate: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  debtToIncome: number;
  emergencyFundMonths: number;
}

export function FinancialSnapshot() {
  const [snapshot, setSnapshot] = useState<FinancialSnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSnapshot() {
      try {
        const response = await api.aiAdvisor.getSnapshot() as any;
        if (response.success) {
          setSnapshot(response.data);
        } else {
          throw new Error(response.error?.message || 'Failed to load snapshot');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load financial snapshot');
      } finally {
        setLoading(false);
      }
    }
    fetchSnapshot();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-red-600">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Financial Snapshot</h3>
        <div className="flex items-center gap-2">
          <HeartIcon className={`w-5 h-5 ${getHealthScoreColor(snapshot.healthScore)}`} />
          <span className={`font-bold ${getHealthScoreColor(snapshot.healthScore)}`}>
            {snapshot.healthScore}/100
          </span>
          <span className="text-sm text-gray-500">
            ({getHealthScoreLabel(snapshot.healthScore)})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Net Worth */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <BanknotesIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Net Worth</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(snapshot.netWorth)}</p>
        </div>

        {/* Monthly Income */}
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">Monthly Income</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(snapshot.monthlyIncome)}</p>
        </div>

        {/* Monthly Expenses */}
        <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />
            <span className="text-sm text-gray-600">Monthly Expenses</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(snapshot.monthlyExpenses)}</p>
        </div>

        {/* Savings Rate */}
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            {snapshot.savings.trend === 'increasing' ? (
              <ArrowTrendingUpIcon className="w-5 h-5 text-purple-600" />
            ) : snapshot.savings.trend === 'decreasing' ? (
              <ArrowTrendingDownIcon className="w-5 h-5 text-purple-600" />
            ) : (
              <BanknotesIcon className="w-5 h-5 text-purple-600" />
            )}
            <span className="text-sm text-gray-600">Savings Rate</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{snapshot.savings.rate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Total Assets</p>
          <p className="font-semibold text-gray-900">{formatCurrency(snapshot.totalAssets)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Total Debt</p>
          <p className="font-semibold text-gray-900">{formatCurrency(snapshot.totalLiabilities)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Emergency Fund</p>
          <p className="font-semibold text-gray-900">{snapshot.emergencyFundMonths.toFixed(1)} months</p>
        </div>
      </div>
    </div>
  );
}
