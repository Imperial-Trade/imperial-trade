import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { PipsData } from '@/utils/pipsCalculator';

interface ProfitLossDisplayProps {
  pipsData?: PipsData;
  size?: 'sm' | 'md' | 'lg';
}

export const ProfitLossDisplay: React.FC<ProfitLossDisplayProps> = ({
  pipsData,
  size = 'md'
}) => {
  if (!pipsData) return null;

  const isProfit = pipsData.direction === 'profit';
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`flex items-center gap-1.5 ${textSizeClasses[size]}`}>
      {isProfit ? (
        <TrendingUp className="h-4 w-4 text-emerald-500" />
      ) : (
        <TrendingDown className="h-4 w-4 text-red-500" />
      )}
      <span
        className={`font-semibold ${
          isProfit ? 'text-emerald-500' : 'text-red-500'
        }`}
      >
        {pipsData.formatted}
      </span>
    </div>
  );
};
