'use client';

import { useState } from 'react';
import { Button } from './ui';
import { SparklesIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: number;
  categoryId: string;
  type: 'income' | 'expense';
  category?: {
    name: string;
  };
}

interface RecurringPattern {
  description: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  transactionCount: number;
  lastDate: number;
  nextExpectedDate: number;
  confidence: number;
}

interface RecurringPatternDetectorProps {
  transactions: Transaction[];
  onCreateRecurring: (pattern: RecurringPattern) => void;
}

export function RecurringPatternDetector({
  transactions,
  onCreateRecurring,
}: RecurringPatternDetectorProps) {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showPatterns, setShowPatterns] = useState(false);

  const detectPatterns = () => {
    setIsDetecting(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const detectedPatterns: RecurringPattern[] = [];
      const descriptionGroups: Record<string, Transaction[]> = {};

      // Group transactions by similar descriptions (fuzzy matching)
      transactions.forEach(t => {
        const normalizedDesc = t.description.toLowerCase().trim().replace(/\d+/g, '').trim();
        if (!descriptionGroups[normalizedDesc]) {
          descriptionGroups[normalizedDesc] = [];
        }
        descriptionGroups[normalizedDesc].push(t);
      });

      // Analyze each group for recurring patterns
      Object.entries(descriptionGroups).forEach(([_, txns]) => {
        if (txns.length < 3) return; // Need at least 3 occurrences

        // Sort by date
        const sortedTxns = [...txns].sort((a, b) => a.date - b.date);

        // Calculate intervals between transactions (in days)
        const intervals: number[] = [];
        for (let i = 1; i < sortedTxns.length; i++) {
          const daysDiff = Math.round((sortedTxns[i].date - sortedTxns[i-1].date) / (1000 * 60 * 60 * 24));
          intervals.push(daysDiff);
        }

        // Calculate average interval and variance
        const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
        const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        const coefficient = stdDev / avgInterval;

        // Determine if pattern is recurring (coefficient < 0.3 means consistent)
        if (coefficient > 0.3) return;

        // Determine frequency based on average interval
        let frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
        if (avgInterval >= 350 && avgInterval <= 380) frequency = 'yearly';
        else if (avgInterval >= 25 && avgInterval <= 35) frequency = 'monthly';
        else if (avgInterval >= 12 && avgInterval <= 16) frequency = 'biweekly';
        else if (avgInterval >= 5 && avgInterval <= 9) frequency = 'weekly';
        else return; // Not a standard frequency

        // Calculate average amount
        const avgAmount = sortedTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0) / sortedTxns.length;

        // Calculate next expected date
        const lastDate = sortedTxns[sortedTxns.length - 1].date;
        const nextExpectedDate = lastDate + (avgInterval * 24 * 60 * 60 * 1000);

        // Calculate confidence (inverse of coefficient, scaled to 0-100)
        const confidence = Math.round((1 - coefficient) * 100);

        detectedPatterns.push({
          description: sortedTxns[0].description,
          categoryId: sortedTxns[0].categoryId,
          categoryName: sortedTxns[0].category?.name || 'Uncategorized',
          amount: avgAmount,
          frequency,
          transactionCount: sortedTxns.length,
          lastDate,
          nextExpectedDate,
          confidence,
        });
      });

      // Sort by confidence
      detectedPatterns.sort((a, b) => b.confidence - a.confidence);

      setPatterns(detectedPatterns.slice(0, 5)); // Top 5
      setShowPatterns(true);
      setIsDetecting(false);
    }, 2000);
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'weekly': return '📅 Weekly';
      case 'biweekly': return '📆 Bi-weekly';
      case 'monthly': return '🗓️ Monthly';
      case 'yearly': return '📊 Yearly';
      default: return freq;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-lg p-6 border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <ClockIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pattern Detection</h2>
            <p className="text-sm text-gray-600">Automatically detect recurring transactions</p>
          </div>
        </div>
        {!showPatterns && (
          <Button
            onClick={detectPatterns}
            isLoading={isDetecting}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            Detect Patterns
          </Button>
        )}
      </div>

      {showPatterns && patterns.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No recurring patterns detected</p>
          <p className="text-sm text-gray-500">
            You need at least 3 similar transactions to detect a pattern.
          </p>
        </div>
      )}

      {showPatterns && patterns.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found <span className="font-semibold text-blue-600">{patterns.length}</span> recurring patterns
            </p>
            <button
              onClick={() => {
                setShowPatterns(false);
                setPatterns([]);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>

          <div className="grid gap-4">
            {patterns.map((pattern, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{pattern.description}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{pattern.categoryName}</span>
                      <span>•</span>
                      <span>{pattern.transactionCount} occurrences</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getConfidenceColor(pattern.confidence)}`}>
                    {pattern.confidence}% match
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Amount</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(pattern.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Frequency</p>
                      <p className="font-semibold text-gray-900">{getFrequencyLabel(pattern.frequency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Next Expected</p>
                      <p className="font-semibold text-gray-900 text-xs">
                        {new Date(pattern.nextExpectedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => onCreateRecurring(pattern)}
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                  Create Recurring Transaction
                </Button>
              </div>
            ))}
          </div>

          <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200 mt-4">
            <p className="text-sm text-cyan-800">
              <span className="font-semibold">💡 Tip:</span> These patterns are detected from your transaction history.
              Review before creating to ensure accuracy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
