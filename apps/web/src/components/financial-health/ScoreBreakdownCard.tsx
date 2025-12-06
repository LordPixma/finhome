'use client';

import {
  BanknotesIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

interface ScoreBreakdownProps {
  breakdown: {
    savingsRate: {
      score: number;
      actual: number;
      target: number;
      description: string;
    };
    debtManagement: {
      score: number;
      debtToIncomeRatio: number;
      description: string;
    };
    emergencyFund: {
      score: number;
      monthsCovered: number;
      targetMonths: number;
      description: string;
    };
    budgetAdherence: {
      score: number;
      utilizationRate: number;
      description: string;
    };
    cashFlow: {
      score: number;
      netMonthly: number;
      stabilityIndex: number;
      description: string;
    };
  };
}

interface MetricCardProps {
  title: string;
  score: number;
  icon: React.ReactNode;
  description: string;
  details: { label: string; value: string }[];
  color: string;
}

function MetricCard({ title, score, icon, description, details, color }: MetricCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    if (score >= 20) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{title}</h4>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(score)}`}>
          {score}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">{description}</p>

      <div className="space-y-2">
        {details.map((detail, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-gray-500">{detail.label}</span>
            <span className="font-medium text-gray-900">{detail.value}</span>
          </div>
        ))}
      </div>

      {/* Score bar */}
      <div className="mt-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              backgroundColor: score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : score >= 20 ? '#f97316' : '#ef4444'
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function ScoreBreakdownCard({ breakdown }: ScoreBreakdownProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const metrics = [
    {
      title: 'Savings Rate',
      score: breakdown.savingsRate.score,
      icon: <BanknotesIcon className="w-5 h-5 text-emerald-600" />,
      description: breakdown.savingsRate.description,
      color: 'bg-emerald-100',
      details: [
        { label: 'Current Rate', value: `${breakdown.savingsRate.actual}%` },
        { label: 'Target Rate', value: `${breakdown.savingsRate.target}%` }
      ]
    },
    {
      title: 'Debt Management',
      score: breakdown.debtManagement.score,
      icon: <CreditCardIcon className="w-5 h-5 text-blue-600" />,
      description: breakdown.debtManagement.description,
      color: 'bg-blue-100',
      details: [
        { label: 'Debt-to-Income', value: `${breakdown.debtManagement.debtToIncomeRatio}%` },
        { label: 'Healthy Range', value: '< 36%' }
      ]
    },
    {
      title: 'Emergency Fund',
      score: breakdown.emergencyFund.score,
      icon: <ShieldCheckIcon className="w-5 h-5 text-purple-600" />,
      description: breakdown.emergencyFund.description,
      color: 'bg-purple-100',
      details: [
        { label: 'Months Covered', value: `${breakdown.emergencyFund.monthsCovered}` },
        { label: 'Target Months', value: `${breakdown.emergencyFund.targetMonths}` }
      ]
    },
    {
      title: 'Budget Adherence',
      score: breakdown.budgetAdherence.score,
      icon: <ChartPieIcon className="w-5 h-5 text-orange-600" />,
      description: breakdown.budgetAdherence.description,
      color: 'bg-orange-100',
      details: [
        { label: 'Budget Used', value: `${Math.round(breakdown.budgetAdherence.utilizationRate)}%` },
        { label: 'Target', value: '< 100%' }
      ]
    },
    {
      title: 'Cash Flow',
      score: breakdown.cashFlow.score,
      icon: <ArrowTrendingUpIcon className="w-5 h-5 text-cyan-600" />,
      description: breakdown.cashFlow.description,
      color: 'bg-cyan-100',
      details: [
        { label: 'Net Monthly', value: formatCurrency(breakdown.cashFlow.netMonthly) },
        { label: 'Stability', value: `${Math.round((1 - breakdown.cashFlow.stabilityIndex) * 100)}%` }
      ]
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        Score Breakdown
        <span className="text-sm font-normal text-gray-500">(20% weight each)</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>
    </div>
  );
}
