'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import {
  AutoCategorizeButton,
  CategorySuggestionCard,
  BatchCategorizeButton,
  CategorizationStatsWidget,
} from '@/components/ai';

export default function AICategorizationDemoPage() {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleAutoCategorizeSuccess = (_categoryId: string, categoryName: string) => {
    setNotification({
      type: 'success',
      message: `✓ Successfully categorized as "${categoryName}"`,
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAutoCategorizeError = (error: string) => {
    setNotification({
      type: 'error',
      message: `✗ ${error}`,
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBatchSuccess = (results: { processed: number; applied: number }) => {
    setNotification({
      type: 'success',
      message: `✓ Processed ${results.processed} transactions. Applied ${results.applied} categories.`,
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAcceptSuggestion = () => {
    setNotification({
      type: 'success',
      message: '✓ Category suggestion accepted and applied!',
    });
    setShowSuggestion(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRejectSuggestion = () => {
    setNotification({
      type: 'error',
      message: 'Suggestion rejected. Please select a category manually.',
    });
    setShowSuggestion(false);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Categorization Demo</h1>
              <p className="text-gray-600 mt-1">
                Explore the AI-powered transaction categorization features
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span className="font-semibold">AI Powered</span>
            </div>
          </div>

          {/* Notification Toast */}
          {notification && (
            <div
              className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 ${
                notification.type === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {notification.type === 'success' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                <span className="font-medium">{notification.message}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Component Demos */}
            <div className="lg:col-span-2 space-y-6">
              {/* Auto-Categorize Button Demo */}
              <Card>
                <CardHeader>
                  <CardTitle>1. Auto-Categorize Button</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Single-click AI categorization for individual transactions
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">STARBUCKS #1234 SEATTLE WA</p>
                        <p className="text-sm text-gray-600">$5.47 • Oct 3, 2025</p>
                        <p className="text-xs text-red-600 mt-1">⚠ Uncategorized</p>
                      </div>
                      <AutoCategorizeButton
                        transactionId="demo-transaction-1"
                        onSuccess={handleAutoCategorizeSuccess}
                        onError={handleAutoCategorizeError}
                      />
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      How it works
                    </h4>
                    <ul className="text-sm text-indigo-800 space-y-1">
                      <li>• Analyzes transaction description with 200+ keywords</li>
                      <li>• Checks historical patterns for this merchant</li>
                      <li>• Auto-assigns if confidence ≥ 80%</li>
                      <li>• Suggests if confidence between 50-80%</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Category Suggestion Card Demo */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>2. Category Suggestion Card</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Interactive AI suggestions with confidence scores
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSuggestion(!showSuggestion)}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      {showSuggestion ? 'Hide' : 'Show'} Demo
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showSuggestion && (
                    <CategorySuggestionCard
                      categoryName="Dining & Restaurants"
                      confidence={0.87}
                      reasoning="Your transaction at STARBUCKS matches the Dining & Restaurants category. You've categorized similar purchases here 12 times before."
                      matchedKeywords={['starbucks', 'coffee', 'cafe']}
                      onAccept={handleAcceptSuggestion}
                      onReject={handleRejectSuggestion}
                    />
                  )}

                  {!showSuggestion && (
                    <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                      <svg
                        className="w-12 h-12 text-gray-400 mx-auto mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                        />
                      </svg>
                      <p className="text-gray-600">Click "Show Demo" to see an AI suggestion</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Batch Categorize Demo */}
              <Card>
                <CardHeader>
                  <CardTitle>3. Batch Categorization</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Process multiple transactions at once
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-700">AMAZON.COM*1234 - $24.99</span>
                        <span className="text-xs text-red-600">Uncategorized</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-700">SHELL GAS STATION - $45.00</span>
                        <span className="text-xs text-red-600">Uncategorized</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-700">NETFLIX.COM - $15.99</span>
                        <span className="text-xs text-red-600">Uncategorized</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <BatchCategorizeButton
                      autoApply={true}
                      onSuccess={handleBatchSuccess}
                      onError={handleAutoCategorizeError}
                      className="flex-1"
                    />
                    <BatchCategorizeButton
                      autoApply={false}
                      onSuccess={handleBatchSuccess}
                      onError={handleAutoCategorizeError}
                      className="flex-1"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">Tip:</span> Use "Auto-Categorize All" for high
                      confidence transactions, or "Get Suggestions" to review each one.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Integration Guide */}
              <Card>
                <CardHeader>
                  <CardTitle>Integration Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Quick Start</h4>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`import {
  AutoCategorizeButton,
  CategorySuggestionCard,
  BatchCategorizeButton,
  CategorizationStatsWidget
} from '@/components/ai';

// Single transaction
<AutoCategorizeButton
  transactionId={transaction.id}
  onSuccess={(categoryId, name) => {
    // Update UI
  }}
/>

// Batch processing
<BatchCategorizeButton
  transactionIds={selectedIds}
  autoApply={true}
  onSuccess={(results) => {
    // Show summary
  }}
/>`}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Features</h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Keyword matching with 200+ merchant patterns</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Historical learning from user corrections</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Confidence-based auto-assignment</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Batch processing for efficiency</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Stats Widget */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <CategorizationStatsWidget />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
