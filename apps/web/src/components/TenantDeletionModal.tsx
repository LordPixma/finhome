'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';

interface TenantDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantName: string;
}

interface DeletionStep {
  id: number;
  title: string;
  description: string;
  confirmation: string;
  userInput: string;
  completed: boolean;
}

export default function TenantDeletionModal({ isOpen, onClose, tenantName }: TenantDeletionModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [deletionResult, setDeletionResult] = useState<any>(null);

  const [steps, setSteps] = useState<DeletionStep[]>([
    {
      id: 1,
      title: 'Confirm Data Loss',
      description: 'All your financial data will be permanently deleted, including transactions, accounts, budgets, and goals.',
      confirmation: 'DELETE_ALL_DATA',
      userInput: '',
      completed: false,
    },
    {
      id: 2,
      title: 'Acknowledge Irreversibility',
      description: 'This action cannot be undone. Once deleted, your tenant and all associated data will be lost forever.',
      confirmation: 'CANNOT_BE_UNDONE',
      userInput: '',
      completed: false,
    },
    {
      id: 3,
      title: 'Final Confirmation',
      description: 'I understand the consequences and want to proceed with deleting my tenant.',
      confirmation: 'I_UNDERSTAND',
      userInput: '',
      completed: false,
    },
  ]);

  const handleInputChange = (stepId: number, value: string) => {
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId
          ? { ...step, userInput: value, completed: value === step.confirmation }
          : step
      )
    );
    setError('');
  };

  const handleNext = () => {
    const currentStepData = steps[currentStep - 1];
    if (currentStepData.completed) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      setError(`Please type "${currentStepData.confirmation}" exactly to continue.`);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDelete = async () => {
    const allCompleted = steps.every(step => step.completed);
    if (!allCompleted) {
      setError('Please complete all confirmation steps.');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const confirmations = steps.map(step => step.confirmation);
      const response = await api.deleteTenant(confirmations);

      if (response.success) {
        setDeletionResult(response.data);
        // Redirect to landing page after successful deletion
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        setError(response.error?.message || 'Failed to delete tenant');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete tenant');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      // Reset state
      setCurrentStep(1);
      setError('');
      setDeletionResult(null);
      setSteps(prevSteps =>
        prevSteps.map(step => ({ ...step, userInput: '', completed: false }))
      );
      onClose();
    }
  };

  if (!isOpen) return null;

  if (deletionResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tenant Deleted Successfully</h2>
          <p className="text-gray-600 mb-6">
            Your tenant "{tenantName}" has been permanently deleted.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Deleted Data:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• {deletionResult.deletedData.transactions} transactions</li>
              <li>• {deletionResult.deletedData.accounts} accounts</li>
              <li>• {deletionResult.deletedData.categories} categories</li>
              <li>• {deletionResult.deletedData.goals} goals</li>
              <li>• {deletionResult.deletedData.budgets} budgets</li>
              <li>• {deletionResult.deletedData.members} members</li>
            </ul>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Redirecting to home page in a few seconds...
          </p>
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep - 1];
  const allStepsCompleted = steps.every(step => step.completed);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-red-50 px-8 py-6 border-b border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⚠️</div>
              <div>
                <h2 className="text-2xl font-bold text-red-900">Delete Tenant</h2>
                <p className="text-red-700">This action is permanent and cannot be undone</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 text-2xl font-bold disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.completed
                        ? 'bg-red-600 text-white'
                        : currentStep === step.id
                        ? 'bg-red-100 text-red-600 border-2 border-red-600'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.completed ? '✓' : step.id}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        step.completed ? 'bg-red-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Step {currentStep} of {steps.length}: {currentStepData.title}
              </p>
            </div>
          </div>

          {/* Current Step */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {currentStepData.title}
            </h3>
            <p className="text-gray-700 mb-6">{currentStepData.description}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type "{currentStepData.confirmation}" to confirm:
                </label>
                <input
                  type="text"
                  value={currentStepData.userInput}
                  onChange={(e) => handleInputChange(currentStepData.id, e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg font-mono text-sm ${
                    currentStepData.userInput === currentStepData.confirmation
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : currentStepData.userInput.length > 0
                      ? 'border-red-500 bg-red-50 text-red-800'
                      : 'border-gray-300'
                  }`}
                  placeholder={currentStepData.confirmation}
                  disabled={isDeleting}
                />
              </div>

              {currentStepData.completed && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <span>✓</span>
                  Confirmation completed
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold">!</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Warning Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <span className="text-yellow-600 text-xl">⚠️</span>
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">
                  What will be deleted:
                </h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• All financial transactions and account data</li>
                  <li>• All budgets, goals, and bill reminders</li>
                  <li>• All categories and recurring transactions</li>
                  <li>• All tenant members and their settings</li>
                  <li>• The entire tenant "{tenantName}"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-4">
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button
                  onClick={handlePrevious}
                  variant="secondary"
                  disabled={isDeleting}
                >
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleClose} variant="secondary" disabled={isDeleting}>
                Cancel
              </Button>

              {currentStep < 3 ? (
                <Button
                  onClick={handleNext}
                  variant="primary"
                  disabled={!currentStepData.completed || isDeleting}
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={!allStepsCompleted}
                  isLoading={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Tenant Forever'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}