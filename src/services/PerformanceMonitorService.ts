interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  timestamp: Date;
  type: 'response_time' | 'database_query' | 'api_call' | 'page_load';
  metadata?: Record<string, any>;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  responseTime: number;
  databaseConnections: number;
  activeUsers: number;
  errorRate: number;
  lastUpdated: Date;
}

class PerformanceMonitorService {
  private static instance: PerformanceMonitorService;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  private constructor() {}

  static getInstance(): PerformanceMonitorService {
    if (!PerformanceMonitorService.instance) {
      PerformanceMonitorService.instance = new PerformanceMonitorService();
    }
    return PerformanceMonitorService.instance;
  }

  trackMetric(name: string, value: number, type: PerformanceMetric['type'], metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      id: crypto.randomUUID(),
      name,
      value,
      type,
      timestamp: new Date(),
      metadata
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    console.log(`Performance Metric - ${name}: ${value}ms`, metadata);
  }

  async measureApiCall<T>(operation: string, apiCall: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      this.trackMetric(operation, duration, 'api_call', { success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.trackMetric(operation, duration, 'api_call', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  getMetrics(type?: PerformanceMetric['type'], limit = 100): PerformanceMetric[] {
    let filtered = this.metrics;
    if (type) {
      filtered = this.metrics.filter(m => m.type === type);
    }
    return filtered.slice(-limit);
  }

  getAverageResponseTime(minutes = 5): number {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(
      m => m.timestamp > since && m.type === 'api_call'
    );
    
    if (recentMetrics.length === 0) return 0;
    
    const total = recentMetrics.reduce((sum, m) => sum + m.value, 0);
    return total / recentMetrics.length;
  }

  getSystemHealth(): SystemHealth {
    const avgResponseTime = this.getAverageResponseTime();
    const errorRate = this.getErrorRate();
    
    let status: SystemHealth['status'] = 'healthy';
    if (avgResponseTime > 2000 || errorRate > 0.1) {
      status = 'degraded';
    }
    if (avgResponseTime > 5000 || errorRate > 0.25) {
      status = 'critical';
    }

    return {
      status,
      responseTime: avgResponseTime,
      databaseConnections: 0, // Would need backend integration
      activeUsers: 0, // Would need backend integration
      errorRate,
      lastUpdated: new Date()
    };
  }

  private getErrorRate(minutes = 5): number {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(
      m => m.timestamp > since && m.type === 'api_call'
    );
    
    if (recentMetrics.length === 0) return 0;
    
    const errorCount = recentMetrics.filter(
      m => m.metadata?.success === false
    ).length;
    
    return errorCount / recentMetrics.length;
  }
}

export const performanceMonitor = PerformanceMonitorService.getInstance();
