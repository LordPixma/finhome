'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui';
import {
  ChartBarIcon,
  BellAlertIcon,
  ShieldCheckIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

export default function CreditScorePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="max-w-2xl mx-auto text-center px-6">
            {/* Icon */}
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center border-4 border-blue-200">
                <ChartBarIcon className="w-12 h-12 text-blue-600" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Credit Score Tracking
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Coming Soon! 🚀
            </p>

            {/* Description */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200 mb-8">
              <p className="text-gray-700 mb-6 leading-relaxed">
                We're working on an exciting new feature that will help you monitor and improve your credit score directly from Finhome360.
              </p>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3 bg-white rounded-lg p-4 border border-blue-100">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ChartBarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Real-time Monitoring</h3>
                    <p className="text-sm text-gray-600">Track your credit score changes in real-time</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white rounded-lg p-4 border border-blue-100">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BellAlertIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Smart Alerts</h3>
                    <p className="text-sm text-gray-600">Get notified of significant changes</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white rounded-lg p-4 border border-blue-100">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Improvement Tips</h3>
                    <p className="text-sm text-gray-600">Personalized recommendations to boost your score</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white rounded-lg p-4 border border-blue-100">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCardIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Credit Report Access</h3>
                    <p className="text-sm text-gray-600">View detailed credit reports and history</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-gray-500">
                Want early access? Let us know!
              </p>
              <Button
                onClick={() => window.location.href = 'mailto:support@finhome360.com?subject=Early%20Access%20to%20Credit%20Score%20Feature'}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Request Early Access
              </Button>
            </div>

            {/* Timeline */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Expected Launch: <span className="font-semibold text-gray-700">Q2 2025</span>
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
