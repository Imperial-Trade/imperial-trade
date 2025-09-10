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

  const messagesCountRef = useRef(0);
  const connectionsCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // Record a message
  const recordMessage = (channel: string = 'price_update') => {
    messagesCountRef.current++;
    
    // Calculate rate and cost estimate
    const elapsedHours = (Date.now() - startTimeRef.current) / (1000 * 60 * 60);
    const messageRate = messagesCountRef.current / Math.max(elapsedHours, 0.1);
    const dailyEstimate = messageRate * 24;
    const costEstimate = (dailyEstimate * 30 * 2.50) / 1000000; // $2.50 per million messages

    setTelemetryData(prev => ({
      ...prev,
      totalMessages: messagesCountRef.current,
      messageRate,
      costEstimate
    }));
  };

  // Record a connection
  const recordConnection = () => {
    connectionsCountRef.current++;
    setTelemetryData(prev => ({
      ...prev,
      totalConnections: connectionsCountRef.current
    }));
  };

  return {
    telemetryData,
    recordMessage,
    recordConnection,
    reset: () => {
      messagesCountRef.current = 0;
      connectionsCountRef.current = 0;
      startTimeRef.current = Date.now();
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