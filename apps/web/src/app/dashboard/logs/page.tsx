'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';

interface ImportLog {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: 'processing' | 'success' | 'partial' | 'failed';
  transactionsImported: number;
  transactionsFailed: number;
  transactionsTotal: number;
  errorMessage: string | null;
  errorDetails: string[] | null;
  processingTimeMs: number | null;
  createdAt: Date;
  completedAt: Date | null;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState<ImportLog | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'partial'>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.getImportLogs();
      if (response.success && response.data) {
        setLogs(response.data as ImportLog[]);
      } else {
        setError('Failed to load import logs');
      }
    } catch (err: any) {
      console.error('Failed to load logs:', err);
      setError(err.message || 'Failed to load import logs');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'partial':
        return '⚠️';
      case 'processing':
        return '⏳';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const exportLogForSupport = (log: ImportLog) => {
    const supportData = {
      logId: log.id,
      fileName: log.fileName,
      fileType: log.fileType,
      fileSize: log.fileSize,
      status: log.status,
      transactionsImported: log.transactionsImported,
      transactionsFailed: log.transactionsFailed,
      transactionsTotal: log.transactionsTotal,
      errorMessage: log.errorMessage,
      errorDetails: log.errorDetails,
      processingTimeMs: log.processingTimeMs,
      createdAt: log.createdAt,
      completedAt: log.completedAt,
    };

    const blob = new Blob([JSON.stringify(supportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-log-${log.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    failed: logs.filter(l => l.status === 'failed').length,
    partial: logs.filter(l => l.status === 'partial').length,
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import Logs</h1>
          <p className="text-gray-600 mt-1">View import history, errors, and export reports for support</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Imports</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-green-50 rounded-xl shadow-lg border border-green-200 p-6">
            <div className="text-sm text-green-600 mb-1">Successful</div>
            <div className="text-3xl font-bold text-green-700">{stats.success}</div>
          </div>
          <div className="bg-yellow-50 rounded-xl shadow-lg border border-yellow-200 p-6">
            <div className="text-sm text-yellow-600 mb-1">Partial</div>
            <div className="text-3xl font-bold text-yellow-700">{stats.partial}</div>
          </div>
          <div className="bg-red-50 rounded-xl shadow-lg border border-red-200 p-6">
            <div className="text-sm text-red-600 mb-1">Failed</div>
            <div className="text-3xl font-bold text-red-700">{stats.failed}</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Imports
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Successful
            </button>
            <button
              onClick={() => setFilter('partial')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'partial'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Partial
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'failed'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Failed
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold mb-1">Error</h3>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-600">Loading import logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Import Logs Found</h3>
            <p className="text-gray-600 mb-6">
              {filter !== 'all'
                ? `No ${filter} imports found. Try changing the filter.`
                : 'Start importing files to see your import history here.'}
            </p>
            <Button onClick={() => (window.location.href = '/dashboard/import')}>
              Import Files
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Imported
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Failed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            log.status
                          )}`}
                        >
                          <span>{getStatusIcon(log.status)}</span>
                          <span className="capitalize">{log.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{log.fileName}</div>
                        <div className="text-sm text-gray-500">
                          {log.fileType} • {formatFileSize(log.fileSize)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-green-600 font-semibold">
                          {log.transactionsImported}
                        </span>
                        <span className="text-gray-500 text-sm"> / {log.transactionsTotal}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={log.transactionsFailed > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                          {log.transactionsFailed}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Details
                          </button>
                          {(log.status === 'failed' || log.status === 'partial') && (
                            <button
                              onClick={() => exportLogForSupport(log)}
                              className="text-purple-600 hover:text-purple-700 font-medium"
                            >
                              Export
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Import Details</h2>
                    <p className="text-gray-600">{selectedLog.fileName}</p>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Status */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${getStatusColor(
                      selectedLog.status
                    )}`}
                  >
                    <span>{getStatusIcon(selectedLog.status)}</span>
                    <span className="capitalize">{selectedLog.status}</span>
                  </span>
                </div>

                {/* File Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">File Type</h3>
                    <p className="text-gray-900">{selectedLog.fileType}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">File Size</h3>
                    <p className="text-gray-900">{formatFileSize(selectedLog.fileSize)}</p>
                  </div>
                </div>

                {/* Transaction Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total</h3>
                    <p className="text-2xl font-bold text-gray-900">{selectedLog.transactionsTotal}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-green-600 mb-1">Imported</h3>
                    <p className="text-2xl font-bold text-green-700">{selectedLog.transactionsImported}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-red-600 mb-1">Failed</h3>
                    <p className="text-2xl font-bold text-red-700">{selectedLog.transactionsFailed}</p>
                  </div>
                </div>

                {/* Processing Time */}
                {selectedLog.processingTimeMs && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Processing Time</h3>
                    <p className="text-gray-900">{selectedLog.processingTimeMs}ms</p>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Started</h3>
                    <p className="text-gray-900">{formatDate(selectedLog.createdAt)}</p>
                  </div>
                  {selectedLog.completedAt && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Completed</h3>
                      <p className="text-gray-900">{formatDate(selectedLog.completedAt)}</p>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {selectedLog.errorMessage && (
                  <div>
                    <h3 className="text-sm font-medium text-red-600 mb-2">Error Message</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700">{selectedLog.errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Error Details */}
                {selectedLog.errorDetails && selectedLog.errorDetails.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-red-600 mb-2">Error Details</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <ul className="space-y-2">
                        {selectedLog.errorDetails.map((err, index) => (
                          <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                            <span className="text-red-500">•</span>
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                {(selectedLog.status === 'failed' || selectedLog.status === 'partial') && (
                  <Button variant="secondary" onClick={() => exportLogForSupport(selectedLog)}>
                    Export for Support
                  </Button>
                )}
                <Button onClick={() => setSelectedLog(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
