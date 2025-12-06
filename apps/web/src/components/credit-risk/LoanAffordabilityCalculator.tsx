'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  CalculatorIcon,
  CurrencyPoundIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface AffordabilityResult {
  id: string;
  affordabilityScore: number;
  affordabilityBand: 'very_affordable' | 'affordable' | 'stretching' | 'risky' | 'unaffordable';
  maxAffordableAmount: number;
  recommendedAmount: number;
  monthlyPaymentEstimate: number;
  totalInterestEstimate: number;
  debtToIncomeRatio: number;
  debtToIncomeAfterLoan: number;
  stressTestResults: {
    canAffordWith2PercentRateIncrease: boolean;
    canAffordWith10PercentIncomeDecrease: boolean;
    monthsOfSavingsCoverage: number;
  };
  riskFactors: string[];
  recommendations: string[];
  aiSummary: string;
}

const loanTypes = [
  { value: 'mortgage', label: 'Mortgage', icon: '🏠' },
  { value: 'personal', label: 'Personal Loan', icon: '💰' },
  { value: 'auto', label: 'Car Loan', icon: '🚗' },
  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
  { value: 'student', label: 'Student Loan', icon: '🎓' },
  { value: 'business', label: 'Business Loan', icon: '🏢' },
  { value: 'other', label: 'Other', icon: '📋' }
] as const;

export function LoanAffordabilityCalculator() {
  const [loanType, setLoanType] = useState<typeof loanTypes[number]['value']>('personal');
  const [amount, setAmount] = useState('10000');
  const [term, setTerm] = useState('60');
  const [rate, setRate] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<AffordabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid loan amount');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const response = await api.creditRisk.calculateAffordability({
        loanType,
        requestedAmount: parseFloat(amount),
        requestedTermMonths: term ? parseInt(term) : undefined,
        estimatedInterestRate: rate ? parseFloat(rate) / 100 : undefined
      }) as any;

      if (response.success) {
        setResult(response.data);
      } else {
        throw new Error(response.error?.message || 'Calculation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate affordability');
    } finally {
      setIsCalculating(false);
    }
  };

  const getBandConfig = (band: AffordabilityResult['affordabilityBand']) => {
    switch (band) {
      case 'very_affordable':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircleIcon, label: 'Very Affordable' };
      case 'affordable':
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircleIcon, label: 'Affordable' };
      case 'stretching':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: ExclamationTriangleIcon, label: 'Stretching' };
      case 'risky':
        return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: ExclamationTriangleIcon, label: 'Risky' };
      case 'unaffordable':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: ExclamationTriangleIcon, label: 'Unaffordable' };
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <CalculatorIcon className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Loan Affordability Calculator</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="space-y-4">
          {/* Loan Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type</label>
            <div className="grid grid-cols-4 gap-2">
              {loanTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setLoanType(type.value)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    loanType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{type.icon}</span>
                  <p className="text-xs mt-1 text-gray-600">{type.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount</label>
            <div className="relative">
              <CurrencyPoundIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10,000"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Term */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Term (months)</label>
            <input
              type="number"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="60"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Interest Rate (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interest Rate (% APR) <span className="text-gray-400">- optional</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Auto-estimate based on loan type"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isCalculating ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <ChartBarIcon className="w-5 h-5" />
                Calculate Affordability
              </>
            )}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Affordability Band */}
              {(() => {
                const config = getBandConfig(result.affordabilityBand);
                const Icon = config.icon;
                return (
                  <div className={`p-4 rounded-lg border ${config.color}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold">{config.label}</span>
                      <span className="ml-auto text-2xl font-bold">{result.affordabilityScore}/100</span>
                    </div>
                    <p className="text-sm">{result.aiSummary}</p>
                  </div>
                );
              })()}

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Monthly Payment</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(result.monthlyPaymentEstimate)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Total Interest</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(result.totalInterestEstimate)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">DTI After Loan</p>
                  <p className="text-lg font-bold text-gray-900">
                    {result.debtToIncomeAfterLoan.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Max Affordable</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(result.maxAffordableAmount)}
                  </p>
                </div>
              </div>

              {/* Stress Tests */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Stress Tests</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">2% rate increase</span>
                    <span className={result.stressTestResults.canAffordWith2PercentRateIncrease ? 'text-green-600' : 'text-red-600'}>
                      {result.stressTestResults.canAffordWith2PercentRateIncrease ? '✓ Passed' : '✗ Failed'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">10% income decrease</span>
                    <span className={result.stressTestResults.canAffordWith10PercentIncomeDecrease ? 'text-green-600' : 'text-red-600'}>
                      {result.stressTestResults.canAffordWith10PercentIncomeDecrease ? '✓ Passed' : '✗ Failed'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Savings coverage</span>
                    <span className="text-gray-900">{result.stressTestResults.monthsOfSavingsCoverage} months</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8 bg-gray-50 rounded-lg">
              <div>
                <CalculatorIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Enter loan details and click calculate to see your affordability assessment</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
