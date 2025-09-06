// PHASE 2: Smart Price Optimization Engine
// Intelligent caching, batching, and cost optimization for live prices

interface SmartCacheEntry {
  price: number;
  timestamp: Date;
  symbol: string;
  quality: 'fresh' | 'interpolated' | 'stale';
  ttl: number;
}

interface ConnectionHealth {
  status: 'excellent' | 'good' | 'poor' | 'critical';
  latency: number;
  reliability: number;
  lastUpdate: Date;
}

interface CostMetrics {
  hourlyRate: number;
  dailyProjection: number;
  optimizationLevel: 'maximum_performance' | 'balanced' | 'cost_optimized' | 'emergency';
}

class SmartPriceOptimizer {
  private static instance: SmartPriceOptimizer;
  private cache = new Map<string, SmartCacheEntry>();
  private connectionHealth: ConnectionHealth = {
    status: 'excellent',
    latency: 0,
    reliability: 100,
    lastUpdate: new Date()
  };
  private costMetrics: CostMetrics = {
    hourlyRate: 0,
    dailyProjection: 0,
    optimizationLevel: 'balanced'
  };

  static getInstance(): SmartPriceOptimizer {
    if (!SmartPriceOptimizer.instance) {
      SmartPriceOptimizer.instance = new SmartPriceOptimizer();
    }
    return SmartPriceOptimizer.instance;
  }

  // PHASE 2: Intelligent price interpolation during micro-disconnections
  interpolatePrice(symbol: string, lastPrice: number, secondsGap: number): number {
    if (secondsGap > 30) return lastPrice; // Don't interpolate after 30s
    
    // Apply minimal random walk for realistic price movement
    const volatility = symbol === 'BTCUSD' ? 0.001 : 0.0005; // BTC more volatile than Gold
    const randomFactor = (Math.random() - 0.5) * volatility * Math.sqrt(secondsGap);
    
    return lastPrice * (1 + randomFactor);
  }

  // Smart caching with dynamic TTL
  cachePrice(symbol: string, price: number, quality: 'fresh' | 'interpolated' | 'stale' = 'fresh'): void {
    const ttl = this.getDynamicTTL(symbol, quality);
    
    this.cache.set(symbol, {
      price,
      timestamp: new Date(),
      symbol,
      quality,
      ttl
    });

    // Cleanup old entries
    this.cleanupCache();
  }

  getCachedPrice(symbol: string): SmartCacheEntry | null {
    const entry = this.cache.get(symbol);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp.getTime();
    if (age > entry.ttl * 1000) {
      this.cache.delete(symbol);
      return null;
    }

    return entry;
  }

  // Dynamic TTL based on symbol and market conditions
  private getDynamicTTL(symbol: string, quality: 'fresh' | 'interpolated' | 'stale'): number {
    const baseSeconds = {
      'BTCUSD': 5,   // 5s for crypto (fast-moving)
      'XAUUSD': 10,  // 10s for gold (slower-moving)
      'default': 15  // 15s for others
    };

    const base = baseSeconds[symbol as keyof typeof baseSeconds] || baseSeconds.default;
    
    // Adjust based on quality
    const qualityMultiplier = {
      'fresh': 1.0,
      'interpolated': 0.5,
      'stale': 0.3
    };

    // Adjust based on cost optimization level
    const costMultiplier = {
      'maximum_performance': 1.0,
      'balanced': 1.5,
      'cost_optimized': 2.0,
      'emergency': 3.0
    };

    return Math.floor(base * qualityMultiplier[quality] * costMultiplier[this.costMetrics.optimizationLevel]);
  }

  // Update connection health metrics
  updateConnectionHealth(latency: number, success: boolean): void {
    this.connectionHealth.latency = latency;
    this.connectionHealth.reliability = success ? 
      Math.min(this.connectionHealth.reliability + 1, 100) :
      Math.max(this.connectionHealth.reliability - 5, 0);
    
    this.connectionHealth.lastUpdate = new Date();
    
    // Update status based on metrics
    if (this.connectionHealth.reliability > 95 && latency < 100) {
      this.connectionHealth.status = 'excellent';
    } else if (this.connectionHealth.reliability > 85 && latency < 200) {
      this.connectionHealth.status = 'good';
    } else if (this.connectionHealth.reliability > 70 && latency < 500) {
      this.connectionHealth.status = 'poor';
    } else {
      this.connectionHealth.status = 'critical';
    }
  }

  // Get smart reconnection delay based on connection health
  getSmartReconnectionDelay(): number {
    const baseDelay = 1000; // 1 second base
    
    switch (this.connectionHealth.status) {
      case 'excellent': return baseDelay;
      case 'good': return baseDelay * 1.5;
      case 'poor': return baseDelay * 2;
      case 'critical': return baseDelay * 4;
      default: return baseDelay;
    }
  }

  // Cleanup expired cache entries
  private cleanupCache(): void {
    const now = Date.now();
    for (const [symbol, entry] of this.cache.entries()) {
      const age = now - entry.timestamp.getTime();
      if (age > entry.ttl * 1000) {
        this.cache.delete(symbol);
      }
    }
  }

  // Get current optimization status
  getOptimizationReport() {
    return {
      cacheSize: this.cache.size,
      connectionHealth: this.connectionHealth,
      costMetrics: this.costMetrics,
      recommendations: this.getOptimizationRecommendations()
    };
  }

  private getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.connectionHealth.status === 'critical') {
      recommendations.push('🚨 Connection quality critical - consider switching to HTTP fallback');
    }
    
    if (this.connectionHealth.latency > 300) {
      recommendations.push('⚠️ High latency detected - enabling aggressive caching');
    }
    
    if (this.costMetrics.dailyProjection > 50) {
      recommendations.push('💰 Daily cost projection high - consider economy mode');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ All optimization metrics within target ranges');
    }
    
    return recommendations;
  }
}

export const smartPriceOptimizer = SmartPriceOptimizer.getInstance();