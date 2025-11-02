'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { Button } from '../Button';
import { api } from '@/lib/api';


export function AIFinancialAssistant() {
  const [question, setQuestion] = useState('');
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.getFinancialAdvice({ question });
      
      if (result.success && result.data) {
        setAdvice((result.data as any).advice);
        setQuestion(''); // Clear the question
      } else {
        setError(result.error?.message || 'Failed to get advice');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "How can I reduce my monthly expenses?",
    "What percentage of income should I save?",
    "How do I build an emergency fund?",
    "Should I pay off debt or invest first?",
    "How can I budget for a vacation?"
  ];

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600/10 text-purple-600 flex items-center justify-center">
            🤖
          </div>
          AI Financial Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Ask me anything about your finances:
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., How can I save more money each month?"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            rows={3}
          />
          <Button
            onClick={handleAskQuestion}
            disabled={!question.trim() || loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? 'Thinking...' : 'Ask AI Assistant'}
          </Button>
        </div>

        {/* Suggested Questions */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">Popular questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => setQuestion(q)}
                className="text-xs px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* AI Response */}
        {advice && (
          <div className="bg-gradient-to-r from-purple-50 to-purple-50/30 rounded-lg p-4 border border-purple-100">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                🧠
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">AI Assistant:</p>
                <p className="text-sm text-gray-700 leading-relaxed">{advice}</p>
                <p className="text-xs text-gray-500 mt-2">
                  💡 This is AI-generated advice. Consider consulting a financial professional for personalized guidance.
                </p>
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
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-sm text-gray-600">AI is analyzing your question...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}