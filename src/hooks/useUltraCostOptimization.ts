import { useState, useEffect } from 'react';
import { ultraCostOptimizer } from '@/services/UltraCostOptimizer';

interface CostOptimizationState {
  isOptimized: boolean;
  projectedSavings: {
    percentage: number;
    monthly: number;
  };
  allowedSymbols: string[];
  isEmergencyMode: boolean;
}

export const useUltraCostOptimization = () => {
  const [state, setState] = useState<CostOptimizationState>({
    isOptimized: false,
    projectedSavings: { percentage: 0, monthly: 0 },
    allowedSymbols: ['XAUUSD', 'BTCUSD'],
    isEmergencyMode: false
  });

  useEffect(() => {
    const updateOptimizationState = () => {
      const report = ultraCostOptimizer.getOptimizationReport();
      const isPerforming = ultraCostOptimizer.isPerformingWell();
      
      setState({
        isOptimized: isPerforming,
        projectedSavings: {
          percentage: report.costSavingsPercent,
          monthly: report.projectedMonthlyCostUSD
        },
        allowedSymbols: report.allowedSymbols,
        isEmergencyMode: report.optimizationLevel === 'EMERGENCY'
      });
    };

    // Update immediately and then every 30 seconds
    updateOptimizationState();
    const interval = setInterval(updateOptimizationState, 30000);

    return () => clearInterval(interval);
  }, []);

  const enableEmergencyMode = () => {
    ultraCostOptimizer.enableEmergencyMode();
    setState(prev => ({ ...prev, isEmergencyMode: true }));
  };

  const resetMetrics = () => {
    ultraCostOptimizer.resetMetrics();
  };

  return {
    ...state,
    enableEmergencyMode,
    resetMetrics
  };
};