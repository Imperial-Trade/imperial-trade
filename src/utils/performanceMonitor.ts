/**
 * Performance Monitoring Utility
 * Tracks render times, API calls, and resource usage
 * Only active in development mode
 */

interface PerformanceEntry {
  startTime: number;
  duration: number;
  timestamp: string;
}

interface PerformanceStats {
  count: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  lastDuration: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceEntry[]> = new Map();
  private enabled: boolean = process.env.NODE_ENV === 'development';

  /**
   * Mark the end of a performance measurement
   */
  mark(label: string, startTime: number): void {
    if (!this.enabled) return;

    const duration = performance.now() - startTime;
    const entry: PerformanceEntry = {
      startTime,
      duration,
      timestamp: new Date().toISOString()
    };

    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }

    const entries = this.metrics.get(label)!;
    entries.push(entry);

    // Keep only last 100 entries per metric
    if (entries.length > 100) {
      entries.shift();
    }

    // Log slow operations (> 100ms)
    if (duration > 100) {
      console.warn(`[PERF] Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get statistics for a specific metric
   */
  getStats(label: string): PerformanceStats | null {
    const entries = this.metrics.get(label);
    if (!entries || entries.length === 0) return null;

    const durations = entries.map(e => e.duration);
    return {
      count: entries.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      lastDuration: durations[durations.length - 1]
    };
  }

  /**
   * Get all performance statistics
   */
  getAllStats(): Record<string, PerformanceStats> {
    const stats: Record<string, PerformanceStats> = {};
    this.metrics.forEach((_, label) => {
      const stat = this.getStats(label);
      if (stat) stats[label] = stat;
    });
    return stats;
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    if (!this.enabled) return;

    const stats = this.getAllStats();
    console.group('[PERF] Performance Summary');
    Object.entries(stats).forEach(([label, stat]) => {
      console.log(`${label}:`, {
        count: stat.count,
        avg: `${stat.avgDuration.toFixed(2)}ms`,
        max: `${stat.maxDuration.toFixed(2)}ms`,
        min: `${stat.minDuration.toFixed(2)}ms`,
        last: `${stat.lastDuration.toFixed(2)}ms`
      });
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
   * Check if a metric is within performance budget
   */
  isWithinBudget(label: string, budgetMs: number): boolean {
    const stats = this.getStats(label);
    return stats ? stats.avgDuration <= budgetMs : true;
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): Record<string, number> | null {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576), // MB
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576), // MB
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
      };
    }
    return null;
  }
}

export const perfMonitor = new PerformanceMonitor();

// Export convenience function for measuring async operations
export async function measureAsync<T>(
  label: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await operation();
    perfMonitor.mark(label, startTime);
    return result;
  } catch (error) {
    perfMonitor.mark(`${label}-error`, startTime);
    throw error;
  }
}
