'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';

interface ImportResult {
  fileName: string;
  logId: string;
  success: boolean;
  imported: number;
  skipped: number;
  total: number;
  errors?: string[];
  processingTimeMs?: number;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoadingAccounts(true);
      const response = await api.getAccounts();
      if (response.success && response.data) {
        const accountList = response.data as Account[];
        setAccounts(accountList);
        if (accountList.length > 0) {
          setSelectedAccountId(accountList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError('Failed to load accounts. Please refresh the page.');
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFilesSelect(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      handleFilesSelect(selectedFiles);
    }
  };

  const handleFilesSelect = (selectedFiles: File[]) => {
    setError('');
    setImportResults([]);

    // Validate file types
    const validExtensions = ['.csv', '.ofx', '.qfx', '.json', '.xml', '.xls', '.xlsx', '.txt', '.mt940', '.pdf'];
    const invalidFiles = selectedFiles.filter(f => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      return !validExtensions.includes(ext);
    });

    if (invalidFiles.length > 0) {
      setError(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}. Supported formats: CSV, Excel, JSON, XML, OFX/QFX, MT940, and PDF.`);
      return;
    }

    // Validate file sizes (max 5MB each)
    const maxSize = 5 * 1024 * 1024;
    const oversizedFiles = selectedFiles.filter(f => f.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      setError(`File(s) exceed 5MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setFiles(selectedFiles);
  };

  const handleImport = async () => {
    if (files.length === 0) {
      setError('Please select at least one file.');
      return;
    }

    if (!selectedAccountId) {
      setError('Please select an account first.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setImportResults([]);

    const results: ImportResult[] = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Processing ${i + 1} of ${files.length}: ${file.name}`);

      try {
        const response = await api.uploadFile(file, selectedAccountId);

        if (response.success) {
          results.push({
            fileName: file.name,
            logId: response.data.logId,
            success: true,
            imported: response.data.imported || 0,
            skipped: response.data.skipped || 0,
            total: response.data.total || 0,
            errors: response.data.errors,
            processingTimeMs: response.data.processingTimeMs,
          });
        } else {
          results.push({
            fileName: file.name,
            logId: '',
            success: false,
            imported: 0,
            skipped: 0,
            total: 0,
            errors: [response.error?.message || 'Unknown error'],
          });
        }
      } catch (err: any) {
        results.push({
          fileName: file.name,
          logId: '',
          success: false,
          imported: 0,
          skipped: 0,
          total: 0,
          errors: [err.message || 'Network error'],
        });
      }
    }

    setImportResults(results);
    setFiles([]);
    setUploadProgress('');
    setIsProcessing(false);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setFiles([]);
    setImportResults([]);
    setError('');
    setUploadProgress('');
  };

  const successfulImports = importResults.filter(r => r.success).length;
  const totalImported = importResults.reduce((sum, r) => sum + r.imported, 0);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import Transactions</h1>
          <p className="text-gray-600 mt-1">Upload bank statements in multiple formats to import transactions</p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
            <span className="text-2xl">📋</span> File Format Requirements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Text Formats</h3>
              <p className="text-sm text-blue-800 mb-2">Structured data files:</p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li><strong>CSV:</strong> Standard format with auto field detection</li>
                <li><strong>JSON:</strong> Structured transaction data</li>
                <li><strong>XML:</strong> Bank XML export files</li>
                <li><strong>MT940:</strong> SWIFT banking format (.txt)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Bank Formats</h3>
              <p className="text-sm text-blue-800 mb-2">Standard bank exports:</p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li><strong>OFX/QFX:</strong> Quicken and bank formats</li>
                <li><strong>Excel:</strong> .xls and .xlsx spreadsheets</li>
                <li><strong>PDF:</strong> Bank statements (multiple files supported)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Multi-File Upload</h3>
              <p className="text-sm text-blue-800 mb-2">Batch processing:</p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Select multiple files at once</li>
                <li>Automatic batch processing</li>
                <li>Progress tracking for each file</li>
                <li>Detailed import logs</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 text-sm text-blue-800">
            <strong>Note:</strong> Maximum file size is 5MB per file. Categories from your files will be automatically created if they don't exist.
          </div>
        </div>

        {/* Account Selector */}
        {importResults.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Select Account</h2>
            {isLoadingAccounts ? (
              <div className="text-gray-500">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  No accounts found. Please{' '}
                  <a href="/dashboard/accounts" className="text-blue-600 hover:underline font-semibold">
                    create an account
                  </a>{' '}
                  before importing transactions.
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor="account-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Choose which account to import transactions into:
                </label>
                <select
                  id="account-select"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.type}) - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Upload Area */}
        {importResults.length === 0 && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-3 border-dashed rounded-xl p-12 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {files.length > 0 ? `${files.length} File${files.length !== 1 ? 's' : ''} Selected` : 'Drag & Drop Files Here'}
            </h3>
            {files.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {file.name.endsWith('.pdf') ? '📄' : '📊'}
                        </span>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={handleImport} 
                    isLoading={isProcessing}
                    disabled={!selectedAccountId || accounts.length === 0}
                  >
                    Import {files.length} File{files.length !== 1 ? 's' : ''}
                  </Button>
                  <Button onClick={handleReset} variant="secondary">
                    Clear All
                  </Button>
                </div>
                {isProcessing && uploadProgress && (
                  <div className="mt-4 text-sm text-blue-600 font-medium">
                    {uploadProgress}
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-6">or click to browse files (multiple selection supported)</p>
                <input
                  type="file"
                  accept=".csv,.ofx,.qfx,.json,.xml,.xls,.xlsx,.txt,.mt940,.pdf"
                  onChange={handleFileInputChange}
                  multiple
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer inline-block">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Choose Files
                  </span>
                </label>
              </>
            )}
          </div>
        )}

        {/* Mobile sticky action bar (ensures upload button is always visible on small screens) */}
        {importResults.length === 0 && files.length > 0 && (
          <div className="fixed inset-x-0 bottom-24 z-40 px-4 sm:hidden">
            <div className="bg-white border border-gray-200 shadow-lg rounded-xl p-3 flex items-center gap-3">
              <Button
                onClick={handleImport}
                isLoading={isProcessing}
                className="flex-1"
                disabled={!selectedAccountId || accounts.length === 0}
              >
                Import {files.length} File{files.length !== 1 ? 's' : ''}
              </Button>
              <Button onClick={handleReset} variant="secondary">
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold mb-1">Import Error</h3>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Import Results */}
        {importResults.length > 0 && (
          <div className="space-y-6">
            <div className={`${successfulImports > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-xl p-8 text-center`}>
              <div className="text-6xl mb-4">{successfulImports > 0 ? '✅' : '❌'}</div>
              <h2 className={`text-2xl font-bold mb-2 ${successfulImports > 0 ? 'text-green-900' : 'text-red-900'}`}>
                Import {successfulImports > 0 ? 'Complete!' : 'Failed'}
              </h2>
              <p className={successfulImports > 0 ? 'text-green-700 mb-6' : 'text-red-700 mb-6'}>
                Successfully processed <span className="font-bold">{successfulImports}</span> of <span className="font-bold">{importResults.length}</span> file{importResults.length !== 1 ? 's' : ''}
              </p>
              <p className="text-lg font-semibold mb-6">
                Total transactions imported: <span className="text-green-600">{totalImported}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleReset}>Import More Files</Button>
                <Button variant="secondary" onClick={() => (window.location.href = '/dashboard/transactions')}>
                  View Transactions
                </Button>
                <Button variant="secondary" onClick={() => (window.location.href = '/dashboard/logs')}>
                  View Import Logs
                </Button>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Import Details</h3>
              <div className="space-y-4">
                {importResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-4 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{result.success ? '✅' : '❌'}</span>
                          <h4 className="font-semibold text-gray-900">{result.fileName}</h4>
                        </div>
                        {result.success ? (
                          <div className="text-sm space-y-1">
                            <p className="text-green-700">
                              <span className="font-medium">Imported:</span> {result.imported} transactions
                            </p>
                            {result.skipped > 0 && (
                              <p className="text-yellow-700">
                                <span className="font-medium">Skipped:</span> {result.skipped} transactions
                              </p>
                            )}
                            {result.processingTimeMs && (
                              <p className="text-gray-600">
                                <span className="font-medium">Processing time:</span> {result.processingTimeMs}ms
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-red-700">
                            {result.errors && result.errors.length > 0 && (
                              <ul className="space-y-1 list-disc list-inside">
                                {result.errors.map((err, errIndex) => (
                                  <li key={errIndex}>{err}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Import Tips */}
        <div className="mt-12 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Import Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Clean Data</h3>
                <p className="text-sm text-gray-600">
                  Ensure your CSV has proper headers and consistent date formats for best results.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">🔒</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Secure Upload</h3>
                <p className="text-sm text-gray-600">
                  All files are processed securely and stored encrypted in the cloud.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">⚡</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Fast Processing</h3>
                <p className="text-sm text-gray-600">
                  Large files are processed in the background with progress notifications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
