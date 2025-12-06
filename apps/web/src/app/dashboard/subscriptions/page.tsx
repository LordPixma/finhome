'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/Card';
import { api } from '@/lib/api';
import {
  CreditCardIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface DetectedSubscription {
  id: string;
  name: string;
  merchant: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  lastChargeDate: string;
  nextChargeDate: string;
  category: string;
  isActive: boolean;
  confidence: number;
  transactionCount: number;
  totalSpent: number;
}

interface SubscriptionSummary {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  subscriptions: DetectedSubscription[];
}

const frequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const frequencyColors: Record<string, string> = {
  weekly: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  monthly: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  quarterly: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  yearly: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
};

export default function SubscriptionsPage() {
  const [data, setData] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.subscriptions.getAll() as any;
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error?.message || 'Failed to load subscriptions');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = data?.subscriptions.filter(sub => {
    if (filter === 'active') return sub.isActive;
    if (filter === 'inactive') return !sub.isActive;
    return true;
  }) || [];

  const formatCurrency = (amount: number | undefined | null, currency: string = 'GBP') => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(safeAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysUntilNextCharge = (nextChargeDate: string) => {
    const next = new Date(nextChargeDate);
    const now = new Date();
    const diff = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 dark:text-green-400';
    if (confidence >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 -mx-6 -mt-6 px-6 pt-8 pb-6 mb-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                  <CreditCardIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Subscriptions</h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Auto-detected recurring payments from your transaction history
              </p>
            </div>
            <button
              onClick={loadSubscriptions}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <ArrowPathIcon className="w-10 h-10 text-gray-400 dark:text-gray-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Analyzing your transactions...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Monthly Cost</p>
                      <p className="text-3xl font-bold mt-1">{formatCurrency(data.totalMonthly)}</p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-lg">
                      <CalendarDaysIcon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Yearly Cost</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {formatCurrency(data.totalYearly)}
                      </p>
                    </div>
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <ChartBarIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Active Subscriptions</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data.activeCount}</p>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
                  {f === 'all' && ` (${data.subscriptions.length})`}
                  {f === 'active' && ` (${data.subscriptions.filter(s => s.isActive).length})`}
                  {f === 'inactive' && ` (${data.subscriptions.filter(s => !s.isActive).length})`}
                </button>
              ))}
            </div>

            {/* Subscriptions List */}
            {filteredSubscriptions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CreditCardIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Subscriptions Found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {filter === 'all'
                      ? "We couldn't detect any recurring subscriptions in your transaction history yet."
                      : `No ${filter} subscriptions found.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredSubscriptions.map((subscription) => {
                  const daysUntil = getDaysUntilNextCharge(subscription.nextChargeDate);

                  return (
                    <Card key={subscription.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex flex-col lg:flex-row">
                          {/* Main Info */}
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                  {subscription.name}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{subscription.category}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    frequencyColors[subscription.frequency]
                                  }`}
                                >
                                  {frequencyLabels[subscription.frequency]}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    subscription.isActive
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                  }`}
                                >
                                  {subscription.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 text-sm">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Amount: </span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(subscription.amount, subscription.currency)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Total Spent: </span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(subscription.totalSpent, subscription.currency)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Confidence: </span>
                                <span className={`font-semibold ${getConfidenceColor(subscription.confidence)}`}>
                                  {subscription.confidence}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Date Info */}
                          <div className="lg:w-64 bg-gray-50 dark:bg-gray-700/50 p-5 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-600">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm">
                                <ClockIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-gray-500 dark:text-gray-400">Last charge:</span>
                                <span className="text-gray-900 dark:text-gray-100 font-medium">
                                  {formatDate(subscription.lastChargeDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CalendarDaysIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-gray-500 dark:text-gray-400">Next charge:</span>
                                <span className="text-gray-900 dark:text-gray-100 font-medium">
                                  {formatDate(subscription.nextChargeDate)}
                                </span>
                              </div>
                              {subscription.isActive && daysUntil > 0 && (
                                <div
                                  className={`text-sm font-medium ${
                                    daysUntil <= 7
                                      ? 'text-orange-600 dark:text-orange-400'
                                      : 'text-gray-600 dark:text-gray-400'
                                  }`}
                                >
                                  {daysUntil === 1 ? 'Due tomorrow' : `Due in ${daysUntil} days`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Information Box */}
            <Card className="mt-8">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">About Subscription Detection</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Subscriptions are automatically detected by analyzing recurring patterns in your transaction
                      history. The confidence score indicates how certain we are about each detection. Higher
                      confidence means more consistent payment patterns. Some subscriptions may be missed if they
                      have irregular payment amounts or schedules.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
