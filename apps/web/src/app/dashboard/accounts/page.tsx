'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Modal, Input, Select, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  balance: number;
  currency: string;
  createdAt?: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    balance: '',
    currency: 'GBP',
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await api.getAccounts() as any;
      if (response.success) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        type: account.type,
        balance: account.balance.toString(),
        currency: account.currency,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        type: 'checking',
        balance: '',
        currency: 'GBP',
      });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const accountData = {
        name: formData.name,
        type: formData.type,
        balance: parseFloat(formData.balance),
        currency: formData.currency,
      };

      if (editingAccount) {
        await api.updateAccount(editingAccount.id, accountData);
      } else {
        await api.createAccount(accountData);
      }

      await loadAccounts();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Failed to save account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) {
      return;
    }

    try {
      await api.deleteAccount(id);
      await loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account');
    }
  };

  const getAccountIcon = (type: string) => {
    const icons: Record<string, string> = {
      checking: '🏦',
      savings: '💰',
      credit: '💳',
      cash: '💵',
      investment: '📈',
    };
    return icons[type] || '🏦';
  };

  const getAccountColor = (type: string) => {
    const colors: Record<string, string> = {
      checking: 'bg-blue-100 text-blue-600',
      savings: 'bg-green-100 text-green-600',
      credit: 'bg-purple-100 text-purple-600',
      cash: 'bg-yellow-100 text-yellow-600',
      investment: 'bg-indigo-100 text-indigo-600',
    };
    return colors[type] || 'bg-blue-100 text-blue-600';
  };

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

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
            <p className="text-gray-600 mt-1">Manage your financial accounts</p>
          </div>
          <Button onClick={() => handleOpenModal()} icon="➕">
            Add Account
          </Button>
        </div>

        {/* Total Balance Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white mb-8">
          <p className="text-blue-100 text-sm font-medium mb-2">Total Balance</p>
          <p className="text-4xl font-bold">{formatCurrency(totalBalance)}</p>
          <p className="text-blue-100 text-sm mt-2">{accounts.length} accounts</p>
        </div>

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">🏦</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No accounts yet</h3>
            <p className="text-gray-600 mb-6">Start by adding your first financial account</p>
            <Button onClick={() => handleOpenModal()}>Add Your First Account</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-full ${getAccountColor(account.type)} flex items-center justify-center text-3xl`}>
                    {getAccountIcon(account.type)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(account)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">{account.name}</h3>
                <p className="text-sm text-gray-500 capitalize mb-4">{account.type}</p>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600 mb-1">Balance</p>
                  <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingAccount ? 'Edit Account' : 'Add New Account'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Input
              label="Account Name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Checking"
            />

            <Select
              label="Account Type"
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={[
                { value: 'checking', label: '🏦 Checking' },
                { value: 'savings', label: '💰 Savings' },
                { value: 'credit', label: '💳 Credit Card' },
                { value: 'cash', label: '💵 Cash' },
                { value: 'investment', label: '📈 Investment' },
              ]}
            />

            <Input
              label="Current Balance"
              type="number"
              step="0.01"
              required
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              placeholder="0.00"
              icon={
                <span className="text-gray-400">$</span>
              }
            />

            <Select
              label="Currency"
              required
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              options={[
                { value: 'USD', label: 'USD - US Dollar' },
                { value: 'EUR', label: 'EUR - Euro' },
                { value: 'GBP', label: 'GBP - British Pound' },
              ]}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving} className="flex-1">
                {editingAccount ? 'Save Changes' : 'Add Account'}
              </Button>
            </div>
          </form>
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
