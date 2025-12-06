'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { ExportModal, ExportDataType, ScheduledReports } from '@/components/export';
import { api } from '@/lib/api';
import {
  DocumentArrowDownIcon,
  CreditCardIcon,
  ChartBarIcon,
  TrophyIcon,
  ChartPieIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

type ExportFormat = 'csv' | 'json';

interface QuickExportOption {
  id: ExportDataType;
  title: string;
  description: string;
  icon: typeof DocumentArrowDownIcon;
  color: string;
}

const exportOptions: QuickExportOption[] = [
  {
    id: 'transactions',
    title: 'Transactions',
    description: 'Export all your transaction history',
    icon: CreditCardIcon,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'budgets',
    title: 'Budgets',
    description: 'Export budget allocations and spending',
    icon: ChartBarIcon,
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'goals',
    title: 'Goals',
    description: 'Export savings goals and contributions',
    icon: TrophyIcon,
    color: 'from-yellow-500 to-orange-600',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Export spending insights and trends',
    icon: ChartPieIcon,
    color: 'from-purple-500 to-pink-600',
  },
  {
    id: 'all',
    title: 'Full Export',
    description: 'Export all your financial data',
    icon: ArchiveBoxIcon,
    color: 'from-gray-600 to-gray-800',
  },
];

export default function ExportPage() {
  const [activeExport, setActiveExport] = useState<ExportDataType | null>(null);
  const [quickExporting, setQuickExporting] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleQuickExport = async (dataType: ExportDataType, format: ExportFormat) => {
    try {
      setQuickExporting(`${dataType}-${format}`);
      setSuccessMessage(null);

      let blob: Blob;

      switch (dataType) {
        case 'transactions':
          blob = await api.export.transactions({ format }) as Blob;
          break;
        case 'budgets':
          blob = await api.export.budgets({ format }) as Blob;
          break;
        case 'goals':
          blob = await api.export.goals({ format, includeContributions: true }) as Blob;
          break;
        case 'analytics':
          blob = await api.export.analytics({ format }) as Blob;
          break;
        case 'all':
          blob = await api.export.all({ format }) as Blob;
          break;
        default:
          throw new Error('Invalid export type');
      }

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSuccessMessage(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} exported successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setQuickExporting(null);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 -mx-6 -mt-6 px-6 pt-8 pb-6 mb-6 border-b border-gray-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <DocumentArrowDownIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Data Export</h1>
              </div>
              <p className="text-gray-600">Download your financial data in various formats</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <span className="text-green-700">{successMessage}</span>
          </div>
        )}

        {/* Quick Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {exportOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <Card key={option.id} className="overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${option.color}`} />
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 bg-gradient-to-br ${option.color} rounded-xl`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{option.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleQuickExport(option.id, 'csv')}
                      disabled={quickExporting === `${option.id}-csv`}
                    >
                      {quickExporting === `${option.id}-csv` ? (
                        <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
                      ) : null}
                      CSV
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleQuickExport(option.id, 'json')}
                      disabled={quickExporting === `${option.id}-json`}
                    >
                      {quickExporting === `${option.id}-json` ? (
                        <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
                      ) : null}
                      JSON
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setActiveExport(option.id)}
                    >
                      Options
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Custom Export Section */}
        <Card>
          <CardHeader className="border-b border-gray-100">
            <CardTitle>Custom Export</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Configure advanced export options with date ranges and filters
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {exportOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setActiveExport(option.id)}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
                >
                  <option.icon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">{option.title}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Reports Section */}
        <ScheduledReports className="mt-6" />

        {/* Tips Section */}
        <Card className="mt-6">
          <CardHeader className="border-b border-gray-100">
            <CardTitle>Export Tips</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">CSV Format</h4>
                <p className="text-sm text-blue-700">
                  Best for spreadsheet applications like Excel or Google Sheets. Easy to edit and analyze.
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">JSON Format</h4>
                <p className="text-sm text-purple-700">
                  Best for data backup or import into other applications. Preserves all data structure.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Modal */}
        {activeExport && (
          <ExportModal
            isOpen={true}
            onClose={() => setActiveExport(null)}
            dataType={activeExport}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
