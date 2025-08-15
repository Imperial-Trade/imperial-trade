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
  if (!marketStatus) return null;

  const { isOpen, sessionName, timeUntilNext } = marketStatus;

  const getStatusConfig = () => {
    if (isOpen) {
      return {
        icon: Activity,
        text: 'Market Open',
        className: 'text-accent-green bg-accent-green/10 border-accent-green/30',
        detail: sessionName,
        countdown: timeUntilNext ? `Closes in ${timeUntilNext}` : ''
      };
    } else {
      return {
        icon: XCircle,
        text: 'Market Closed',
        className: 'text-red-400 bg-red-400/10 border-red-400/30',
        detail: sessionName,
        countdown: timeUntilNext ? `Opens in ${timeUntilNext}` : ''
      };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn(
      'flex items-center gap-2 px-2 py-1 rounded-md border text-xs transition-all',
      config.className,
      className
    )}>
      <Icon className="w-3 h-3" />
      <div className="flex flex-col">
        <span className="font-medium">{config.text}</span>
        {config.detail && (
          <span className="text-xs opacity-80">{config.detail}</span>
        )}
        {config.countdown && (
          <div className="flex items-center gap-1 text-xs opacity-70">
            <Clock className="w-2.5 h-2.5" />
            <span>{config.countdown}</span>
          </div>
        )}
      </div>
    </div>
  );
}