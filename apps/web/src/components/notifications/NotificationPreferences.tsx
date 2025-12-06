'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import {
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface NotificationPreferencesData {
  emailEnabled: boolean;
  emailBudgetAlerts: boolean;
  emailBillReminders: boolean;
  emailGoalMilestones: boolean;
  emailUnusualSpending: boolean;
  emailWeeklySummary: boolean;
  emailMonthlyReport: boolean;
  pushEnabled: boolean;
  pushBudgetAlerts: boolean;
  pushBillReminders: boolean;
  pushGoalMilestones: boolean;
  pushUnusualSpending: boolean;
  pushLowBalance: boolean;
  pushLargeTransactions: boolean;
  budgetAlertThreshold: number;
  lowBalanceThreshold: number;
  largeTransactionThreshold: number;
  unusualSpendingSensitivity: 'low' | 'medium' | 'high';
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  digestFrequency: 'realtime' | 'daily' | 'weekly';
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferencesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await api.notifications.getPreferences() as any;
        if (response.success) {
          setPreferences(response.data);
        }
      } catch (err) {
        setError('Failed to load notification preferences');
        console.error('Error fetching preferences:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPreferences();
  }, []);

  const handleChange = (key: keyof NotificationPreferencesData, value: any) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      setError(null);
      await api.notifications.updatePreferences(preferences);
      setSuccessMessage('Preferences saved successfully');
    } catch (err) {
      setError('Failed to save preferences');
      console.error('Error saving preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
            <span className="ml-2 text-gray-500">Loading preferences...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-600">
            <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2" />
            <p>{error || 'Failed to load preferences'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* Email Notifications */}
      <Card>
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center gap-3">
            <EnvelopeIcon className="w-5 h-5 text-blue-600" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700">Enable email notifications</span>
              <input
                type="checkbox"
                checked={preferences.emailEnabled}
                onChange={(e) => handleChange('emailEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </label>

            <div className={`space-y-3 pl-4 ${!preferences.emailEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Budget alerts</span>
                <input
                  type="checkbox"
                  checked={preferences.emailBudgetAlerts}
                  onChange={(e) => handleChange('emailBudgetAlerts', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bill reminders</span>
                <input
                  type="checkbox"
                  checked={preferences.emailBillReminders}
                  onChange={(e) => handleChange('emailBillReminders', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Goal milestones</span>
                <input
                  type="checkbox"
                  checked={preferences.emailGoalMilestones}
                  onChange={(e) => handleChange('emailGoalMilestones', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Unusual spending alerts</span>
                <input
                  type="checkbox"
                  checked={preferences.emailUnusualSpending}
                  onChange={(e) => handleChange('emailUnusualSpending', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Weekly summary</span>
                <input
                  type="checkbox"
                  checked={preferences.emailWeeklySummary}
                  onChange={(e) => handleChange('emailWeeklySummary', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly report</span>
                <input
                  type="checkbox"
                  checked={preferences.emailMonthlyReport}
                  onChange={(e) => handleChange('emailMonthlyReport', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center gap-3">
            <DevicePhoneMobileIcon className="w-5 h-5 text-green-600" />
            <CardTitle>In-App Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700">Enable in-app notifications</span>
              <input
                type="checkbox"
                checked={preferences.pushEnabled}
                onChange={(e) => handleChange('pushEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </label>

            <div className={`space-y-3 pl-4 ${!preferences.pushEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Budget alerts</span>
                <input
                  type="checkbox"
                  checked={preferences.pushBudgetAlerts}
                  onChange={(e) => handleChange('pushBudgetAlerts', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bill reminders</span>
                <input
                  type="checkbox"
                  checked={preferences.pushBillReminders}
                  onChange={(e) => handleChange('pushBillReminders', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Goal milestones</span>
                <input
                  type="checkbox"
                  checked={preferences.pushGoalMilestones}
                  onChange={(e) => handleChange('pushGoalMilestones', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Unusual spending</span>
                <input
                  type="checkbox"
                  checked={preferences.pushUnusualSpending}
                  onChange={(e) => handleChange('pushUnusualSpending', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Low balance alerts</span>
                <input
                  type="checkbox"
                  checked={preferences.pushLowBalance}
                  onChange={(e) => handleChange('pushLowBalance', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Large transaction alerts</span>
                <input
                  type="checkbox"
                  checked={preferences.pushLargeTransactions}
                  onChange={(e) => handleChange('pushLargeTransactions', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
            <CardTitle>Alert Thresholds</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget alert threshold
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={preferences.budgetAlertThreshold}
                  onChange={(e) => handleChange('budgetAlertThreshold', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="w-16 text-center text-sm font-medium text-gray-900">
                  {preferences.budgetAlertThreshold}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Alert when budget usage reaches this percentage
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Low balance threshold
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">£</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={preferences.lowBalanceThreshold}
                  onChange={(e) => handleChange('lowBalanceThreshold', parseFloat(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Alert when account balance falls below this amount
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Large transaction threshold
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">£</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={preferences.largeTransactionThreshold}
                  onChange={(e) => handleChange('largeTransactionThreshold', parseFloat(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Alert for transactions above this amount
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unusual spending sensitivity
              </label>
              <select
                value={preferences.unusualSpendingSensitivity}
                onChange={(e) => handleChange('unusualSpendingSensitivity', e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="low">Low (100%+ increase)</option>
                <option value="medium">Medium (50%+ increase)</option>
                <option value="high">High (25%+ increase)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                How sensitive the unusual spending detection should be
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours & Digest */}
      <Card>
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-5 h-5 text-purple-600" />
            <CardTitle>Timing & Frequency</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <label className="flex items-center justify-between mb-3">
                <span className="text-gray-700">Enable quiet hours</span>
                <input
                  type="checkbox"
                  checked={preferences.quietHoursEnabled}
                  onChange={(e) => handleChange('quietHoursEnabled', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>

              <div className={`flex items-center gap-4 ${!preferences.quietHoursEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) => handleChange('quietHoursStart', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                No notifications will be sent during quiet hours
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Digest frequency
              </label>
              <select
                value={preferences.digestFrequency}
                onChange={(e) => handleChange('digestFrequency', e.target.value as any)}
                className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="realtime">Real-time (instant)</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                How often to receive notification summaries
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
