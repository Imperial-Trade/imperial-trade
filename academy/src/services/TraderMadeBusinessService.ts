// TraderMade Business Plan Service - Ultra-Fast Infrastructure Management

export interface BusinessPlanMetrics {
  apiQuotaUsed: number;
  apiQuotaLimit: number;
  quotaUtilization: number;
  avgLatency: number;
  connectionUptime: number;
  errorRate: number;
  priceUpdatesPerSecond: number;
  cacheHitRate: number;
  ultraFastTicksReceived: number;
  institutionalTicksReceived: number;
}

export interface BusinessPlanConfig {
  maxRequestsPerMinute: number;
  ultraFastBatchInterval: number;
  cacheTTLTiers: {
    crypto: number;
    gold: number;
    forex: number;
    indices: number;
  };
  connectionTimeout: number;
  heartbeatInterval: number;
  enableUltraFastTicks: boolean;
  enableInstitutionalTicks: boolean;
  enableConnectionPooling: boolean;
}

class TraderMadeBusinessService {
  private static instance: TraderMadeBusinessService;
  
  // Performance tracking
  private metrics: BusinessPlanMetrics = {
    apiQuotaUsed: 0,
    apiQuotaLimit: 1200, // Business plan limit
    quotaUtilization: 0,
    avgLatency: 0,
    connectionUptime: 0,
    errorRate: 0,
    priceUpdatesPerSecond: 0,
    cacheHitRate: 0,
    ultraFastTicksReceived: 0,
    institutionalTicksReceived: 0
  };

  // Business plan configuration
  private config: BusinessPlanConfig = {
    maxRequestsPerMinute: 1200,
    ultraFastBatchInterval: 100, // 100ms ultra-fast batching
    cacheTTLTiers: {
      crypto: 100,   // 100ms for BTC/ETH
      gold: 200,     // 200ms for XAU
      forex: 300,    // 300ms for EUR/USD
      indices: 500   // 500ms for USA30/NAS100
    },
    connectionTimeout: 5000,
    heartbeatInterval: 15000,
    enableUltraFastTicks: true,
    enableInstitutionalTicks: true,
    enableConnectionPooling: true
  };

  // Performance counters
  private latencyHistory: number[] = [];
  private priceUpdateCounter = 0;
  private priceUpdateStartTime = Date.now();
  private connectionStartTime = Date.now();
  private errorCounter = 0;
  private requestCounter = 0;
  private cacheHits = 0;
  private cacheRequests = 0;

  static getInstance(): TraderMadeBusinessService {
    if (!TraderMadeBusinessService.instance) {
      TraderMadeBusinessService.instance = new TraderMadeBusinessService();
    }
    return TraderMadeBusinessService.instance;
  }

  // Record API request for quota tracking
  recordApiRequest(): void {
    this.requestCounter++;
    this.metrics.apiQuotaUsed = this.requestCounter;
    this.metrics.quotaUtilization = (this.requestCounter / this.metrics.apiQuotaLimit) * 100;
  }

  // Record latency measurement
  recordLatency(latencyMs: number): void {
    this.latencyHistory.push(latencyMs);
    // Keep only last 100 measurements
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift();
    }
    
    // Calculate average latency
    this.metrics.avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
  }

  // Record price update
  recordPriceUpdate(isUltraFast: boolean = false, isInstitutional: boolean = false): void {
    this.priceUpdateCounter++;
    
    if (isUltraFast) {
      this.metrics.ultraFastTicksReceived++;
    }
    
    if (isInstitutional) {
      this.metrics.institutionalTicksReceived++;
    }
    
    // Calculate updates per second
    const elapsed = (Date.now() - this.priceUpdateStartTime) / 1000;
    this.metrics.priceUpdatesPerSecond = this.priceUpdateCounter / elapsed;
  }

  // Record cache hit/miss
  recordCacheAccess(wasHit: boolean): void {
    this.cacheRequests++;
    if (wasHit) {
      this.cacheHits++;
    }
    this.metrics.cacheHitRate = (this.cacheHits / this.cacheRequests) * 100;
  }

  // Record connection error
  recordError(): void {
    this.errorCounter++;
    this.metrics.errorRate = (this.errorCounter / Math.max(this.requestCounter, 1)) * 100;
  }

  // Calculate connection uptime
  updateUptime(): void {
    const elapsed = (Date.now() - this.connectionStartTime) / 1000;
    this.metrics.connectionUptime = elapsed;
  }

  // Get current metrics
  getMetrics(): BusinessPlanMetrics {
    this.updateUptime();
    return { ...this.metrics };
  }

  // Get business plan configuration
  getConfig(): BusinessPlanConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(newConfig: Partial<BusinessPlanConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Reset metrics (for testing or new sessions)
  resetMetrics(): void {
    this.metrics = {
      apiQuotaUsed: 0,
      apiQuotaLimit: 1200,
      quotaUtilization: 0,
      avgLatency: 0,
      connectionUptime: 0,
      errorRate: 0,
      priceUpdatesPerSecond: 0,
      cacheHitRate: 0,
      ultraFastTicksReceived: 0,
      institutionalTicksReceived: 0
    };
    
    this.latencyHistory = [];
    this.priceUpdateCounter = 0;
    this.priceUpdateStartTime = Date.now();
    this.connectionStartTime = Date.now();
    this.errorCounter = 0;
    this.requestCounter = 0;
    this.cacheHits = 0;
    this.cacheRequests = 0;
  }

  // Get performance grade based on metrics
  getPerformanceGrade(): 'excellent' | 'good' | 'fair' | 'poor' {
    const metrics = this.getMetrics();
    
    // Excellent: Low latency, high uptime, low error rate, good utilization
    if (metrics.avgLatency < 150 && metrics.errorRate < 1 && metrics.quotaUtilization > 50) {
      return 'excellent';
    }
    
    // Good: Moderate performance
    if (metrics.avgLatency < 300 && metrics.errorRate < 5 && metrics.quotaUtilization > 20) {
      return 'good';
    }
    
    // Fair: Acceptable performance
    if (metrics.avgLatency < 500 && metrics.errorRate < 10) {
      return 'fair';
    }
    
    return 'poor';
  }

  // Check if using business plan effectively
  isBusinessPlanOptimized(): boolean {
    const metrics = this.getMetrics();
    
    return (
      metrics.quotaUtilization > 30 && // Using at least 30% of quota
      metrics.avgLatency < 200 && // Low latency
      metrics.errorRate < 2 && // Low error rate
      metrics.priceUpdatesPerSecond > 5 // Good update frequency
    );
  }

  // Get optimization recommendations
  getOptimizationRecommendations(): string[] {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];
    
    if (metrics.quotaUtilization < 30) {
      recommendations.push('Increase API utilization to get better value from business plan');
    }
    
    if (metrics.avgLatency > 300) {
      recommendations.push('Consider optimizing network connection or reducing cache TTL');
    }
    
    if (metrics.errorRate > 5) {
      recommendations.push('Investigate connection stability issues');
    }
    
    if (metrics.priceUpdatesPerSecond < 5) {
      recommendations.push('Reduce batch intervals for faster price updates');
    }
    
    if (metrics.cacheHitRate < 80) {
      recommendations.push('Optimize cache TTL settings for better performance');
    }
    
    return recommendations;
  }
}

export const businessService = TraderMadeBusinessService.getInstance();
