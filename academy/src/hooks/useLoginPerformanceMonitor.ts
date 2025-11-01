import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  loginStartTime: number;
  animationStartTime: number;
  animationEndTime: number;
  totalLoginDuration: number;
  animationDuration: number;
}

/**
 * Monitors login and animation performance to detect freezing issues
 */
export function useLoginPerformanceMonitor() {
  const metricsRef = useRef<Partial<PerformanceMetrics>>({});
  
  const markLoginStart = () => {
    metricsRef.current.loginStartTime = performance.now();
    console.log('🔍 Login performance tracking started');
  };
  
  const markAnimationStart = () => {
    metricsRef.current.animationStartTime = performance.now();
    console.log('🎬 Welcome animation started');
  };
  
  const markAnimationEnd = () => {
    const endTime = performance.now();
    metricsRef.current.animationEndTime = endTime;
    
    if (metricsRef.current.loginStartTime && metricsRef.current.animationStartTime) {
      const totalDuration = endTime - metricsRef.current.loginStartTime;
      const animationDuration = endTime - metricsRef.current.animationStartTime;
      
      metricsRef.current.totalLoginDuration = totalDuration;
      metricsRef.current.animationDuration = animationDuration;
      
      console.log('🎯 Login Performance Results:', {
        totalLoginTime: `${totalDuration.toFixed(2)}ms`,
        animationTime: `${animationDuration.toFixed(2)}ms`,
        status: totalDuration < 3000 ? 'OPTIMIZED ✅' : 'NEEDS_IMPROVEMENT ⚠️'
      });
    }
  };
  
  return {
    markLoginStart,
    markAnimationStart,
    markAnimationEnd,
    getMetrics: () => metricsRef.current
  };
}