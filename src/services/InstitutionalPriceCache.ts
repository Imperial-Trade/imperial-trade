/**
 * Professional Institutional Price Cache Service
 * High-performance in-memory caching with interpolation, prediction, and market session awareness
 */

interface CachedPriceData {
  price: number;
  bid: number;
  ask: number;
  timestamp: number;
  sequence: number;
  volatility: number;
  trend: 'up' | 'down' | 'sideways';
  confidence: number; // 0-1 quality score
  source: 'fix' | 'websocket' | 'interpolated' | 'predicted';
  sessionActive: boolean;
  volume?: number;
  spread: number;
}

interface PricePrediction {
  predictedPrice: number;
  confidence: number;
  timeHorizon: number; // milliseconds
  volatilityFactor: number;
}

interface MarketSession {
  name: string;
  isActive: boolean;
  openTime: Date;
  closeTime: Date;
  timezone: string;
  volume: number;
}

export class InstitutionalPriceCache {
  private cache: Map<string, CachedPriceData[]> = new Map();
  private maxHistoryLength = 1000; // Keep last 1000 ticks per symbol
  private interpolationWindow = 5000; // 5 second window for interpolation
  private predictionHorizon = 1000; // 1 second prediction horizon
  private volatilityWindow = 50; // Calculate volatility over 50 ticks
  private stalenessThreshold = 250; // 250ms staleness threshold
  
  // Market session tracking
  private marketSessions: Map<string, MarketSession> = new Map();
  private sessionUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeMarketSessions();
    this.startSessionMonitoring();
  }

  /**
   * Initialize major market sessions
   */
  private initializeMarketSessions(): void {
    const sessions = [
      { name: 'Sydney', timezone: 'Australia/Sydney', offset: 10 },
      { name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 9 },
      { name: 'London', timezone: 'Europe/London', offset: 0 },
      { name: 'New York', timezone: 'America/New_York', offset: -5 }
    ];

    sessions.forEach(session => {
      this.marketSessions.set(session.name, {
        name: session.name,
        isActive: this.calculateSessionStatus(session.offset),
        openTime: new Date(),
        closeTime: new Date(),
        timezone: session.timezone,
        volume: 0
      });
    });

    console.log('📊 Initialized market sessions:', Array.from(this.marketSessions.keys()));
  }

  /**
   * Calculate if a market session is currently active
   */
  private calculateSessionStatus(timezoneOffset: number): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const sessionHour = (utcHour + timezoneOffset + 24) % 24;
    
    // Most forex markets are active 24/5, but with varying liquidity
    // Major sessions: Sydney (6-15), Tokyo (0-9), London (8-17), NY (13-22)
    return sessionHour >= 0 && sessionHour <= 23 && now.getUTCDay() >= 1 && now.getUTCDay() <= 5;
  }

  /**
   * Start monitoring market sessions
   */
  private startSessionMonitoring(): void {
    this.sessionUpdateInterval = setInterval(() => {
      this.updateMarketSessions();
    }, 60000); // Update every minute
  }

  /**
   * Update market session status
   */
  private updateMarketSessions(): void {
    this.marketSessions.forEach((session, name) => {
      const offset = this.getTimezoneOffset(session.timezone);
      session.isActive = this.calculateSessionStatus(offset);
    });
  }

  /**
   * Get timezone offset for session
   */
  private getTimezoneOffset(timezone: string): number {
    const offsets: { [key: string]: number } = {
      'Australia/Sydney': 10,
      'Asia/Tokyo': 9,
      'Europe/London': 0,
      'America/New_York': -5
    };
    return offsets[timezone] || 0;
  }

  /**
   * Store price data with enhanced metadata
   */
  setPriceData(symbol: string, data: {
    price: number;
    bid: number;
    ask: number;
    timestamp: number;
    sequence?: number;
    source?: 'fix' | 'websocket';
    volume?: number;
  }): void {
    const now = Date.now();
    const spread = data.ask - data.bid;
    
    // Get or create price history for symbol
    let history = this.cache.get(symbol);
    if (!history) {
      history = [];
      this.cache.set(symbol, history);
    }

    // Calculate volatility and trend
    const volatility = this.calculateVolatility(history, data.price);
    const trend = this.calculateTrend(history, data.price);
    const confidence = this.calculateConfidence(data, spread, volatility);
    
    // Determine which market sessions are active
    const sessionActive = Array.from(this.marketSessions.values()).some(session => session.isActive);

    const cachedData: CachedPriceData = {
      price: data.price,
      bid: data.bid,
      ask: data.ask,
      timestamp: data.timestamp || now,
      sequence: data.sequence || now,
      volatility,
      trend,
      confidence,
      source: data.source || 'websocket',
      sessionActive,
      volume: data.volume,
      spread
    };

    // Add to history
    history.push(cachedData);

    // Maintain maximum history length
    if (history.length > this.maxHistoryLength) {
      history.splice(0, history.length - this.maxHistoryLength);
    }

    console.log(`💾 CACHE UPDATE: ${symbol} = $${data.price.toFixed(5)} | Vol: ${volatility.toFixed(4)} | Trend: ${trend} | Confidence: ${confidence.toFixed(2)}`);
  }

  /**
   * Get latest price with interpolation and prediction
   */
  getPrice(symbol: string, enablePrediction = false): CachedPriceData | null {
    const history = this.cache.get(symbol);
    if (!history || history.length === 0) {
      return null;
    }

    const latest = history[history.length - 1];
    const now = Date.now();
    const age = now - latest.timestamp;

    // Return fresh data if within staleness threshold
    if (age <= this.stalenessThreshold) {
      return latest;
    }

    // Use interpolation for slightly stale data
    if (age <= this.interpolationWindow) {
      return this.interpolatePrice(history, now);
    }

    // Use prediction for older data if enabled
    if (enablePrediction && age <= this.predictionHorizon) {
      return this.predictPrice(history, now);
    }

    // Return latest data with warning for very stale data
    console.warn(`⚠️ Stale price data for ${symbol}: ${age}ms old`);
    return {
      ...latest,
      confidence: Math.max(0, latest.confidence - 0.5), // Reduce confidence for stale data
      source: 'interpolated'
    };
  }

  /**
   * Interpolate price based on recent trend
   */
  private interpolatePrice(history: CachedPriceData[], targetTime: number): CachedPriceData {
    if (history.length < 2) {
      return history[history.length - 1];
    }

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    
    const timeDiff = targetTime - latest.timestamp;
    const priceDiff = latest.price - previous.price;
    const velocity = priceDiff / (latest.timestamp - previous.timestamp);
    
    // Interpolate price based on velocity
    const interpolatedPrice = latest.price + (velocity * timeDiff);
    
    // Adjust bid/ask proportionally
    const midPoint = (latest.bid + latest.ask) / 2;
    const spread = latest.spread;
    const priceDelta = interpolatedPrice - midPoint;
    
    return {
      ...latest,
      price: interpolatedPrice,
      bid: interpolatedPrice - (spread / 2) + priceDelta,
      ask: interpolatedPrice + (spread / 2) + priceDelta,
      timestamp: targetTime,
      source: 'interpolated',
      confidence: Math.max(0.3, latest.confidence - 0.2) // Reduce confidence for interpolated data
    };
  }

  /**
   * Predict future price using trend analysis
   */
  private predictPrice(history: CachedPriceData[], targetTime: number): CachedPriceData {
    if (history.length < 5) {
      return this.interpolatePrice(history, targetTime);
    }

    const recent = history.slice(-5); // Use last 5 data points
    const prediction = this.calculatePricePrediction(recent, targetTime);
    const latest = history[history.length - 1];
    
    // Calculate new bid/ask based on prediction
    const spreadRatio = latest.spread / latest.price;
    const predictedSpread = prediction.predictedPrice * spreadRatio;
    
    return {
      ...latest,
      price: prediction.predictedPrice,
      bid: prediction.predictedPrice - (predictedSpread / 2),
      ask: prediction.predictedPrice + (predictedSpread / 2),
      timestamp: targetTime,
      source: 'predicted',
      confidence: Math.min(prediction.confidence, 0.7), // Cap prediction confidence
      spread: predictedSpread
    };
  }

  /**
   * Calculate price prediction using linear regression
   */
  private calculatePricePrediction(data: CachedPriceData[], targetTime: number): PricePrediction {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    data.forEach((point, i) => {
      const x = point.timestamp;
      const y = point.price;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const predictedPrice = slope * targetTime + intercept;
    const volatility = this.calculateVolatility(data, predictedPrice);
    const confidence = Math.max(0.1, 1 - volatility); // Higher volatility = lower confidence
    
    return {
      predictedPrice,
      confidence,
      timeHorizon: targetTime - data[data.length - 1].timestamp,
      volatilityFactor: volatility
    };
  }

  /**
   * Calculate price volatility
   */
  private calculateVolatility(history: CachedPriceData[], currentPrice: number): number {
    if (history.length < 2) return 0;
    
    const recent = history.slice(-Math.min(this.volatilityWindow, history.length));
    const prices = recent.map(d => d.price);
    prices.push(currentPrice);
    
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  /**
   * Calculate price trend
   */
  private calculateTrend(history: CachedPriceData[], currentPrice: number): 'up' | 'down' | 'sideways' {
    if (history.length < 3) return 'sideways';
    
    const recent = history.slice(-3);
    const avgRecentPrice = recent.reduce((sum, d) => sum + d.price, 0) / recent.length;
    
    const threshold = avgRecentPrice * 0.001; // 0.1% threshold
    
    if (currentPrice > avgRecentPrice + threshold) return 'up';
    if (currentPrice < avgRecentPrice - threshold) return 'down';
    return 'sideways';
  }

  /**
   * Calculate confidence score for price data
   */
  private calculateConfidence(data: any, spread: number, volatility: number): number {
    let confidence = 1.0;
    
    // Reduce confidence for wide spreads
    if (spread > data.price * 0.001) { // 0.1% spread threshold
      confidence -= 0.2;
    }
    
    // Reduce confidence for high volatility
    if (volatility > 0.01) { // 1% volatility threshold
      confidence -= 0.3;
    }
    
    // Reduce confidence for non-FIX sources
    if (data.source !== 'fix') {
      confidence -= 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get price history for symbol
   */
  getHistory(symbol: string, limit?: number): CachedPriceData[] {
    const history = this.cache.get(symbol);
    if (!history) return [];
    
    if (limit) {
      return history.slice(-limit);
    }
    
    return [...history];
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    symbols: number;
    totalEntries: number;
    stalestData: number;
    activeSessions: string[];
    averageConfidence: number;
  } {
    const symbols = Array.from(this.cache.keys());
    const totalEntries = symbols.reduce((sum, symbol) => sum + (this.cache.get(symbol)?.length || 0), 0);
    
    const now = Date.now();
    let oldestTimestamp = now;
    let totalConfidence = 0;
    let confidentEntries = 0;
    
    symbols.forEach(symbol => {
      const history = this.cache.get(symbol);
      if (history && history.length > 0) {
        const latest = history[history.length - 1];
        oldestTimestamp = Math.min(oldestTimestamp, latest.timestamp);
        totalConfidence += latest.confidence;
        confidentEntries++;
      }
    });
    
    const activeSessions = Array.from(this.marketSessions.entries())
      .filter(([_, session]) => session.isActive)
      .map(([name]) => name);
    
    return {
      symbols: symbols.length,
      totalEntries,
      stalestData: now - oldestTimestamp,
      activeSessions,
      averageConfidence: confidentEntries > 0 ? totalConfidence / confidentEntries : 0
    };
  }

  /**
   * Clear stale data
   */
  cleanupStaleData(maxAge = 300000): number { // 5 minutes default
    const now = Date.now();
    let removedCount = 0;
    
    this.cache.forEach((history, symbol) => {
      const originalLength = history.length;
      
      // Remove entries older than maxAge
      const filtered = history.filter(entry => now - entry.timestamp <= maxAge);
      
      if (filtered.length !== originalLength) {
        this.cache.set(symbol, filtered);
        removedCount += originalLength - filtered.length;
        
        // Remove symbol entirely if no recent data
        if (filtered.length === 0) {
          this.cache.delete(symbol);
        }
      }
    });
    
    console.log(`🧹 Cleaned up ${removedCount} stale cache entries`);
    return removedCount;
  }

  /**
   * Shutdown cache service
   */
  shutdown(): void {
    if (this.sessionUpdateInterval) {
      clearInterval(this.sessionUpdateInterval);
      this.sessionUpdateInterval = null;
    }
    
    this.cache.clear();
    this.marketSessions.clear();
    
    console.log('🛑 Institutional Price Cache shutdown complete');
  }
}

// Singleton instance
export const institutionalPriceCache = new InstitutionalPriceCache();