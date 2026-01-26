// Technical Indicator Calculations for Pro AI Analysis

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  rsiDivergence: 'bullish' | 'bearish' | 'none';
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  ema20: number;
  ema50: number;
  ema200: number;
  atr: number;
  atr14: number[];
  priceChange24h: number;
  priceChangePercent24h: number;
  highLow: {
    high24h: number;
    low24h: number;
    high7d: number;
    low7d: number;
  };
  volumeProfile: {
    averageVolume: number;
    currentVolumeRatio: number; // Current vs average
  };
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (const change of changes) {
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }
  
  // Calculate initial averages
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // Smooth the averages
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Detect RSI Divergence
 */
export function detectRSIDivergence(candles: CandleData[], rsiValues: number[]): 'bullish' | 'bearish' | 'none' {
  if (candles.length < 20 || rsiValues.length < 20) return 'none';
  
  const recentCandles = candles.slice(-20);
  const recentRSI = rsiValues.slice(-20);
  
  // Find local lows/highs in price
  const priceLows: { index: number; value: number }[] = [];
  const priceHighs: { index: number; value: number }[] = [];
  
  for (let i = 2; i < recentCandles.length - 2; i++) {
    const low = recentCandles[i].low;
    const high = recentCandles[i].high;
    
    if (low < recentCandles[i-1].low && low < recentCandles[i-2].low &&
        low < recentCandles[i+1].low && low < recentCandles[i+2].low) {
      priceLows.push({ index: i, value: low });
    }
    
    if (high > recentCandles[i-1].high && high > recentCandles[i-2].high &&
        high > recentCandles[i+1].high && high > recentCandles[i+2].high) {
      priceHighs.push({ index: i, value: high });
    }
  }
  
  // Check for bullish divergence (lower lows in price, higher lows in RSI)
  if (priceLows.length >= 2) {
    const last = priceLows[priceLows.length - 1];
    const prev = priceLows[priceLows.length - 2];
    if (last.value < prev.value && recentRSI[last.index] > recentRSI[prev.index]) {
      return 'bullish';
    }
  }
  
  // Check for bearish divergence (higher highs in price, lower highs in RSI)
  if (priceHighs.length >= 2) {
    const last = priceHighs[priceHighs.length - 1];
    const prev = priceHighs[priceHighs.length - 2];
    if (last.value > prev.value && recentRSI[last.index] < recentRSI[prev.index]) {
      return 'bearish';
    }
  }
  
  return 'none';
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { value: number; signal: number; histogram: number } {
  if (prices.length < slowPeriod + signalPeriod) {
    return { value: 0, signal: 0, histogram: 0 };
  }
  
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macdLine = fastEMA - slowEMA;
  
  // Calculate MACD line history for signal
  const macdHistory: number[] = [];
  for (let i = slowPeriod; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const fast = calculateEMA(slice, fastPeriod);
    const slow = calculateEMA(slice, slowPeriod);
    macdHistory.push(fast - slow);
  }
  
  const signalLine = calculateEMA(macdHistory, signalPeriod);
  const histogram = macdLine - signalLine;
  
  return {
    value: parseFloat(macdLine.toFixed(4)),
    signal: parseFloat(signalLine.toFixed(4)),
    histogram: parseFloat(histogram.toFixed(4)),
  };
}

/**
 * Calculate ATR (Average True Range)
 */
export function calculateATR(candles: CandleData[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  // Use smoothed average (Wilder's method)
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }
  
  return atr;
}

/**
 * Calculate all technical indicators from candle data
 */
export function calculateAllIndicators(candles: CandleData[]): TechnicalIndicators {
  if (candles.length < 2) {
    return {
      rsi: 50,
      rsiDivergence: 'none',
      macd: { value: 0, signal: 0, histogram: 0 },
      ema20: 0,
      ema50: 0,
      ema200: 0,
      atr: 0,
      atr14: [],
      priceChange24h: 0,
      priceChangePercent24h: 0,
      highLow: { high24h: 0, low24h: 0, high7d: 0, low7d: 0 },
      volumeProfile: { averageVolume: 0, currentVolumeRatio: 1 },
    };
  }
  
  const closePrices = candles.map(c => c.close);
  const currentPrice = closePrices[closePrices.length - 1];
  
  // Calculate RSI
  const rsi = calculateRSI(closePrices, 14);
  
  // Calculate RSI history for divergence detection
  const rsiHistory: number[] = [];
  for (let i = 15; i <= closePrices.length; i++) {
    rsiHistory.push(calculateRSI(closePrices.slice(0, i), 14));
  }
  const rsiDivergence = detectRSIDivergence(candles.slice(-20), rsiHistory.slice(-20));
  
  // Calculate EMAs
  const ema20 = calculateEMA(closePrices, 20);
  const ema50 = calculateEMA(closePrices, 50);
  const ema200 = calculateEMA(closePrices, Math.min(200, closePrices.length));
  
  // Calculate MACD
  const macd = calculateMACD(closePrices);
  
  // Calculate ATR
  const atr = calculateATR(candles, 14);
  
  // Calculate ATR history for the last 14 periods
  const atr14: number[] = [];
  for (let i = Math.max(15, candles.length - 14); i <= candles.length; i++) {
    atr14.push(calculateATR(candles.slice(0, i), 14));
  }
  
  // Price changes
  const price24hAgo = candles.length > 24 ? candles[candles.length - 25].close : candles[0].close;
  const priceChange24h = currentPrice - price24hAgo;
  const priceChangePercent24h = (priceChange24h / price24hAgo) * 100;
  
  // High/Low calculations
  const last24 = candles.slice(-24);
  const last168 = candles.slice(-168); // 7 days in hours
  
  const highLow = {
    high24h: Math.max(...last24.map(c => c.high)),
    low24h: Math.min(...last24.map(c => c.low)),
    high7d: Math.max(...last168.map(c => c.high)),
    low7d: Math.min(...last168.map(c => c.low)),
  };
  
  // Volume profile
  const volumes = candles.map(c => c.volume);
  const averageVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const currentVolume = volumes[volumes.length - 1];
  const currentVolumeRatio = averageVolume > 0 ? currentVolume / averageVolume : 1;
  
  return {
    rsi: parseFloat(rsi.toFixed(2)),
    rsiDivergence,
    macd,
    ema20: parseFloat(ema20.toFixed(4)),
    ema50: parseFloat(ema50.toFixed(4)),
    ema200: parseFloat(ema200.toFixed(4)),
    atr: parseFloat(atr.toFixed(4)),
    atr14,
    priceChange24h: parseFloat(priceChange24h.toFixed(4)),
    priceChangePercent24h: parseFloat(priceChangePercent24h.toFixed(2)),
    highLow,
    volumeProfile: {
      averageVolume: parseFloat(averageVolume.toFixed(0)),
      currentVolumeRatio: parseFloat(currentVolumeRatio.toFixed(2)),
    },
  };
}

/**
 * Format candles for AI prompt (condensed format)
 */
export function formatCandlesForAI(candles: CandleData[], limit: number = 50): string {
  const recentCandles = candles.slice(-limit);
  
  // Create a condensed format: time,O,H,L,C,V
  const lines = recentCandles.map(c => {
    const date = new Date(c.time * 1000);
    const timeStr = date.toISOString().slice(0, 16).replace('T', ' ');
    return `${timeStr}|${c.open.toFixed(2)}|${c.high.toFixed(2)}|${c.low.toFixed(2)}|${c.close.toFixed(2)}|${c.volume}`;
  });
  
  return `Time|Open|High|Low|Close|Volume\n${lines.join('\n')}`;
}

/**
 * Identify key price levels from candle data
 */
export function identifyKeyLevels(candles: CandleData[], currentPrice: number): {
  supports: { price: number; strength: number }[];
  resistances: { price: number; strength: number }[];
} {
  if (candles.length < 20) {
    return { supports: [], resistances: [] };
  }
  
  // Find swing highs and lows
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  
  for (let i = 2; i < candles.length - 2; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    
    // Swing high
    if (high > candles[i-1].high && high > candles[i-2].high &&
        high > candles[i+1].high && high > candles[i+2].high) {
      swingHighs.push(high);
    }
    
    // Swing low
    if (low < candles[i-1].low && low < candles[i-2].low &&
        low < candles[i+1].low && low < candles[i+2].low) {
      swingLows.push(low);
    }
  }
  
  // Cluster nearby levels
  const clusterLevels = (levels: number[], threshold: number): { price: number; strength: number }[] => {
    if (levels.length === 0) return [];
    
    const sorted = [...levels].sort((a, b) => a - b);
    const clusters: { sum: number; count: number }[] = [];
    
    for (const level of sorted) {
      const existing = clusters.find(c => Math.abs(c.sum / c.count - level) < threshold);
      if (existing) {
        existing.sum += level;
        existing.count++;
      } else {
        clusters.push({ sum: level, count: 1 });
      }
    }
    
    return clusters
      .map(c => ({ price: c.sum / c.count, strength: Math.min(10, c.count * 2) }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
  };
  
  const priceRange = currentPrice * 0.005; // 0.5% clustering threshold
  
  const supports = clusterLevels(swingLows.filter(l => l < currentPrice), priceRange);
  const resistances = clusterLevels(swingHighs.filter(h => h > currentPrice), priceRange);
  
  return { supports, resistances };
}
