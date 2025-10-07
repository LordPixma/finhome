'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { AIFinancialAssistant } from '@/components/ai/AIFinancialAssistant';
import { AITransactionCategorizer } from '@/components/ai/AITransactionCategorizer';
import { AISpendingSummary } from '@/components/ai/AISpendingSummary';
import { CategorizationStatsWidget } from '@/components/ai';
import { api } from '@/lib/api';

interface AIStatus {
  status?: string;
  modelsAvailable?: boolean;
  timestamp?: string;
}

export default function AIFeaturesPage() {
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(false);

  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.aiStatus();
      
      if (response.success && response.data) {
        setAiStatus(response.data);
      } else {
        setError(response.error?.message || 'Failed to check AI status');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-blue-600 text-white text-2xl shadow-sm">🤖</span>
                <span>AI Insights</span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
                  loading ? 'bg-gray-100 text-gray-600 border-gray-200' : error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${loading ? 'bg-gray-400 animate-pulse' : error ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
                  {loading ? 'Checking…' : error ? 'Unavailable' : 'Active'}
                </span>
              </h1>
              <p className="text-gray-600 mt-1 max-w-xl">Get intelligent assistance, automatic categorization, and spending insights powered by privacy‑aware AI.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={checkAIStatus} variant="outline" size="sm" disabled={loading}>
                {loading ? '⏳ Checking' : '🔄 Refresh'}
              </Button>
            </div>
          </div>
          {aiStatus && (
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-4">
              <span>Models: {aiStatus.modelsAvailable ? '✅ Available' : '❌ Unavailable'}</span>
              {aiStatus.timestamp && <span>Last checked: {new Date(aiStatus.timestamp).toLocaleTimeString()}</span>}
            </div>
          )}
        </div>

        {/* Error State (inline) */}
        {error && !loading && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-red-800 mb-1">AI Service Unavailable</p>
              <p className="text-sm text-red-700 mb-2">{error}</p>
              <Button onClick={checkAIStatus} size="sm" variant="secondary">Retry</Button>
            </div>
          </div>
        )}

        {/* Primary Feature Grid */}
        {(!error || loading) && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              <div className="lg:col-span-1"><AITransactionCategorizer /></div>
              <div className="lg:col-span-1"><AIFinancialAssistant /></div>
              <div className="lg:col-span-1"><AISpendingSummary /></div>
            </div>
            <div className="mb-12">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-sm">📈</span>
                Categorization Performance
              </h2>
              <CategorizationStatsWidget />
            </div>
          </>
        )}

        {/* Upcoming / Additional Features */}
        <div className="mb-6">
          <button
            onClick={() => setShowUpcoming(!showUpcoming)}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
          >
            <span className={`transform transition-transform ${showUpcoming ? 'rotate-90' : ''}`}>▶</span>
            <span className="font-medium">Upcoming Advanced AI Features</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Preview</span>
          </button>
        </div>
        {showUpcoming && (
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">⚡</span>
                Advanced AI (Coming Soon)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl mb-2">🔍</div>
                  <h4 className="font-semibold text-gray-900 mb-1">Anomaly Detection</h4>
                  <p className="text-sm text-gray-600">Automatically flag unusual spending and potential fraud.</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl mb-2">📈</div>
                  <h4 className="font-semibold text-gray-900 mb-1">Smart Budgets</h4>
                  <p className="text-sm text-gray-600">Adaptive budgets based on habits and seasonality.</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl mb-2">🎯</div>
                  <h4 className="font-semibold text-gray-900 mb-1">Goal Optimization</h4>
                  <p className="text-sm text-gray-600">Optimize saving strategy for multiple goals.</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl mb-2">💡</div>
                  <h4 className="font-semibold text-gray-900 mb-1">Predictive Insights</h4>
                  <p className="text-sm text-gray-600">Forecast cash flow and spending trends.</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">🚀</span>
                  Why It Matters
                </h4>
                <p className="text-sm text-gray-700 mb-3">These features will provide deeper automation, proactive alerts, and forward‑looking planning tools.</p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                  <span className="px-2 py-1 rounded-full bg-white border border-gray-200">🧠 Advanced Models</span>
                  <span className="px-2 py-1 rounded-full bg-white border border-gray-200">⚡ Fast Processing</span>
                  <span className="px-2 py-1 rounded-full bg-white border border-gray-200">🔒 Privacy First</span>
                  <span className="px-2 py-1 rounded-full bg-white border border-gray-200">🌐 Always Available</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}