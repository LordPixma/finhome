'use client';

// Open Banking Integration - TrueLayer Sandbox
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';

interface BankConnection {
  id: string;
  institutionName: string;
  institutionId: string;
  status: 'active' | 'disconnected' | 'expired' | 'error';
  lastSyncAt: number;
  createdAt: number;
}

function BankingContent() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadConnections();

    // Check for callback parameters
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      setSuccessMessage('Bank connected successfully! Transactions will be synced shortly.');
      // Clear URL parameters
      window.history.replaceState({}, '', '/dashboard/banking');
    }

    if (error) {
      setError(decodeURIComponent(error));
      // Clear URL parameters
      window.history.replaceState({}, '', '/dashboard/banking');
    }
  }, [searchParams]);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const response = await api.getBankConnections();
      if (response.success && response.data) {
        setConnections(response.data as BankConnection[]);
      }
    } catch (err: any) {
      console.error('Failed to load connections:', err);
      setError('Failed to load bank connections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectBank = async () => {
    try {
      setIsConnecting(true);
      setError('');
      setSuccessMessage('');

      const response = await api.connectBank();
      if (response.success && response.data) {
        const { authUrl } = response.data as { authUrl: string };
        // Redirect to TrueLayer authorization
        window.location.href = authUrl;
      } else {
        setError('Failed to initiate bank connection');
      }
    } catch (err: any) {
      console.error('Failed to connect bank:', err);
      setError(err.message || 'Failed to connect bank');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (connectionId: string, institutionName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${institutionName}?`)) {
      return;
    }

    try {
      setError('');
      const response = await api.disconnectBank(connectionId);
      if (response.success) {
        setSuccessMessage(`${institutionName} disconnected successfully`);
        loadConnections();
      } else {
        setError('Failed to disconnect bank');
      }
    } catch (err: any) {
      console.error('Failed to disconnect bank:', err);
      setError(err.message || 'Failed to disconnect bank');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'disconnected':
        return 'text-gray-600 bg-gray-100';
      case 'expired':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Bank Connections</h1>
            <p className="text-gray-600 mt-2">
              Connect your bank accounts to automatically import transactions
            </p>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Connect New Bank Button */}
          <div className="mb-8">
            <Button
              onClick={handleConnectBank}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              {isConnecting ? 'Connecting...' : '+ Connect Bank Account'}
            </Button>
          </div>

          {/* Connected Banks */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Connected Banks</h2>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
                <p className="text-gray-600 mt-4">Loading connections...</p>
              </div>
            ) : connections.length === 0 ? (
              <div className="p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No banks connected</h3>
                <p className="mt-2 text-gray-600">
                  Connect your first bank account to start importing transactions automatically
                </p>
                <Button
                  onClick={handleConnectBank}
                  disabled={isConnecting}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                >
                  Connect Bank Account
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="p-6 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg
                            className="h-6 w-6 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {connection.institutionName}
                        </h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              connection.status
                            )}`}
                          >
                            {connection.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            Last sync: {formatDate(connection.lastSyncAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={() =>
                          handleDisconnect(connection.id, connection.institutionName)
                        }
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg border border-red-300"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              🔒 Secure Bank Connection
            </h3>
            <p className="text-blue-800 text-sm">
              We use TrueLayer Open Banking to securely connect to your bank. We never see your
              banking credentials, and all data is encrypted. You can disconnect at any time.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function BankingPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <BankingContent />
    </Suspense>
  );
}
