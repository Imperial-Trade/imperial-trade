// Price source verification and validation types

export interface PriceSourceInfo {
  name: string;
  type: 'CFD' | 'Spot' | 'Futures' | 'Index';
  category: 'institutional' | 'retail' | 'aggregated';
  latency: 'ultra-fast' | 'fast' | 'standard' | 'delayed';
  description: string;
}

export interface SpreadMetrics {
  bid: number;
  ask: number;
  spread: number;
  spreadBps: number; // Basis points
  spreadPercent: number;
  isWideSpread: boolean;
  timestamp: number;
}

export interface PriceValidation {
  price: number;
  confidence: 'high' | 'medium' | 'low';
  isOutlier: boolean;
  deviationPercent: number;
  sourceCount: number;
  timestamp: number;
}

export interface PriceSourceHealth {
  isConnected: boolean;
  lastUpdate: number;
  updateFrequency: number; // Updates per second
  averageLatency: number;
  failureCount: number;
  successRate: number;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

// TraderMade-specific source configurations
export const TRADERMADE_SOURCES: Record<string, PriceSourceInfo> = {
  BTCUSD: {
    name: 'TraderMade CFD',
    type: 'CFD',
    category: 'institutional',
    latency: 'ultra-fast',
    description: 'Institutional CFD pricing with market maker spreads'
  },
  EURUSD: {
    name: 'TraderMade FX',
    type: 'Spot',
    category: 'institutional',
    latency: 'ultra-fast',
    description: 'Professional forex interbank pricing'
  },
  XAUUSD: {
    name: 'TraderMade Metals',
    type: 'Spot',
    category: 'institutional',
    latency: 'ultra-fast',
    description: 'Precious metals spot pricing'
  },
  USA30USD: {
    name: 'TraderMade Indices',
    type: 'CFD',
    category: 'institutional',
    latency: 'ultra-fast',
    description: 'Stock index CFD pricing'
  },
  NAS100USD: {
    name: 'TraderMade Indices',
    type: 'CFD',
    category: 'institutional',
    latency: 'ultra-fast',
    description: 'Stock index CFD pricing'
  }
} as const;

// Spread thresholds by symbol (in basis points)
export const SPREAD_THRESHOLDS: Record<string, { warning: number; critical: number }> = {
  BTCUSD: { warning: 50, critical: 100 }, // $50-100 spread warnings
  EURUSD: { warning: 2, critical: 5 },    // 2-5 pip warnings
  XAUUSD: { warning: 30, critical: 50 },  // $0.30-0.50 spread warnings
  USA30USD: { warning: 100, critical: 200 }, // 1-2 point warnings
  NAS100USD: { warning: 200, critical: 400 } // 2-4 point warnings
};

// Calculate spread metrics
export function calculateSpreadMetrics(bid: number, ask: number, symbol: string): SpreadMetrics {
  const spread = ask - bid;
  const midPrice = (bid + ask) / 2;
  const spreadPercent = (spread / midPrice) * 100;
  const spreadBps = spreadPercent * 100; // Convert to basis points
  
  const threshold = SPREAD_THRESHOLDS[symbol] || { warning: 50, critical: 100 };
  const isWideSpread = spreadBps > threshold.warning;
  
  return {
    bid,
    ask,
    spread,
    spreadBps,
    spreadPercent,
    isWideSpread,
    timestamp: Date.now()
  };
}

// Get price source information
export function getPriceSourceInfo(symbol: string): PriceSourceInfo {
  return TRADERMADE_SOURCES[symbol] || {
    name: 'TraderMade',
    type: 'CFD',
    category: 'institutional',
    latency: 'ultra-fast',
    description: 'Professional market data'
  };
}

// Validate price against expected ranges
export function validatePrice(price: number, symbol: string, historicalAvg?: number): PriceValidation {
  let confidence: 'high' | 'medium' | 'low' = 'high';
  let isOutlier = false;
  let deviationPercent = 0;
  
  if (historicalAvg && historicalAvg > 0) {
    deviationPercent = Math.abs((price - historicalAvg) / historicalAvg) * 100;
    
    // Flag as outlier if deviation > 5%
    if (deviationPercent > 5) {
      isOutlier = true;
      confidence = 'low';
    } else if (deviationPercent > 2) {
      confidence = 'medium';
    }
  }
  
  // Basic sanity checks
  if (price <= 0) {
    isOutlier = true;
    confidence = 'low';
  }
  
  return {
    price,
    confidence,
    isOutlier,
    deviationPercent,
    sourceCount: 1, // Single source for now
    timestamp: Date.now()
  };
}