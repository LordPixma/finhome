'use client';

import React from 'react';

export interface SpendingInsight {
  type: 'warning' | 'positive' | 'neutral';
  title: string;
  description: string;
  impact: number;
  category?: string;
}

interface InsightsWidgetProps {
  insights: SpendingInsight[];
  className?: string;
}

const InsightCard: React.FC<{ insight: SpendingInsight }> = ({ insight }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'positive': return '✅';
      default: return 'ℹ️';
    }
  };

  const getColors = (type: string) => {
    switch (type) {
      case 'warning': 
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          accent: 'text-amber-600'
        };
      case 'positive':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          accent: 'text-green-600'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          accent: 'text-blue-600'
        };
    }
  };

  const colors = getColors(insight.type);
  const impactText = insight.impact > 0 
    ? `+£${insight.impact.toFixed(0)}`
    : `-£${Math.abs(insight.impact).toFixed(0)}`;

  return (
    <div className={`p-4 rounded-lg ${colors.bg} ${colors.border} border`}>
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{getIcon(insight.type)}</div>
        <div className="flex-1">
          <h4 className={`font-semibold ${colors.text} mb-1`}>
            {insight.title}
          </h4>
          <p className={`text-sm ${colors.text} mb-2`}>
            {insight.description}
          </p>
          <div className="flex justify-between items-center">
            {insight.category && (
              <span className={`text-xs px-2 py-1 rounded-full bg-white ${colors.accent}`}>
                {insight.category}
              </span>
            )}
            <span className={`text-sm font-medium ${colors.accent}`}>
              Impact: {impactText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const InsightsWidget: React.FC<InsightsWidgetProps> = ({ 
  insights, 
  className = '' 
}) => {
  if (!insights || insights.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          💡 Financial Insights
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-gray-600">
            Add more transactions to get personalized insights
          </p>
        </div>
      </div>
    );
  }

  // Sort insights by type priority (warnings first, then positive, then neutral)
  const sortedInsights = [...insights].sort((a, b) => {
    const priority = { warning: 3, positive: 2, neutral: 1 };
    return priority[b.type] - priority[a.type];
  });

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          💡 Financial Insights
        </h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {insights.length} insight{insights.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {sortedInsights.map((insight, index) => (
          <InsightCard key={index} insight={insight} />
        ))}
      </div>

      {/* Action suggestions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          💪 Quick Actions
        </h4>
        <div className="flex flex-wrap gap-2">
          <button className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors">
            Review Budget
          </button>
          <button className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors">
            Set Savings Goal
          </button>
          <button className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors">
            Analyze Categories
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightsWidget;