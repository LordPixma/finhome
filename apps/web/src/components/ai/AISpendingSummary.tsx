'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { Button } from '../Button';
import { api } from '@/lib/api';

export function AISpendingSummary() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.getMonthlySummary();
      
      if (result.success && result.data) {
        setSummary(result.data);
      } else {
        setError(result.error?.message || 'Failed to load summary');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="text-blue-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            📊
          </div>
          AI Spending Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Refresh Button */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            AI-powered analysis of your spending patterns
          </p>
          <Button
            onClick={loadSummary}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Analyzing...' : '🔄 Refresh'}
          </Button>
        </div>

        {/* AI Summary */}
        {summary && !loading && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                  🧠
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">AI Analysis:</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{summary.summary}</p>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Analysis Period</p>
                    <p className="text-xl font-bold">{summary.period}</p>
                  </div>
                  <div className="text-2xl">📅</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm">Transactions Analyzed</p>
                    <p className="text-xl font-bold">{summary.transactionCount}</p>
                  </div>
                  <div className="text-2xl">💳</div>
                </div>
              </div>
            </div>

            {/* AI Features Preview */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">🚀 More AI Features Coming Soon</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Budget recommendations</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Anomaly detection</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Spending predictions</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Smart alerts</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm text-gray-600 text-center">
              AI is analyzing your spending patterns...
            </p>
            <p className="text-xs text-gray-500 mt-1">
              This may take a few moments
            </p>
          </div>
        )}

        {/* Empty State */}
        {!summary && !loading && !error && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <p className="text-gray-600 mb-4">Ready to analyze your spending with AI</p>
            <Button onClick={loadSummary}>Start Analysis</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}