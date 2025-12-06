'use client';

import {
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

interface ImprovementTipsCardProps {
  riskFactors: string[];
  positiveFactors: string[];
  improvementTips: string[];
}

export function ImprovementTipsCard({ riskFactors, positiveFactors, improvementTips }: ImprovementTipsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Score Analysis</h3>

      <div className="space-y-6">
        {/* Positive Factors */}
        {positiveFactors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-green-100">
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
              </div>
              <h4 className="font-medium text-green-700">Working in Your Favour</h4>
            </div>
            <ul className="space-y-2">
              {positiveFactors.map((factor, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk Factors */}
        {riskFactors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-red-100">
                <ExclamationCircleIcon className="w-4 h-4 text-red-600" />
              </div>
              <h4 className="font-medium text-red-700">Areas of Concern</h4>
            </div>
            <ul className="space-y-2">
              {riskFactors.map((factor, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-2" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvement Tips */}
        {improvementTips.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-100">
                <LightBulbIcon className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="font-medium text-blue-700">How to Improve</h4>
            </div>
            <ul className="space-y-3">
              {improvementTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty State */}
        {positiveFactors.length === 0 && riskFactors.length === 0 && improvementTips.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <LightBulbIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Calculate your credit score to see personalised insights</p>
          </div>
        )}
      </div>
    </div>
  );
}
