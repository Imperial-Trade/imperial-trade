import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
}

export function usePerformanceMonitor(componentName: string, enabled: boolean = false) {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0
  });

  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    renderStartRef.current = startTime;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      const metrics = metricsRef.current;
      metrics.renderCount++;
      metrics.lastRenderTime = renderTime;
      metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderTime);
      metrics.averageRenderTime = (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount;

      // Log performance metrics every 50 renders in dev mode
      if (metrics.renderCount % 50 === 0 && process.env.NODE_ENV === 'development') {
        console.log(`[PERFORMANCE] ${componentName}:`, {
          renders: metrics.renderCount,
          avgTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
          maxTime: `${metrics.maxRenderTime.toFixed(2)}ms`,
          lastTime: `${metrics.lastRenderTime.toFixed(2)}ms`
        });
      }
    };
  });

  return metricsRef.current;
}