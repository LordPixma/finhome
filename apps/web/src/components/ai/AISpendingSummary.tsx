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
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
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
            <div className="bg-gradient-to-r from-blue-50 to-blue-50/30 rounded-lg p-4 border border-blue-100">
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
              <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Analysis Period</p>
                    <p className="text-lg font-semibold text-gray-900">{summary.period}</p>
                  </div>
                  <div className="text-2xl">📅</div>
                </div>
              </div>
              <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Transactions Analyzed</p>
                    <p className="text-lg font-semibold text-gray-900">{summary.transactionCount}</p>
                  </div>
                  <div className="text-2xl">💳</div>
                </div>
              </div>
            </div>
            {/* Mini roadmap */}
            <div className="rounded-lg p-4 border border-dashed border-gray-300 bg-white">
              <h4 className="font-semibold text-gray-900 mb-3">🚀 Roadmap Preview</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Budget recommendations</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Anomaly detection</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Spending predictions</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Smart alerts</li>
              </ul>
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