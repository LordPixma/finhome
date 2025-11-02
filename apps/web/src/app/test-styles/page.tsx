'use client';

import { PlusIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function TestStyles() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Style Test Page</h1>
        
        {/* Test Professional Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button className="group relative overflow-hidden p-6 bg-white hover:bg-gradient-to-br hover:from-primary-50 hover:to-primary-100/60 rounded-2xl border border-gray-200 hover:border-primary-300 transition-all duration-300 hover:-translate-y-2 shadow-sm hover:shadow-xl text-left">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-gradient-to-br from-primary-100 to-primary-200 group-hover:from-primary-200 group-hover:to-primary-300 rounded-2xl transition-all duration-300 shadow-sm group-hover:shadow-md">
                  <PlusIcon className="w-8 h-8 text-primary-600 group-hover:text-primary-700 transition-colors" />
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">Add Transaction</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Record a new income or expense transaction quickly</p>
              <div className="mt-4 text-xs text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Click to get started →
              </div>
            </div>
          </button>

          <button className="group relative overflow-hidden p-6 bg-white hover:bg-gradient-to-br hover:from-success-50 hover:to-success-100/60 rounded-2xl border border-gray-200 hover:border-success-300 transition-all duration-300 hover:-translate-y-2 shadow-sm hover:shadow-xl text-left">
            <div className="absolute top-0 right-0 w-20 h-20 bg-success-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-gradient-to-br from-success-100 to-success-200 group-hover:from-success-200 group-hover:to-success-300 rounded-2xl transition-all duration-300 shadow-sm group-hover:shadow-md">
                  <ChartBarIcon className="w-8 h-8 text-success-600 group-hover:text-success-700 transition-colors" />
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">View Reports</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Analyze your spending patterns and insights</p>
              <div className="mt-4 text-xs text-success-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Click to get started →
              </div>
            </div>
          </button>
        </div>

        {/* Test StatCard styling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat-card-primary p-6 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase font-medium tracking-wider text-white/70">
                Total Balance
              </p>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
                <PlusIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mb-4">
              <p className="text-3xl font-bold font-mono text-white">
                $12,345.67
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/80">
                3 accounts
              </p>
            </div>
          </div>

          <div className="stat-card-success p-6 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase font-medium tracking-wider text-gray-500">
                Income
              </p>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-success-50">
                <ChartBarIcon className="w-6 h-6 text-success-600" />
              </div>
            </div>
            <div className="mb-4">
              <p className="text-3xl font-bold font-mono text-gray-900">
                $5,432.10
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Last 30 days
              </p>
            </div>
          </div>
        </div>

        {/* Color Tests */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Color Tests</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-primary-500 text-white rounded-lg">Primary 500</div>
            <div className="p-4 bg-success-500 text-white rounded-lg">Success 500</div>
            <div className="p-4 bg-error-500 text-white rounded-lg">Error 500</div>
            <div className="p-4 bg-warning-500 text-white rounded-lg">Warning 500</div>
            <div className="p-4 bg-purple-500 text-white rounded-lg">Purple 500</div>
            <div className="p-4 bg-primary-100 text-primary-900 rounded-lg">Primary 100</div>
            <div className="p-4 bg-success-100 text-success-900 rounded-lg">Success 100</div>
            <div className="p-4 bg-error-100 text-error-900 rounded-lg">Error 100</div>
          </div>
        </div>

        {/* Shadow Tests */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Shadow Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-xl shadow-card">
              <h3 className="font-semibold mb-2">shadow-card</h3>
              <p className="text-gray-600">Basic card shadow</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-card-hover">
              <h3 className="font-semibold mb-2">shadow-card-hover</h3>
              <p className="text-gray-600">Enhanced hover shadow</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-lg">
              <h3 className="font-semibold mb-2">shadow-lg</h3>
              <p className="text-gray-600">Tailwind large shadow</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}