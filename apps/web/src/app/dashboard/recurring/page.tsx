'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Modal, Input, Select, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface RecurringTransaction {
  id: string;
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string;
  description: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  status: 'active' | 'paused' | 'completed';
  autoCreate: boolean;
  lastCreated?: string;
  nextDate?: string;
  accountName?: string;
  categoryName?: string;
  categoryColor?: string;
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

export default function RecurringPage() {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [formData, setFormData] = useState({
    accountId: '',
    categoryId: '',
    type: 'expense' as 'income' | 'expense',
    amount: '',
    frequency: 'monthly' as RecurringTransaction['frequency'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    description: '',
    dayOfMonth: '',
    dayOfWeek: '',
    status: 'active' as RecurringTransaction['status'],
    autoCreate: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [recurringRes, accountsRes, categoriesRes] = await Promise.all([
        api.getRecurringTransactions() as any,
        api.getAccounts() as any,
        api.getCategories() as any,
      ]);

      if (recurringRes.success) setRecurring(recurringRes.data);
      if (accountsRes.success) setAccounts(accountsRes.data);
      if (categoriesRes.success) setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      amount: parseFloat(formData.amount),
      dayOfMonth: formData.dayOfMonth ? parseInt(formData.dayOfMonth) : undefined,
      dayOfWeek: formData.dayOfWeek ? parseInt(formData.dayOfWeek) : undefined,
      endDate: formData.endDate || undefined,
    };

    try {
      if (editing) {
        const res = await api.updateRecurringTransaction(editing.id, data) as any;
        if (res.success) {
          await loadData();
          setIsModalOpen(false);
          resetForm();
        }
      } else {
        const res = await api.createRecurringTransaction(data) as any;
        if (res.success) {
          await loadData();
          setIsModalOpen(false);
          resetForm();
        }
      }
    } catch (error) {
      console.error('Failed to save recurring transaction:', error);
    }
  };

  const handleEdit = (item: RecurringTransaction) => {
    setEditing(item);
    setFormData({
      accountId: item.accountId,
      categoryId: item.categoryId,
      type: item.type,
      amount: item.amount.toString(),
      frequency: item.frequency,
      startDate: item.startDate.split('T')[0],
      endDate: item.endDate ? item.endDate.split('T')[0] : '',
      description: item.description,
      dayOfMonth: item.dayOfMonth?.toString() || '',
      dayOfWeek: item.dayOfWeek?.toString() || '',
      status: item.status,
      autoCreate: item.autoCreate,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recurring transaction?')) return;

    try {
      const res = await api.deleteRecurringTransaction(id) as any;
      if (res.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to delete recurring transaction:', error);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      accountId: '',
      categoryId: '',
      type: 'expense',
      amount: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      description: '',
      dayOfMonth: '',
      dayOfWeek: '',
      status: 'active',
      autoCreate: true,
    });
  };

  const filteredCategories = categories.filter((c) => c.type === formData.type);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Recurring Transactions</h1>
              <p className="text-gray-600 mt-1">Automate your regular income and expenses</p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              icon="🔁"
            >
              Add Recurring
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : recurring.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
              <div className="text-6xl mb-4">🔁</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No recurring transactions yet</h3>
              <p className="text-gray-600 mb-6">Set up automatic tracking of subscriptions, bills, and regular income</p>
              <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>Add Your First Recurring Transaction</Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {recurring.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                        style={{ backgroundColor: item.categoryColor ? `${item.categoryColor}20` : '#gray20' }}
                      >
                        🔁
                      </div>
                      <div>
                        <div className="font-bold text-lg">{item.description}</div>
                        <div className="text-sm text-gray-600">
                          {item.categoryName} • {item.accountName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)} •{' '}
                          {item.status === 'active' ? '✅ Active' : item.status}
                          {item.nextDate && ` • Next: ${new Date(item.nextDate).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div
                        className={`text-2xl font-bold ${
                          item.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {item.type === 'income' ? '+' : '-'}
                        {formatCurrency(item.amount)}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleEdit(item)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title={editing ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Type"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as 'income' | 'expense', categoryId: '' })
              }
              required
              options={[
                { value: 'expense', label: '💸 Expense' },
                { value: 'income', label: '💰 Income' },
              ]}
            />

            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Netflix Subscription"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />

              <Select
                label="Frequency"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                required
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'biweekly', label: 'Biweekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Account"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                required
                options={[
                  { value: '', label: 'Select account...' },
                  ...accounts.map((account) => ({
                    value: account.id,
                    label: account.name,
                  })),
                ]}
              />

              <Select
                label="Category"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                options={[
                  { value: '', label: 'Select category...' },
                  ...filteredCategories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />

              <Input
                label="End Date (Optional)"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              required
              options={[
                { value: 'active', label: 'Active' },
                { value: 'paused', label: 'Paused' },
                { value: 'completed', label: 'Completed' },
              ]}
            />

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.autoCreate}
                onChange={(e) => setFormData({ ...formData, autoCreate: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              Auto-create transactions on schedule
            </label>

            <div className="flex gap-2 pt-4">
              <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
