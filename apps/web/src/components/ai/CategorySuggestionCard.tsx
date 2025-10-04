'use client';

import { Card, CardContent } from '../Card';

interface CategorySuggestionCardProps {
  categoryName: string;
  confidence: number;
  reasoning: string;
  matchedKeywords: string[];
  onAccept?: () => void;
  onReject?: () => void;
  loading?: boolean;
}

export function CategorySuggestionCard({
  categoryName,
  confidence,
  reasoning,
  matchedKeywords,
  onAccept,
  onReject,
  loading = false,
}: CategorySuggestionCardProps) {
  const confidencePercent = Math.round(confidence * 100);
  
  // Color coding based on confidence level
  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceBadge = () => {
    if (confidence >= 0.8) return { text: 'High Confidence', color: 'bg-green-500' };
    if (confidence >= 0.5) return { text: 'Medium Confidence', color: 'bg-yellow-500' };
    return { text: 'Low Confidence', color: 'bg-red-500' };
  };

  const badge = getConfidenceBadge();

  return (
    <Card className={`border-2 transition-all duration-200 hover:shadow-lg ${getConfidenceColor()}`}>
      <CardContent>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900">AI Suggestion</h4>
                <p className="text-sm text-gray-600">Category recommendation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${badge.color}`}>
                {badge.text}
              </span>
            </div>
          </div>

          {/* Suggested Category */}
          <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Suggested Category:</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      confidence >= 0.8 ? 'bg-green-500' : confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700">{confidencePercent}%</span>
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{categoryName}</p>
          </div>

          {/* Reasoning */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Why this category?</p>
                <p className="text-sm text-gray-600">{reasoning}</p>
              </div>
            </div>
          </div>

          {/* Matched Keywords */}
          {matchedKeywords.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Matched Keywords:</p>
              <div className="flex flex-wrap gap-2">
                {matchedKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onAccept}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Applying...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Accept Suggestion
                </>
              )}
            </button>
            <button
              onClick={onReject}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Choose Different
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
