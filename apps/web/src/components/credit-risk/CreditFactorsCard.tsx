'use client';

import { useMemo } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CreditCardIcon,
  DocumentCheckIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface FactorBreakdown {
  paymentHistory: number;
  creditUtilization: number;
  creditAge: number;
  creditMix: number;
  recentInquiries: number;
}

interface CreditFactorsCardProps {
  breakdown: FactorBreakdown;
  metrics?: {
    utilizationPercentage?: number;
    missedPayments?: number;
  };
}

export function CreditFactorsCard({ breakdown, metrics }: CreditFactorsCardProps) {
  const factors = useMemo(() => [
    {
      name: 'Payment History',
      score: breakdown.paymentHistory,
      weight: 35,
      icon: DocumentCheckIcon,
      description: 'Track record of on-time payments',
      detail: metrics?.missedPayments !== undefined
        ? `${metrics.missedPayments} missed payments`
        : undefined
    },
    {
      name: 'Credit Utilization',
      score: breakdown.creditUtilization,
      weight: 30,
      icon: CreditCardIcon,
      description: 'How much credit you\'re using vs. available',
      detail: metrics?.utilizationPercentage !== undefined
        ? `${metrics.utilizationPercentage.toFixed(1)}% utilized`
        : undefined
    },
    {
      name: 'Credit Age',
      score: breakdown.creditAge,
      weight: 15,
      icon: ClockIcon,
      description: 'Length of your credit history'
    },
    {
      name: 'Credit Mix',
      score: breakdown.creditMix,
      weight: 10,
      icon: CheckCircleIcon,
      description: 'Variety of credit account types'
    },
    {
      name: 'Recent Inquiries',
      score: breakdown.recentInquiries,
      weight: 10,
      icon: MagnifyingGlassIcon,
      description: 'Recent applications for credit'
    }
  ], [breakdown, metrics]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Credit Score Factors</h3>
        <div className="text-xs text-gray-500">
          Impact weight shown in parentheses
        </div>
      </div>

      <div className="space-y-4">
        {factors.map((factor) => {
          const Icon = factor.icon;
          return (
            <div key={factor.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getScoreColor(factor.score)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{factor.name}</span>
                      <span className="text-xs text-gray-400">({factor.weight}%)</span>
                    </div>
                    <p className="text-xs text-gray-500">{factor.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {factor.detail && (
                    <span className="text-xs text-gray-500">{factor.detail}</span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-sm font-semibold ${getScoreColor(factor.score)}`}>
                    {factor.score}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(factor.score)}`}
                  style={{ width: `${factor.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Impact Explanation */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600">
            <p className="font-medium text-gray-700 mb-1">How factors affect your score</p>
            <p>
              Payment history and credit utilization have the highest impact (65% combined).
              Focus on making on-time payments and keeping utilization below 30% for the best results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
