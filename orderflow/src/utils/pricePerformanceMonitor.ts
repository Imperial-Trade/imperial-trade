// Phase 4: Performance Monitoring Utilities
import { isDevToolsEnabled } from '@/utils/featureFlags';
interface PerformanceMetrics {
  priceUpdatesReceived: number;
  priceUpdatesFiltered: number;
  uiUpdatesRendered: number;
  avgLatencyMs: number;
  lastResetTime: number;
  // Sub-2s Live Guarantee metrics
  avgArrivalAgeMs: number;
  p95ArrivalAgeMs: number;
  avgServerSkewMs: number;
}

class PricePerformanceMonitor {
  private metrics: PerformanceMetrics = {
    priceUpdatesReceived: 0,
    priceUpdatesFiltered: 0,
    uiUpdatesRendered: 0,
    avgLatencyMs: 0,
    lastResetTime: Date.now(),
    // Sub-2s Live Guarantee metrics
    avgArrivalAgeMs: 0,
    p95ArrivalAgeMs: 0,
    avgServerSkewMs: 0
  };

  private latencyMeasurements: number[] = [];
  private arrivalAgeMeasurements: number[] = []; // New: Track arrival age measurements
  private serverSkewMeasurements: number[] = []; // New: Track server timestamp vs arrival time skew
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

  // Sub-2s Live Guarantee: Record arrival age for monitoring
  recordArrivalAge(arrivalAgeMs: number) {
    this.arrivalAgeMeasurements.push(arrivalAgeMs);
    
    if (this.arrivalAgeMeasurements.length > this.MAX_MEASUREMENTS) {
      this.arrivalAgeMeasurements.shift();
    }
    
    // Update average and p95
    const sorted = [...this.arrivalAgeMeasurements].sort((a, b) => a - b);
    this.metrics.avgArrivalAgeMs = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    this.metrics.p95ArrivalAgeMs = sorted[Math.floor(sorted.length * 0.95)] || 0;
  }

  // Sub-2s Live Guarantee: Record server timestamp skew
  recordServerSkew(skewMs: number) {
    this.serverSkewMeasurements.push(skewMs);
    
    if (this.serverSkewMeasurements.length > this.MAX_MEASUREMENTS) {
      this.serverSkewMeasurements.shift();
    }
    
    this.metrics.avgServerSkewMs = 
      this.serverSkewMeasurements.reduce((a, b) => a + b, 0) / this.serverSkewMeasurements.length;
  }

  getMetrics(): PerformanceMetrics & {
    efficiencyRatio: number;
    uptime: number;
    sub2sCompliance: number; // New: Percentage of measurements under 2s
  } {
    const now = Date.now();
    const uptime = now - this.metrics.lastResetTime;
    const efficiencyRatio = this.metrics.priceUpdatesReceived > 0 
      ? this.metrics.priceUpdatesFiltered / this.metrics.priceUpdatesReceived 
      : 0;
    
    // Calculate Sub-2s compliance
    const under2sCount = this.arrivalAgeMeasurements.filter(age => age < 2000).length;
    const sub2sCompliance = this.arrivalAgeMeasurements.length > 0 
      ? (under2sCount / this.arrivalAgeMeasurements.length) * 100 
      : 0;

    return {
      ...this.metrics,
      efficiencyRatio,
      uptime,
      sub2sCompliance
    };
  }

  reset() {
    this.metrics = {
      priceUpdatesReceived: 0,
      priceUpdatesFiltered: 0,
      uiUpdatesRendered: 0,
      avgLatencyMs: 0,
      lastResetTime: Date.now(),
      avgArrivalAgeMs: 0,
      p95ArrivalAgeMs: 0,
      avgServerSkewMs: 0
    };
    this.latencyMeasurements = [];
    this.arrivalAgeMeasurements = [];
    this.serverSkewMeasurements = [];
  }

  // Phase 4: Log performance summary with Sub-2s metrics
  logSummary() {
    if (isDevToolsEnabled()) {
      const metrics = this.getMetrics();
      console.log('📊 Price Performance Metrics (Sub-2s Guarantee):', {
        received: metrics.priceUpdatesReceived,
        filtered: `${metrics.priceUpdatesFiltered} (${(metrics.efficiencyRatio * 100).toFixed(1)}% reduction)`,
        rendered: metrics.uiUpdatesRendered,
        avgLatency: `${metrics.avgLatencyMs.toFixed(1)}ms`,
        avgArrivalAge: `${metrics.avgArrivalAgeMs.toFixed(0)}ms`,
        p95ArrivalAge: `${metrics.p95ArrivalAgeMs.toFixed(0)}ms`,
        sub2sCompliance: `${metrics.sub2sCompliance.toFixed(1)}%`,
        serverSkew: `${metrics.avgServerSkewMs.toFixed(0)}ms`,
        uptime: `${Math.floor(metrics.uptime / 60000)}m ${Math.floor((metrics.uptime % 60000) / 1000)}s`
      });
    }
  }
}

// Export singleton instance
export const pricePerformanceMonitor = new PricePerformanceMonitor();

// Export types for external use
export type { PerformanceMetrics };
