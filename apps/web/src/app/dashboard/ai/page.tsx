'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { AIFinancialAssistant } from '@/components/ai/AIFinancialAssistant';
import { AITransactionCategorizer } from '@/components/ai/AITransactionCategorizer';
import { AISpendingSummary } from '@/components/ai/AISpendingSummary';
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI-Powered Financial Intelligence
              </h1>
              <p className="text-gray-600 mt-2">
                Get intelligent insights, advice, and automation for your finances
              </p>
            </div>
          </div>

          {/* AI Status Indicator */}
          <Card className="max-w-md mx-auto mb-8">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    aiStatus && !error ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-medium">
                    {loading ? 'Checking AI Status...' : 
                     error ? 'AI Service Unavailable' : 
                     'AI Service Active'}
                  </span>
                </div>
                <Button 
                  onClick={checkAIStatus} 
                  variant="outline" 
                  size="sm"
                  disabled={loading}
                >
                  {loading ? '⏳' : '🔄'}
                </Button>
              </div>
              {aiStatus && (
                <div className="mt-2 text-xs text-gray-500">
                  Models: {aiStatus.modelsAvailable ? '✅ Available' : '❌ Unavailable'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Features Grid */}
        {aiStatus && !error ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* AI Transaction Categorizer */}
            <div className="lg:col-span-1">
              <AITransactionCategorizer />
            </div>

            {/* AI Financial Assistant */}
            <div className="lg:col-span-1">
              <AIFinancialAssistant />
            </div>

            {/* AI Spending Summary */}
            <div className="lg:col-span-1 xl:col-span-1">
              <AISpendingSummary />
            </div>

            {/* Additional AI Features Preview */}
            <div className="lg:col-span-2 xl:col-span-3">
              <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50">
                <CardHeader>
                  <CardTitle className="text-purple-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                      ⚡
                    </div>
                    Advanced AI Features (Coming Soon)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="text-2xl mb-2">🔍</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Anomaly Detection</h4>
                      <p className="text-sm text-gray-600">AI spots unusual spending patterns and potential fraud</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="text-2xl mb-2">📈</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Smart Budgets</h4>
                      <p className="text-sm text-gray-600">AI creates personalized budgets based on your spending habits</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="text-2xl mb-2">🎯</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Goal Optimization</h4>
                      <p className="text-sm text-gray-600">AI helps optimize your financial goals and savings strategies</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="text-2xl mb-2">💡</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Predictive Insights</h4>
                      <p className="text-sm text-gray-600">AI predicts future spending and income trends</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                        🚀
                      </div>
                      <h4 className="font-semibold text-gray-900">Powered by Advanced AI</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Our AI features leverage state-of-the-art language models for fast, 
                      secure, and intelligent financial analysis.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>🧠 Advanced Models</span>
                      <span>⚡ Fast Processing</span>
                      <span>🔒 Privacy-First</span>
                      <span>🌐 Always Available</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // Error State
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Service Unavailable</h3>
            <p className="text-gray-600 mb-4">
              {error || 'The AI service is currently not available. Please try again later.'}
            </p>
            <Button onClick={checkAIStatus} disabled={loading}>
              {loading ? 'Checking...' : 'Retry'}
            </Button>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}