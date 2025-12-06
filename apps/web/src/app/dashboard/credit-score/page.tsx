'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import {
  CreditScoreGauge,
  CreditFactorsCard,
  ImprovementTipsCard,
  LoanAffordabilityCalculator,
  CreditScoreHistoryChart
} from '@/components/credit-risk';
import {
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface CreditRiskData {
  score: {
    id: string;
    overallScore: number;
    scoreBand: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
    breakdown: {
      paymentHistory: number;
      creditUtilization: number;
      creditAge: number;
      creditMix: number;
      recentInquiries: number;
    };
    metrics: {
      totalCreditLimit: number | null;
      totalCreditUsed: number | null;
      utilizationPercentage: number | null;
      missedPayments: number | null;
    };
    riskFactors: string[];
    positiveFactors: string[];
    improvementTips: string[];
    calculatedAt: string;
  } | null;
  history: Array<{
    period: string;
    score: number;
    previousScore: number | null;
    delta: number;
  }>;
  recentAssessments: Array<{
    id: string;
    loanType: string;
    requestedAmount: number;
    affordabilityBand: string;
    calculatedAt: string;
  }>;
  bureauConnections: Array<{
    bureau: string;
    status: string;
    lastSyncAt: string | null;
  }>;
  officialScores: Array<{
    bureau: string;
    score: number | null;
    date: string | null;
  }>;
}

export default function CreditScorePage() {
  const [data, setData] = useState<CreditRiskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.creditRisk.getSummary() as any;
      if (response.success) {
        setData(response.data);
      } else {
        throw new Error('Failed to load credit risk data');
      }
    } catch (err) {
      console.error('Error loading credit risk:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await api.creditRisk.calculateScore();
      await loadData();
    } catch (err) {
      console.error('Error recalculating score:', err);
      setError('Failed to recalculate score');
    } finally {
      setIsRecalculating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreBandLabel = (band: string) => {
    switch (band) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      case 'very_poor': return 'Very Poor';
      default: return band;
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading your credit assessment...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h2>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ChartBarIcon className="w-7 h-7 text-blue-600" />
                Credit Risk Assessment
              </h1>
              <p className="text-gray-500 mt-1">
                Internal credit score analysis based on your financial data
              </p>
            </div>
            <div className="flex items-center gap-3">
              {data?.score?.calculatedAt && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <ClockIcon className="w-4 h-4" />
                  Updated {formatDate(data.score.calculatedAt)}
                </div>
              )}
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                {isRecalculating ? 'Calculating...' : 'Recalculate'}
              </button>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">This is an estimated internal score</p>
              <p className="text-blue-600">
                This score is calculated based on your financial data in Finhome360 and is for guidance purposes only.
                It is not an official credit bureau score. For official scores, connect to Experian, Equifax, or TransUnion.
              </p>
            </div>
          </div>

          {/* Main Score Section */}
          {data?.score ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Gauge */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Internal Score</h2>
                  <CreditScoreGauge
                    score={data.score.overallScore}
                    scoreBand={data.score.scoreBand}
                    size="lg"
                  />
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      Score range: 0-999 (similar to Experian)
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                  <p className="text-blue-100 text-sm mb-1">Score Band</p>
                  <p className="text-3xl font-bold">{getScoreBandLabel(data.score.scoreBand)}</p>
                  <p className="text-blue-100 text-xs mt-2">
                    Based on 5 key credit factors
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
                  <p className="text-emerald-100 text-sm mb-1">Score Trend</p>
                  <p className="text-3xl font-bold">
                    {data.history.length > 1
                      ? (data.history[data.history.length - 1]?.delta > 0 ? '+' : '') +
                        (data.history[data.history.length - 1]?.delta || 0)
                      : 'New'}
                  </p>
                  <p className="text-emerald-100 text-xs mt-2">
                    {data.history.length > 1 ? 'Points from last month' : 'Start tracking your progress'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                  <p className="text-purple-100 text-sm mb-1">Credit Utilization</p>
                  <p className="text-3xl font-bold">
                    {data.score.metrics.utilizationPercentage?.toFixed(1) ?? '-'}%
                  </p>
                  <p className="text-purple-100 text-xs mt-2">
                    Target: Keep below 30%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
                  <p className="text-orange-100 text-sm mb-1">Positive Factors</p>
                  <p className="text-3xl font-bold">{data.score.positiveFactors.length}</p>
                  <p className="text-orange-100 text-xs mt-2">
                    Helping your credit score
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8 text-center">
              <ShieldCheckIcon className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Calculate Your Credit Score</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                We'll analyze your financial data to generate an internal credit risk assessment. Click below to start.
              </p>
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isRecalculating ? 'Calculating...' : 'Calculate My Score'}
              </button>
            </div>
          )}

          {/* Credit Factors */}
          {data?.score?.breakdown && (
            <CreditFactorsCard
              breakdown={data.score.breakdown}
              metrics={{
                utilizationPercentage: data.score.metrics.utilizationPercentage ?? undefined,
                missedPayments: data.score.metrics.missedPayments ?? undefined
              }}
            />
          )}

          {/* History Chart */}
          {data?.history && data.history.length > 0 && (
            <CreditScoreHistoryChart
              history={data.history}
              currentScore={data.score?.overallScore || 0}
            />
          )}

          {/* Improvement Tips */}
          {data?.score && (
            <ImprovementTipsCard
              riskFactors={data.score.riskFactors}
              positiveFactors={data.score.positiveFactors}
              improvementTips={data.score.improvementTips}
            />
          )}

          {/* Loan Affordability Calculator */}
          <LoanAffordabilityCalculator />

          {/* Bureau Connections Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Credit Bureau Connections</h3>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Coming Soon</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Experian', 'Equifax', 'TransUnion'].map((bureau) => {
                const connection = data?.bureauConnections?.find(c => c.bureau.toLowerCase() === bureau.toLowerCase());
                const officialScore = data?.officialScores?.find(s => s.bureau.toLowerCase() === bureau.toLowerCase());

                return (
                  <div key={bureau} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{bureau}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        connection?.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {connection?.status === 'active' ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    {officialScore?.score ? (
                      <p className="text-2xl font-bold text-gray-900">{officialScore.score}</p>
                    ) : (
                      <p className="text-sm text-gray-500">Connect to view score</p>
                    )}
                    <button
                      disabled
                      className="mt-3 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed"
                    >
                      Connect Coming Soon
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Assessments */}
          {data?.recentAssessments && data.recentAssessments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Affordability Assessments</h3>
              <div className="space-y-3">
                {data.recentAssessments.map((assessment) => (
                  <div key={assessment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {assessment.loanType.replace('_', ' ')} Loan
                      </p>
                      <p className="text-sm text-gray-500">
                        £{assessment.requestedAmount.toLocaleString()} - {formatDate(assessment.calculatedAt)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      assessment.affordabilityBand === 'very_affordable' ? 'bg-green-100 text-green-800' :
                      assessment.affordabilityBand === 'affordable' ? 'bg-blue-100 text-blue-800' :
                      assessment.affordabilityBand === 'stretching' ? 'bg-yellow-100 text-yellow-800' :
                      assessment.affordabilityBand === 'risky' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {assessment.affordabilityBand.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
