'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface UrgentAction {
  category: string;
  title: string;
  description: string;
  impact: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface Opportunity {
  category: string;
  title: string;
  description: string;
  potentialBenefit: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface PersonalizedAdviceData {
  urgentActions: UrgentAction[];
  opportunities: Opportunity[];
  monthlyActionPlan: string[];
  longTermGoals: string[];
  aiInsights: string;
}

export function PersonalizedAdvice() {
  const [advice, setAdvice] = useState<PersonalizedAdviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'urgent' | 'opportunities' | 'plan'>('urgent');

  useEffect(() => {
    async function fetchAdvice() {
      try {
        const response = await api.aiAdvisor.getAdvice() as any;
        if (response.success) {
          setAdvice(response.data.advice);
        } else {
          throw new Error(response.error?.message || 'Failed to load advice');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load personalized advice');
      } finally {
        setLoading(false);
      }
    }
    fetchAdvice();
  }, []);

  const getPriorityColor = (priority: UrgentAction['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: Opportunity['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-blue-100 text-blue-700';
      case 'hard':
        return 'bg-purple-100 text-purple-700';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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

  if (!advice) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <SparklesIcon className="w-6 h-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI-Powered Advice</h3>
      </div>

      {/* AI Insights Summary */}
      <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg mb-6">
        <div className="flex items-start gap-3">
          <LightBulbIcon className="w-6 h-6 text-purple-600 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-gray-900 mb-1">AI Analysis</h4>
            <p className="text-sm text-gray-700">{advice.aiInsights}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('urgent')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'urgent'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Urgent Actions ({advice.urgentActions.length})
        </button>
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'opportunities'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Opportunities ({advice.opportunities.length})
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'plan'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Action Plan
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'urgent' && (
        <div className="space-y-3">
          {advice.urgentActions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p className="text-gray-600">No urgent actions needed. Great job!</p>
            </div>
          ) : (
            advice.urgentActions.map((action, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${getPriorityColor(action.priority)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide opacity-75">
                      {action.category}
                    </span>
                    <h4 className="font-semibold">{action.title}</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getPriorityColor(
                      action.priority
                    )}`}
                  >
                    {action.priority}
                  </span>
                </div>
                <p className="text-sm mb-2">{action.description}</p>
                <div className="flex items-center gap-1 text-xs opacity-75">
                  <ArrowRightIcon className="w-3 h-3" />
                  <span>Impact: {action.impact}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="space-y-3">
          {advice.opportunities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <LightBulbIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No specific opportunities identified yet. Keep tracking your finances!</p>
            </div>
          ) : (
            advice.opportunities.map((opp, i) => (
              <div key={i} className="p-4 rounded-lg border border-green-200 bg-green-50/50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
                      {opp.category}
                    </span>
                    <h4 className="font-semibold text-gray-900">{opp.title}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(opp.difficulty)}`}>
                    {opp.difficulty}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{opp.description}</p>
                <div className="flex items-center gap-1 text-xs text-green-700">
                  <CheckCircleIcon className="w-3 h-3" />
                  <span>Potential benefit: {opp.potentialBenefit}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="space-y-6">
          {/* Monthly Actions */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">This Month's Focus</h4>
            <div className="space-y-2">
              {advice.monthlyActionPlan.map((action, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-700">{action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Long-term Goals */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Long-term Recommendations</h4>
            <div className="space-y-2">
              {advice.longTermGoals.map((goal, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg"
                >
                  <ArrowRightIcon className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">{goal}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 mt-6 pt-4 border-t border-gray-100">
        This advice is AI-generated and should not replace consultation with a qualified financial adviser.
      </p>
    </div>
  );
}
