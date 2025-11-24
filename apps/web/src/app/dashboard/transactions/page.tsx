'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Modal, Input, Select, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useUserSettings } from '@/hooks/useUserSettings';
import { AutoCategorizeButton, BatchCategorizeButton, AITransactionCategorizer } from '@/components/ai';
import { 
  TrashIcon, 
  ArchiveBoxIcon,
  PlusIcon,
  PencilIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: number;
  type: 'income' | 'expense';
  accountId: string;
  categoryId: string;
  notes?: string;
  account?: {
    name: string;
    type: string;
  };
  category?: {
    name: string;
    type: string;
  };
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { settings: userSettings } = useUserSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    accountId: '',
    categoryId: '',
    notes: '',
  });
  const [filters, setFilters] = useState({
    type: 'all',
    accountId: 'all',
    categoryId: 'all',
    search: '',
  });
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Bulk operations state
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [transactionsRes, accountsRes, categoriesRes] = await Promise.all([
        api.getTransactions() as any,
        api.getAccounts() as any,
        api.getCategories() as any,
      ]);

      if (transactionsRes.success) {
        setTransactions(transactionsRes.data);
      }
      if (accountsRes.success) {
        setAccounts(accountsRes.data);
      }
      if (categoriesRes.success) {
        setCategories(categoriesRes.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      const date = new Date(transaction.date);
      setFormData({
        description: transaction.description,
        amount: Math.abs(transaction.amount).toString(),
        date: date.toISOString().split('T')[0],
        type: transaction.type,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        notes: transaction.notes || '',
      });
    } else {
      setEditingTransaction(null);
      const expenseCategories = categories.filter(cat => cat.type === 'expense');
      setFormData({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        accountId: accounts[0]?.id || '',
        categoryId: expenseCategories[0]?.id || '',
        notes: '',
      });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (!formData.accountId) {
      setError('Please select an account');
      return;
    }
    
    if (!formData.categoryId) {
      setError('Please select a category');
      return;
    }

    setIsSaving(true);

    try {
      const amount = parseFloat(formData.amount);
      const transactionData = {
        description: formData.description.trim(),
        amount: formData.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        date: new Date(formData.date).toISOString(),
        type: formData.type,
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        notes: formData.notes?.trim() || undefined,
      };

      if (editingTransaction) {
        await api.updateTransaction(editingTransaction.id, transactionData);
      } else {
        await api.createTransaction(transactionData);
      }

      await loadData();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await api.deleteTransaction(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  // Bulk operation handlers
  const handleSelectTransaction = (id: string) => {
    setSelectedTransactions(prev => 
      prev.includes(id) 
        ? prev.filter(tid => tid !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allIds = paginatedTransactions.map(t => t.id);
    setSelectedTransactions(
      selectedTransactions.length === allIds.length ? [] : allIds
    );
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTransactions.length} selected transaction${selectedTransactions.length > 1 ? 's' : ''}?`)) {
      return;
    }

    try {
      setIsBulkOperating(true);
      const result = await api.bulkDeleteTransactions(selectedTransactions);
      
      if (result.success) {
        setNotification({ message: (result.data as any)?.message || 'Transactions deleted successfully', type: 'success' });
        setSelectedTransactions([]);
        setIsSelectMode(false);
        await loadData();
      } else {
        throw new Error((result.error as any)?.message || 'Failed to delete transactions');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      setNotification({ message: 'Failed to delete transactions', type: 'error' });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedTransactions.length === 0) return;

    try {
      setIsBulkOperating(true);
      const result = await api.bulkArchiveTransactions(selectedTransactions);
      
      if (result.success) {
        setNotification({ message: (result.data as any)?.message || 'Transactions archived successfully', type: 'success' });
        setSelectedTransactions([]);
        setIsSelectMode(false);
        await loadData();
      } else {
        throw new Error((result.error as any)?.message || 'Failed to archive transactions');
      }
    } catch (error) {
      console.error('Bulk archive error:', error);
      setNotification({ message: 'Failed to archive transactions', type: 'error' });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setIsBulkOperating(true);
      const result = await api.clearAllTransactions();
      
      if (result.success) {
        setNotification({ message: (result.data as any)?.message || 'All transactions cleared successfully', type: 'success' });
        setSelectedTransactions([]);
        setIsSelectMode(false);
        setShowClearConfirm(false);
        await loadData();
      } else {
        throw new Error((result.error as any)?.message || 'Failed to clear transactions');
      }
    } catch (error) {
      console.error('Clear all error:', error);
      setNotification({ message: 'Failed to clear all transactions', type: 'error' });
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    if (filters.type !== 'all' && transaction.type !== filters.type) return false;
    if (filters.accountId !== 'all' && transaction.accountId !== filters.accountId) return false;
    if (filters.categoryId !== 'all' && transaction.categoryId !== filters.categoryId) return false;
    if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = a.date - b.date;
    } else {
      comparison = Math.abs(a.amount) - Math.abs(b.amount);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Paginate
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryIcon = (type: string) => {
    const iconClass = "w-4 h-4";
    if (type === 'income') {
      return <ArrowUpIcon className={`${iconClass} text-success-600`} />;
    } else {
      return <ArrowDownIcon className={`${iconClass} text-error-600`} />;
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCategorizeSuccess = async (_transactionId: string, _categoryId: string, categoryName: string) => {
    showNotification(`Successfully categorized as "${categoryName}"`, 'success');
    await loadData();
  };

  const handleBatchCategorizeSuccess = async (results: { processed: number; applied: number }) => {
    showNotification(`Processed ${results.processed} transactions, applied ${results.applied} categories`, 'success');
    await loadData();
  };

  // Calculate stats
  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalExpenses = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const filteredCategoriesByType = categories.filter(
    (cat) => cat.type === formData.type
  );

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white animate-slide-in-right`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {notification.type === 'success' ? '✅' : '❌'}
              </span>
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-1">Track your income and expenses</p>
          </div>
          <div className="flex items-center gap-3">
            <BatchCategorizeButton
              autoApply={true}
              onSuccess={handleBatchCategorizeSuccess}
              onError={(error) => showNotification(error, 'error')}
            />
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Transaction
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1 font-medium">Total Income</p>
                <p className="text-2xl font-bold text-success-600 font-mono">{formatCurrency(totalIncome, userSettings?.currency, userSettings?.currencySymbol)}</p>
              </div>
              <div className="w-12 h-12 bg-success-50 rounded-full flex items-center justify-center border-2 border-success-200 group-hover:bg-success-100 transition-colors">
                <ArrowUpIcon className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="card p-6 hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1 font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-error-600 font-mono">{formatCurrency(totalExpenses, userSettings?.currency, userSettings?.currencySymbol)}</p>
              </div>
              <div className="w-12 h-12 bg-error-50 rounded-full flex items-center justify-center border-2 border-error-200 group-hover:bg-error-100 transition-colors">
                <ArrowDownIcon className="w-6 h-6 text-error-600" />
              </div>
            </div>
          </div>

          <div className="card p-6 hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1 font-medium">Net</p>
                <p className={`text-2xl font-bold font-mono ${totalIncome - totalExpenses >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                  {formatCurrency(totalIncome - totalExpenses, userSettings?.currency, userSettings?.currencySymbol)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 group-hover:opacity-80 transition-colors ${
                totalIncome - totalExpenses >= 0 
                  ? 'bg-primary-50 border-primary-200' 
                  : 'bg-warning-50 border-warning-200'
              }`}>
                <ReceiptPercentIcon className={`w-6 h-6 ${
                  totalIncome - totalExpenses >= 0 ? 'text-primary-600' : 'text-warning-600'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">Filter Transactions</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              icon={<MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />}
            />

            <Select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'income', label: 'Income' },
                { value: 'expense', label: 'Expense' },
              ]}
            />

            <Select
              value={filters.accountId}
              onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
              options={[
                { value: 'all', label: 'All Accounts' },
                ...accounts.map((acc) => ({ value: acc.id, label: acc.name })),
              ]}
            />

            <Select
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
              ]}
            />
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 font-medium">Sort by:</span>
            </div>
            <button
              onClick={() => setSortBy('date')}
              className={`text-sm px-3 py-1 rounded-lg transition-colors ${sortBy === 'date' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Date
            </button>
            <button
              onClick={() => setSortBy('amount')}
              className={`text-sm px-3 py-1 rounded-lg transition-colors ${sortBy === 'amount' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Amount
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUpIcon className="w-4 h-4" />
                  Ascending
                </>
              ) : (
                <>
                  <ArrowDownIcon className="w-4 h-4" />
                  Descending
                </>
              )}
            </button>
            <span className="text-sm text-gray-500 ml-auto font-medium">
              {filteredTransactions.length} transactions
            </span>
          </div>
        </div>

        {/* Bulk Operations Toolbar */}
        {paginatedTransactions.length > 0 && (
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isSelectMode 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {isSelectMode ? 'Exit Select Mode' : 'Select Transactions'}
                </button>
                
                {isSelectMode && (
                  <>
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {selectedTransactions.length === paginatedTransactions.length ? 'Deselect All' : 'Select All'}
                    </button>
                    
                    {selectedTransactions.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {selectedTransactions.length} selected
                        </span>
                        <button
                          onClick={handleBulkArchive}
                          disabled={isBulkOperating}
                          className="flex items-center px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
                        >
                          <ArchiveBoxIcon className="w-4 h-4 mr-1" />
                          Archive
                        </button>
                        <button
                          onClick={handleBulkDelete}
                          disabled={isBulkOperating}
                          className="flex items-center px-3 py-2 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          <TrashIcon className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors font-medium"
              >
                Clear All Transactions
              </button>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {paginatedTransactions.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BanknotesIcon className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-600 mb-6">Start tracking your finances by adding your first transaction</p>
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <PlusIcon className="w-5 h-5" />
              Add Your First Transaction
            </button>
          </div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {isSelectMode && (
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={selectedTransactions.length === paginatedTransactions.length && paginatedTransactions.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AI
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-25 transition-colors border-b border-gray-50">
                        {isSelectMode && (
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.includes(transaction.id)}
                              onChange={() => handleSelectTransaction(transaction.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">{transaction.description}</div>
                          {transaction.notes && (
                            <div className="text-gray-500 text-xs mt-1">{transaction.notes}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="inline-flex items-center gap-2">
                            {getCategoryIcon(transaction.category?.type || transaction.type)}
                            <span className="text-gray-900 font-medium">{transaction.category?.name || 'Uncategorized'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {transaction.account?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={`font-bold font-mono ${transaction.type === 'income' ? 'text-success-600' : 'text-error-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, userSettings?.currency, userSettings?.currencySymbol)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {!transaction.categoryId && (
                            <AutoCategorizeButton
                              transactionId={transaction.id}
                              onSuccess={(categoryId, categoryName) => 
                                handleCategorizeSuccess(transaction.id, categoryId, categoryName)
                              }
                              onError={(error) => showNotification(error, 'error')}
                              size="sm"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal(transaction)}
                              className="text-gray-400 hover:text-primary-600 transition-colors p-2 rounded-lg hover:bg-primary-50"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.id)}
                              className="text-gray-400 hover:text-error-600 transition-colors p-2 rounded-lg hover:bg-error-50"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Description"
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Grocery shopping"
              />

              <Input
                label="Amount"
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                icon={<span className="text-gray-400">$</span>}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />

              <Select
                label="Type"
                required
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value as 'income' | 'expense';
                  const categoriesForType = categories.filter(cat => cat.type === newType);
                  setFormData({ 
                    ...formData, 
                    type: newType, 
                    categoryId: categoriesForType[0]?.id || '' 
                  });
                }}
                options={[
                  { value: 'income', label: '💰 Income' },
                  { value: 'expense', label: '💸 Expense' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Account"
                required
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                options={accounts.map((acc) => ({
                  value: acc.id,
                  label: acc.name,
                }))}
              />

              <Select
                label="Category"
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                options={filteredCategoriesByType.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                }))}
              />
            </div>

            <Input
              label="Notes (Optional)"
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details..."
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving} className="flex-1">
                {editingTransaction ? 'Save Changes' : 'Add Transaction'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Clear All Confirmation Modal */}
        <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="Clear All Transactions">
          <div className="space-y-4 text-center">
            <div className="text-6xl">⚠️</div>
            <div>
              <h3 className="text-lg font-bold text-red-600 mb-2">Permanently Delete All Transactions?</h3>
              <p className="text-gray-600 mb-4">
                This will permanently delete <strong>all {filteredTransactions.length} transactions</strong> from your account. 
                This action cannot be undone.
              </p>
              <p className="text-sm text-gray-500 bg-yellow-50 p-3 rounded-lg">
                💡 Consider using the bulk select feature to delete specific transactions instead, 
                or archive them first if you might need them later.
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setShowClearConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleClearAll}
                isLoading={isBulkOperating}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                Yes, Delete All
              </Button>
            </div>
          </div>
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
