'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export type ExportDataType = 'transactions' | 'budgets' | 'goals' | 'analytics' | 'all';
export type ExportFormat = 'csv' | 'json';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: ExportDataType;
  title?: string;
}

export function ExportModal({ isOpen, onClose, dataType, title }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);

      const options = {
        format,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      let blob: Blob;

      switch (dataType) {
        case 'transactions':
          blob = await api.export.transactions(options) as Blob;
          break;
        case 'budgets':
          blob = await api.export.budgets(options) as Blob;
          break;
        case 'goals':
          blob = await api.export.goals({ format, includeContributions: true }) as Blob;
          break;
        case 'analytics':
          blob = await api.export.analytics(options) as Blob;
          break;
        case 'all':
          blob = await api.export.all(options) as Blob;
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

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTitle = () => {
    switch (dataType) {
      case 'transactions':
        return 'Export Transactions';
      case 'budgets':
        return 'Export Budgets';
      case 'goals':
        return 'Export Goals';
      case 'analytics':
        return 'Export Analytics';
      case 'all':
        return 'Export All Data';
      default:
        return 'Export Data';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {title || getDefaultTitle()}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  format === 'csv'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <TableCellsIcon className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-medium">CSV</p>
                  <p className="text-xs text-gray-500">Spreadsheet</p>
                </div>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  format === 'json'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DocumentTextIcon className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-medium">JSON</p>
                  <p className="text-xs text-gray-500">Data format</p>
                </div>
              </button>
            </div>
          </div>

          {/* Date Range */}
          {dataType !== 'goals' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Date Range (optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Leave empty to export all data
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
