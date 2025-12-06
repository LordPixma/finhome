'use client';

import React from 'react';

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  percentage: number;
  description: string;
}

export interface TrendsData {
  income: TrendAnalysis;
  expense: TrendAnalysis;
  savings: TrendAnalysis;
}

interface TrendsWidgetProps {
  trends: TrendsData;
  className?: string;
}

const TrendCard: React.FC<{ 
  label: string; 
  trend: TrendAnalysis; 
  icon: string; 
  baseColor: string;
}> = ({ label, trend, icon, baseColor }) => {
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      default: return '➖';
    }
  };

  const getTrendColor = (direction: string) => {
    // For income: up is good, down is bad
    // For expenses: down is good, up is bad
    // For savings: up is good, down is bad
    if (direction === 'stable') return 'text-gray-600 dark:text-gray-400';

    const isGoodTrend = (label === 'Expenses' && direction === 'decreasing') ||
                       (label !== 'Expenses' && direction === 'increasing');

    return isGoodTrend ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getBgColor = (direction: string) => {
    if (direction === 'stable') return 'bg-gray-50 dark:bg-gray-700/50';

    const isGoodTrend = (label === 'Expenses' && direction === 'decreasing') ||
                       (label !== 'Expenses' && direction === 'increasing');

    return isGoodTrend ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';
  };

  const trendColor = getTrendColor(trend.direction);
  const bgColor = getBgColor(trend.direction);
  const absPercentage = Math.abs(trend.percentage);

  return (
    <div className={`p-4 rounded-lg border ${bgColor} border-gray-200 dark:border-gray-700`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{icon}</span>
          <h4 className="font-medium text-gray-900 dark:text-gray-100">{label}</h4>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-lg">{getTrendIcon(trend.direction)}</span>
          <span className={`text-sm font-semibold ${trendColor}`}>
            {trend.direction === 'stable' ? '0%' : `${absPercentage.toFixed(1)}%`}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        {trend.description}
      </p>

      {/* Trend indicator bar */}
      <div className="mt-3">
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              trend.direction === 'increasing' ? baseColor :
              trend.direction === 'decreasing' ? 'bg-red-400' : 'bg-gray-400'
            }`}
            style={{ width: `${Math.min(100, absPercentage * 2)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export const TrendsWidget: React.FC<TrendsWidgetProps> = ({
  trends,
  className = ''
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-none border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          📊 Trend Analysis
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
          Last 6 months
        </span>
      </div>

      <div className="space-y-4">
        <TrendCard
          label="Income"
          trend={trends.income}
          icon="💰"
          baseColor="bg-green-400"
        />

        <TrendCard
          label="Expenses"
          trend={trends.expense}
          icon="💸"
          baseColor="bg-red-400"
        />

        <TrendCard
          label="Net Savings"
          trend={trends.savings}
          icon="🎯"
          baseColor="bg-blue-400"
        />
      </div>

      {/* Overall trend summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">📋 Summary:</span>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          {trends.income.direction === 'increasing' && (
            <div className="flex items-center space-x-1">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Income is growing steadily</span>
            </div>
          )}

          {trends.expense.direction === 'decreasing' && (
            <div className="flex items-center space-x-1">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Expenses are under control</span>
            </div>
          )}

          {trends.savings.direction === 'increasing' && (
            <div className="flex items-center space-x-1">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Savings rate is improving</span>
            </div>
          )}

          {trends.expense.direction === 'increasing' && Math.abs(trends.expense.percentage) > 10 && (
            <div className="flex items-center space-x-1">
              <span className="text-amber-600 dark:text-amber-400">⚠</span>
              <span>Monitor rising expenses</span>
            </div>
          )}

          {trends.savings.direction === 'decreasing' && (
            <div className="flex items-center space-x-1">
              <span className="text-red-600 dark:text-red-400">⚠</span>
              <span>Review budget to improve savings</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendsWidget;