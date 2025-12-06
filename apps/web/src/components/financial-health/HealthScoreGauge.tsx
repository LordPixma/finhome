'use client';

import { useState, useEffect } from 'react';

interface HealthScoreGaugeProps {
  score: number;
  category: 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

export function HealthScoreGauge({
  score,
  category,
  size = 'md',
  showLabel = true,
  animated = true
}: HealthScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(animated ? 0 : score);

  useEffect(() => {
    if (!animated) return;

    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setAnimatedScore(Math.min(Math.round(increment * currentStep), score));

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score, animated]);

  const getCategoryColor = () => {
    switch (category) {
      case 'excellent':
        return { primary: '#10b981', secondary: '#d1fae5', text: 'Excellent' };
      case 'good':
        return { primary: '#3b82f6', secondary: '#dbeafe', text: 'Good' };
      case 'fair':
        return { primary: '#f59e0b', secondary: '#fef3c7', text: 'Fair' };
      case 'needs_improvement':
        return { primary: '#f97316', secondary: '#ffedd5', text: 'Needs Work' };
      case 'critical':
        return { primary: '#ef4444', secondary: '#fee2e2', text: 'Critical' };
      default:
        return { primary: '#6b7280', secondary: '#f3f4f6', text: 'Unknown' };
    }
  };

  const colors = getCategoryColor();

  const sizeConfig = {
    sm: { width: 120, strokeWidth: 8, fontSize: 24, labelSize: 10 },
    md: { width: 180, strokeWidth: 12, fontSize: 36, labelSize: 14 },
    lg: { width: 240, strokeWidth: 16, fontSize: 48, labelSize: 18 }
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const progress = (animatedScore / 100) * circumference;

  // Calculate extra height for the label badge below the gauge
  const labelHeight = showLabel ? 36 : 0;
  const svgHeight = config.width / 2 + 20;
  const totalHeight = svgHeight + labelHeight;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: totalHeight }}>
        <svg
          width={config.width}
          height={svgHeight}
          viewBox={`0 0 ${config.width} ${svgHeight}`}
        >
          {/* Background arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${config.width / 2}
                A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
            fill="none"
            stroke={colors.secondary}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />

          {/* Progress arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${config.width / 2}
                A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
            fill="none"
            stroke={colors.primary}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{ transition: animated ? 'stroke-dashoffset 1.5s ease-out' : 'none' }}
          />

          {/* Score markers */}
          {[0, 25, 50, 75, 100].map((marker) => {
            const angle = (marker / 100) * 180 - 180;
            const x = config.width / 2 + (radius + config.strokeWidth) * Math.cos((angle * Math.PI) / 180);
            const y = config.width / 2 + (radius + config.strokeWidth) * Math.sin((angle * Math.PI) / 180);
            return (
              <text
                key={marker}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={config.labelSize - 4}
                fill="#9ca3af"
              >
                {marker}
              </text>
            );
          })}
        </svg>

        {/* Center score display - positioned inside the arc */}
        <div
          className="absolute flex items-end justify-center"
          style={{
            left: '50%',
            top: 0,
            height: svgHeight,
            transform: 'translateX(-50%)',
            paddingBottom: '8px'
          }}
        >
          <span
            className="font-bold"
            style={{ fontSize: config.fontSize, color: colors.primary, lineHeight: 1 }}
          >
            {animatedScore}
          </span>
        </div>

        {/* Label badge - positioned below the gauge */}
        {showLabel && (
          <div
            className="absolute flex justify-center w-full"
            style={{
              top: svgHeight + 4
            }}
          >
            <span
              className="font-semibold px-3 py-1 rounded-full whitespace-nowrap"
              style={{
                fontSize: config.labelSize,
                backgroundColor: colors.secondary,
                color: colors.primary
              }}
            >
              {colors.text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
