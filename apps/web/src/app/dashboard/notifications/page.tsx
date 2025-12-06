'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { NotificationPreferences } from '@/components/notifications';
import { api } from '@/lib/api';
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  icon?: string;
  color?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

type TabType = 'all' | 'settings';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'alerts' | 'milestones' | 'reminders'>('all');
  const [runningAlertCheck, setRunningAlertCheck] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const options: any = { limit: 100 };

      if (filter === 'unread') {
        options.unreadOnly = true;
      } else if (filter === 'alerts') {
        options.category = 'alert';
      } else if (filter === 'milestones') {
        options.category = 'milestone';
      } else if (filter === 'reminders') {
        options.category = 'reminder';
      }

      const response = await api.notifications.getAll(options) as any;
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchNotifications();
    }
  }, [activeTab, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.notifications.dismiss(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleRunAlertCheck = async () => {
    try {
      setRunningAlertCheck(true);
      await api.notifications.checkAlerts();
      await fetchNotifications();
    } catch (error) {
      console.error('Error running alert check:', error);
    } finally {
      setRunningAlertCheck(false);
    }
  };

  const getPriorityStyles = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-4 border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-4 border-l-gray-200';
    }
  };

  const getCategoryIcon = (category: string, priority: Notification['priority']) => {
    const iconClass = `w-6 h-6 ${
      priority === 'urgent' ? 'text-red-600' :
      priority === 'high' ? 'text-orange-600' :
      priority === 'medium' ? 'text-yellow-600' :
      'text-gray-500'
    }`;

    switch (category) {
      case 'alert':
        return <ExclamationTriangleIcon className={iconClass} />;
      case 'milestone':
        return <CheckCircleIcon className={iconClass} />;
      case 'reminder':
        return <ClockIcon className={iconClass} />;
      case 'insight':
        return <InformationCircleIcon className={iconClass} />;
      default:
        return <BellIcon className={iconClass} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 -mx-6 -mt-6 px-6 pt-8 pb-6 mb-6 border-b border-gray-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <BellIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-1 text-sm font-medium bg-primary-100 text-primary-700 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-gray-600">Stay informed about your finances with smart alerts</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleRunAlertCheck}
                disabled={runningAlertCheck}
              >
                {runningAlertCheck ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Check Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2 -mx-2 px-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BellIcon className="w-4 h-4" />
            All Notifications
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Cog6ToothIcon className="w-4 h-4" />
            Preferences
          </button>
        </div>

        {activeTab === 'all' && (
          <>
            {/* Filter Bar */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <FunnelIcon className="w-5 h-5 text-gray-400" />
                    <div className="flex gap-2">
                      {(['all', 'unread', 'alerts', 'milestones', 'reminders'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            filter === f
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead}>
                      <CheckIcon className="w-4 h-4 mr-1" />
                      Mark all read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notifications List */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-12 text-center">
                    <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
                    <p className="mt-3 text-gray-500">Loading notifications...</p>
                  </div>
                ) : error ? (
                  <div className="p-12 text-center">
                    <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-gray-600">{error}</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Notifications about your budgets, goals, and spending will appear here
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`relative p-5 hover:bg-gray-50 transition-colors ${
                          !notification.isRead ? getPriorityStyles(notification.priority) : ''
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 mt-0.5">
                            {notification.icon ? (
                              <span className="text-2xl">{notification.icon}</span>
                            ) : (
                              getCategoryIcon(notification.category, notification.priority)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className={`font-medium ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {notification.message}
                                </p>
                              </div>
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {formatDate(notification.createdAt)}
                              </span>
                            </div>
                            {notification.actionUrl && (
                              <Link
                                href={notification.actionUrl}
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
                              >
                                {notification.actionLabel || 'View details'}
                                <ChevronRightIcon className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                          <div className="flex-shrink-0 flex gap-2">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Mark as read"
                              >
                                <CheckIcon className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDismiss(notification.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Dismiss"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'settings' && <NotificationPreferences />}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
