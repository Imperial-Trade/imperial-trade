import React from 'react';
import { neonColors } from './neonTheme';

interface ConfidenceRingProps {
  value: number; // 0-100
  size?: number;
  label?: string;
}

const ConfidenceRing: React.FC<ConfidenceRingProps> = ({ value, size = 100, label = 'Confidence' }) => {
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = () => {
    if (value >= 70) return neonColors.positive;
    if (value >= 40) return neonColors.neutral;
    return neonColors.negative;
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={neonColors.borderDefault}
            strokeWidth={strokeWidth}
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease',
              filter: `drop-shadow(0 0 8px ${color})`,
            }}
          />
        </svg>

        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span
            className="text-2xl font-bold font-mono"
            style={{ 
              color: color,
              textShadow: `0 0 10px ${color}40`,
            }}
          >
            {value}
          </span>
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: neonColors.textDim }}
          >
            Score
          </span>
        </div>

        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Label */}
      <span
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: neonColors.textSecondary }}
      >
        {label}
      </span>
    </div>
  );
};

export default ConfidenceRing;
