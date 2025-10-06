'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { Button } from '../Button';


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
      const response = await fetch('/api/ai/financial-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ question })
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        setAdvice(result.data.advice);
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
    <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="text-purple-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
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
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={3}
          />
          <Button
            onClick={handleAskQuestion}
            disabled={!question.trim() || loading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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
          <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
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