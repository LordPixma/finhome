'use client';'use client';



import { useState, useEffect } from 'react';import { useState, useEffect } from 'react';

import { ProtectedRoute } from '@/components/ProtectedRoute';import { api } from '@/lib/api';

import DashboardLayout from '@/components/DashboardLayout';import type { BankConnectionSummary, SyncResult } from '@finhome360/shared';

import { Button } from '@/components/ui';import { Button } from '@/components/ui';

import { api } from '@/lib/api';import { 

import type { BankConnectionSummary, SyncResult } from '@finhome360/shared';  LinkIcon, 

import {   ArrowPathIcon, 

  LinkIcon,   TrashIcon,

  ArrowPathIcon,   CheckCircleIcon,

  TrashIcon,  ExclamationCircleIcon,

  CheckCircleIcon,  ClockIcon,

  ExclamationCircleIcon,} from '@heroicons/react/24/outline';

  ClockIcon,

} from '@heroicons/react/24/outline';export default function BankingPage() {

  const [connections, setConnections] = useState<BankConnectionSummary[]>([]);

function BankingContent() {  const [loading, setLoading] = useState(true);

  const [connections, setConnections] = useState<BankConnectionSummary[]>([]);  const [syncing, setSyncing] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);  const [error, setError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);  useEffect(() => {

    loadConnections();

  useEffect(() => {  }, []);

    loadConnections();

  }, []);  const loadConnections = async () => {

    try {

  const loadConnections = async () => {      setLoading(true);

    try {      setError(null);

      setLoading(true);      const data = await api.getBankConnections();

      setError(null);      setConnections(data);

      const data = await api.getBankConnections();    } catch (err) {

      setConnections(data);      setError('Failed to load bank connections');

    } catch (err) {      console.error(err);

      setError('Failed to load bank connections');    } finally {

      console.error(err);      setLoading(false);

    } finally {    }

      setLoading(false);  };

    }

  };  const handleConnect = async () => {

    try {

  const handleConnect = async () => {      setError(null);

    try {      const response = await api.createBankLink({});

      setError(null);      window.location.href = response.authorizationUrl;

      const response = await api.createBankLink({});    } catch (err) {

      window.location.href = response.authorizationUrl;      setError('Failed to initiate bank connection');

    } catch (err) {      console.error(err);

      setError('Failed to initiate bank connection');    }

      console.error(err);  };

    }

  };  const handleSync = async (connectionId: string) => {

    try {

  const handleSync = async (connectionId: string) => {      setSyncing(connectionId);

    try {      setError(null);

      setSyncing(connectionId);      const result: SyncResult = await api.syncBankConnection(connectionId);

      setError(null);      

      const result: SyncResult = await api.syncBankConnection(connectionId);      alert(Sync complete!\nFetched: \\nImported: \\nSkipped: \);

            

      const message = `Sync complete!\nFetched: ${result.transactionsFetched}\nImported: ${result.transactionsImported}\nSkipped: ${result.transactionsSkipped}`;      await loadConnections();

      alert(message);    } catch (err) {

            setError('Failed to sync bank connection');

      await loadConnections();      console.error(err);

    } catch (err) {    } finally {

      setError('Failed to sync bank connection');      setSyncing(null);

      console.error(err);    }

    } finally {  };

      setSyncing(null);

    }  const handleDisconnect = async (connectionId: string) => {

  };    if (!confirm('Are you sure you want to disconnect this bank? This will not delete your existing transactions.')) {

      return;

  const handleDisconnect = async (connectionId: string) => {    }

    if (!confirm('Are you sure you want to disconnect this bank? This will not delete your existing transactions.')) {

      return;    try {

    }      setError(null);

      await api.disconnectBankConnection(connectionId);

    try {      await loadConnections();

      setError(null);    } catch (err) {

      await api.disconnectBankConnection(connectionId);      setError('Failed to disconnect bank');

      await loadConnections();      console.error(err);

    } catch (err) {    }

      setError('Failed to disconnect bank');  };

      console.error(err);

    }  const getStatusIcon = (status: string) => {

  };    switch (status) {

      case 'active':

  const getStatusIcon = (status: string) => {        return <CheckCircleIcon className=\"w-5 h-5 text-success-500\" />;

    switch (status) {      case 'error':

      case 'active':        return <ExclamationCircleIcon className=\"w-5 h-5 text-error-500\" />;

        return <CheckCircleIcon className="w-5 h-5 text-success-500" />;      case 'expired':

      case 'error':        return <ClockIcon className=\"w-5 h-5 text-warning-500\" />;

        return <ExclamationCircleIcon className="w-5 h-5 text-error-500" />;      default:

      case 'expired':        return <ClockIcon className=\"w-5 h-5 text-gray-400\" />;

        return <ClockIcon className="w-5 h-5 text-warning-500" />;    }

      default:  };

        return <ClockIcon className="w-5 h-5 text-gray-400" />;

    }  const getStatusText = (status: string) => {

  };    switch (status) {

      case 'active':

  const getStatusText = (status: string) => {        return 'Connected';

    switch (status) {      case 'error':

      case 'active':        return 'Error';

        return 'Connected';      case 'expired':

      case 'error':        return 'Expired';

        return 'Error';      default:

      case 'expired':        return 'Unknown';

        return 'Expired';    }

      default:  };

        return 'Unknown';

    }  if (loading) {

  };    return (

      <div className=\"flex items-center justify-center min-h-[400px]\">

  if (loading) {        <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600\"></div>

    return (      </div>

      <div className="flex items-center justify-center min-h-[400px]">    );

        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>  }

      </div>

    );  return (

  }    <div>

      <div className=\"mb-8\">

  return (        <h1 className=\"text-3xl font-bold text-gray-900\">Open Banking</h1>

    <div>        <p className=\"mt-2 text-gray-600\">

      <div className="mb-8">          Connect your bank accounts to automatically sync transactions

        <h1 className="text-3xl font-bold text-gray-900">Open Banking</h1>        </p>

        <p className="mt-2 text-gray-600">      </div>

          Connect your bank accounts to automatically sync transactions

        </p>      {error && (

      </div>        <div className=\"mb-6 p-4 bg-error-50 border border-error-200 rounded-lg text-error-700\">

          {error}

      {error && (        </div>

        <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg text-error-700">      )}

          {error}

        </div>      <div className=\"mb-6\">

      )}        <Button

          onClick={handleConnect}

      <div className="mb-6">          className=\"flex items-center\"

        <Button        >

          onClick={handleConnect}          <LinkIcon className=\"w-5 h-5 mr-2\" />

          className="flex items-center"          Connect Bank Account

        >        </Button>

          <LinkIcon className="w-5 h-5 mr-2" />      </div>

          Connect Bank Account

        </Button>      {connections.length === 0 ? (

      </div>        <div className=\"bg-white rounded-lg shadow p-12 text-center\">

          <LinkIcon className=\"w-16 h-16 text-gray-300 mx-auto mb-4\" />

      {connections.length === 0 ? (          <h3 className=\"text-lg font-medium text-gray-900 mb-2\">

        <div className="bg-white rounded-lg shadow p-12 text-center">            No bank connections yet

          <LinkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />          </h3>

          <h3 className="text-lg font-medium text-gray-900 mb-2">          <p className=\"text-gray-600 mb-6\">

            No bank connections yet            Connect your bank to automatically sync transactions using TrueLayer

          </h3>          </p>

          <p className="text-gray-600 mb-6">          <Button onClick={handleConnect}>

            Connect your bank to automatically sync transactions using TrueLayer            <LinkIcon className=\"w-5 h-5 mr-2\" />

          </p>            Connect Your First Bank

          <Button onClick={handleConnect}>          </Button>

            <LinkIcon className="w-5 h-5 mr-2" />        </div>

            Connect Your First Bank      ) : (

          </Button>        <div className=\"bg-white rounded-lg shadow overflow-hidden\">

        </div>          <div className=\"divide-y divide-gray-200\">

      ) : (            {connections.map((connection) => (

        <div className="bg-white rounded-lg shadow overflow-hidden">              <div

          <div className="divide-y divide-gray-200">                key={connection.id}

            {connections.map((connection) => (                className=\"p-6 hover:bg-gray-50 transition-colors\"

              <div              >

                key={connection.id}                <div className=\"flex items-start justify-between\">

                className="p-6 hover:bg-gray-50 transition-colors"                  <div className=\"flex-1\">

              >                    <div className=\"flex items-center space-x-3\">

                <div className="flex items-start justify-between">                      <h3 className=\"text-lg font-semibold text-gray-900\">

                  <div className="flex-1">                        {connection.institutionName}

                    <div className="flex items-center space-x-3">                      </h3>

                      <h3 className="text-lg font-semibold text-gray-900">                      <div className=\"flex items-center space-x-1\">

                        {connection.institutionName}                        {getStatusIcon(connection.status)}

                      </h3>                        <span

                      <div className="flex items-center space-x-1">                          className={\	ext-sm font-medium \\}

                        {getStatusIcon(connection.status)}                        >

                        <span                          {getStatusText(connection.status)}

                          className={`text-sm font-medium ${                        </span>

                            connection.status === 'active'                      </div>

                              ? 'text-success-700'                    </div>

                              : connection.status === 'error'                    <div className=\"mt-2 space-y-1\">

                              ? 'text-error-700'                      <p className=\"text-sm text-gray-600\">

                              : 'text-warning-700'                        {connection.accountCount} account{connection.accountCount !== 1 ? 's' : ''} connected

                          }`}                      </p>

                        >                      {connection.lastSyncAt && (

                          {getStatusText(connection.status)}                        <p className=\"text-sm text-gray-500\">

                        </span>                          Last synced: {new Date(connection.lastSyncAt).toLocaleString()}

                      </div>                        </p>

                    </div>                      )}

                    <div className="mt-2 space-y-1">                      {connection.nextSyncAt && (

                      <p className="text-sm text-gray-600">                        <p className=\"text-sm text-gray-500\">

                        {connection.accountCount} account{connection.accountCount !== 1 ? 's' : ''} connected                          Next sync: {new Date(connection.nextSyncAt).toLocaleString()}

                      </p>                        </p>

                      {connection.lastSyncAt && (                      )}

                        <p className="text-sm text-gray-500">                    </div>

                          Last synced: {new Date(connection.lastSyncAt).toLocaleString()}                  </div>

                        </p>                  <div className=\"flex items-center space-x-2 ml-4\">

                      )}                    <Button

                      {connection.nextSyncAt && (                      variant=\"outline\"

                        <p className="text-sm text-gray-500">                      size=\"sm\"

                          Next sync: {new Date(connection.nextSyncAt).toLocaleString()}                      onClick={() => handleSync(connection.id)}

                        </p>                      disabled={syncing === connection.id || connection.status !== 'active'}

                      )}                      className=\"flex items-center\"

                    </div>                    >

                  </div>                      <ArrowPathIcon

                  <div className="flex items-center space-x-2 ml-4">                        className={\w-4 h-4 mr-1 \\}

                    <Button                      />

                      variant="outline"                      Sync Now

                      size="sm"                    </Button>

                      onClick={() => handleSync(connection.id)}                    <Button

                      disabled={syncing === connection.id || connection.status !== 'active'}                      variant=\"outline\"

                      className="flex items-center"                      size=\"sm\"

                    >                      onClick={() => handleDisconnect(connection.id)}

                      <ArrowPathIcon                      className=\"text-error-600 hover:text-error-700 hover:bg-error-50\"

                        className={`w-4 h-4 mr-1 ${                    >

                          syncing === connection.id ? 'animate-spin' : ''                      <TrashIcon className=\"w-4 h-4\" />

                        }`}                    </Button>

                      />                  </div>

                      Sync Now                </div>

                    </Button>              </div>

                    <Button            ))}

                      variant="outline"          </div>

                      size="sm"        </div>

                      onClick={() => handleDisconnect(connection.id)}      )}

                      className="text-error-600 hover:text-error-700 hover:bg-error-50"

                    >      <div className=\"mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6\">

                      <TrashIcon className="w-4 h-4" />        <h3 className=\"text-sm font-semibold text-blue-900 mb-2\">

                    </Button>          About Open Banking

                  </div>        </h3>

                </div>        <p className=\"text-sm text-blue-800\">

              </div>          Open Banking is a secure way to connect your bank accounts using TrueLayer. 

            ))}          Your banking credentials are never shared with Finhome360. Transactions are 

          </div>          automatically imported and categorized to save you time.

        </div>        </p>

      )}      </div>

    </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">  );

        <h3 className="text-sm font-semibold text-blue-900 mb-2">}

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
