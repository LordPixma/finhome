'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { BankConnectionSummary } from '@finhome360/shared';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  PlusIcon,
  ArrowUpRightIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface BannerState {
  type: 'success' | 'error';
  message: string;
}

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border border-green-200',
  disconnected: 'bg-gray-100 text-gray-600 border border-gray-200',
  expired: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  error: 'bg-red-100 text-red-700 border border-red-200',
};

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'disconnected':
      return 'Disconnected';
    case 'expired':
      return 'Token expired';
    case 'error':
      return 'Needs attention';
    default:
      return status;
  }
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Never';
  }
  const date = new Date(value);
  return date.toLocaleString();
}

export default function BankingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<BankConnectionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  const loadConnections = useCallback(
    async (options?: { showLoading?: boolean }) => {
      const showLoading = options?.showLoading ?? true;
      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setError(null);
        const response = (await api.getBankConnections()) as any;
        if (response.success) {
          setConnections(response.data);
        } else {
          setError(response.error?.message || 'Failed to load bank connections');
        }
      } catch (err) {
        console.error('Failed to load bank connections:', err);
        setError('Failed to load bank connections. Please try again.');
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const startPolling = useCallback(() => {
    stopPolling();
    pollingIntervalRef.current = setInterval(() => {
      loadConnections({ showLoading: false });
    }, 5000);
    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling();
    }, 30000);
  }, [loadConnections, stopPolling]);

  useEffect(() => {
    const status = searchParams.get('status');
    const message = searchParams.get('message');

    if (status === 'connected') {
      setBanner({ type: 'success', message: 'Bank account linked successfully. Your transactions will appear shortly.' });
      router.replace('/dashboard/banking');
    } else if (status === 'error') {
      setBanner({ type: 'error', message: message || 'Failed to link bank account. Please try again.' });
      router.replace('/dashboard/banking');
    }
  }, [router, searchParams]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const hasConnections = useMemo(() => connections.length > 0, [connections]);

  const handleConnectBank = async () => {
    try {
      setIsLinking(true);
      const response = await api.createBankLink('/dashboard/banking') as any;
      if (response.success) {
        window.location.href = response.data.authorizationUrl;
      } else {
        setBanner({ type: 'error', message: response.error?.message || 'Failed to start bank connection.' });
      }
    } catch (err) {
      console.error('Failed to start bank connection:', err);
      setBanner({ type: 'error', message: 'Failed to start bank connection. Please try again.' });
    } finally {
      setIsLinking(false);
    }
  };

  const handleSyncConnection = async (connectionId: string) => {
    try {
      setSyncingConnectionId(connectionId);
      const response = await api.syncBankConnection(connectionId) as any;
      if (response.success) {
        setBanner({ type: 'success', message: 'Sync started. Transactions will update shortly.' });
        await loadConnections({ showLoading: false });
        startPolling();
      } else {
        setBanner({ type: 'error', message: response.error?.message || 'Failed to start sync.' });
      }
    } catch (err) {
      console.error('Failed to sync connection:', err);
      setBanner({ type: 'error', message: 'Failed to start sync. Please try again.' });
    } finally {
      setSyncingConnectionId(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      setIsGlobalSyncing(true);
      const response = (await api.syncAllBankConnections()) as any;
      if (response.success) {
        setBanner({ type: 'success', message: 'Sync started for all connections.' });
        await loadConnections({ showLoading: false });
        startPolling();
      } else {
        setBanner({ type: 'error', message: response.error?.message || 'Failed to start sync.' });
      }
    } catch (err) {
      console.error('Failed to sync all connections:', err);
      setBanner({ type: 'error', message: 'Failed to start sync. Please try again.' });
    } finally {
      setIsGlobalSyncing(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Disconnecting will stop automatic transaction syncing. Continue?')) {
      return;
    }

    try {
      setDisconnectingId(connectionId);
      const response = await api.disconnectBankConnection(connectionId) as any;
      if (response.success) {
        setBanner({ type: 'success', message: 'Connection disconnected.' });
        await loadConnections({ showLoading: false });
      } else {
        setBanner({ type: 'error', message: response.error?.message || 'Failed to disconnect connection.' });
      }
    } catch (err) {
      console.error('Failed to disconnect connection:', err);
      setBanner({ type: 'error', message: 'Failed to disconnect connection.' });
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bank Connections</h1>
            <p className="text-gray-600 mt-1">Securely link your bank accounts and keep transactions in sync automatically.</p>
          </div>
          <div className="flex gap-3">
            {hasConnections && (
              <button
                onClick={handleSyncAll}
                disabled={isGlobalSyncing}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowPathIcon className={`w-5 h-5 ${isGlobalSyncing ? 'animate-spin' : ''}`} />
                {isGlobalSyncing ? 'Syncing...' : 'Sync All'}
              </button>
            )}
            <button
              onClick={handleConnectBank}
              disabled={isLinking}
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              {isLinking ? 'Connecting…' : 'Connect Bank'}
            </button>
          </div>
        </div>

        {banner && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-lg border p-4 ${
              banner.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {banner.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{banner.message}</span>
            <button
              onClick={() => setBanner(null)}
              className="ml-auto text-sm font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="card border border-red-200 bg-red-50 text-red-700 p-6">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-semibold">Failed to load bank connections</h2>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
            <button onClick={() => loadConnections()} className="btn-secondary mt-4">
              Retry
            </button>
          </div>
        ) : !hasConnections ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BanknotesIcon className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No bank connections yet</h3>
            <p className="text-gray-600 mb-6">Connect your first bank to start syncing transactions automatically.</p>
            <button
              onClick={handleConnectBank}
              disabled={isLinking}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <PlusIcon className="w-5 h-5" />
              {isLinking ? 'Connecting…' : 'Connect a Bank'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {connections.map(connection => (
              <div key={connection.id} className="card p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <ShieldCheckIcon className="w-6 h-6 text-primary-500" />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {connection.institutionName || 'Connected Institution'}
                        </h2>
                        <p className="text-sm text-gray-500">
                          Provider: {connection.providerConnectionId.slice(0, 12)}…
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <span className={`px-3 py-1 rounded-full ${statusStyles[connection.status] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                        {getStatusLabel(connection.status)}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Last sync: {formatDate(connection.lastSyncAt)}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        Linked accounts: {connection.accounts.length}
                      </span>
                    </div>
                    {connection.lastError && (
                      <p className="mt-2 text-sm text-red-600">Last error: {connection.lastError}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSyncConnection(connection.id)}
                      disabled={syncingConnectionId === connection.id}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <ArrowPathIcon className={`w-5 h-5 ${syncingConnectionId === connection.id ? 'animate-spin' : ''}`} />
                      {syncingConnectionId === connection.id ? 'Syncing…' : 'Sync Now'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(connection.id)}
                      disabled={disconnectingId === connection.id}
                      className="btn-outline flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      {disconnectingId === connection.id ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {connection.accounts.map(account => (
                    <div key={account.id} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-500">{account.type.toUpperCase()}</p>
                          <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                        </div>
                        <BanknotesIcon className="w-8 h-8 text-primary-500" />
                      </div>
                      <p className="mt-4 text-2xl font-mono font-bold text-gray-900">
                        {formatCurrency(account.balance)}
                      </p>
                      <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-600">
                        {account.accountNumber && (
                          <p className="flex items-center gap-2">
                            <ArrowUpRightIcon className="w-4 h-4 text-gray-400" />
                            Account: {account.accountNumber}
                          </p>
                        )}
                        {account.sortCode && (
                          <p className="flex items-center gap-2">
                            <ArrowUpRightIcon className="w-4 h-4 text-gray-400" />
                            Sort Code: {account.sortCode}
                          </p>
                        )}
                        <p className="flex items-center gap-2">
                          <ArrowUpRightIcon className="w-4 h-4 text-gray-400" />
                          Currency: {account.currency}
                        </p>
                        <p className="flex items-center gap-2">
                          <ArrowUpRightIcon className="w-4 h-4 text-gray-400" />
                          Last updated: {formatDate(account.lastUpdatedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
