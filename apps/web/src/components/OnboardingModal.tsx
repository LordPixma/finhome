'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui';
import { 
  ChevronRightIcon, 
  ChevronLeftIcon, 
  CheckIcon,
  CurrencyDollarIcon,
  TagIcon,
  CalendarIcon,
  BellIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface OnboardingData {
  account: {
    name: string;
    type: string;
    balance: string;
    currency: string;
  };
  goals: Array<{
    name: string;
    targetAmount: string;
    deadline: string;
    description: string;
  }>;
  bills: Array<{
    name: string;
    amount: string;
    dueDay: string;
    frequency: string;
    categoryId: string;
  }>;
  preferences: {
    currency: string;
    currencySymbol: string;
    dateFormat: string;
    reminderDays: string;
  };
}

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Finhome360!',
    description: 'Let\'s get you set up with everything you need to manage your finances effectively.',
    icon: HomeIcon,
  },
  {
    id: 'account',
    title: 'Add Your First Account',
    description: 'Start by adding your main bank account to track your balance.',
    icon: CurrencyDollarIcon,
  },
  {
    id: 'categories',
    title: 'Set Up Categories',
    description: 'We\'ll create some default spending categories for you.',
    icon: TagIcon,
  },
  {
    id: 'goals',
    title: 'Financial Goals',
    description: 'Set savings goals to track your financial progress.',
    icon: CalendarIcon,
  },
  {
    id: 'bills',
    title: 'Bill Reminders',
    description: 'Never miss a payment with automated bill reminders.',
    icon: BellIcon,
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Your Finhome360 account is ready. Start managing your finances!',
    icon: CheckIcon,
  },
];

const DEFAULT_CATEGORIES = [
  { name: 'Groceries', type: 'expense', color: '#10b981', icon: '🛒' },
  { name: 'Transport', type: 'expense', color: '#3b82f6', icon: '🚗' },
  { name: 'Utilities', type: 'expense', color: '#f59e0b', icon: '⚡' },
  { name: 'Entertainment', type: 'expense', color: '#ec4899', icon: '🎬' },
  { name: 'Healthcare', type: 'expense', color: '#ef4444', icon: '🏥' },
  { name: 'Dining Out', type: 'expense', color: '#8b5cf6', icon: '🍽️' },
  { name: 'Shopping', type: 'expense', color: '#06b6d4', icon: '🛍️' },
  { name: 'Salary', type: 'income', color: '#22c55e', icon: '💰' },
  { name: 'Investment', type: 'income', color: '#16a34a', icon: '📈' },
];

export default function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    account: {
      name: '',
      type: 'current',
      balance: '',
      currency: 'GBP',
    },
    goals: [],
    bills: [],
    preferences: {
      currency: 'GBP',
      currencySymbol: '£',
      dateFormat: 'DD/MM/YYYY',
      reminderDays: '3',
    },
  });

  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = async () => {
    if (currentStep === ONBOARDING_STEPS.length - 2) {
      // Second to last step - complete onboarding
      await completeOnboarding();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, ONBOARDING_STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      // Create the account (authorized, via API client)
      if (data.account.name && data.account.balance) {
        await api.createAccount({
          name: data.account.name,
          type: data.account.type,
          balance: data.account.balance === '' ? 0 : parseFloat(data.account.balance),
          currency: data.account.currency,
        });
      }

      // Create default categories
      for (const category of DEFAULT_CATEGORIES) {
        await api.createCategory(category as any);
      }

      // Create goals
      for (const goal of data.goals) {
        if (goal.name && goal.targetAmount) {
          await api.createGoal({
            name: goal.name,
            description: goal.description,
            targetAmount: parseFloat(goal.targetAmount),
            deadline: goal.deadline ? new Date(goal.deadline) : null,
            color: '#3b82f6',
            icon: '🎯',
          });
        }
      }

      // Create bill reminders
      for (const bill of data.bills) {
        if (bill.name && bill.amount) {
          const nextDueDate = new Date();
          nextDueDate.setDate(parseInt(bill.dueDay));
          if (nextDueDate < new Date()) {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          }
          await api.createBillReminder({
            name: bill.name,
            amount: parseFloat(bill.amount),
            categoryId: bill.categoryId,
            dueDate: nextDueDate,
            frequency: bill.frequency,
            reminderDays: parseInt(data.preferences.reminderDays),
            status: 'pending',
          });
        }
      }

      // Update user preferences and mark onboarding as complete
      await api.updateSettings({
        ...data.preferences,
        onboardingComplete: true,
      });

      setCurrentStep(ONBOARDING_STEPS.length - 1);
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('There was an error setting up your account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addGoal = () => {
    setData(prev => ({
      ...prev,
      goals: [
        ...prev.goals,
        { name: '', targetAmount: '', deadline: '', description: '' },
      ],
    }));
  };

  const addBill = () => {
    setData(prev => ({
      ...prev,
      bills: [
        ...prev.bills,
        { name: '', amount: '', dueDay: '1', frequency: 'monthly', categoryId: '' },
      ],
    }));
  };

  const updateGoal = (index: number, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.map((goal, i) => 
        i === index ? { ...goal, [field]: value } : goal
      ),
    }));
  };

  const updateBill = (index: number, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      bills: prev.bills.map((bill, i) => 
        i === index ? { ...bill, [field]: value } : bill
      ),
    }));
  };

  const renderStepContent = () => {
    const step = ONBOARDING_STEPS[currentStep];

    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <HomeIcon className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Finhome360!</h2>
            <p className="text-gray-600 mb-6">
              We'll help you set up your financial management system in just a few steps. 
              This should take about 3-5 minutes.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-green-500" />
                Add your first account
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-green-500" />
                Set up categories
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-green-500" />
                Create financial goals
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-green-500" />
                Set up bill reminders
              </div>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="py-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Add Your First Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Main Current Account"
                  value={data.account.name}
                  onChange={(e) => setData(prev => ({ ...prev, account: { ...prev.account, name: e.target.value } }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={data.account.type}
                  onChange={(e) => setData(prev => ({ ...prev, account: { ...prev.account, type: e.target.value } }))}
                >
                  <option value="current">🏦 Current Account</option>
                  <option value="savings">💰 Savings</option>
                  <option value="credit">💳 Credit Card</option>
                  <option value="cash">💵 Cash</option>
                  <option value="investment">📈 Investment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  value={data.account.balance}
                  onChange={(e) => setData(prev => ({ ...prev, account: { ...prev.account, balance: e.target.value } }))}
                />
              </div>
            </div>
          </div>
        );

      case 'categories':
        return (
          <div className="py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <TagIcon className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Default Categories</h2>
            <p className="text-gray-600 text-center mb-6">
              We'll create these essential categories to help you organize your transactions.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {DEFAULT_CATEGORIES.map((category) => (
                <div key={category.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{category.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    category.type === 'income' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {category.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className="py-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Financial Goals</h2>
            <p className="text-gray-600 text-center mb-6">
              Set up savings goals to track your financial progress. You can add or modify these later.
            </p>
            
            {data.goals.map((goal, index) => (
              <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Goal name (e.g., Emergency Fund)"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={goal.name}
                    onChange={(e) => updateGoal(index, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Target amount"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={goal.targetAmount}
                    onChange={(e) => updateGoal(index, 'targetAmount', e.target.value)}
                  />
                  <input
                    type="date"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={goal.deadline}
                    onChange={(e) => updateGoal(index, 'deadline', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={goal.description}
                    onChange={(e) => updateGoal(index, 'description', e.target.value)}
                  />
                </div>
              </div>
            ))}
            
            <button
              onClick={addGoal}
              className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors"
            >
              + Add Financial Goal
            </button>
          </div>
        );

      case 'bills':
        return (
          <div className="py-6">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BellIcon className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Bill Reminders</h2>
            <p className="text-gray-600 text-center mb-6">
              Set up recurring bill reminders so you never miss a payment.
            </p>
            
            {data.bills.map((bill, index) => (
              <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Bill name (e.g., Electricity)"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={bill.name}
                    onChange={(e) => updateBill(index, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={bill.amount}
                    onChange={(e) => updateBill(index, 'amount', e.target.value)}
                  />
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={bill.dueDay}
                    onChange={(e) => updateBill(index, 'dueDay', e.target.value)}
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                    ))}
                  </select>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={bill.frequency}
                    onChange={(e) => updateBill(index, 'frequency', e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            ))}
            
            <button
              onClick={addBill}
              className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-500 hover:text-orange-600 transition-colors"
            >
              + Add Bill Reminder
            </button>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckIcon className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">You're All Set!</h2>
            <p className="text-gray-600 mb-6">
              Your Finhome360 account has been configured with your preferences. 
              You can always modify these settings later.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg text-left">
              <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Start adding transactions or import bank statements</li>
                <li>• Review and adjust your categories</li>
                <li>• Set up budgets for your spending categories</li>
                <li>• Track progress toward your financial goals</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to Finhome" size="lg">
      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / ONBOARDING_STEPS.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-4 py-2 rounded-md ${
              isFirstStep 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Previous
          </button>

          <button
            onClick={isLastStep ? onComplete : handleNext}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              'Setting up...'
            ) : isLastStep ? (
              'Start Using Finhome360'
            ) : (
              <>
                {currentStep === ONBOARDING_STEPS.length - 2 ? 'Complete Setup' : 'Continue'}
                <ChevronRightIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}