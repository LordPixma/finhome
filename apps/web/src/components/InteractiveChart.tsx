'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ChartData {
  name: string;
  value?: number;
  date?: string;
  income?: number;
  expense?: number;
  net?: number;
  predicted?: boolean;
  confidence?: number;
  [key: string]: any; // Index signature for Recharts compatibility
}

interface InteractiveChartProps {
  data: ChartData[];
  type: 'line' | 'area' | 'bar' | 'pie';
  title: string;
  subtitle?: string;
  height?: number;
  showPrediction?: boolean;
  colors?: string[];
}

// Default color palette for charts
const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green  
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {typeof entry.value === 'number' ? 
              new Intl.NumberFormat('en-GB', { 
                style: 'currency', 
                currency: 'GBP' 
              }).format(entry.value) : 
              entry.value
            }
            {entry.payload.predicted && (
              <span className="text-xs text-gray-500 ml-1">(predicted)</span>
            )}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Line Chart Component
const InteractiveLineChart: React.FC<{ data: ChartData[]; colors: string[]; showPrediction?: boolean }> = ({ 
  data, 
  colors 
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis 
        dataKey="name" 
        stroke="#6B7280"
        fontSize={12}
      />
      <YAxis 
        stroke="#6B7280"
        fontSize={12}
        tickFormatter={(value) => new Intl.NumberFormat('en-GB', { 
          style: 'currency', 
          currency: 'GBP',
          notation: 'compact'
        }).format(value)}
      />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      
      {/* Regular data lines */}
      {data.some(d => d.income !== undefined) && (
        <Line
          type="monotone"
          dataKey="income"
          stroke={colors[1]}
          strokeWidth={2}
          dot={{ fill: colors[1], r: 4 }}
          activeDot={{ r: 6 }}
          name="Income"
        />
      )}
      {data.some(d => d.expense !== undefined) && (
        <Line
          type="monotone"
          dataKey="expense"
          stroke={colors[3]}
          strokeWidth={2}
          dot={{ fill: colors[3], r: 4 }}
          activeDot={{ r: 6 }}
          name="Expenses"
        />
      )}
      {data.some(d => d.net !== undefined) && (
        <Line
          type="monotone"
          dataKey="net"
          stroke={colors[0]}
          strokeWidth={2}
          dot={{ fill: colors[0], r: 4 }}
          activeDot={{ r: 6 }}
          name="Net Savings"
        />
      )}
      {data.some(d => d.value !== undefined && !d.income && !d.expense) && (
        <Line
          type="monotone"
          dataKey="value"
          stroke={colors[0]}
          strokeWidth={2}
          dot={{ fill: colors[0], r: 4 }}
          activeDot={{ r: 6 }}
          name="Value"
        />
      )}
    </LineChart>
  </ResponsiveContainer>
);

// Area Chart Component  
const InteractiveAreaChart: React.FC<{ data: ChartData[]; colors: string[] }> = ({ data, colors }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <defs>
        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={colors[1]} stopOpacity={0.8}/>
          <stop offset="95%" stopColor={colors[1]} stopOpacity={0.1}/>
        </linearGradient>
        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={colors[3]} stopOpacity={0.8}/>
          <stop offset="95%" stopColor={colors[3]} stopOpacity={0.1}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
      <YAxis 
        stroke="#6B7280" 
        fontSize={12}
        tickFormatter={(value) => new Intl.NumberFormat('en-GB', { 
          style: 'currency', 
          currency: 'GBP',
          notation: 'compact'
        }).format(value)}
      />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      
      {data.some(d => d.expense !== undefined) && (
        <Area
          type="monotone"
          dataKey="expense"
          stroke={colors[3]}
          fillOpacity={1}
          fill="url(#expenseGrad)"
          name="Expenses"
        />
      )}
      {data.some(d => d.income !== undefined) && (
        <Area
          type="monotone"
          dataKey="income"
          stroke={colors[1]}
          fillOpacity={1}
          fill="url(#incomeGrad)"
          name="Income"
        />
      )}
    </AreaChart>
  </ResponsiveContainer>
);

// Bar Chart Component
const InteractiveBarChart: React.FC<{ data: ChartData[]; colors: string[] }> = ({ data, colors }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
      <YAxis 
        stroke="#6B7280" 
        fontSize={12}
        tickFormatter={(value) => new Intl.NumberFormat('en-GB', { 
          style: 'currency', 
          currency: 'GBP',
          notation: 'compact'
        }).format(value)}
      />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      
      {data.some(d => d.income !== undefined) && (
        <Bar dataKey="income" fill={colors[1]} name="Income" />
      )}
      {data.some(d => d.expense !== undefined) && (
        <Bar dataKey="expense" fill={colors[3]} name="Expenses" />
      )}
      {data.some(d => d.value !== undefined && !d.income && !d.expense) && (
        <Bar dataKey="value" fill={colors[0]} name="Amount" />
      )}
    </BarChart>
  </ResponsiveContainer>
);

// Pie Chart Component
const InteractivePieChart: React.FC<{ data: ChartData[]; colors: string[] }> = ({ data, colors }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, value, percent }: any) => 
          `${name}: ${new Intl.NumberFormat('en-GB', { 
            style: 'currency', 
            currency: 'GBP',
            notation: 'compact'
          }).format(Number(value))} (${(Number(percent) * 100).toFixed(1)}%)`
        }
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
      >
        {data.map((_, index) => (
          <Cell 
            key={`cell-${index}`} 
            fill={colors[index % colors.length]} 
          />
        ))}
      </Pie>
      <Tooltip 
        formatter={(value) => [
          new Intl.NumberFormat('en-GB', { 
            style: 'currency', 
            currency: 'GBP' 
          }).format(Number(value)), 
          'Amount'
        ]}
      />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

// Main Interactive Chart Component
export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  type,
  title,
  subtitle,
  height = 300,
  showPrediction = false,
  colors = DEFAULT_COLORS
}) => {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return <InteractiveLineChart data={data} colors={colors} showPrediction={showPrediction} />;
      case 'area':
        return <InteractiveAreaChart data={data} colors={colors} />;
      case 'bar':
        return <InteractiveBarChart data={data} colors={colors} />;
      case 'pie':
        return <InteractivePieChart data={data} colors={colors} />;
      default:
        return <InteractiveLineChart data={data} colors={colors} showPrediction={showPrediction} />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>
      
      <div style={{ height: `${height}px` }}>
        {renderChart()}
      </div>
    </div>
  );
};

export default InteractiveChart;