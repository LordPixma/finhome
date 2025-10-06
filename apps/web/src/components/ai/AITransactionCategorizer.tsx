'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';
import { Button } from '../Button';

export function AITransactionCategorizer() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [suggestion, setSuggestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategorize = async () => {
    if (!description.trim() || !amount) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/categorize-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount)
        })
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        setSuggestion(result.data);
      } else {
        setError(result.error?.message || 'Failed to categorize');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exampleTransactions = [
    { description: 'STARBUCKS #1234 SEATTLE WA', amount: '5.47' },
    { description: 'SHELL GAS STATION', amount: '45.00' },
    { description: 'AMAZON.COM PURCHASE', amount: '29.99' },
    { description: 'CHIPOTLE MEXICAN GRILL', amount: '12.50' },
    { description: 'AT&T WIRELESS PAYMENT', amount: '85.00' }
  ];

  return (
    <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="text-green-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            🎯
          </div>
          AI Transaction Categorizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., STARBUCKS #1234 SEATTLE WA"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25.99"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <Button
          onClick={handleCategorize}
          disabled={!description.trim() || !amount || loading}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        >
          {loading ? 'Analyzing...' : '🤖 Categorize with AI'}
        </Button>

        {/* Example Transactions */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">Try these examples:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {exampleTransactions.map((example, index) => (
              <button
                key={index}
                onClick={() => {
                  setDescription(example.description);
                  setAmount(example.amount);
                }}
                className="text-left p-2 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
              >
                <p className="text-sm font-medium text-green-800">{example.description}</p>
                <p className="text-xs text-green-600">${example.amount}</p>
              </button>
            ))}
          </div>
        </div>

        {/* AI Suggestion */}
        {suggestion && (
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-green-900">AI Recommendation</h4>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    suggestion.confidence > 0.8 ? 'bg-green-500' : 
                    suggestion.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-gray-600">
                    {Math.round(suggestion.confidence * 100)}% confident
                  </span>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <p className="font-medium text-green-800 text-lg">📁 {suggestion.category}</p>
                <p className="text-sm text-green-700 mt-1">{suggestion.reasoning}</p>
              </div>

              {suggestion.alternativeCategories && suggestion.alternativeCategories.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Other possibilities:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.alternativeCategories.map((cat: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span className="ml-2 text-sm text-gray-600">AI is analyzing the transaction...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}