'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Modal, Input, Select, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { AIBudgetSuggestions } from '@/components/AIBudgetSuggestions';
import { ExportButton } from '@/components/export';

interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: 'monthly' | 'yearly';
  startDate: number;
  endDate?: number;
  category?: {
    name: string;
    type: string;
  };
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  date: number;
  type: 'income' | 'expense';
}

interface BudgetWithSpending extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [budgetsRes, categoriesRes, transactionsRes] = await Promise.all([
        api.getBudgets() as any,
        api.getCategories() as any,
        api.getTransactions() as any,
      ]);

      if (budgetsRes.success) {
        setBudgets(budgetsRes.data);
      }
      if (categoriesRes.success) {
        setCategories(categoriesRes.data.filter((cat: Category) => cat.type === 'expense'));
      }
      if (transactionsRes.success) {
        setTransactions(transactionsRes.data.filter((t: Transaction) => t.type === 'expense'));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSpending = (budget: Budget): BudgetWithSpending => {
    const now = Date.now();
    const startDate = budget.startDate;
    const endDate = budget.endDate || (budget.period === 'monthly' 
      ? startDate + 30 * 24 * 60 * 60 * 1000 
      : startDate + 365 * 24 * 60 * 60 * 1000);

    const spent = transactions
      .filter(
        (t) =>
          t.categoryId === budget.categoryId &&
          t.date >= startDate &&
          t.date <= Math.min(endDate, now)
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount) * 100;

    return {
      ...budget,
      spent,
      remaining,
      percentage: Math.min(percentage, 100),
    };
  };

  const budgetsWithSpending = budgets.map(calculateSpending);

  const handleOpenModal = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
      const date = new Date(budget.startDate);
      setFormData({
        categoryId: budget.categoryId,
        amount: budget.amount.toString(),
        period: budget.period,
        startDate: date.toISOString().split('T')[0],
      });
    } else {
      setEditingBudget(null);
      setFormData({
        categoryId: '',
        amount: '',
        period: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
      });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const startDate = new Date(formData.startDate).getTime();
      const budgetData = {
        categoryId: formData.categoryId,
        amount: parseFloat(formData.amount),
        period: formData.period,
        startDate,
        endDate: formData.period === 'monthly' 
          ? startDate + 30 * 24 * 60 * 60 * 1000 
          : startDate + 365 * 24 * 60 * 60 * 1000,
      };

      if (editingBudget) {
        await api.updateBudget(editingBudget.id, budgetData);
      } else {
        await api.createBudget(budgetData);
      }

      await loadData();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) {
      return;
    }

    try {
      await api.deleteBudget(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete budget:', error);
      alert('Failed to delete budget');
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 75) return 'bg-yellow-500';
    if (percentage < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600';
    if (percentage < 75) return 'text-yellow-600';
    if (percentage < 90) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 100) return 'Over Budget!';
    if (percentage >= 90) return 'Almost there';
    if (percentage >= 75) return 'On track';
    return 'Good progress';
  };

  // Calculate overall stats
  const totalBudgeted = budgetsWithSpending.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetsWithSpending.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overBudgetCount = budgetsWithSpending.filter((b) => b.percentage >= 100).length;

  const availableCategories = categories.filter(
    (cat) => !budgets.some((b) => b.categoryId === cat.id) || editingBudget?.categoryId === cat.id
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
            <p className="text-gray-600 mt-1">Track your spending against budgets</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton dataType="budgets" variant="secondary" />
            <Button onClick={() => handleOpenModal()} icon="➕">
              Add Budget
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Budgeted</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudgeted)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                🎯
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl">
                💸
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Remaining</p>
                <p className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalRemaining)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                💰
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Over Budget</p>
                <p className="text-2xl font-bold text-red-600">{overBudgetCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl">
                ⚠️
              </div>
            </div>
          </div>
        </div>

        {/* AI Budget Suggestions */}
        <div className="mb-8">
          <AIBudgetSuggestions
            categories={categories}
            transactions={transactions}
            existingBudgets={budgets.map(b => ({ categoryId: b.categoryId, amount: b.amount }))}
            onApplySuggestion={(categoryId, amount) => {
              setFormData({
                categoryId,
                amount: amount.toString(),
                period: 'monthly',
                startDate: new Date().toISOString().split('T')[0],
              });
              setIsModalOpen(true);
            }}
          />
        </div>

        {/* Budgets Grid */}
        {budgetsWithSpending.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No budgets yet</h3>
            <p className="text-gray-600 mb-6">Start managing your spending by creating your first budget</p>
            <Button onClick={() => handleOpenModal()}>Create Your First Budget</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {budgetsWithSpending.map((budget) => (
              <div
                key={budget.id}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{budget.category?.name || 'Unknown'}</h3>
                    <p className="text-sm text-gray-500 capitalize">{budget.period} budget</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(budget)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">
                      {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)}
                    </span>
                    <span className={`font-semibold ${getStatusColor(budget.percentage)}`}>
                      {budget.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${getProgressBarColor(budget.percentage)}`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Remaining</p>
                    <p className={`text-lg font-bold ${budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(budget.remaining)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className={`text-lg font-bold ${getStatusColor(budget.percentage)}`}>
                      {getStatusText(budget.percentage)}
                    </p>
                  </div>
                </div>

                {/* Over Budget Alert */}
                {budget.percentage >= 100 && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-lg">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-900">Over Budget</p>
                      <p className="text-xs text-red-700">
                        You've exceeded this budget by {formatCurrency(Math.abs(budget.remaining))}
                      </p>
                    </div>
                  </div>
                )}

                {/* Warning Alert */}
                {budget.percentage >= 90 && budget.percentage < 100 && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-lg">⚡</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-900">Almost There</p>
                      <p className="text-xs text-yellow-700">
                        You have {formatCurrency(budget.remaining)} left in this budget
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingBudget ? 'Edit Budget' : 'Create New Budget'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Select
              label="Category"
              required
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              options={availableCategories.map((cat) => ({
                value: cat.id,
                label: cat.name,
              }))}
              helperText={availableCategories.length === 0 ? "All categories already have budgets" : undefined}
            />

            <Input
              label="Budget Amount"
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              icon={<span className="text-gray-400">$</span>}
              helperText="How much do you want to budget for this category?"
            />

            <Select
              label="Budget Period"
              required
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              options={[
                { value: 'monthly', label: '📅 Monthly' },
                { value: 'yearly', label: '📆 Yearly' },
              ]}
              helperText="Monthly budgets reset each month, yearly budgets reset each year"
            />

            <Input
              label="Start Date"
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              helperText="When should this budget start?"
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving} className="flex-1">
                {editingBudget ? 'Save Changes' : 'Create Budget'}
              </Button>
            </div>
          </form>
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
