"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { AITransactionCategorizer } from "@/components/ai/AITransactionCategorizer";
import { AIFinancialAssistant } from "@/components/ai/AIFinancialAssistant";
import { AISpendingSummary } from "@/components/ai/AISpendingSummary";
import { api } from "@/lib/api";

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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">AI Insights</h1>
            <p className="text-sm text-gray-600">Categorize transactions, ask questions, and view spending insights.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Categorizer</CardTitle>
            </CardHeader>
            <CardContent>
              <AITransactionCategorizer />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <AIFinancialAssistant />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Spending Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <AISpendingSummary />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
