// Business Plan Performance Optimization Hook

import { useState, useEffect, useCallback } from 'react';
import { businessService, type BusinessPlanMetrics } from '@/services/TraderMadeBusinessService';

interface BusinessPlanOptimization {
  metrics: BusinessPlanMetrics;
  performanceGrade: 'excellent' | 'good' | 'fair' | 'poor';
  isOptimized: boolean;
  recommendations: string[];
  refreshMetrics: () => void;
  resetMetrics: () => void;
}

export function useBusinessPlanOptimization(): BusinessPlanOptimization {
  const [metrics, setMetrics] = useState<BusinessPlanMetrics>(() => businessService.getMetrics());
  const [performanceGrade, setPerformanceGrade] = useState<'excellent' | 'good' | 'fair' | 'poor'>('fair');
  const [isOptimized, setIsOptimized] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const refreshMetrics = useCallback(() => {
    const newMetrics = businessService.getMetrics();
    const grade = businessService.getPerformanceGrade();
    const optimized = businessService.isBusinessPlanOptimized();
    const recs = businessService.getOptimizationRecommendations();
    
    setMetrics(newMetrics);
    setPerformanceGrade(grade);
    setIsOptimized(optimized);
    setRecommendations(recs);
  }, []);

  const resetMetrics = useCallback(() => {
    businessService.resetMetrics();
    refreshMetrics();
  }, [refreshMetrics]);

  // Auto-refresh metrics every 5 seconds
  useEffect(() => {
    const interval = setInterval(refreshMetrics, 5000);
    
    // Initial load
    refreshMetrics();
    
    return () => clearInterval(interval);
  }, [refreshMetrics]);

  return {
    metrics,
    performanceGrade,
    isOptimized,
    recommendations,
    refreshMetrics,
    resetMetrics
  };
}