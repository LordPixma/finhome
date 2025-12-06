'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  BanknotesIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface DebtItem {
  debtId: string;
  debtName: string;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  recommendedPayment: number;
  payoffOrder: number;
  projectedPayoffDate: string;
  totalInterestCost: number;
}

interface DebtStrategyData {
  strategy: 'avalanche' | 'snowball';
  strategyReason: string;
  totalDebt: number;
  totalMonthlyMinimum: number;
  recommendedMonthlyPayment: number;
  projectedPayoffDate: string;
  totalInterestSaved: number;
  payoffOrder: DebtItem[];
  milestones: Array<{
    date: string;
    debtName: string;
    description: string;
  }>;
}

export function DebtStrategy() {
  const [strategy, setStrategy] = useState<DebtStrategyData | null>(null);
  const [extraPayment, setExtraPayment] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noDebt, setNoDebt] = useState(false);

  const fetchStrategy = async (extra: number = 0) => {
    try {
      const response = await api.aiAdvisor.getDebtStrategy(extra) as any;
      if (response.success) {
        if (response.data === null) {
          setNoDebt(true);
          setStrategy(null);
        } else {
          setNoDebt(false);
          setStrategy(response.data.strategy);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to load strategy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load debt strategy');
    }
  };

  useEffect(() => {
    async function initialFetch() {
      setLoading(true);
      await fetchStrategy(0);
      setLoading(false);
    }
    initialFetch();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    await fetchStrategy(parseFloat(extraPayment) || 0);
    setRecalculating(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-red-600">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (noDebt) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BanknotesIcon className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Debt Payoff Strategy</h3>
        </div>
        <div className="text-center py-8">
          <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h4 className="text-xl font-semibold text-gray-900 mb-2">Congratulations!</h4>
          <p className="text-gray-600">You're debt-free! Keep up the great work.</p>
        </div>
      </div>
    );
  }

  if (!strategy) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BanknotesIcon className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Debt Payoff Strategy</h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            strategy.strategy === 'avalanche'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}
        >
          {strategy.strategy === 'avalanche' ? 'Avalanche Method' : 'Snowball Method'}
        </span>
      </div>

      {/* Strategy Explanation */}
      <div className="p-4 bg-gray-50 rounded-lg mb-6">
        <p className="text-sm text-gray-600">{strategy.strategyReason}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-red-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Total Debt</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(strategy.totalDebt)}</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Recommended Payment</p>
          <p className="text-lg font-bold text-blue-600">
            {formatCurrency(strategy.recommendedMonthlyPayment)}/mo
          </p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Interest Saved</p>
          <p className="text-lg font-bold text-green-600">
            {formatCurrency(strategy.totalInterestSaved)}
          </p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Debt-Free By</p>
          <p className="text-lg font-bold text-purple-600">{formatDate(strategy.projectedPayoffDate)}</p>
        </div>
      </div>

      {/* Extra Payment Calculator */}
      <div className="p-4 bg-indigo-50 rounded-lg mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">What if you pay extra?</h4>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
              <input
                type="number"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <span className="text-sm text-gray-500">extra per month</span>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {recalculating ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <ChartBarIcon className="w-4 h-4" />
                Recalculate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Payoff Order */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Recommended Payoff Order</h4>
        <div className="space-y-3">
          {strategy.payoffOrder.map((debt, index) => (
            <div
              key={debt.debtId}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {debt.payoffOrder}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{debt.debtName}</p>
                <p className="text-sm text-gray-500">
                  {debt.interestRate.toFixed(1)}% APR • Min: {formatCurrency(debt.minimumPayment)}/mo
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{formatCurrency(debt.currentBalance)}</p>
                <p className="text-xs text-gray-500">Payoff: {formatDate(debt.projectedPayoffDate)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      {strategy.milestones.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Upcoming Milestones</h4>
          <div className="space-y-2">
            {strategy.milestones.slice(0, 4).map((milestone, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <CalendarIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{milestone.debtName}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(milestone.date)} - {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
