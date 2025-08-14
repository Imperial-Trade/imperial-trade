import { useEffect, useRef } from 'react';

interface RenderMetrics {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
}

class RenderMonitor {
  private metrics = new Map<string, RenderMetrics>();
  private isEnabled = process.env.NODE_ENV === 'development';

  startRender(componentName: string): () => void {
    if (!this.isEnabled) return () => {};
    
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      const existing = this.metrics.get(componentName);
      if (existing) {
        const newCount = existing.renderCount + 1;
        const newAverage = (existing.averageRenderTime * existing.renderCount + renderTime) / newCount;
        
        this.metrics.set(componentName, {
          componentName,
          renderCount: newCount,
          lastRenderTime: renderTime,
          averageRenderTime: newAverage
        });
      } else {
        this.metrics.set(componentName, {
          componentName,
          renderCount: 1,
          lastRenderTime: renderTime,
          averageRenderTime: renderTime
        });
      }

      // Log performance warnings
      if (renderTime > 16) {
        console.warn(`🐌 Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
      
      if (existing && existing.renderCount > 0 && existing.renderCount % 10 === 0) {
        console.log(`📊 ${componentName}: ${existing.renderCount} renders, avg ${existing.averageRenderTime.toFixed(2)}ms`);
      }
    };
  }

  getMetrics(): RenderMetrics[] {
    return Array.from(this.metrics.values());
  }

  reset(): void {
    this.metrics.clear();
  }
}

const renderMonitor = new RenderMonitor();

export function useRenderOptimization(componentName: string) {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    renderCountRef.current += 1;
    
    // Start timing this render
    const endRender = renderMonitor.startRender(componentName);
    
    // End timing when effect cleanup runs or component re-renders
    return endRender;
  });

  return {
    renderCount: renderCountRef.current,
    getMetrics: () => renderMonitor.getMetrics(),
    resetMetrics: () => renderMonitor.reset()
  };
}

export { renderMonitor };