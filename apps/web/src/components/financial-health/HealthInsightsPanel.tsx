'use client';

import {
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Insight {
  id: string;
  type: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  potentialImpact?: number;
  actionItems?: string[];
  isRead?: boolean;
  isDismissed?: boolean;
}

interface HealthInsightsPanelProps {
  insights: Insight[];
  recommendations: string[];
  onDismiss?: (id: string) => void;
  onMarkRead?: (id: string) => void;
}

export function HealthInsightsPanel({
  insights,
  recommendations,
  onDismiss,
  onMarkRead
}: HealthInsightsPanelProps) {
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          icon: <ExclamationTriangleIcon className="w-5 h-5" />,
          bg: 'bg-red-50',
          border: 'border-red-200',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          badge: 'bg-red-100 text-red-700'
        };
      case 'high':
        return {
          icon: <ExclamationTriangleIcon className="w-5 h-5" />,
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          badge: 'bg-orange-100 text-orange-700'
        };
      case 'medium':
        return {
          icon: <LightBulbIcon className="w-5 h-5" />,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-700'
        };
      default:
        return {
          icon: <InformationCircleIcon className="w-5 h-5" />,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          badge: 'bg-gray-100 text-gray-700'
        };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      {insights.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-yellow-500" />
            AI Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight) => {
              const config = getPriorityConfig(insight.priority);
              return (
                <div
                  key={insight.id}
                  className={`${config.bg} ${config.border} border rounded-xl p-4 relative ${
                    insight.isRead ? 'opacity-75' : ''
                  }`}
                  onClick={() => onMarkRead?.(insight.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${config.iconBg} ${config.iconColor} p-2 rounded-lg flex-shrink-0`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge}`}>
                          {insight.priority}
                        </span>
                        {insight.potentialImpact && insight.potentialImpact > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Potential: {formatCurrency(insight.potentialImpact)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{insight.content}</p>

                      {insight.actionItems && insight.actionItems.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">Action Items:</p>
                          <ul className="space-y-1">
                            {insight.actionItems.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                <CheckCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {onDismiss && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(insight.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
            Recommendations
          </h3>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
            <ul className="space-y-3">
              {recommendations.map((recommendation, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Empty state */}
      {insights.length === 0 && recommendations.length === 0 && (
        <div className="text-center py-8">
          <InformationCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No insights or recommendations at this time.</p>
          <p className="text-sm text-gray-400 mt-1">Keep tracking your finances for personalized advice.</p>
        </div>
      )}
    </div>
  );
}
