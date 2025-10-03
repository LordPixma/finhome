'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Modal, Input, Select, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  accountId?: string;
  status: 'active' | 'completed' | 'abandoned';
  color: string;
  icon: string;
  accountName?: string;
}

interface Account {
  id: string;
  name: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contributionModal, setContributionModal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    currentAmount: '0',
    deadline: '',
    accountId: '',
    status: 'active' as Goal['status'],
    color: '#3B82F6',
    icon: '🎯',
  });
  const [contributionData, setContributionData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const GOAL_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  const GOAL_ICONS = ['🎯', '💰', '🏠', '🚗', '✈️', '🎓', '💍', '🏖️', '📱', '💻'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [goalsRes, accountsRes] = await Promise.all([
        api.getGoals() as any,
        api.getAccounts() as any,
      ]);

      if (goalsRes.success) setGoals(goalsRes.data);
      if (accountsRes.success) setAccounts(accountsRes.data);
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
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount),
      deadline: formData.deadline || undefined,
      accountId: formData.accountId || undefined,
    };

    try {
      if (editing) {
        const res = await api.updateGoal(editing.id, data) as any;
        if (res.success) {
          await loadData();
          setIsModalOpen(false);
          resetForm();
        }
      } else {
        const res = await api.createGoal(data) as any;
        if (res.success) {
          await loadData();
          setIsModalOpen(false);
          resetForm();
        }
      }
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  const handleContributionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionModal) return;

    const data = {
      amount: parseFloat(contributionData.amount),
      date: contributionData.date,
      notes: contributionData.notes || undefined,
    };

    try {
      const res = await api.addGoalContribution(contributionModal.id, data) as any;
      if (res.success) {
        await loadData();
        setContributionModal(null);
        setContributionData({
          amount: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
        });
      }
    } catch (error) {
      console.error('Failed to add contribution:', error);
    }
  };

  const handleEdit = (item: Goal) => {
    setEditing(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      targetAmount: item.targetAmount.toString(),
      currentAmount: item.currentAmount.toString(),
      deadline: item.deadline ? item.deadline.split('T')[0] : '',
      accountId: item.accountId || '',
      status: item.status,
      color: item.color,
      icon: item.icon,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal? This will also delete all contributions.')) return;

    try {
      const res = await api.deleteGoal(id) as any;
      if (res.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      name: '',
      description: '',
      targetAmount: '',
      currentAmount: '0',
      deadline: '',
      accountId: '',
      status: 'active',
      color: '#3B82F6',
      icon: '🎯',
    });
  };

  const getProgressPercentage = (goal: Goal) => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Goals & Savings</h1>
              <p className="text-gray-600 mt-1">Track your financial goals and progress</p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              icon="🎯"
            >
              Add Goal
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : goals.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No goals yet</h3>
              <p className="text-gray-600 mb-6">Start tracking your savings goals and watch your progress</p>
              <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>Create Your First Goal</Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => {
                const progress = getProgressPercentage(goal);
                return (
                  <div
                    key={goal.id}
                    className="bg-white rounded-xl shadow-lg border-2 p-6 hover:shadow-xl transition-shadow"
                    style={{ borderColor: goal.color }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-sm"
                        style={{ backgroundColor: `${goal.color}20` }}
                      >
                        {goal.icon}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(goal)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">{goal.name}</h3>
                    {goal.description && (
                      <p className="text-sm text-gray-600 mb-4">{goal.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-bold" style={{ color: goal.color }}>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%`, backgroundColor: goal.color }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-gray-900">{formatCurrency(goal.currentAmount)}</span>
                        <span className="text-gray-600">{formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </div>

                    {goal.deadline && (
                      <p className="text-xs text-gray-500 mb-4">
                        📅 Target: {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    )}

                    {goal.status === 'completed' && (
                      <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium text-center mb-4">
                        ✅ Goal Completed!
                      </div>
                    )}

                    <Button
                      onClick={() => setContributionModal(goal)}
                      variant="secondary"
                      className="w-full"
                      disabled={goal.status !== 'active'}
                    >
                      Add Contribution
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add/Edit Goal Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title={editing ? 'Edit Goal' : 'Add Goal'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Goal Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Emergency Fund"
              required
            />

            <Input
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of your goal"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Target Amount"
                type="number"
                step="0.01"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                required
              />

              <Input
                label="Current Amount"
                type="number"
                step="0.01"
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Deadline (Optional)"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />

              <Select
                label="Linked Account (Optional)"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                options={[
                  { value: '', label: 'None' },
                  ...accounts.map((acc) => ({
                    value: acc.id,
                    label: acc.name,
                  })),
                ]}
              />
            </div>

            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              required
              options={[
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'abandoned', label: 'Abandoned' },
              ]}
            />

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2">
                {GOAL_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      formData.color === color
                        ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
              <div className="flex gap-2">
                {GOAL_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-12 h-12 rounded-lg text-2xl flex items-center justify-center transition-all ${
                      formData.icon === icon
                        ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                        : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

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

        {/* Add Contribution Modal */}
        <Modal
          isOpen={!!contributionModal}
          onClose={() => {
            setContributionModal(null);
            setContributionData({
              amount: '',
              date: new Date().toISOString().split('T')[0],
              notes: '',
            });
          }}
          title={`Add Contribution to ${contributionModal?.name}`}
        >
          <form onSubmit={handleContributionSubmit} className="space-y-4">
            <Input
              label="Contribution Amount"
              type="number"
              step="0.01"
              value={contributionData.amount}
              onChange={(e) => setContributionData({ ...contributionData, amount: e.target.value })}
              required
            />

            <Input
              label="Date"
              type="date"
              value={contributionData.date}
              onChange={(e) => setContributionData({ ...contributionData, date: e.target.value })}
              required
            />

            <Input
              label="Notes (Optional)"
              value={contributionData.notes}
              onChange={(e) => setContributionData({ ...contributionData, notes: e.target.value })}
              placeholder="e.g., Monthly savings"
            />

            <div className="flex gap-2 pt-4">
              <Button type="submit">Add Contribution</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setContributionModal(null)}
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
