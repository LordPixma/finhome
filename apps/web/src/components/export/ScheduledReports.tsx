'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import {
  ClockIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

type ReportType = 'transactions' | 'budgets' | 'goals' | 'analytics' | 'all';
type ReportFormat = 'csv' | 'json';
type ReportFrequency = 'daily' | 'weekly' | 'monthly';

interface ScheduledReport {
  id: string;
  name: string;
  reportType: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  timezone: string;
  includeAllTime: boolean;
  lookbackDays: number;
  deliveryEmail: string;
  isEnabled: boolean;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed' | 'pending';
  lastError?: string;
  nextRunAt?: string;
  runCount: number;
  createdAt: string;
}

interface ScheduledReportsProps {
  className?: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const REPORT_TYPES = [
  { value: 'transactions', label: 'Transactions' },
  { value: 'budgets', label: 'Budgets' },
  { value: 'goals', label: 'Goals' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'all', label: 'All Data' },
];

export function ScheduledReports({ className = '' }: ScheduledReportsProps) {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    reportType: ReportType;
    format: ReportFormat;
    frequency: ReportFrequency;
    dayOfWeek: number;
    dayOfMonth: number;
    timeOfDay: string;
    timezone: string;
    includeAllTime: boolean;
    lookbackDays: number;
    deliveryEmail: string;
  }>({
    name: '',
    reportType: 'transactions',
    format: 'csv',
    frequency: 'weekly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    timeOfDay: '09:00',
    timezone: 'Europe/London',
    includeAllTime: false,
    lookbackDays: 30,
    deliveryEmail: '',
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await api.scheduledReports.getAll() as any;
      if (response.success) {
        setReports(response.data);
      }
    } catch (err) {
      setError('Failed to load scheduled reports');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (report?: ScheduledReport) => {
    if (report) {
      setEditingReport(report);
      setFormData({
        name: report.name,
        reportType: report.reportType,
        format: report.format,
        frequency: report.frequency,
        dayOfWeek: report.dayOfWeek || 1,
        dayOfMonth: report.dayOfMonth || 1,
        timeOfDay: report.timeOfDay,
        timezone: report.timezone,
        includeAllTime: report.includeAllTime,
        lookbackDays: report.lookbackDays,
        deliveryEmail: report.deliveryEmail,
      });
    } else {
      setEditingReport(null);
      setFormData({
        name: '',
        reportType: 'transactions',
        format: 'csv',
        frequency: 'weekly',
        dayOfWeek: 1,
        dayOfMonth: 1,
        timeOfDay: '09:00',
        timezone: 'Europe/London',
        includeAllTime: false,
        lookbackDays: 30,
        deliveryEmail: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingReport(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingReport) {
        await api.scheduledReports.update(editingReport.id, formData);
      } else {
        await api.scheduledReports.create(formData);
      }
      await loadReports();
      handleCloseModal();
    } catch (err) {
      setError('Failed to save scheduled report');
      console.error('Error saving report:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (report: ScheduledReport) => {
    try {
      await api.scheduledReports.toggle(report.id, !report.isEnabled);
      await loadReports();
    } catch (err) {
      console.error('Error toggling report:', err);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) {
      return;
    }

    try {
      await api.scheduledReports.delete(reportId);
      await loadReports();
    } catch (err) {
      console.error('Error deleting report:', err);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getFrequencyLabel = (report: ScheduledReport) => {
    switch (report.frequency) {
      case 'daily':
        return `Daily at ${report.timeOfDay}`;
      case 'weekly':
        return `Weekly on ${DAYS_OF_WEEK[report.dayOfWeek || 0]} at ${report.timeOfDay}`;
      case 'monthly':
        return `Monthly on day ${report.dayOfMonth} at ${report.timeOfDay}`;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-500">Loading scheduled reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <ClockIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Scheduled Reports</h2>
            <p className="text-sm text-gray-500">Automated reports delivered to your email</p>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()} size="sm">
          <PlusIcon className="w-4 h-4 mr-1" />
          Add Schedule
        </Button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="text-center py-8">
          <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-700 font-medium mb-1">No scheduled reports</h3>
          <p className="text-gray-500 text-sm mb-4">
            Set up automated reports to be delivered to your email
          </p>
          <Button onClick={() => handleOpenModal()} variant="secondary" size="sm">
            Create your first schedule
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className={`border rounded-lg p-4 transition-colors ${
                report.isEnabled ? 'border-gray-200' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium ${report.isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                      {report.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.isEnabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {report.isEnabled ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span className="capitalize">{report.reportType} ({report.format.toUpperCase()})</span>
                    <span>{getFrequencyLabel(report)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gray-500">
                      <EnvelopeIcon className="w-4 h-4" />
                      {report.deliveryEmail}
                    </span>
                    {report.lastRunAt && (
                      <span className="flex items-center gap-1">
                        {report.lastRunStatus === 'success' ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        ) : report.lastRunStatus === 'failed' ? (
                          <ExclamationCircleIcon className="w-4 h-4 text-red-500" />
                        ) : null}
                        <span className="text-gray-500">
                          Last run: {formatDate(report.lastRunAt)}
                        </span>
                      </span>
                    )}
                    {report.nextRunAt && (
                      <span className="text-gray-500">
                        Next run: {formatDate(report.nextRunAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(report)}
                    className={`p-2 rounded-lg transition-colors ${
                      report.isEnabled
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={report.isEnabled ? 'Pause' : 'Resume'}
                  >
                    {report.isEnabled ? (
                      <PauseIcon className="w-4 h-4" />
                    ) : (
                      <PlayIcon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenModal(report)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingReport ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Weekly Transaction Report"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Report Type
                    </label>
                    <select
                      value={formData.reportType}
                      onChange={(e) => setFormData({ ...formData, reportType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {REPORT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Format
                    </label>
                    <select
                      value={formData.format}
                      onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {formData.frequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day of Week
                    </label>
                    <select
                      value={formData.dayOfWeek}
                      onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {DAYS_OF_WEEK.map((day, index) => (
                        <option key={index} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.frequency === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day of Month
                    </label>
                    <select
                      value={formData.dayOfMonth}
                      onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={formData.timeOfDay}
                      onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lookback Period
                    </label>
                    <select
                      value={formData.lookbackDays}
                      onChange={(e) => setFormData({ ...formData, lookbackDays: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={14}>Last 14 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={60}>Last 60 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Email
                  </label>
                  <input
                    type="email"
                    value={formData.deliveryEmail}
                    onChange={(e) => setFormData({ ...formData, deliveryEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? 'Saving...' : editingReport ? 'Update Schedule' : 'Create Schedule'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
