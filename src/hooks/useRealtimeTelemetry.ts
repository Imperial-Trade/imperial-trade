import { useEffect, useRef, useState } from 'react';

interface TelemetryData {
  totalMessages: number;
  totalConnections: number;
  messageRate: number;
  costEstimate: number;
  optimizationRate: number;
}

export function useRealtimeTelemetry() {
  const [telemetryData, setTelemetryData] = useState<TelemetryData>({
    totalMessages: 0,
    totalConnections: 0,
    messageRate: 0,
    costEstimate: 0,
    optimizationRate: 85 // Default based on expected filtering
  });

  // Enhanced telemetry tracking
  const telemetryRef = useRef({
    messagesReceived: 0,
    connectionsCreated: 0,
    startTime: Date.now(),
    clampActivations: 0
  });

  // Record a message
  const recordMessage = (channel: string = 'price_update') => {
    telemetryRef.current.messagesReceived++;
    
    // Calculate rate and cost estimate
    const elapsedHours = (Date.now() - telemetryRef.current.startTime) / (1000 * 60 * 60);
    const messageRate = telemetryRef.current.messagesReceived / Math.max(elapsedHours, 0.1);
    const dailyEstimate = messageRate * 24;
    const costEstimate = (dailyEstimate * 30 * 2.50) / 1000000; // $2.50 per million messages

    setTelemetryData(prev => ({
      ...prev,
      totalMessages: telemetryRef.current.messagesReceived,
      messageRate,
      costEstimate
    }));
  };

  // Record a connection
  const recordConnection = () => {
    telemetryRef.current.connectionsCreated++;
    setTelemetryData(prev => ({
      ...prev,
      totalConnections: telemetryRef.current.connectionsCreated
    }));
  };

  // Record clamp activation
  const recordClampActivation = () => {
    telemetryRef.current.clampActivations++;
  };

  // Sync to persistent storage
  const syncTelemetry = async () => {
    const elapsedHours = (Date.now() - telemetryRef.current.startTime) / (1000 * 60 * 60);
    const messageRate = telemetryRef.current.messagesReceived / Math.max(elapsedHours, 0.1);
    const costEstimate = (messageRate * 24 * 30 * 2.50) / 1000000;
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.rpc('upsert_daily_telemetry', {
        p_messages: telemetryRef.current.messagesReceived,
        p_connections: telemetryRef.current.connectionsCreated,
        p_message_rate: messageRate,
        p_cost_estimate: costEstimate,
        p_clamp_activations: telemetryRef.current.clampActivations
      });
    } catch (error) {
      console.warn('Failed to sync telemetry:', error);
    }
  };

  return {
    telemetryData,
    recordMessage,
    recordConnection,
    recordClampActivation,
    syncTelemetry,
    reset: () => {
      telemetryRef.current = {
        messagesReceived: 0,
        connectionsCreated: 0,
        startTime: Date.now(),
        clampActivations: 0
      };
      setTelemetryData({
        totalMessages: 0,
        totalConnections: 0,
        messageRate: 0,
        costEstimate: 0,
        optimizationRate: 85
      });
    }
  };
}