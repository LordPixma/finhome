'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Modal, Input, Select, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  ChartBarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Account {
  id: string;
  name: string;
  type: 'current' | 'savings' | 'credit' | 'cash' | 'investment';
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
    type: 'current',
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
        type: 'current',
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
      const balanceValue = formData.balance === '' ? 0 : parseFloat(formData.balance);
      
      // Validate that balance is a valid number
      if (isNaN(balanceValue)) {
        setError('Please enter a valid number for balance');
        setIsSaving(false);
        return;
      }

      const accountData = {
        name: formData.name,
        type: formData.type,
        balance: balanceValue,
        currency: formData.currency,
      };

      console.log('Submitting account data:', accountData);

      if (editingAccount) {
        await api.updateAccount(editingAccount.id, accountData);
      } else {
        await api.createAccount(accountData);
      }

      await loadAccounts();
      handleCloseModal();
    } catch (err: any) {
      console.error('Account save error:', err);
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
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      current: BuildingLibraryIcon,
      savings: BanknotesIcon,
      credit: CreditCardIcon,
      cash: BanknotesIcon,
      investment: ChartBarIcon,
    };
    return iconMap[type] || BuildingLibraryIcon;
  };

  const getAccountColor = (type: string) => {
    const colors: Record<string, string> = {
      current: 'bg-primary-50 text-primary-600 border-primary-200',
      savings: 'bg-success-50 text-success-600 border-success-200',
      credit: 'bg-purple-50 text-purple-600 border-purple-200',
      cash: 'bg-warning-50 text-warning-600 border-warning-200',
      investment: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    };
    return colors[type] || 'bg-primary-50 text-primary-600 border-primary-200';
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
          <div className="flex gap-3">
            <Link href="/dashboard/banking" className="btn-secondary flex items-center gap-2">
              Secure Bank Sync
            </Link>
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Account
            </button>
          </div>
        </div>

        {/* Total Balance Card */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 text-white mb-8 hover:shadow-xl transition-shadow">
          <p className="text-primary-100 text-sm font-medium mb-2">Total Balance</p>
          <p className="text-4xl font-bold font-mono">{formatCurrency(totalBalance)}</p>
          <p className="text-primary-100 text-sm mt-2">{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</p>
        </div>

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BuildingLibraryIcon className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No accounts yet</h3>
            <p className="text-gray-600 mb-6">Start by adding your first financial account</p>
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <PlusIcon className="w-5 h-5" />
              Add Your First Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="card-hover p-6 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-full ${getAccountColor(account.type)} flex items-center justify-center border-2`}>
                    {React.createElement(getAccountIcon(account.type), { className: 'w-6 h-6' })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(account)}
                      className="text-gray-400 hover:text-primary-600 transition-colors p-2 rounded-lg hover:bg-primary-50"
                      title="Edit"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="text-gray-400 hover:text-error-600 transition-colors p-2 rounded-lg hover:bg-error-50"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">{account.name}</h3>
                <p className="text-sm text-gray-500 capitalize mb-4">{account.type}</p>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-500 mb-1 font-medium">Balance</p>
                  <p className={`text-2xl font-bold font-mono ${account.balance >= 0 ? 'text-gray-900' : 'text-error-600'}`}>
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
              placeholder="e.g., Main Current Account"
            />

            <Select
              label="Account Type"
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={[
                { value: 'current', label: '🏦 Current Account' },
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
                { value: 'GBP', label: '£ GBP - British Pound' },
                { value: 'USD', label: '$ USD - US Dollar' },
                { value: 'EUR', label: '€ EUR - Euro' },
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
