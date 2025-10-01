import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  tpHits: number[];
  totalTPs: number;
  showPercentage?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  tpHits,
  totalTPs,
  showPercentage = true
}) => {
  if (totalTPs === 0) return null;

  const progress = (tpHits.length / totalTPs) * 100;
  const completedTPs = tpHits.length;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">TP Progress</span>
        {showPercentage && (
          <span className="font-medium text-foreground">
            {completedTPs}/{totalTPs} ({Math.round(progress)}%)
          </span>
        )}
      </div>
      <Progress 
        value={progress} 
        className="h-2 bg-muted/30"
      />
      <div className="flex gap-1 mt-1">
        {Array.from({ length: totalTPs }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              tpHits.includes(i + 1)
                ? 'bg-emerald-500'
                : 'bg-muted/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
