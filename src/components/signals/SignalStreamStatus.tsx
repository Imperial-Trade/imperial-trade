import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, Activity, AlertTriangle } from 'lucide-react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { supabase } from '@/integrations/supabase/client';
import { PriceConnectionStatus } from '@/components/realtime/PriceConnectionStatus';

interface StreamStatus {
  websocket: 'connected' | 'connecting' | 'disconnected' | 'error';
  monitor: 'active' | 'inactive' | 'error';
  priceData: 'live' | 'cached' | 'stale';
  alerts: number;
}

export function SignalStreamStatus() {
  const { connectionStatus, dataSource, isUsingEnhancedSystem } = useOptimizedWebSocketPrices();
  const [status, setStatus] = useState<StreamStatus>({
    websocket: 'connecting',
    monitor: 'inactive', 
    priceData: 'cached',
    alerts: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update websocket status from hybrid context
  useEffect(() => {
    setStatus(prev => ({
      ...prev,
      websocket: connectionStatus,
      priceData: connectionStatus === 'connected' ? 'live' : 'cached'
    }));
  }, [connectionStatus]);

  const checkSystemStatus = async () => {
    try {
      setIsRefreshing(true);
      
      // Update status based on websocket connection
      setStatus(prev => ({
        ...prev,
        monitor: connectionStatus === 'connected' ? 'active' : 'inactive',
        alerts: 0 // No alert monitoring system active
      }));
      
      console.log('✅ System status refreshed');
    } catch (error) {
      console.error('❌ Status check failed:', error);
      setStatus(prev => ({ ...prev, monitor: 'error' }));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (type: keyof StreamStatus) => {
    const value = status[type];
    if (type === 'alerts') return 'default';
    
    switch (value) {
      case 'connected':
      case 'active':
      case 'live':
        return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'connecting':
      case 'cached':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'disconnected':
      case 'inactive':
      case 'stale':
      case 'error':
        return 'bg-red-500/20 text-red-700 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    }
  };

  const getStatusIcon = (type: keyof StreamStatus) => {
    const value = status[type];
    if (type === 'alerts') return <Activity className="h-4 w-4" />;
    
    switch (value) {
      case 'connected':
      case 'active':
      case 'live':
        return <Wifi className="h-4 w-4" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'disconnected':
      case 'inactive':
      case 'stale':
      case 'error':
        return <WifiOff className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const needsAction = false; // No monitor initialization needed

  return (
    <div className="space-y-3">
      {/* Price Connection Status */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Price Data:</span>
          <PriceConnectionStatus />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkSystemStatus}
          disabled={isRefreshing}
          className="ml-auto"
        >
          {isRefreshing ? (
            <RefreshCw className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Refresh
        </Button>
      </div>

      {/* System Status */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">System:</span>
          <Badge className={getStatusColor('websocket')}>
            {getStatusIcon('websocket')}
            <span className="ml-1">{status.websocket}</span>
          </Badge>
          <Badge className={getStatusColor('monitor')}>
            {getStatusIcon('monitor')}
            <span className="ml-1">Monitor {status.monitor}</span>
          </Badge>
          <Badge variant="outline">
            {getStatusIcon('alerts')}
            <span className="ml-1">{status.alerts} Active Alerts</span>
          </Badge>
        </div>
        
        {/* Monitor initialization removed - using enhanced-signal-notification-dispatcher only */}
      </div>

      {/* Enhanced System Badge */}
      {isUsingEnhancedSystem && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-green-600 border-green-200">
            Enhanced System Active
          </Badge>
          <span>{dataSource}</span>
        </div>
      )}
    </div>
  );
};