'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface PredictionMonth {
  month: string;
  predictedIncome: number;
  predictedExpenses: number;
  predictedSavings: number;
  confidence: number;
  anomalyRisk: 'low' | 'medium' | 'high';
  categoryBreakdown: Array<{
    category: string;
    predicted: number;
    historical: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
}

export function SpendingPredictions() {
  const [predictions, setPredictions] = useState<PredictionMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPredictions() {
      try {
        const response = await api.aiAdvisor.getPredictions(3) as any;
        if (response.success) {
          setPredictions(response.data.forecasts);
        } else {
          throw new Error(response.error?.message || 'Failed to load predictions');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load predictions');
      } finally {
        setLoading(false);
      }
    }
    fetchPredictions();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const chartData = predictions.map(p => ({
    month: new Date(p.month + '-01').toLocaleDateString('en-GB', { month: 'short' }),
    income: p.predictedIncome,
    expenses: p.predictedExpenses,
    savings: p.predictedSavings
  }));

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-3">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-green-600">Income: {formatCurrency(payload[0]?.value || 0)}</p>
            <p className="text-red-600">Expenses: {formatCurrency(payload[1]?.value || 0)}</p>
            <p className="text-blue-600">Savings: {formatCurrency(payload[2]?.value || 0)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <ChartBarIcon className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Spending Predictions</h3>
      </div>

      {/* Chart */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#e5e7eb" />
            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
            <Bar dataKey="savings" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Savings" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Prediction Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {predictions.map((prediction) => (
          <div
            key={prediction.month}
            className={`p-4 rounded-lg border ${
              prediction.anomalyRisk === 'high'
                ? 'border-red-200 bg-red-50'
                : prediction.anomalyRisk === 'medium'
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-900">
                {new Date(prediction.month + '-01').toLocaleDateString('en-GB', {
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  prediction.confidence >= 80
                    ? 'bg-green-100 text-green-700'
                    : prediction.confidence >= 60
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {prediction.confidence}% confidence
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                  Income
                </span>
                <span className="font-medium">{formatCurrency(prediction.predictedIncome)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                  Expenses
                </span>
                <span className="font-medium">{formatCurrency(prediction.predictedExpenses)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-600">Predicted Savings</span>
                <span
                  className={`font-bold ${
                    prediction.predictedSavings >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(prediction.predictedSavings)}
                </span>
              </div>
            </div>

            {prediction.anomalyRisk !== 'low' && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-1 text-xs">
                  <ExclamationTriangleIcon
                    className={`w-4 h-4 ${
                      prediction.anomalyRisk === 'high' ? 'text-red-500' : 'text-yellow-500'
                    }`}
                  />
                  <span className={prediction.anomalyRisk === 'high' ? 'text-red-700' : 'text-yellow-700'}>
                    {prediction.anomalyRisk === 'high' ? 'High' : 'Medium'} spending risk detected
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
        Predictions are based on historical spending patterns and may not reflect future changes in circumstances.
      </p>
    </div>
  );
}
