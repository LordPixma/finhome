'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import type { BankConnectionSummary, SyncResult } from '@finhome360/shared';
import { 
  LinkIcon, 
  ArrowPathIcon, 
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

function BankingContent() {
  const [connections, setConnections] = useState<BankConnectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getBankConnections();
      if (response.success && response.data) {
        setConnections(response.data as BankConnectionSummary[]);
      }
    } catch (err) {
      setError('Failed to load bank connections');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setError(null);
      const response = await api.createBankLink('/dashboard/banking');
      if (response.success && response.data) {
        const data = response.data as { authorizationUrl: string };
        window.location.href = data.authorizationUrl;
      }
    } catch (err) {
      setError('Failed to initiate bank connection');
      console.error(err);
    }
  };

  const handleSync = async (connectionId: string) => {
    try {
      setSyncing(connectionId);
      setError(null);
      const response = await api.syncBankConnection(connectionId);
      
      if (response.success && response.data) {
        const result = response.data as SyncResult;
        const message = `Sync complete!\nFetched: ${result.transactionsFetched}\nImported: ${result.transactionsImported}\nSkipped: ${result.transactionsSkipped}`;
        alert(message);
      }
      
      await loadConnections();
    } catch (err) {
      setError('Failed to sync bank connection');
      console.error(err);
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this bank? This will not delete your existing transactions.')) {
      return;
    }

    try {
      setError(null);
      await api.disconnectBankConnection(connectionId);
      await loadConnections();
    } catch (err) {
      setError('Failed to disconnect bank');
      console.error(err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-success-500" />;
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5 text-error-500" />;
      case 'expired':
        return <ClockIcon className="w-5 h-5 text-warning-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'expired':
        return 'Expired';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Open Banking</h1>
        <p className="mt-2 text-gray-600">
          Connect your bank accounts to automatically sync transactions
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg text-error-700">
          {error}
        </div>
      )}

      <div className="mb-6">
        <Button
          onClick={handleConnect}
          className="flex items-center"
        >
          <LinkIcon className="w-5 h-5 mr-2" />
          Connect Bank Account
        </Button>
      </div>

      {connections.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <LinkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No bank connections yet
          </h3>
          <p className="text-gray-600 mb-6">
            Connect your bank to automatically sync transactions using TrueLayer
          </p>
          <Button onClick={handleConnect}>
            <LinkIcon className="w-5 h-5 mr-2" />
            Connect Your First Bank
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {connection.institutionName}
                      </h3>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(connection.status)}
                        <span
                          className={`text-sm font-medium ${
                            connection.status === 'active'
                              ? 'text-success-700'
                              : connection.status === 'error'
                              ? 'text-error-700'
                              : 'text-warning-700'
                          }`}
                        >
                          {getStatusText(connection.status)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">
                        {connection.accountCount} account{connection.accountCount !== 1 ? 's' : ''} connected
                      </p>
                      {connection.lastSyncAt && (
                        <p className="text-sm text-gray-500">
                          Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSync(connection.id)}
                      disabled={syncing === connection.id || connection.status !== 'active'}
                      className="flex items-center"
                    >
                      <ArrowPathIcon
                        className={`w-4 h-4 mr-1 ${
                          syncing === connection.id ? 'animate-spin' : ''
                        }`}
                      />
                      Sync Now
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDisconnect(connection.id)}
                      className="flex items-center"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          About Open Banking
        </h3>
        <p className="text-sm text-blue-800">
          Open Banking is a secure way to connect your bank accounts using TrueLayer. 
          Your banking credentials are never shared with Finhome360. Transactions are 
          automatically imported and categorized to save you time.
        </p>
      </div>
    </div>
  );
}

export default function BankingPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <BankingContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
