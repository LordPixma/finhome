'use client';

import { useState } from 'react';
import { Button } from './ui';
import { BellAlertIcon, CheckCircleIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: number;
  type: 'income' | 'expense';
  category?: {
    name: string;
  };
}

interface BillSuggestion {
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  frequency: 'monthly' | 'yearly';
  lastPaid: number;
  transactionCount: number;
}

interface BillReminderSuggestionsProps {
  transactions: Transaction[];
  onCreateReminder: (suggestion: BillSuggestion) => void;
}

export function BillReminderSuggestions({
  transactions,
  onCreateReminder,
}: BillReminderSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<BillSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const analyzeBills = () => {
    setIsAnalyzing(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const billSuggestions: BillSuggestion[] = [];

      // Bill keywords to identify common bills
      const billKeywords = [
        'netflix', 'spotify', 'amazon prime', 'apple', 'disney',
        'electric', 'gas', 'water', 'internet', 'phone', 'mobile',
        'insurance', 'rent', 'mortgage', 'gym', 'subscription'
      ];

      // Group transactions by description
      const descriptionGroups: Record<string, Transaction[]> = {};

      transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          const normalizedDesc = t.description.toLowerCase().trim();

          // Check if it matches bill keywords
          const matchesBill = billKeywords.some(keyword => normalizedDesc.includes(keyword));
          if (!matchesBill) return;

          const key = normalizedDesc.replace(/\d+/g, '').trim();
          if (!descriptionGroups[key]) {
            descriptionGroups[key] = [];
          }
          descriptionGroups[key].push(t);
        });

      // Analyze each group
      Object.entries(descriptionGroups).forEach(([desc, txns]) => {
        if (txns.length < 2) return; // Need at least 2 occurrences

        // Sort by date
        const sortedTxns = [...txns].sort((a, b) => a.date - b.date);

        // Calculate intervals
        const intervals: number[] = [];
        for (let i = 1; i < sortedTxns.length; i++) {
          const daysDiff = Math.round((sortedTxns[i].date - sortedTxns[i-1].date) / (1000 * 60 * 60 * 24));
          intervals.push(daysDiff);
        }

        const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

        // Determine frequency (monthly or yearly)
        let frequency: 'monthly' | 'yearly';
        if (avgInterval >= 25 && avgInterval <= 35) {
          frequency = 'monthly';
        } else if (avgInterval >= 350 && avgInterval <= 380) {
          frequency = 'yearly';
        } else {
          return; // Not a standard bill frequency
        }

        // Calculate average amount
        const avgAmount = sortedTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0) / sortedTxns.length;

        // Get the most common day of month
        const daysOfMonth = sortedTxns.map(t => new Date(t.date).getDate());
        const dayFrequency: Record<number, number> = {};
        daysOfMonth.forEach(day => {
          dayFrequency[day] = (dayFrequency[day] || 0) + 1;
        });
        const mostCommonDay = parseInt(Object.entries(dayFrequency)
          .sort((a, b) => b[1] - a[1])[0][0]);

        billSuggestions.push({
          name: sortedTxns[0].description,
          amount: avgAmount,
          dueDay: mostCommonDay,
          category: sortedTxns[0].category?.name || 'Bills',
          frequency,
          lastPaid: sortedTxns[sortedTxns.length - 1].date,
          transactionCount: sortedTxns.length,
        });
      });

      // Sort by amount (highest first)
      billSuggestions.sort((a, b) => b.amount - a.amount);

      setSuggestions(billSuggestions.slice(0, 8)); // Top 8
      setShowSuggestions(true);
      setIsAnalyzing(false);
    }, 1800);
  };

  const getDayLabel = (day: number) => {
    if (day === 1 || day === 21 || day === 31) return `${day}st`;
    if (day === 2 || day === 22) return `${day}nd`;
    if (day === 3 || day === 23) return `${day}rd`;
    return `${day}th`;
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-lg p-6 border border-orange-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <BellAlertIcon className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bill Reminder Suggestions</h2>
            <p className="text-sm text-gray-600">Detect bills from your transaction history</p>
          </div>
        </div>
        {!showSuggestions && (
          <Button
            onClick={analyzeBills}
            isLoading={isAnalyzing}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          >
            <BellAlertIcon className="w-5 h-5 mr-2" />
            Analyze Transactions
          </Button>
        )}
      </div>

      {showSuggestions && suggestions.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <BellAlertIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No bill patterns detected</p>
          <p className="text-sm text-gray-500">
            You need recurring expenses with bill-related keywords (e.g., Netflix, Electric, Insurance).
          </p>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found <span className="font-semibold text-orange-600">{suggestions.length}</span> potential bills
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{suggestion.name}</h3>
                    <p className="text-sm text-gray-500">{suggestion.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-bold text-orange-600">{formatCurrency(suggestion.amount)}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3 grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <CalendarDaysIcon className="w-3 h-3" />
                      <span>Due Date</span>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">{getDayLabel(suggestion.dueDay)} of month</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Frequency</p>
                    <p className="font-semibold text-gray-900 text-sm capitalize">{suggestion.frequency}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{suggestion.transactionCount} payments found</span>
                  <span>Last: {new Date(suggestion.lastPaid).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>

                <Button
                  onClick={() => onCreateReminder(suggestion)}
                  size="sm"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                  Create Reminder
                </Button>
              </div>
            ))}
          </div>

          <div className="bg-red-50 rounded-lg p-4 border border-red-200 mt-4">
            <p className="text-sm text-red-800">
              <span className="font-semibold">💡 Tip:</span> These are detected from recurring expenses. Review amounts and dates before creating reminders.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
