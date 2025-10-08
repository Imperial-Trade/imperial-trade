/**
 * Performance Monitor - Area 4 Implementation
 * 
 * Centralized performance tracking for critical operations:
 * - Signal refresh latency
 * - Price polling latency
 * - Component render times
 * - Memory usage tracking
 */

interface PerformanceMetric {
  count: number;
  totalDuration: number;
  measurements: number[];
  maxDuration: number;
  minDuration: number;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  private readonly MAX_MEASUREMENTS = 100; // Keep last 100 measurements
  private readonly SLOW_OPERATION_THRESHOLD = 100; // ms
  private readonly CRITICAL_OPERATION_THRESHOLD = 500; // ms

  /**
   * Mark the end of a performance measurement
   * @param label - Unique identifier for the operation
   * @param startTime - Result from performance.now() at operation start
   */
  mark(label: string, startTime: number): void {
    const duration = performance.now() - startTime;
    
    if (!this.metrics.has(label)) {
      this.metrics.set(label, {
        count: 0,
        totalDuration: 0,
        measurements: [],
        maxDuration: 0,
        minDuration: Infinity
      });
    }

    const metric = this.metrics.get(label)!;
    metric.count++;
    metric.totalDuration += duration;
    metric.measurements.push(duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.minDuration = Math.min(metric.minDuration, duration);

    // Keep only last MAX_MEASUREMENTS
    if (metric.measurements.length > this.MAX_MEASUREMENTS) {
      metric.measurements.shift();
    }

    // Log slow operations
    if (duration > this.CRITICAL_OPERATION_THRESHOLD) {
      console.error(`🐌 CRITICAL SLOW OPERATION: ${label} took ${duration.toFixed(2)}ms (threshold: ${this.CRITICAL_OPERATION_THRESHOLD}ms)`);
    } else if (duration > this.SLOW_OPERATION_THRESHOLD) {
      console.warn(`⚠️ Slow operation: ${label} took ${duration.toFixed(2)}ms (threshold: ${this.SLOW_OPERATION_THRESHOLD}ms)`);
    }
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(label: string): {
    count: number;
    avg: number;
    max: number;
    min: number;
    p95: number;
    p99: number;
  } | null {
    const metric = this.metrics.get(label);
    if (!metric || metric.count === 0) return null;

    const avg = metric.totalDuration / metric.count;
    const sorted = [...metric.measurements].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      count: metric.count,
      avg,
      max: metric.maxDuration,
      min: metric.minDuration,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0
    };
  }

  /**
   * Get all tracked metrics
   */
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const allStats: Record<string, ReturnType<typeof this.getStats>> = {};
    this.metrics.forEach((_, label) => {
      allStats[label] = this.getStats(label);
    });
    return allStats;
  }

  /**
   * Log a summary of all metrics to console
   */
  logSummary(): void {
    console.group('📊 Performance Monitor Summary');
    
    this.metrics.forEach((_, label) => {
      const stats = this.getStats(label);
      if (!stats) return;

      console.log(`\n${label}:`);
      console.log(`  Count: ${stats.count}`);
      console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
      console.log(`  Min: ${stats.min.toFixed(2)}ms`);
      console.log(`  Max: ${stats.max.toFixed(2)}ms`);
      console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
      console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
    });

    console.groupEnd();
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Check if operation is within performance budget
   */
  isWithinBudget(label: string, budgetMs: number): boolean {
    const stats = this.getStats(label);
    return stats ? stats.avg < budgetMs : true;
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }
}

export const perfMonitor = new PerformanceMonitor();

// Export for use in tests
export { PerformanceMonitor };
