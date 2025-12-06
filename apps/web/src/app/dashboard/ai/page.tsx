"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { AIFinancialAssistant } from "@/components/ai/AIFinancialAssistant";
import { AISpendingSummary } from "@/components/ai/AISpendingSummary";
import {
  FinancialSnapshot,
  SpendingPredictions,
  GoalForecasts,
  DebtStrategy,
  PersonalizedAdvice
} from "@/components/ai-advisor";
import { api } from "@/lib/api";
import {
  ChartBarIcon,
  SparklesIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  FlagIcon,
  CpuChipIcon
} from "@heroicons/react/24/outline";

type TabType = 'overview' | 'predictions' | 'goals' | 'debt' | 'advice' | 'assistant';

export default function AIFeaturesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveReport = async () => {
    try {
      setDownloading(true);
      setError(null);
      const blob = await api.downloadAIReport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finhome-ai-report-${new Date().toISOString().slice(0,7)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "Failed to save report");
    } finally {
      setDownloading(false);
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: ChartBarIcon },
    { id: 'predictions' as const, label: 'Predictions', icon: ArrowTrendingUpIcon },
    { id: 'goals' as const, label: 'Goals', icon: FlagIcon },
    { id: 'debt' as const, label: 'Debt Strategy', icon: BanknotesIcon },
    { id: 'advice' as const, label: 'AI Advice', icon: SparklesIcon },
    { id: 'assistant' as const, label: 'Assistant', icon: CpuChipIcon },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 -mx-6 -mt-6 px-6 pt-8 pb-6 mb-6 border-b border-gray-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">AI Financial Advisor</h1>
              </div>
              <p className="text-gray-600">Intelligent insights, predictions, and personalized financial advice</p>
            </div>
            <div className="flex items-center gap-3">
              {error && (
                <span className="text-sm text-red-600">{error}</span>
              )}
              <Button onClick={handleSaveReport} disabled={downloading}>
                {downloading ? "Generating…" : "Save as PDF"}
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2 -mx-2 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Financial Snapshot */}
            <FinancialSnapshot />

            {/* Quick Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => setActiveTab('predictions')}
                className="text-left"
              >
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <ArrowTrendingUpIcon className="w-6 h-6 text-green-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-2">Spending Predictions</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          AI forecasts your future spending based on historical patterns
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>

              <button
                onClick={() => setActiveTab('goals')}
                className="text-left"
              >
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <FlagIcon className="w-6 h-6 text-blue-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-2">Goal Forecasting</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Track goal progress and get AI-powered success predictions
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>

              <button
                onClick={() => setActiveTab('debt')}
                className="text-left"
              >
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <BanknotesIcon className="w-6 h-6 text-purple-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-2">Debt Strategy</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Optimized debt payoff strategy with what-if calculations
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </div>

            {/* AI Spending Summary */}
            <Card className="h-full">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                    <ChartBarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <CardTitle>Spending Analysis</CardTitle>
                </div>
                <p className="text-sm text-gray-500 mt-2">AI-powered spending insights and categorization stats</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  <div className="p-6">
                    <AISpendingSummary />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'predictions' && (
          <SpendingPredictions />
        )}

        {activeTab === 'goals' && (
          <GoalForecasts />
        )}

        {activeTab === 'debt' && (
          <DebtStrategy />
        )}

        {activeTab === 'advice' && (
          <PersonalizedAdvice />
        )}

        {activeTab === 'assistant' && (
          <Card className="h-full">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg">
                  <LightBulbIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <CardTitle>AI Financial Assistant</CardTitle>
              </div>
              <p className="text-sm text-gray-500 mt-2">Ask questions about your finances and get intelligent answers</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                <div className="p-6">
                  <AIFinancialAssistant />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
