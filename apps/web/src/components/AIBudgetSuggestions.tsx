'use client';

import { useState } from 'react';
import { Button } from './ui';
import { SparklesIcon, LightBulbIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  date: number;
  type: 'income' | 'expense';
}

interface BudgetSuggestion {
  categoryId: string;
  categoryName: string;
  suggestedAmount: number;
  currentSpending: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

interface AIBudgetSuggestionsProps {
  categories: Category[];
  transactions: Transaction[];
  existingBudgets: Array<{ categoryId: string; amount: number }>;
  onApplySuggestion: (categoryId: string, amount: number) => void;
}

export function AIBudgetSuggestions({
  categories,
  transactions,
  existingBudgets,
  onApplySuggestion,
}: AIBudgetSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const generateSuggestions = () => {
    setIsGenerating(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const newSuggestions: BudgetSuggestion[] = [];

      // Get last 3 months of transactions
      const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const recentTransactions = transactions.filter(t => t.date >= threeMonthsAgo && t.type === 'expense');

      // Calculate average spending per category
      const categorySpending: Record<string, number[]> = {};
      recentTransactions.forEach(t => {
        if (!categorySpending[t.categoryId]) {
          categorySpending[t.categoryId] = [];
        }
        categorySpending[t.categoryId].push(Math.abs(t.amount));
      });

      // Generate suggestions for top spending categories
      Object.entries(categorySpending).forEach(([categoryId, amounts]) => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return;

        // Skip if budget already exists
        if (existingBudgets.some(b => b.categoryId === categoryId)) return;

        const totalSpent = amounts.reduce((sum, a) => sum + a, 0);
        const avgSpent = totalSpent / 3; // Average per month over 3 months
        const maxSpent = Math.max(...amounts);

        // Only suggest for categories with significant spending
        if (avgSpent < 50) return;

        // Calculate suggested budget (110% of average to allow buffer)
        const suggestedAmount = Math.ceil(avgSpent * 1.1);

        // Determine confidence based on spending consistency
        const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avgSpent, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        const coefficient = stdDev / avgSpent;

        let confidence: 'high' | 'medium' | 'low';
        let reason: string;

        if (coefficient < 0.2) {
          confidence = 'high';
          reason = `Consistent spending pattern. You typically spend ${formatCurrency(avgSpent)} per month in this category.`;
        } else if (coefficient < 0.5) {
          confidence = 'medium';
          reason = `Moderate spending variation. Average of ${formatCurrency(avgSpent)} per month with occasional peaks.`;
        } else {
          confidence = 'low';
          reason = `Variable spending detected. Ranges from ${formatCurrency(Math.min(...amounts))} to ${formatCurrency(maxSpent)} per month.`;
        }

        newSuggestions.push({
          categoryId,
          categoryName: category.name,
          suggestedAmount,
          currentSpending: avgSpent,
          reason,
          confidence,
        });
      });

      // Sort by current spending (highest first)
      newSuggestions.sort((a, b) => b.currentSpending - a.currentSpending);

      setSuggestions(newSuggestions.slice(0, 5)); // Top 5 suggestions
      setShowSuggestions(true);
      setIsGenerating(false);
    }, 1500);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high': return '🎯 High Confidence';
      case 'medium': return '⚡ Medium Confidence';
      case 'low': return '💡 Low Confidence';
      default: return '';
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Budget Suggestions</h2>
            <p className="text-sm text-gray-600">Smart recommendations based on your spending patterns</p>
          </div>
        </div>
        {!showSuggestions && (
          <Button
            onClick={generateSuggestions}
            isLoading={isGenerating}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            Generate Suggestions
          </Button>
        )}
      </div>

      {showSuggestions && suggestions.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <LightBulbIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No suggestions available</p>
          <p className="text-sm text-gray-500">
            You either have budgets for all major categories or need more transaction history (at least 3 months).
          </p>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found <span className="font-semibold text-purple-600">{suggestions.length}</span> budget recommendations
            </p>
            <button
              onClick={() => {
                setShowSuggestions(false);
                setSuggestions([]);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>

          <div className="grid gap-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.categoryId}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{suggestion.categoryName}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getConfidenceColor(suggestion.confidence)}`}>
                      {getConfidenceBadge(suggestion.confidence)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Suggested Budget</p>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(suggestion.suggestedAmount)}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-gray-700 flex items-start gap-2">
                    <LightBulbIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    {suggestion.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Current avg: <span className="font-semibold">{formatCurrency(suggestion.currentSpending)}</span>
                  </div>
                  <Button
                    onClick={() => onApplySuggestion(suggestion.categoryId, suggestion.suggestedAmount)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">💡 Tip:</span> These suggestions are based on your last 3 months of spending.
              You can always adjust the amounts after creating the budgets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
