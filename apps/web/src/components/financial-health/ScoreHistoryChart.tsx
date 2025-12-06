'use client';

import { useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';

interface HistoryEntry {
  period: string;
  score: number;
  previousScore?: number | null;
  delta: number;
  reason?: string;
}

interface ScoreHistoryChartProps {
  history: HistoryEntry[];
  currentScore: number;
}

export function ScoreHistoryChart({ history, currentScore: _currentScore }: ScoreHistoryChartProps) {
  void _currentScore; // Reserved for future use
  const chartData = useMemo(() => {
    // Sort by period and format for chart
    return [...history]
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((entry) => {
        const [year, month] = entry.period.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthLabel = monthNames[parseInt(month) - 1] || month;

        return {
          ...entry,
          label: `${monthLabel} ${year.slice(2)}`,
          fill: entry.score >= 80 ? '#10b981' : entry.score >= 60 ? '#3b82f6' : entry.score >= 40 ? '#f59e0b' : '#ef4444'
        };
      });
  }, [history]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return { direction: 'stable', value: 0 };

    const firstScore = chartData[0].score;
    const lastScore = chartData[chartData.length - 1].score;
    const change = lastScore - firstScore;

    return {
      direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
      value: Math.abs(change)
    };
  }, [chartData]);

  const averageScore = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.round(chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length);
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-3">
          <p className="font-semibold text-gray-900">{data.label}</p>
          <p className="text-2xl font-bold" style={{ color: data.fill }}>
            {data.score}
          </p>
          {data.delta !== 0 && (
            <p className={`text-sm ${data.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.delta > 0 ? '+' : ''}{data.delta} from previous
            </p>
          )}
          {data.reason && (
            <p className="text-xs text-gray-500 mt-1 max-w-xs">{data.reason}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Score History</h3>
        <div className="h-48 flex items-center justify-center text-gray-500">
          <p>No historical data available yet. Check back next month!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Score History</h3>
        <div className="flex items-center gap-4">
          {/* Trend indicator */}
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            trend.direction === 'up' ? 'bg-green-100 text-green-700' :
            trend.direction === 'down' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {trend.direction === 'up' ? (
              <ArrowTrendingUpIcon className="w-4 h-4" />
            ) : trend.direction === 'down' ? (
              <ArrowTrendingDownIcon className="w-4 h-4" />
            ) : (
              <MinusIcon className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {trend.direction === 'stable' ? 'Stable' : `${trend.value} pts`}
            </span>
          </div>

          {/* Average badge */}
          <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
            Avg: {averageScore}
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Score zone reference lines */}
            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" strokeOpacity={0.5} />
            <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="5 5" strokeOpacity={0.5} />
            <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.5} />

            {/* Area under curve */}
            <Area
              type="monotone"
              dataKey="score"
              stroke="none"
              fill="url(#scoreGradient)"
            />

            {/* Score line */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill={payload.fill}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 8, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Score zone legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">Excellent (80+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-600">Good (60-79)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-xs text-gray-600">Fair (40-59)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-gray-600">Needs Work (&lt;40)</span>
        </div>
      </div>
    </div>
  );
}
