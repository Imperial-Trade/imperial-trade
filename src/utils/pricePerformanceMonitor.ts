// Phase 4: Performance Monitoring Utilities
interface PerformanceMetrics {
  priceUpdatesReceived: number;
  priceUpdatesFiltered: number;
  uiUpdatesRendered: number;
  avgLatencyMs: number;
  lastResetTime: number;
}

class PricePerformanceMonitor {
  private metrics: PerformanceMetrics = {
    priceUpdatesReceived: 0,
    priceUpdatesFiltered: 0,
    uiUpdatesRendered: 0,
    avgLatencyMs: 0,
    lastResetTime: Date.now()
  };

  private latencyMeasurements: number[] = [];
  private readonly MAX_MEASUREMENTS = 100;

  recordPriceUpdate(wasFiltered: boolean = false) {
    this.metrics.priceUpdatesReceived++;
    if (wasFiltered) {
      this.metrics.priceUpdatesFiltered++;
    }
  }

  recordUIUpdate() {
    this.metrics.uiUpdatesRendered++;
  }

  recordLatency(latencyMs: number) {
    this.latencyMeasurements.push(latencyMs);
    
    // Keep only the most recent measurements
    if (this.latencyMeasurements.length > this.MAX_MEASUREMENTS) {
      this.latencyMeasurements.shift();
    }
    
    // Update average
    this.metrics.avgLatencyMs = 
      this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
  }

  getMetrics(): PerformanceMetrics & {
    efficiencyRatio: number;
    uptime: number;
  } {
    const now = Date.now();
    const uptime = now - this.metrics.lastResetTime;
    const efficiencyRatio = this.metrics.priceUpdatesReceived > 0 
      ? this.metrics.priceUpdatesFiltered / this.metrics.priceUpdatesReceived 
      : 0;

    return {
      ...this.metrics,
      efficiencyRatio,
      uptime
    };
  }

  reset() {
    this.metrics = {
      priceUpdatesReceived: 0,
      priceUpdatesFiltered: 0,
      uiUpdatesRendered: 0,
      avgLatencyMs: 0,
      lastResetTime: Date.now()
    };
    this.latencyMeasurements = [];
  }

  // Phase 4: Log performance summary
  logSummary() {
    const metrics = this.getMetrics();
    console.log('📊 Price Performance Metrics:', {
      received: metrics.priceUpdatesReceived,
      filtered: `${metrics.priceUpdatesFiltered} (${(metrics.efficiencyRatio * 100).toFixed(1)}% reduction)`,
      rendered: metrics.uiUpdatesRendered,
      avgLatency: `${metrics.avgLatencyMs.toFixed(1)}ms`,
      uptime: `${Math.floor(metrics.uptime / 60000)}m ${Math.floor((metrics.uptime % 60000) / 1000)}s`
    });
  }
}

// Export singleton instance
export const pricePerformanceMonitor = new PricePerformanceMonitor();

// Export types for external use
export type { PerformanceMetrics };
