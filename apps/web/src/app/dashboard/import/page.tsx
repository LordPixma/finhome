'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';

interface ImportedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  accountId?: string;
  categoryId?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  transactions?: ImportedTransaction[];
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<ImportedTransaction[]>([]);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

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

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setError('');
    setImportResult(null);
    setPreviewData([]);

    // Validate file type
    const validExtensions = ['.csv', '.ofx', '.qfx', '.json', '.xml', '.xls', '.xlsx', '.txt', '.mt940', '.pdf'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setError('Invalid file type. Supported formats: CSV, Excel (XLS/XLSX), JSON, XML, OFX/QFX, MT940 (TXT), and PDF.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size exceeds 5MB limit.');
      return;
    }

    setFile(selectedFile);
    parseFilePreview(selectedFile);
  };

  const parseFilePreview = async (file: File) => {
    setIsProcessing(true);

    try {
      const text = await file.text();
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (fileExtension === '.csv') {
        parseCSV(text);
      } else if (fileExtension === '.ofx') {
        parseOFX(text);
      }
    } catch (err: any) {
      setError('Failed to parse file: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setError('CSV file is empty or invalid.');
      return;
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const transactions: ImportedTransaction[] = [];

    for (let i = 1; i < Math.min(lines.length, 11); i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const transaction: ImportedTransaction = {
        date: values[headers.indexOf('date')] || new Date().toISOString().split('T')[0],
        description: values[headers.indexOf('description')] || values[headers.indexOf('memo')] || 'Imported',
        amount: parseFloat(values[headers.indexOf('amount')] || '0'),
        type: 'expense',
      };

      // Determine type based on amount
      if (transaction.amount > 0) {
        transaction.type = 'income';
      } else {
        transaction.type = 'expense';
        transaction.amount = Math.abs(transaction.amount);
      }

      transactions.push(transaction);
    }

    setPreviewData(transactions);
  };

  const parseOFX = (text: string) => {
    // Simple OFX parser for demonstration
    const transactions: ImportedTransaction[] = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;

    let count = 0;
    while ((match = stmtTrnRegex.exec(text)) !== null && count < 10) {
      const trnData = match[1];
      
      const dateMatch = /<DTPOSTED>(\d{8})/i.exec(trnData);
      const amountMatch = /<TRNAMT>([-\d.]+)/i.exec(trnData);
      const memoMatch = /<MEMO>(.*?)<\//i.exec(trnData);
      const nameMatch = /<NAME>(.*?)<\//i.exec(trnData);

      if (dateMatch && amountMatch) {
        const amount = parseFloat(amountMatch[1]);
        const transaction: ImportedTransaction = {
          date: `${dateMatch[1].substring(0, 4)}-${dateMatch[1].substring(4, 6)}-${dateMatch[1].substring(6, 8)}`,
          description: memoMatch?.[1] || nameMatch?.[1] || 'Imported',
          amount: Math.abs(amount),
          type: amount >= 0 ? 'income' : 'expense',
        };

        transactions.push(transaction);
        count++;
      }
    }

    if (transactions.length === 0) {
      setError('No valid transactions found in OFX file.');
      return;
    }

    setPreviewData(transactions);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    if (!selectedAccountId) {
      setError('Please select an account first.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await api.uploadFile(file, selectedAccountId);

      if (response.success) {
        setImportResult({
          success: response.data.imported || 0,
          failed: response.data.skipped || 0,
          errors: response.data.errors || [],
          transactions: response.data.transactions || [],
        });
        setFile(null);
        setPreviewData([]);
      } else {
        setError('Import failed: ' + (response.error?.message || 'Unknown error'));
      }
    } catch (err: any) {
      setError('Import failed: ' + (err.message || 'Network error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    setError('');
  };

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
                <li><strong>PDF:</strong> Bank statements (limited support)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Auto-Detection</h3>
              <p className="text-sm text-blue-800 mb-2">Smart processing:</p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Automatic field detection</li>
                <li>Category matching and creation</li>
                <li>Currency symbol support</li>
                <li>Date format recognition</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 text-sm text-blue-800">
            <strong>Note:</strong> Maximum file size is 5MB. Categories from your files will be automatically created if they don't exist. PDF support is limited - please use CSV or Excel for best results.
          </div>
        </div>

        {/* Account Selector */}
        {!importResult && (
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
        {!importResult && (
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
              {file ? 'File Selected' : 'Drag & Drop File Here'}
            </h3>
            {file ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 inline-block">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {file.name.endsWith('.csv') ? '📊' : '📄'}
                    </span>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleReset} variant="secondary">
                    Choose Different File
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-6">or click to browse files</p>
                <input
                  type="file"
                  accept=".csv,.ofx,.qfx,.json,.xml,.xls,.xlsx,.txt,.mt940,.pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer inline-block">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Choose File
                  </span>
                </label>
              </>
            )}
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

        {/* Preview */}
        {previewData.length > 0 && !importResult && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 mt-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Preview</h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Showing first {previewData.length} transactions
                  </p>
                </div>
                <Button 
                  onClick={handleImport} 
                  isLoading={isProcessing}
                  disabled={!selectedAccountId || accounts.length === 0}
                >
                  Import {previewData.length} Transaction{previewData.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewData.map((transaction, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {transaction.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'income'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {transaction.type === 'income' ? '💰 Income' : '💸 Expense'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span
                          className={`font-semibold ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">Import Complete!</h2>
              <p className="text-green-700 mb-6">
                Successfully imported <span className="font-bold">{importResult.success}</span> transaction
                {importResult.success !== 1 ? 's' : ''}
              </p>
              {importResult.failed > 0 && (
                <p className="text-red-700 mb-4">
                  <span className="font-bold">{importResult.failed}</span> transaction
                  {importResult.failed !== 1 ? 's' : ''} failed to import
                </p>
              )}
              <div className="flex gap-3 justify-center">
                <Button onClick={handleReset}>Import More Files</Button>
                <Button variant="secondary" onClick={() => (window.location.href = '/dashboard/transactions')}>
                  View Transactions
                </Button>
              </div>
            </div>

            {/* Error Details */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="font-bold text-red-900 mb-3">Import Errors:</h3>
                <ul className="space-y-2">
                  {importResult.errors.map((err, index) => (
                    <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Import History */}
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
