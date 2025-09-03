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

  return null;
}