'use client';

import { useMemo } from 'react';

interface CreditScoreGaugeProps {
  score: number;
  scoreBand: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function CreditScoreGauge({ score, scoreBand, size = 'md', showLabel = true }: CreditScoreGaugeProps) {
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'sm':
        return { width: 160, height: 90, strokeWidth: 12, fontSize: 'text-2xl', labelSize: 'text-xs' };
      case 'lg':
        return { width: 280, height: 160, strokeWidth: 20, fontSize: 'text-5xl', labelSize: 'text-base' };
      default:
        return { width: 220, height: 130, strokeWidth: 16, fontSize: 'text-4xl', labelSize: 'text-sm' };
    }
  }, [size]);

  const bandConfig = useMemo(() => {
    switch (scoreBand) {
      case 'excellent':
        return { color: '#10b981', label: 'Excellent', description: 'Top tier credit' };
      case 'good':
        return { color: '#3b82f6', label: 'Good', description: 'Above average' };
      case 'fair':
        return { color: '#f59e0b', label: 'Fair', description: 'Room to improve' };
      case 'poor':
        return { color: '#f97316', label: 'Poor', description: 'Needs attention' };
      case 'very_poor':
        return { color: '#ef4444', label: 'Very Poor', description: 'Urgent improvement needed' };
    }
  }, [scoreBand]);

  // Calculate arc progress (0-999 score mapped to 0-1)
  const progress = score / 999;
  const { width, height, strokeWidth } = sizeConfig;
  const radius = (width - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - progress);

  // Arc path for semi-circle
  const arcPath = `M ${strokeWidth / 2} ${height} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width, height: height + 10 }}>
        <svg width={width} height={height + 10} className="transform -rotate-0">
          {/* Background arc */}
          <path
            d={arcPath}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Score arc with gradient */}
          <defs>
            <linearGradient id={`creditGradient-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path
            d={arcPath}
            fill="none"
            stroke={`url(#creditGradient-${score})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out'
            }}
          />
          {/* Score indicator dot */}
          <circle
            cx={width / 2 + Math.cos(Math.PI * (1 - progress)) * radius}
            cy={height - Math.sin(Math.PI * progress) * radius}
            r={strokeWidth / 2 + 2}
            fill={bandConfig.color}
            stroke="white"
            strokeWidth={3}
            style={{
              transition: 'cx 1s ease-in-out, cy 1s ease-in-out'
            }}
          />
        </svg>

        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className={`${sizeConfig.fontSize} font-bold`} style={{ color: bandConfig.color }}>
            {score}
          </span>
          {showLabel && (
            <>
              <span className={`${sizeConfig.labelSize} font-semibold text-gray-700`}>
                {bandConfig.label}
              </span>
              <span className="text-xs text-gray-500">out of 999</span>
            </>
          )}
        </div>
      </div>

      {/* Score band scale */}
      <div className="flex justify-between w-full px-2 mt-2">
        <div className="flex flex-col items-start">
          <span className="text-xs font-semibold text-red-500">0</span>
          <span className="text-[10px] text-gray-400">Very Poor</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-yellow-500">720</span>
          <span className="text-[10px] text-gray-400">Fair</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-green-500">999</span>
          <span className="text-[10px] text-gray-400">Excellent</span>
        </div>
      </div>
    </div>
  );
}
