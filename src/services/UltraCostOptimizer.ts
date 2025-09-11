/**
 * Ultra-Cost Optimization Service
 * Implements aggressive cost reduction strategies for 70% savings
 */

interface CostMetrics {
  tradermadeApiCalls: number;
  databaseConnections: number;
  redisOperations: number;
  edgeFunctionExecutions: number;
  estimatedMonthlyCost: number;
}

interface OptimizationConfig {
  allowedSymbols: string[];
  maxDatabaseConnections: number;
  cacheTTLMultiplier: number;
  batchSizeMultiplier: number;
  aggressive: boolean;
}

class UltraCostOptimizer {
  private static instance: UltraCostOptimizer;
  private config: OptimizationConfig;
  private metrics: CostMetrics;
  private lastOptimization: Date;

  private constructor() {
    this.config = {
      allowedSymbols: ['XAUUSD'], // 🚨 EMERGENCY: Only 1 symbol
      maxDatabaseConnections: 3, // 🚨 EMERGENCY: Max 3 connections total
      cacheTTLMultiplier: 10, // 🚨 EMERGENCY: 10x longer cache
      batchSizeMultiplier: 5, // 🚨 EMERGENCY: 5x larger batches
      aggressive: true
    };

    this.metrics = {
      tradermadeApiCalls: 0,
      databaseConnections: 0,
      redisOperations: 0,
      edgeFunctionExecutions: 0,
      estimatedMonthlyCost: 0
    };

    this.lastOptimization = new Date();
    console.log('💰 Ultra-Cost Optimizer initialized - Target: 70% cost reduction');
  }

  static getInstance(): UltraCostOptimizer {
    if (!UltraCostOptimizer.instance) {
      UltraCostOptimizer.instance = new UltraCostOptimizer();
    }
    return UltraCostOptimizer.instance;
  }

  // Symbol filtering for cost optimization
  isSymbolAllowed(symbol: string): boolean {
    return this.config.allowedSymbols.includes(symbol);
  }

  // Dynamic connection scaling based on market activity
  getOptimalConnectionCount(isMarketHours: boolean, isPeakHours: boolean): number {
    if (!isMarketHours) return 5; // Minimum during market close
    if (isPeakHours) return this.config.maxDatabaseConnections; // Maximum during peaks
    return Math.floor(this.config.maxDatabaseConnections * 0.6); // 60% during normal hours
  }

  // Smart cache TTL calculation
  getOptimizedCacheTTL(baseSeconds: number, dataType: 'prices' | 'signals' | 'other'): number {
    let multiplier = this.config.cacheTTLMultiplier;
    
    // Extra aggressive caching for non-critical data
    switch (dataType) {
      case 'prices':
        multiplier = 4; // 4x longer for price data (acceptable for XAUUSD/BTCUSD)
        break;
      case 'signals':
        multiplier = 2; // 2x longer for signals
        break;
      default:
        multiplier = 5; // 5x longer for other data
    }
    
    return baseSeconds * multiplier;
  }

  // Batch size optimization
  getOptimalBatchSize(baseBatchSize: number): number {
    return Math.floor(baseBatchSize * this.config.batchSizeMultiplier);
  }

  // Cost tracking
  trackApiCall(type: 'tradermade' | 'database' | 'redis' | 'edge_function'): void {
    switch (type) {
      case 'tradermade':
        this.metrics.tradermadeApiCalls++;
        break;
      case 'database':
        this.metrics.databaseConnections++;
        break;
      case 'redis':
        this.metrics.redisOperations++;
        break;
      case 'edge_function':
        this.metrics.edgeFunctionExecutions++;
        break;
    }
    
    this.updateCostEstimate();
  }

  // Cost estimation (monthly)
  private updateCostEstimate(): void {
    // Rough cost estimates per month
    const tradermadeCost = this.metrics.tradermadeApiCalls * 0.001; // $0.001 per call
    const databaseCost = this.metrics.databaseConnections * 0.01; // $0.01 per connection
    const redisCost = this.metrics.redisOperations * 0.0001; // $0.0001 per operation
    const edgeFunctionCost = this.metrics.edgeFunctionExecutions * 0.000001; // $0.000001 per execution
    
    this.metrics.estimatedMonthlyCost = tradermadeCost + databaseCost + redisCost + edgeFunctionCost;
  }

  // Get optimization report
  getOptimizationReport(): {
    config: OptimizationConfig;
    metrics: CostMetrics;
    projectedSavings: {
      percentage: number;
      monthly: number;
    };
  } {
    const originalMonthlyCost = 45; // Estimated original cost
    const currentCost = this.metrics.estimatedMonthlyCost;
    const savings = originalMonthlyCost - currentCost;
    const savingsPercentage = (savings / originalMonthlyCost) * 100;

    return {
      config: this.config,
      metrics: this.metrics,
      projectedSavings: {
        percentage: Math.round(savingsPercentage),
        monthly: Math.round(savings)
      }
    };
  }

  // Reset metrics (for monthly tracking)
  resetMetrics(): void {
    this.metrics = {
      tradermadeApiCalls: 0,
      databaseConnections: 0,
      redisOperations: 0,
      edgeFunctionExecutions: 0,
      estimatedMonthlyCost: 0
    };
    this.lastOptimization = new Date();
    console.log('📊 Ultra-Cost Optimizer metrics reset');
  }

  // Emergency cost reduction mode
  enableEmergencyMode(): void {
    this.config.aggressive = true;
    this.config.cacheTTLMultiplier = 5; // Even more aggressive caching
    this.config.maxDatabaseConnections = 10; // Further reduce connections
    console.log('🚨 Emergency cost reduction mode enabled');
  }

  // Check if optimization targets are being met
  isPerformingWell(): boolean {
    const report = this.getOptimizationReport();
    return report.projectedSavings.percentage >= 60; // Target 60%+ savings
  }
}

// Export singleton instance
export const ultraCostOptimizer = UltraCostOptimizer.getInstance();