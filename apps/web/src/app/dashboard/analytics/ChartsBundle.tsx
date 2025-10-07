"use client";

import { formatCurrency } from '@/lib/utils';
import { InteractiveChart } from '@/components/InteractiveChart';
import type { ForecastResult } from '@/lib/predictiveAnalytics';

interface ChartsBundleProps {
  forecast: ForecastResult | null;
  monthlyData: { month: string; income: number; expense: number }[];
  expenseCategories: { categoryName: string; amount: number }[];
  incomeCategories: { categoryName: string; amount: number }[];
  totalIncome: number;
  totalExpense: number;
}

export function ChartsBundle({ forecast, monthlyData, expenseCategories, incomeCategories, totalIncome, totalExpense }: ChartsBundleProps) {
  return (
    <>
      {/* Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {forecast && (
          <InteractiveChart
            data={forecast.predictions.map(p => ({
              name: p.month,
              income: p.income,
              expense: p.expense,
              net: p.net,
              predicted: p.predicted
            }))}
            type="line"
            title="📈 Cashflow Forecast"
            subtitle={`Including ${forecast.predictions.filter(p => p.predicted).length} months prediction (${(forecast.confidence * 100).toFixed(0)}% confidence)`}
            height={350}
            showPrediction={true}
          />
        )}

        <InteractiveChart
          data={monthlyData.map(m => ({ name: m.month, income: m.income, expense: m.expense }))}
          type="area"
          title="💰 Income vs Expenses"
          subtitle="Historical cashflow comparison"
          height={350}
        />
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {expenseCategories.length > 0 && (
          <InteractiveChart
            data={expenseCategories.map(cat => ({ name: cat.categoryName, value: cat.amount }))}
            type="pie"
            title="💸 Expense Categories"
            subtitle={`${expenseCategories.length} categories • ${formatCurrency(totalExpense)} total`}
            height={350}
          />
        )}
        {incomeCategories.length > 0 && (
          <InteractiveChart
            data={incomeCategories.map(cat => ({ name: cat.categoryName, value: cat.amount }))}
            type="pie"
            title="💰 Income Sources"
            subtitle={`${incomeCategories.length} sources • ${formatCurrency(totalIncome)} total`}
            height={350}
          />
        )}
      </div>
    </>
  );
}
