import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, Activity, AlertTriangle } from 'lucide-react';
import { useHybridWebSocketPrices } from '@/contexts/HybridWebSocketPriceContext';
import { supabase } from '@/integrations/supabase/client';

interface StreamStatus {
  websocket: 'connected' | 'connecting' | 'disconnected' | 'error';
  monitor: 'active' | 'inactive' | 'error';
  priceData: 'live' | 'cached' | 'stale';
  alerts: number;
}

export function SignalStreamStatus() {
  const { connectionStatus, dataSource, isUsingEnhancedSystem } = useHybridWebSocketPrices();
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
      
      // Check persistent monitor health
      const monitorResponse = await supabase.functions.invoke('persistent-alert-monitor', {
        body: { action: 'health' }
      });
      
      // Check active alerts count
      const { count: alertCount } = await supabase
        .from('alert_monitoring')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setStatus(prev => ({
        ...prev,
        monitor: monitorResponse.data?.status === 'active' ? 'active' : 'inactive',
        alerts: alertCount || 0
      }));
      
      console.log('✅ System status check completed:', { monitorResponse, alertCount });
    } catch (error) {
      console.error('❌ Status check failed:', error);
      setStatus(prev => ({ ...prev, monitor: 'error' }));
    } finally {
      setIsRefreshing(false);
    }
  };

  const initializeMonitor = async () => {
    try {
      setIsRefreshing(true);
      console.log('🚀 Initializing persistent monitor...');
      
      const response = await supabase.functions.invoke('persistent-alert-monitor', {
        body: { action: 'start' }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      console.log('✅ Monitor initialized:', response.data);
      await checkSystemStatus();
    } catch (error) {
      console.error('❌ Failed to initialize monitor:', error);
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

  const needsAction = status.monitor === 'inactive' || status.monitor === 'error';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Signal Stream Status</h3>
          {isUsingEnhancedSystem && (
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
              Enhanced System
            </Badge>
          )}
          <Badge className="bg-muted/20 text-muted-foreground border-border/30 text-xs">
            {dataSource}
          </Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkSystemStatus}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Badge className={`flex items-center gap-2 p-3 ${getStatusColor('websocket')}`}>
          {getStatusIcon('websocket')}
          <div>
            <div className="font-medium">WebSocket</div>
            <div className="text-xs capitalize">{status.websocket}</div>
          </div>
        </Badge>

        <Badge className={`flex items-center gap-2 p-3 ${getStatusColor('monitor')}`}>
          {getStatusIcon('monitor')}
          <div>
            <div className="font-medium">Monitor</div>
            <div className="text-xs capitalize">{status.monitor}</div>
          </div>
        </Badge>

        <Badge className={`flex items-center gap-2 p-3 ${getStatusColor('priceData')}`}>
          {getStatusIcon('priceData')}
          <div>
            <div className="font-medium">Price Data</div>
            <div className="text-xs capitalize">{status.priceData}</div>
          </div>
        </Badge>

        <Badge className={`flex items-center gap-2 p-3 ${getStatusColor('alerts')}`}>
          {getStatusIcon('alerts')}
          <div>
            <div className="font-medium">Active Alerts</div>
            <div className="text-xs">{status.alerts}</div>
          </div>
        </Badge>
      </div>

      {needsAction && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Price monitoring is inactive. Initialize to start live tracking.</span>
            <Button 
              size="sm" 
              onClick={initializeMonitor}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Initialize Monitor'
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}