import React from 'react';
import { Clock, Activity, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketStatusBadgeProps {
  marketStatus?: {
    isOpen: boolean;
    sessionName?: string;
    timeUntilNext?: string;
  };
  className?: string;
}

export function MarketStatusBadge({ marketStatus, className }: MarketStatusBadgeProps) {
  if (!marketStatus || marketStatus.isOpen) return null; // Only show when market is closed

  const { sessionName, timeUntilNext } = marketStatus;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all',
      'text-red-400 bg-red-400/10 border-red-400/30',
      className
    )}>
      <XCircle className="w-4 h-4" />
      <div className="flex flex-col gap-1">
        <span className="font-medium">Market Closed</span>
        {sessionName && (
          <span className="text-xs opacity-80">{sessionName}</span>
        )}
        {timeUntilNext && (
          <div className="flex items-center gap-1 text-xs opacity-90">
            <Clock className="w-3 h-3" />
            <span>Opens in {timeUntilNext}</span>
          </div>
        )}
      </div>
    </div>
  );
}