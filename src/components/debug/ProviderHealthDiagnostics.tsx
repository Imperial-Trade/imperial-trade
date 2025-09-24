import React, { useMemo } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';

interface ProviderHealthDiagnosticsProps {
  showDetails?: boolean;
}

/**
 * Provider Health Diagnostics Component
 * Monitors and displays the health status of the WebSocket price provider
 */
export const ProviderHealthDiagnostics: React.FC<ProviderHealthDiagnosticsProps> = ({ 
  showDetails = false 
}) => {
  const { connectionStatus, error, lastUpdated, dataSource, prices } = useOptimizedWebSocketPrices();

  const healthStatus = useMemo(() => {
    const priceCount = Object.keys(prices || {}).length;
    const hasRecentUpdate = lastUpdated && (Date.now() - new Date(lastUpdated).getTime()) < 30000;
    
    if (connectionStatus === 'connected' && hasRecentUpdate && priceCount > 0) {
      return {
        status: 'healthy',
        icon: CheckCircle,
        color: 'text-green-400',
        variant: 'default' as const,
        message: 'Provider running optimally'
      };
    }
    
    if (connectionStatus === 'connecting' || dataSource === 'initializing') {
      return {
        status: 'initializing',
        icon: Activity,
        color: 'text-blue-400',
        variant: 'secondary' as const,
        message: 'Provider initializing'
      };
    }
    
    if (error || connectionStatus === 'error') {
      return {
        status: 'error',
        icon: XCircle,
        color: 'text-red-400',
        variant: 'destructive' as const,
        message: error || 'Connection error'
      };
    }
    
    return {
      status: 'warning',
      icon: AlertTriangle,
      color: 'text-yellow-400',
      variant: 'outline' as const,
      message: 'Provider issues detected'
    };
  }, [connectionStatus, error, lastUpdated, dataSource, prices]);

  if (!showDetails) {
    return (
      <Badge variant={healthStatus.variant} className={`${healthStatus.color} flex items-center gap-1`}>
        <healthStatus.icon className="w-3 h-3" />
        Provider {healthStatus.status}
      </Badge>
    );
  }

  return (
    <Card className="p-3 bg-card border-border">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={healthStatus.variant} className={`${healthStatus.color} flex items-center gap-1`}>
            <healthStatus.icon className="w-3 h-3" />
            {healthStatus.status.toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {healthStatus.message}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Status: {connectionStatus}</Badge>
          <Badge variant="outline">Source: {dataSource}</Badge>
          <Badge variant="outline">Prices: {Object.keys(prices || {}).length}</Badge>
        </div>
      </div>
      
      {lastUpdated && (
        <div className="mt-2 text-xs text-muted-foreground">
          Last update: {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </Card>
  );
};