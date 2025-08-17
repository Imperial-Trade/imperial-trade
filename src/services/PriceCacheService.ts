/**
 * Ultra-Fast Price Caching Service for Real-Time Trading
 * Provides in-memory caching with persistence, interpolation, and volatility detection
 */

interface CachedPriceData {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  change: number;
  changePercent: number;
  timestamp: number;
  tick_timestamp?: number;
  volatility?: number;
  confidence_score?: number;
  source: 'websocket' | 'http' | 'interpolated';
  is_ultra_fast_tick?: boolean;
}

interface VolatilityMetrics {
  avg_price: number;
  volatility: number;
  price_history: number[];
  last_calculated: number;
}

class PriceCacheService {
  private cache = new Map<string, CachedPriceData>();
  private priceHistory = new Map<string, number[]>();
  private volatilityMetrics = new Map<string, VolatilityMetrics>();
  private lastPrices = new Map<string, number>();
  private subscribers = new Map<string, Set<(data: CachedPriceData) => void>>();
  
  // Performance optimizations
  private readonly MAX_HISTORY_SIZE = 100;
  private readonly CACHE_TTL = 30000; // 30 seconds max age
  private readonly INTERPOLATION_THRESHOLD = 1000; // 1 second
  private readonly VOLATILITY_CALCULATION_INTERVAL = 5000; // 5 seconds

  constructor() {
    // Load from localStorage on initialization
    this.loadFromStorage();
    
    // Set up periodic volatility calculations
    setInterval(() => this.calculateVolatilityMetrics(), this.VOLATILITY_CALCULATION_INTERVAL);
    
    // Periodic cleanup of old data
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Get cached price with interpolation fallback
   */
  getPrice(symbol: string): CachedPriceData | null {
    const cached = this.cache.get(symbol);
    
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    
    // Return if data is fresh
    if (age < this.INTERPOLATION_THRESHOLD) {
      return cached;
    }

    // Try interpolation for slightly stale data
    if (age < this.CACHE_TTL) {
      const interpolated = this.interpolatePrice(symbol, cached);
      if (interpolated) {
        return interpolated;
      }
    }

    return cached; // Return even if stale - better than no data
  }

  /**
   * Set price with smart caching and persistence
   */
  setPrice(symbol: string, data: Omit<CachedPriceData, 'timestamp' | 'volatility' | 'confidence_score'>): void {
    const now = Date.now();
    const lastPrice = this.lastPrices.get(symbol) || data.price;
    
    // Calculate confidence score based on source and age
    const confidence_score = this.calculateConfidenceScore(data.source, now - (data.tick_timestamp || now));
    
    // Update price history for volatility calculation
    this.updatePriceHistory(symbol, data.price);

    const cachedData: CachedPriceData = {
      ...data,
      timestamp: now,
      tick_timestamp: data.tick_timestamp || now,
      volatility: this.getVolatility(symbol),
      confidence_score
    };

    this.cache.set(symbol, cachedData);
    this.lastPrices.set(symbol, data.price);
    
    // Persist to localStorage (async to avoid blocking)
    this.saveToStorageAsync(symbol, cachedData);
    
    // Notify subscribers
    this.notifySubscribers(symbol, cachedData);
  }

  /**
   * Real-time price interpolation for smooth updates
   */
  private interpolatePrice(symbol: string, cachedData: CachedPriceData): CachedPriceData | null {
    const history = this.priceHistory.get(symbol);
    if (!history || history.length < 3) {
      return null;
    }

    const volatility = this.getVolatility(symbol);
    if (volatility > 0.05) { // Don't interpolate during high volatility
      return null;
    }

    // Simple linear interpolation based on recent trend
    const recentPrices = history.slice(-3);
    const trend = (recentPrices[2] - recentPrices[0]) / 2;
    const age = Date.now() - cachedData.timestamp;
    const interpolationFactor = Math.min(age / this.INTERPOLATION_THRESHOLD, 1);
    
    const interpolatedPrice = cachedData.price + (trend * interpolationFactor);
    
    return {
      ...cachedData,
      price: interpolatedPrice,
      source: 'interpolated',
      confidence_score: Math.max((cachedData.confidence_score || 1) * 0.7, 0.3),
      timestamp: Date.now()
    };
  }

  /**
   * Subscribe to real-time price updates
   */
  subscribe(symbol: string, callback: (data: CachedPriceData) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    
    this.subscribers.get(symbol)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(symbol);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(symbol);
        }
      }
    };
  }

  /**
   * Update price history for volatility calculations
   */
  private updatePriceHistory(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    
    const history = this.priceHistory.get(symbol)!;
    history.push(price);
    
    // Keep only recent history
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.splice(0, history.length - this.MAX_HISTORY_SIZE);
    }
  }

  /**
   * Calculate volatility metrics
   */
  private calculateVolatilityMetrics(): void {
    for (const [symbol, history] of this.priceHistory.entries()) {
      if (history.length < 10) continue; // Need minimum data points
      
      const recentHistory = history.slice(-30); // Last 30 price points
      const avg_price = recentHistory.reduce((sum, price) => sum + price, 0) / recentHistory.length;
      
      const variance = recentHistory.reduce((sum, price) => {
        const diff = price - avg_price;
        return sum + (diff * diff);
      }, 0) / recentHistory.length;
      
      const volatility = Math.sqrt(variance) / avg_price; // Normalized volatility
      
      this.volatilityMetrics.set(symbol, {
        avg_price,
        volatility,
        price_history: recentHistory,
        last_calculated: Date.now()
      });
    }
  }

  /**
   * Get current volatility for a symbol
   */
  getVolatility(symbol: string): number {
    const metrics = this.volatilityMetrics.get(symbol);
    if (!metrics || Date.now() - metrics.last_calculated > this.VOLATILITY_CALCULATION_INTERVAL * 2) {
      return 0;
    }
    return metrics.volatility;
  }

  /**
   * Calculate confidence score based on data source and age
   */
  private calculateConfidenceScore(source: string, age: number): number {
    let baseScore = 1.0;
    
    // Score based on source
    switch (source) {
      case 'websocket':
        baseScore = 1.0;
        break;
      case 'http':
        baseScore = 0.8;
        break;
      case 'interpolated':
        baseScore = 0.6;
        break;
      default:
        baseScore = 0.5;
    }
    
    // Reduce score based on age
    const ageFactor = Math.max(1 - (age / this.CACHE_TTL), 0.1);
    
    return baseScore * ageFactor;
  }

  /**
   * Notify all subscribers of price updates
   */
  private notifySubscribers(symbol: string, data: CachedPriceData): void {
    const subscribers = this.subscribers.get(symbol);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error notifying price subscriber:', error);
        }
      });
    }
  }

  /**
   * Async persistence to localStorage
   */
  private saveToStorageAsync(symbol: string, data: CachedPriceData): void {
    // Use requestIdleCallback for non-blocking storage
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.saveToStorage(symbol, data));
    } else {
      setTimeout(() => this.saveToStorage(symbol, data), 0);
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(symbol: string, data: CachedPriceData): void {
    try {
      const key = `price_cache_${symbol}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      // Handle storage quota exceeded gracefully
      console.warn('localStorage quota exceeded, clearing old data');
      this.clearOldStorageData();
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('price_cache_')) {
          const symbol = key.replace('price_cache_', '');
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          
          // Only load recent data
          if (Date.now() - data.timestamp < this.CACHE_TTL) {
            this.cache.set(symbol, data);
            this.lastPrices.set(symbol, data.price);
          }
        }
      }
    } catch (error) {
      console.warn('Error loading from localStorage:', error);
    }
  }

  /**
   * Clear old storage data
   */
  private clearOldStorageData(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('price_cache_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (Date.now() - data.timestamp > this.CACHE_TTL) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key); // Remove corrupted data
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const now = Date.now();
    
    // Remove old cache entries
    for (const [symbol, data] of this.cache.entries()) {
      if (now - data.timestamp > this.CACHE_TTL) {
        this.cache.delete(symbol);
      }
    }
    
    // Remove old volatility metrics
    for (const [symbol, metrics] of this.volatilityMetrics.entries()) {
      if (now - metrics.last_calculated > this.VOLATILITY_CALCULATION_INTERVAL * 5) {
        this.volatilityMetrics.delete(symbol);
      }
    }
    
    // Clear old storage data
    this.clearOldStorageData();
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): {
    cached_symbols: number;
    total_subscribers: number;
    avg_confidence: number;
    highest_volatility: { symbol: string; volatility: number } | null;
  } {
    const cached_symbols = this.cache.size;
    const total_subscribers = Array.from(this.subscribers.values())
      .reduce((sum, set) => sum + set.size, 0);
    
    const confidenceScores = Array.from(this.cache.values())
      .map(data => data.confidence_score || 0);
    const avg_confidence = confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length 
      : 0;
    
    let highest_volatility: { symbol: string; volatility: number } | null = null;
    for (const [symbol, metrics] of this.volatilityMetrics.entries()) {
      if (!highest_volatility || metrics.volatility > highest_volatility.volatility) {
        highest_volatility = { symbol, volatility: metrics.volatility };
      }
    }
    
    return {
      cached_symbols,
      total_subscribers,
      avg_confidence,
      highest_volatility
    };
  }
}

// Export singleton instance
export const priceCacheService = new PriceCacheService();
