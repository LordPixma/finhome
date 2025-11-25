'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

interface GoalProgressTrackerProps {
  goal: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    color: string;
    icon: string;
  };
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function GoalProgressTracker({ goal, showDetails = true, size = 'md' }: GoalProgressTrackerProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const progressPercent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const remaining = goal.targetAmount - goal.currentAmount;
  const isCompleted = goal.currentAmount >= goal.targetAmount;

  // Animate progress on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progressPercent);
    }, 100);
    return () => clearTimeout(timer);
  }, [progressPercent]);

  // Calculate days remaining
  const daysRemaining = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Size configurations
  const sizeConfig = {
    sm: { height: 'h-2', text: 'text-xs', icon: 'text-lg', padding: 'p-3' },
    md: { height: 'h-3', text: 'text-sm', icon: 'text-2xl', padding: 'p-4' },
    lg: { height: 'h-4', text: 'text-base', icon: 'text-3xl', padding: 'p-6' },
  };

  const config = sizeConfig[size];

  // Milestone markers
  const milestones = [25, 50, 75, 100];

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${config.padding} transition-all hover:shadow-xl`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-md"
            style={{ backgroundColor: `${goal.color}20` }}
          >
            <span className={config.icon}>{goal.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{goal.name}</h3>
            {daysRemaining !== null && (
              <p className={`${config.text} text-gray-500`}>
                {daysRemaining > 0 ? (
                  <>
                    {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                  </>
                ) : daysRemaining === 0 ? (
                  'Due today'
                ) : (
                  <span className="text-red-600">{Math.abs(daysRemaining)} days overdue</span>
                )}
              </p>
            )}
          </div>
        </div>
        {isCompleted && (
          <div className="flex-shrink-0 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold animate-bounce">
            Completed! 🎉
          </div>
        )}
      </div>

      {/* Progress Bar with Milestones */}
      <div className="relative mb-3">
        {/* Milestone markers */}
        <div className="absolute -top-6 left-0 right-0 flex justify-between px-1">
          {milestones.map((milestone) => (
            <div
              key={milestone}
              className={`flex flex-col items-center transition-all duration-300 ${
                progressPercent >= milestone ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <span className={`${config.text} font-semibold ${
                progressPercent >= milestone ? 'text-green-600' : 'text-gray-400'
              }`}>
                {milestone}%
              </span>
              {progressPercent >= milestone && (
                <div className="mt-1 text-green-600">✓</div>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar background */}
        <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${config.height} mt-6`}>
          {/* Animated progress fill */}
          <div
            className={`${config.height} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
            style={{
              width: `${animatedProgress}%`,
              backgroundColor: goal.color,
            }}
          >
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 -translate-x-full animate-shimmer"
              style={{
                backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shimmer 2s infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      {showDetails && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className={`${config.text} text-gray-500 mb-1`}>Current</p>
            <p className="font-semibold text-gray-900">{formatCurrency(goal.currentAmount)}</p>
          </div>
          <div>
            <p className={`${config.text} text-gray-500 mb-1`}>Target</p>
            <p className="font-semibold text-gray-900">{formatCurrency(goal.targetAmount)}</p>
          </div>
          <div>
            <p className={`${config.text} text-gray-500 mb-1`}>Remaining</p>
            <p className={`font-semibold ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {remaining > 0 ? formatCurrency(remaining) : 'Goal Met!'}
            </p>
          </div>
        </div>
      )}

      {/* Progress percentage badge */}
      <div className="mt-4 flex items-center justify-between">
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: `${goal.color}20`,
            color: goal.color,
          }}
        >
          {progressPercent.toFixed(1)}% Complete
        </div>
        {!isCompleted && progressPercent > 0 && (
          <p className={`${config.text} text-gray-500`}>
            {progressPercent >= 75 ? "Almost there! 💪" : progressPercent >= 50 ? "Halfway there! 🎯" : progressPercent >= 25 ? "Great start! 🚀" : "Keep going! 💫"}
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
}
