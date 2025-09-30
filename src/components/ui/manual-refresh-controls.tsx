import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ManualRefreshControlsProps {
  onRefresh: () => Promise<void> | void;
  onReconnect?: () => Promise<void> | void;
  onClearCache?: () => Promise<void> | void;
  isRefreshing?: boolean;
  lastRefresh?: Date;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showLastRefresh?: boolean;
}

export function ManualRefreshControls({
  onRefresh,
  onReconnect,
  onClearCache,
  isRefreshing = false,
  lastRefresh,
  className,
  variant = 'outline',
  size = 'sm',
  showLastRefresh = false
}: ManualRefreshControlsProps) {
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const handleRefresh = async () => {
    setLocalRefreshing(true);
    try {
      await onRefresh();
      toast({
        title: 'Data Refreshed',
        description: 'Latest data loaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Could not refresh data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLocalRefreshing(false);
    }
  };

  const handleReconnect = async () => {
    if (!onReconnect) return;
    setReconnecting(true);
    try {
      await onReconnect();
      toast({
        title: 'Reconnected',
        description: 'Connection restored successfully',
      });
    } catch (error) {
      toast({
        title: 'Reconnection Failed',
        description: 'Could not reconnect. Please check your connection.',
        variant: 'destructive'
      });
    } finally {
      setReconnecting(false);
    }
  };

  const handleClearCache = async () => {
    if (!onClearCache) return;
    setClearingCache(true);
    try {
      await onClearCache();
      toast({
        title: 'Cache Cleared',
        description: 'All cached data removed',
      });
    } catch (error) {
      toast({
        title: 'Clear Failed',
        description: 'Could not clear cache. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setClearingCache(false);
    }
  };

  const isAnyLoading = isRefreshing || localRefreshing || reconnecting || clearingCache;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant={variant}
        size={size}
        onClick={handleRefresh}
        disabled={isAnyLoading}
        className="gap-2"
      >
        <RefreshCw className={cn('w-4 h-4', (isRefreshing || localRefreshing) && 'animate-spin')} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>

      {onReconnect && (
        <Button
          variant={variant}
          size={size}
          onClick={handleReconnect}
          disabled={isAnyLoading}
          className="gap-2"
        >
          <Wifi className={cn('w-4 h-4', reconnecting && 'animate-pulse')} />
          <span className="hidden sm:inline">Reconnect</span>
        </Button>
      )}

      {onClearCache && (
        <Button
          variant={variant}
          size={size}
          onClick={handleClearCache}
          disabled={isAnyLoading}
          className="gap-2"
        >
          <Database className={cn('w-4 h-4', clearingCache && 'animate-pulse')} />
          <span className="hidden sm:inline">Clear Cache</span>
        </Button>
      )}

      {showLastRefresh && lastRefresh && (
        <span className="text-xs text-muted-foreground">
          Last: {lastRefresh.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
