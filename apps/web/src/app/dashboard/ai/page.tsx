"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { AIFinancialAssistant } from "@/components/ai/AIFinancialAssistant";
import { AISpendingSummary } from "@/components/ai/AISpendingSummary";
import { api } from "@/lib/api";
import {
  ChartBarIcon,
  SparklesIcon,
  LightBulbIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BanknotesIcon
} from "@heroicons/react/24/outline";

export default function AIFeaturesPage() {
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

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 -mx-6 -mt-6 px-6 pt-8 pb-10 mb-8 border-b border-gray-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">AI Insights</h1>
              </div>
              <p className="text-gray-600">Get intelligent insights, ask financial questions, and analyze your spending patterns</p>
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

        {/* AI Features Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Financial Assistant - Larger */}
          <div className="xl:col-span-2">
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
          </div>

          {/* AI Spending Insights */}
          <div className="xl:col-span-1">
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
        </div>

        {/* Quick AI Features Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUpIcon className="w-6 h-6 text-green-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-2">Smart Categorization</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    AI automatically categorizes all your transactions for better insights
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <TrendingDownIcon className="w-6 h-6 text-blue-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-2">Spending Patterns</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Detect recurring transactions and identify unusual spending
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <BanknotesIcon className="w-6 h-6 text-purple-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-2">Budget Recommendations</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Get personalized suggestions to optimize your spending
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
