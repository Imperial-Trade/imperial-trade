import { useState, useEffect } from 'react';
import { costTracker, CostMetrics, CostAlert } from '@/services/CostTracker';

interface CostTrackingState extends CostMetrics {
  projectedMonthlyCost: number;
  costEfficiencyRatio: number;
  alerts: CostAlert[];
  status: 'optimal' | 'warning' | 'critical';
  summary: {
    current: string;
    daily: string;
    monthly: string;
  };
}

export const useCostTracking = () => {
  const [costMetrics, setCostMetrics] = useState<CostTrackingState>({
    realtimeMessages: 0,
    totalCostUSD: 0,
    dailyCostUSD: 0,
    monthlyCostUSD: 0,
    lastResetTime: Date.now(),
    peakHourlyRate: 0,
    currentHourlyRate: 0,
    projectedMonthlyCost: 0,
    costEfficiencyRatio: 0,
    alerts: [],
    status: 'optimal',
    summary: {
      current: '$0.0000',
      daily: '$0.00/day',
      monthly: '$0/month'
    }
  });

  useEffect(() => {
    const updateMetrics = () => {
      const metrics = costTracker.getMetrics();
      const summary = costTracker.getCostSummary();
      
      setCostMetrics({
        ...metrics,
        status: summary.status,
        summary: {
          current: summary.current,
          daily: summary.daily,
          monthly: summary.monthly
        }
      });
    };

    // Update immediately
    updateMetrics();
    
    // Update every 30 seconds
    const interval = setInterval(updateMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  const resetMetrics = () => {
    costTracker.reset();
  };

  const recordMessage = (type?: 'price_update' | 'subscription' | 'presence' | 'broadcast') => {
    costTracker.recordRealtimeMessage(type);
  };

  return {
    ...costMetrics,
    resetMetrics,
    recordMessage
  };
};