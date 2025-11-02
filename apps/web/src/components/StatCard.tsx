'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  variant?: 'primary' | 'success' | 'error' | 'warning';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'primary',
  trend,
  className = ''
}: StatCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'stat-card-primary';
      case 'success':
        return 'stat-card-success';
      case 'error':
        return 'stat-card-error';
      case 'warning':
        return 'stat-card-warning';
      default:
        return 'card-hover';
    }
  };

  const getTextColor = () => {
    return variant === 'primary' ? 'text-white' : 'text-gray-900';
  };

  const getSubtitleColor = () => {
    return variant === 'primary' ? 'text-white/80' : 'text-gray-500';
  };

  return (
    <div className={`${getVariantClasses()} p-6 transition-all duration-200 ${className}`}>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <p className={`text-xs uppercase font-medium tracking-wider ${
          variant === 'primary' ? 'text-white/70' : 'text-gray-500'
        }`}>
          {title}
        </p>
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
          variant === 'primary' 
            ? 'bg-white/20' 
            : variant === 'success'
            ? 'bg-success-50'
            : variant === 'error'
            ? 'bg-error-50'
            : variant === 'warning'
            ? 'bg-warning-50'
            : 'bg-gray-50'
        }`}>
          {icon}
        </div>
      </div>

      {/* Value Section */}
      <div className="mb-4">
        <p className={`text-currency-xl tabular-nums ${getTextColor()}`}>
          {value}
        </p>
      </div>

      {/* Footer Section */}
      <div className="flex items-center justify-between">
        {subtitle && (
          <p className={`text-sm ${getSubtitleColor()}`}>
            {subtitle}
          </p>
        )}
        
        {trend && (
          <div className={`flex items-center text-sm font-medium ${
            trend.direction === 'up' 
              ? variant === 'primary' ? 'text-white/90' : 'text-success-600'
              : variant === 'primary' ? 'text-white/90' : 'text-error-600'
          }`}>
            <span className="mr-1">
              {trend.direction === 'up' ? '↗' : '↘'}
            </span>
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;