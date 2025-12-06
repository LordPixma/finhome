'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  FlagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface GoalForecast {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  projectedCompletionDate: string | null;
  onTrack: boolean;
  probabilityOfSuccess: number;
  recommendedMonthlyContribution: number;
  currentMonthlyContribution: number;
  shortfall: number;
  suggestions: string[];
}

interface GoalForecastsData {
  forecasts: GoalForecast[];
  summary: {
    totalGoals: number;
    onTrack: number;
    atRisk: number;
    averageSuccessProbability: number;
  };
}

export function GoalForecasts() {
  const [data, setData] = useState<GoalForecastsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchForecasts() {
      try {
        const response = await api.aiAdvisor.getGoalForecasts() as any;
        if (response.success) {
          setData(response.data);
        } else {
          throw new Error(response.error?.message || 'Failed to load forecasts');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load goal forecasts');
      } finally {
        setLoading(false);
      }
    }
    fetchForecasts();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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

  if (!data || data.forecasts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FlagIcon className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Goal Forecasts</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <FlagIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No active goals found. Create a goal to see forecasts!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FlagIcon className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Goal Forecasts</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            <span className="text-green-700">{data.summary.onTrack} on track</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-700">{data.summary.atRisk} at risk</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-sm text-gray-500">Total Goals</p>
          <p className="text-xl font-bold text-gray-900">{data.summary.totalGoals}</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg text-center">
          <p className="text-sm text-gray-500">On Track</p>
          <p className="text-xl font-bold text-green-600">{data.summary.onTrack}</p>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg text-center">
          <p className="text-sm text-gray-500">At Risk</p>
          <p className="text-xl font-bold text-yellow-600">{data.summary.atRisk}</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-sm text-gray-500">Avg Success Rate</p>
          <p className="text-xl font-bold text-blue-600">{data.summary.averageSuccessProbability}%</p>
        </div>
      </div>

      {/* Goal Cards */}
      <div className="space-y-4">
        {data.forecasts.map((forecast) => {
          const progress = (forecast.currentAmount / forecast.targetAmount) * 100;

          return (
            <div
              key={forecast.goalId}
              className={`p-4 rounded-lg border ${
                forecast.onTrack
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-yellow-200 bg-yellow-50/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{forecast.goalName}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Target: {formatDate(forecast.targetDate)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      forecast.onTrack
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {forecast.onTrack ? (
                      <>
                        <CheckCircleIcon className="w-3 h-3" />
                        On Track
                      </>
                    ) : (
                      <>
                        <ExclamationTriangleIcon className="w-3 h-3" />
                        At Risk
                      </>
                    )}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {forecast.probabilityOfSuccess}% success probability
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{formatCurrency(forecast.currentAmount)}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(forecast.targetAmount)}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      forecast.onTrack ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">{progress.toFixed(1)}% complete</p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div className="p-2 bg-white rounded border border-gray-200">
                  <p className="text-gray-500 text-xs">Current Monthly</p>
                  <p className="font-medium">{formatCurrency(forecast.currentMonthlyContribution)}</p>
                </div>
                <div className="p-2 bg-white rounded border border-gray-200">
                  <p className="text-gray-500 text-xs">Recommended Monthly</p>
                  <p className="font-medium text-blue-600">
                    {formatCurrency(forecast.recommendedMonthlyContribution)}
                  </p>
                </div>
              </div>

              {/* Projected Completion */}
              {forecast.projectedCompletionDate && (
                <div className="flex items-center gap-2 text-sm">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-600">
                    Projected completion:{' '}
                    <span className="font-medium">{formatDate(forecast.projectedCompletionDate)}</span>
                  </span>
                </div>
              )}

              {/* Suggestions */}
              {forecast.suggestions.length > 0 && !forecast.onTrack && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Suggestions:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {forecast.suggestions.slice(0, 2).map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-blue-500">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
