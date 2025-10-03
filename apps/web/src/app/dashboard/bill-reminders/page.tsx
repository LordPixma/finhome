'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Modal, Input, Select, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface BillReminder {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  dueDate: number;
  frequency: 'once' | 'weekly' | 'monthly' | 'yearly';
  reminderDays: number;
  status: 'pending' | 'paid' | 'overdue';
  category?: {
    name: string;
    icon?: string;
  };
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

export default function BillRemindersPage() {
  const [billReminders, setBillReminders] = useState<BillReminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillReminder | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currencySymbol, setCurrencySymbol] = useState('£');
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    categoryId: '',
    dueDate: new Date().toISOString().split('T')[0],
    frequency: 'monthly',
    reminderDays: '3',
    status: 'pending',
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [billsRes, categoriesRes, settingsRes] = await Promise.all([
        api.getBillReminders() as any,
        api.getCategories() as any,
        api.getSettings() as any,
      ]);

      if (billsRes.success) {
        setBillReminders(billsRes.data);
      }
      if (categoriesRes.success) {
        setCategories(categoriesRes.data.filter((cat: Category) => cat.type === 'expense'));
      }
      if (settingsRes.success && settingsRes.data) {
        setCurrencySymbol(settingsRes.data.currencySymbol || '£');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (bill?: BillReminder) => {
    if (bill) {
      setEditingBill(bill);
      const date = new Date(bill.dueDate);
      setFormData({
        name: bill.name,
        amount: bill.amount.toString(),
        categoryId: bill.categoryId,
        dueDate: date.toISOString().split('T')[0],
        frequency: bill.frequency,
        reminderDays: bill.reminderDays.toString(),
        status: bill.status,
      });
    } else {
      setEditingBill(null);
      setFormData({
        name: '',
        amount: '',
        categoryId: categories[0]?.id || '',
        dueDate: new Date().toISOString().split('T')[0],
        frequency: 'monthly',
        reminderDays: '3',
        status: 'pending',
      });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBill(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const billData = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId,
        dueDate: new Date(formData.dueDate).getTime(),
        frequency: formData.frequency,
        reminderDays: parseInt(formData.reminderDays),
        status: formData.status,
      };

      if (editingBill) {
        await api.updateBillReminder(editingBill.id, billData);
      } else {
        await api.createBillReminder(billData);
      }

      await loadData();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Failed to save bill reminder');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bill reminder?')) {
      return;
    }

    try {
      await api.deleteBillReminder(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete bill reminder:', error);
      alert('Failed to delete bill reminder');
    }
  };

  const handleMarkAsPaid = async (bill: BillReminder) => {
    try {
      await api.updateBillReminder(bill.id, { ...bill, status: 'paid' });
      await loadData();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      alert('Failed to mark as paid');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilDue = (dueDate: number) => {
    const now = new Date().getTime();
    const diff = dueDate - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return '✅';
      case 'overdue':
        return '⚠️';
      default:
        return '⏰';
    }
  };

  // Calculate stats
  const upcomingBills = billReminders.filter((b) => b.status === 'pending' && getDaysUntilDue(b.dueDate) <= 7);
  const overdueBills = billReminders.filter((b) => b.status === 'overdue' || (b.status === 'pending' && getDaysUntilDue(b.dueDate) < 0));
  const paidBills = billReminders.filter((b) => b.status === 'paid');
  const totalAmount = billReminders.filter((b) => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);

  // Sort bills by due date
  const sortedBills = [...billReminders].sort((a, b) => a.dueDate - b.dueDate);

  // Group bills by month for calendar view
  const billsByMonth: Record<string, BillReminder[]> = {};
  sortedBills.forEach((bill) => {
    const date = new Date(bill.dueDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!billsByMonth[monthKey]) {
      billsByMonth[monthKey] = [];
    }
    billsByMonth[monthKey].push(bill);
  });

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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bill Reminders</h1>
            <p className="text-gray-600 mt-1">Never miss a payment deadline</p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📅 Calendar
              </button>
            </div>
            <Button onClick={() => handleOpenModal()} icon="➕">
              Add Bill
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Upcoming (7 days)</p>
                <p className="text-2xl font-bold text-yellow-600">{upcomingBills.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
                ⏰
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueBills.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl">
                ⚠️
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Paid This Month</p>
                <p className="text-2xl font-bold text-green-600">{paidBills.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                ✅
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pending</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                💵
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {billReminders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No bill reminders yet</h3>
            <p className="text-gray-600 mb-6">Set up reminders to stay on top of your bills</p>
            <Button onClick={() => handleOpenModal()}>Add Your First Bill</Button>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="space-y-4">
            {sortedBills.map((bill) => {
              const daysUntil = getDaysUntilDue(bill.dueDate);
              const isOverdue = bill.status !== 'paid' && daysUntil < 0;
              const isUpcoming = bill.status === 'pending' && daysUntil <= 7 && daysUntil >= 0;

              return (
                <div
                  key={bill.id}
                  className={`bg-white rounded-xl shadow-lg p-6 border-2 transition-all ${
                    isOverdue
                      ? 'border-red-300 bg-red-50'
                      : isUpcoming
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-3xl">
                        {bill.category?.icon || '📄'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">{bill.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                            {getStatusIcon(bill.status)} {bill.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>📂 {bill.category?.name || 'Uncategorized'}</span>
                          <span>📅 Due: {formatDate(bill.dueDate)}</span>
                          <span className="capitalize">🔄 {bill.frequency}</span>
                          {daysUntil >= 0 && bill.status === 'pending' && (
                            <span className="font-semibold text-yellow-600">
                              {daysUntil === 0 ? 'Due today!' : `${daysUntil} days remaining`}
                            </span>
                          )}
                          {isOverdue && (
                            <span className="font-semibold text-red-600">
                              {Math.abs(daysUntil)} days overdue
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(bill.amount)}</p>
                        <p className="text-xs text-gray-500 mt-1">Reminder: {bill.reminderDays}d before</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-6">
                      {bill.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMarkAsPaid(bill)}
                        >
                          Mark Paid
                        </Button>
                      )}
                      <button
                        onClick={() => handleOpenModal(bill)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(bill.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Calendar View */
          <div className="space-y-6">
            {Object.keys(billsByMonth).sort().map((monthKey) => {
              const [year, month] = monthKey.split('-');
              const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en-US', {
                month: 'long',
                year: 'numeric',
              });
              const bills = billsByMonth[monthKey];

              return (
                <div key={monthKey} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                    <h3 className="text-xl font-bold text-white">{monthName}</h3>
                    <p className="text-blue-100 text-sm">{bills.length} bill{bills.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="p-6 space-y-3">
                    {bills.map((bill) => {
                      const daysUntil = getDaysUntilDue(bill.dueDate);
                      const isOverdue = bill.status !== 'paid' && daysUntil < 0;

                      return (
                        <div
                          key={bill.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                            isOverdue
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-900">
                                {new Date(bill.dueDate).getDate()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(bill.dueDate).toLocaleString('en-US', { weekday: 'short' })}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{bill.category?.icon || '📄'}</span>
                                <h4 className="font-semibold text-gray-900">{bill.name}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                                  {bill.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{bill.category?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(bill.amount)}</p>
                            <div className="flex gap-2">
                              {bill.status === 'pending' && (
                                <Button size="sm" variant="secondary" onClick={() => handleMarkAsPaid(bill)}>
                                  ✓
                                </Button>
                              )}
                              <button
                                onClick={() => handleOpenModal(bill)}
                                className="p-2 text-gray-400 hover:text-blue-600"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingBill ? 'Edit Bill Reminder' : 'Add New Bill Reminder'}
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
                label="Bill Name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Electric Bill"
              />

              <Input
                label="Amount"
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                icon={<span className="text-gray-400">{currencySymbol}</span>}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Category"
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                options={categories.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                }))}
              />

              <Input
                label="Due Date"
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Frequency"
                required
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                options={[
                  { value: 'once', label: '⚡ One-time' },
                  { value: 'weekly', label: '📅 Weekly' },
                  { value: 'monthly', label: '📆 Monthly' },
                  { value: 'yearly', label: '🗓️ Yearly' },
                ]}
              />

              <Input
                label="Remind Me (days before)"
                type="number"
                required
                min="0"
                max="30"
                value={formData.reminderDays}
                onChange={(e) => setFormData({ ...formData, reminderDays: e.target.value })}
                helperText="How many days before due date?"
              />
            </div>

            <Select
              label="Status"
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'pending', label: '⏰ Pending' },
                { value: 'paid', label: '✅ Paid' },
                { value: 'overdue', label: '⚠️ Overdue' },
              ]}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving} className="flex-1">
                {editingBill ? 'Save Changes' : 'Add Bill'}
              </Button>
            </div>
          </form>
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
