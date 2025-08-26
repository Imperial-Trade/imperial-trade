
import { performanceMonitor } from './PerformanceMonitorService';
import { redisCache } from './RedisCache';
import { connectionPool } from './ConnectionPoolManager';

interface PerformanceAlert {
  type: 'response_time' | 'error_rate' | 'cache_miss' | 'connection_pool';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metrics: Record<string, number | string>;
}

interface SystemPerformanceSnapshot {
  timestamp: Date;
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  cache: {
    hitRate: number;
    size: number;
    memoryUsage: number;
  };
  connections: {
    active: number;
    errorRate: number;
    queueLength: number;
  };
  trading: {
    signalDeliveryTime: number;
    priceUpdateLatency: number;
    alertProcessingTime: number;
  };
}

/**
 * Enhanced Performance Monitor for High-Frequency Trading
 * Specialized monitoring for sub-100ms Forex signal delivery
 */
class EnhancedPerformanceMonitor {
  private static instance: EnhancedPerformanceMonitor;
  private alerts: PerformanceAlert[] = [];
  private snapshots: SystemPerformanceSnapshot[] = [];
  private maxSnapshots = 1000;
  private monitoringInterval: NodeJS.Timeout;
  private responseTimes: number[] = [];
  private maxResponseTimes = 1000;

  private constructor() {
    this.startContinuousMonitoring();
    console.log('📈 Enhanced Performance Monitor started for trading platform');
  }

  static getInstance(): EnhancedPerformanceMonitor {
    if (!EnhancedPerformanceMonitor.instance) {
      EnhancedPerformanceMonitor.instance = new EnhancedPerformanceMonitor();
    }
    return EnhancedPerformanceMonitor.instance;
  }

  // High-frequency operation tracking
  async trackSignalDelivery<T>(operation: () => Promise<T>, signalId?: string): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const deliveryTime = performance.now() - startTime;
      
      this.recordResponseTime(deliveryTime);
      performanceMonitor.trackMetric('signal_delivery', deliveryTime, 'response_time', {
        signalId: signalId || 'unknown',
        success: true,
        target: 100 // Target: sub-100ms
      });

      // Alert if delivery is slow
      if (deliveryTime > 100) {
        this.createAlert('response_time', 'warning', 
          `Signal delivery slow: ${deliveryTime.toFixed(2)}ms (target: <100ms)`, {
          deliveryTime,
          signalId: signalId || 'unknown'
        });
      }

      return result;
    } catch (error) {
      const deliveryTime = performance.now() - startTime;
      this.recordResponseTime(deliveryTime);
      
      performanceMonitor.trackMetric('signal_delivery', deliveryTime, 'response_time', {
        signalId: signalId || 'unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.createAlert('error_rate', 'critical',
        `Signal delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        deliveryTime,
        signalId: signalId || 'unknown'
      });

      throw error;
    }
  }

  async trackPriceUpdate<T>(operation: () => Promise<T>, symbol?: string): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const updateTime = performance.now() - startTime;
      
      performanceMonitor.trackMetric('price_update', updateTime, 'response_time', {
        symbol: symbol || 'unknown',
        success: true,
        target: 50 // Target: sub-50ms for price updates
      });

      if (updateTime > 50) {
        this.createAlert('response_time', 'warning',
          `Price update slow: ${updateTime.toFixed(2)}ms (target: <50ms)`, {
          updateTime,
          symbol: symbol || 'unknown'
        });
      }

      return result;
    } catch (error) {
      const updateTime = performance.now() - startTime;
      
      performanceMonitor.trackMetric('price_update', updateTime, 'response_time', {
        symbol: symbol || 'unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  // Cache performance monitoring
  monitorCachePerformance(): void {
    const cacheStats = redisCache.getStats();
    const hitRate = parseFloat(cacheStats.hitRate);

    performanceMonitor.trackMetric('cache_hit_rate', hitRate, 'response_time', {
      cacheSize: cacheStats.size,
      maxSize: cacheStats.maxSize
    });

    // Alert on low cache hit rate
    if (hitRate < 80 && (cacheStats.hits + cacheStats.misses) > 100) {
      this.createAlert('cache_miss', 'warning',
        `Cache hit rate low: ${hitRate}% (target: >80%)`, {
        hitRate,
        cacheSize: cacheStats.size
      });
    }
  }

  // Connection pool monitoring
  monitorConnectionPool(): void {
    const poolMetrics = connectionPool.getMetrics();
    
    performanceMonitor.trackMetric('connection_pool_utilization', 
      (poolMetrics.activeConnections / 50) * 100, 'response_time', {
      activeConnections: poolMetrics.activeConnections,
      errorRate: poolMetrics.errorRate * 100,
      queueLength: poolMetrics.queueLength
    });

    // Alert on high connection pool usage
    if (poolMetrics.activeConnections > 40) { // 80% of max 50
      this.createAlert('connection_pool', 'warning',
        `Connection pool high usage: ${poolMetrics.activeConnections}/50`, {
        activeConnections: poolMetrics.activeConnections,
        queueLength: poolMetrics.queueLength
      });
    }

    // Alert on high error rate
    if (poolMetrics.errorRate > 0.1 && poolMetrics.totalRequests > 10) { // 10% error rate
      this.createAlert('error_rate', 'critical',
        `High database error rate: ${(poolMetrics.errorRate * 100).toFixed(1)}%`, {
        errorRate: poolMetrics.errorRate * 100,
        totalRequests: poolMetrics.totalRequests
      });
    }
  }

  // System health snapshot
  captureSnapshot(): SystemPerformanceSnapshot {
    const cacheStats = redisCache.getStats();
    const poolMetrics = connectionPool.getMetrics();
    
    // Calculate percentiles
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    
    const snapshot: SystemPerformanceSnapshot = {
      timestamp: new Date(),
      responseTime: {
        avg: poolMetrics.avgResponseTime,
        p95: sortedTimes[p95Index] || 0,
        p99: sortedTimes[p99Index] || 0
      },
      cache: {
        hitRate: parseFloat(cacheStats.hitRate),
        size: cacheStats.size,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
      },
      connections: {
        active: poolMetrics.activeConnections,
        errorRate: poolMetrics.errorRate * 100,
        queueLength: poolMetrics.queueLength
      },
      trading: {
        signalDeliveryTime: this.getAverageMetric('signal_delivery'),
        priceUpdateLatency: this.getAverageMetric('price_update'),
        alertProcessingTime: this.getAverageMetric('alert_processing')
      }
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    return snapshot;
  }

  // Continuous monitoring
  private startContinuousMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      try {
        this.monitorCachePerformance();
        this.monitorConnectionPool();
        
        const snapshot = this.captureSnapshot();
        
        // Log performance summary every minute
        console.log('⚡ Performance Summary:', {
          signalDelivery: `${snapshot.trading.signalDeliveryTime.toFixed(1)}ms`,
          priceUpdate: `${snapshot.trading.priceUpdateLatency.toFixed(1)}ms`,
          cacheHitRate: `${snapshot.cache.hitRate.toFixed(1)}%`,
          connectionPool: `${snapshot.connections.active}/50`,
          memoryUsage: `${snapshot.cache.memoryUsage.toFixed(1)}MB`
        });
        
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 60000); // Every minute
  }

  // Helper methods
  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);
    if (this.responseTimes.length > this.maxResponseTimes) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimes);
    }
  }

  private getAverageMetric(metricName: string): number {
    const metrics = performanceMonitor.getMetrics('response_time');
    const relevantMetrics = metrics.filter(m => m.name.includes(metricName));
    
    if (relevantMetrics.length === 0) return 0;
    
    return relevantMetrics.reduce((sum, m) => sum + m.value, 0) / relevantMetrics.length;
  }

  private createAlert(type: PerformanceAlert['type'], severity: PerformanceAlert['severity'], 
                     message: string, metrics: Record<string, number | string>): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      timestamp: new Date(),
      metrics
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log critical alerts immediately
    if (severity === 'critical') {
      console.error('🚨 CRITICAL PERFORMANCE ALERT:', message, metrics);
    } else {
      console.warn('⚠️  Performance Warning:', message, metrics);
    }
  }

  // Public API
  getRecentAlerts(count = 10): PerformanceAlert[] {
    return this.alerts.slice(-count);
  }

  getPerformanceTrend(minutes = 5): SystemPerformanceSnapshot[] {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.snapshots.filter(s => s.timestamp > since);
  }

  getCurrentSnapshot(): SystemPerformanceSnapshot {
    return this.captureSnapshot();
  }

  // Check if system is performing within trading requirements
  isPerformanceOptimal(): boolean {
    const recent = this.snapshots.slice(-5); // Last 5 snapshots
    if (recent.length === 0) return true;
    
    const avgSignalTime = recent.reduce((sum, s) => sum + s.trading.signalDeliveryTime, 0) / recent.length;
    const avgPriceTime = recent.reduce((sum, s) => sum + s.trading.priceUpdateLatency, 0) / recent.length;
    const avgCacheHit = recent.reduce((sum, s) => sum + s.cache.hitRate, 0) / recent.length;
    
    return avgSignalTime < 100 && avgPriceTime < 50 && avgCacheHit > 75;
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    console.log('📊 Enhanced Performance Monitor destroyed');
  }
}

export const enhancedPerformanceMonitor = EnhancedPerformanceMonitor.getInstance();
