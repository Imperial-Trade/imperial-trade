
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  signalStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  priceStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  priceSource?: string;
  lastUpdated?: number;
  className?: string;
}

const StatusBadge: React.FC<{ label: string; status: Props['signalStatus'] }> = ({ label, status }) => {
  const variantClasses = {
    connected: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    connecting: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    disconnected: 'bg-muted text-muted-foreground border-border',
    error: 'bg-red-500/15 text-red-600 border-red-500/30',
  }[status];

  return (
    <Badge variant="outline" className={cn('text-xs', variantClasses)}>
      {label}: {status}
    </Badge>
  );
};

export const ConnectionStatusIndicator: React.FC<Props> = ({ signalStatus, priceStatus, priceSource, lastUpdated, className }) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <StatusBadge label="Signals" status={signalStatus} />
      <StatusBadge label={priceSource ? priceSource : 'Prices'} status={priceStatus} />
      {lastUpdated && (
        <span className="text-xs text-muted-foreground">
          Updated {Math.max(0, Math.round((Date.now() - lastUpdated) / 1000))}s ago
        </span>
      )}
    </div>
  );
};
