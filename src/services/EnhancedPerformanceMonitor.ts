
// Enhanced performance monitor for trading operations
export class EnhancedPerformanceMonitor {
  private metrics = new Map<string, { count: number; totalTime: number; errors: number }>();

  async trackSignalDelivery<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      this.recordMetric(operationName, performance.now() - startTime, false);
      return result;
    } catch (error) {
      this.recordMetric(operationName, performance.now() - startTime, true);
      throw error;
    }
  }

  async trackPriceUpdate<T>(
    operation: () => Promise<T>,
    symbol: string
  ): Promise<T> {
    return this.trackSignalDelivery(operation, `price_update_${symbol}`);
  }

  private recordMetric(name: string, duration: number, isError: boolean): void {
    const existing = this.metrics.get(name) || { count: 0, totalTime: 0, errors: 0 };
    this.metrics.set(name, {
      count: existing.count + 1,
      totalTime: existing.totalTime + duration,
      errors: existing.errors + (isError ? 1 : 0)
    });
  }

  getCurrentSnapshot() {
    const snapshot: Record<string, any> = {};
    this.metrics.forEach((metric, name) => {
      snapshot[name] = {
        avgTime: metric.totalTime / metric.count,
        count: metric.count,
        errorRate: metric.errors / metric.count,
        totalErrors: metric.errors
      };
    });
    return snapshot;
  }

  isPerformanceOptimal(): boolean {
    // Check if any critical operations are taking too long
    const snapshot = this.getCurrentSnapshot();
    for (const [name, metric] of Object.entries(snapshot)) {
      if (name.includes('signal') && (metric as any).avgTime > 100) {
        return false; // Signal operations should be under 100ms
      }
    }
    return true;
  }
}

export const enhancedPerformanceMonitor = new EnhancedPerformanceMonitor();
