import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface UseMetaApiCandlesReturn {
  candles: CandleData[];
  isLoading: boolean;
  error: string | null;
  source: 'yahoo' | 'metaapi' | 'mock' | null;
  fetchCandles: (symbol: string, timeframe: string, limit?: number, currentLivePrice?: number | null) => Promise<void>;
  clearCandles: () => void;
}

// Generate mock candles client-side as fallback, anchored to current live price
function generateMockCandles(symbol: string, timeframe: string, limit: number, currentLivePrice?: number | null): CandleData[] {
  const candles: CandleData[] = [];
  const now = new Date();
  
  const intervalMs: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };

  const interval = intervalMs[timeframe] || 60 * 60 * 1000;

  // Use current live price if available, otherwise use default base prices
  let endPrice: number;
  let basePrice: number;
  
  if (currentLivePrice && currentLivePrice > 0) {
    endPrice = currentLivePrice;
    basePrice = currentLivePrice;
  } else {
    // Fallback base price by symbol
    basePrice = 100;
    if (symbol.includes('XAU') || symbol.includes('GOLD')) basePrice = 2650;
    else if (symbol.includes('BTC')) basePrice = 95000;
    else if (symbol.includes('U30') || symbol.includes('US30')) basePrice = 43000;
    else if (symbol.includes('SPX') || symbol.includes('SP500')) basePrice = 5900;
    else if (symbol.includes('NDX') || symbol.includes('NAS')) basePrice = 21000;
    else if (symbol.includes('EUR')) basePrice = 1.08;
    else if (symbol.includes('GBP')) basePrice = 1.27;
    endPrice = basePrice;
  }

  const volatility = endPrice * 0.002; // 0.2% volatility per candle
  const decimals = endPrice < 10 ? 5 : endPrice < 100 ? 4 : 2;
  
  // Generate candles working backwards from current price
  // First, pre-calculate prices by walking backwards
  const prices: number[] = [endPrice];
  for (let i = 1; i < limit; i++) {
    const change = (Math.random() - 0.5) * volatility;
    prices.unshift(prices[0] - change); // Walk backwards
  }
  
  // Now generate candles with proper OHLC from the price path
  for (let i = 0; i < limit; i++) {
    const time = Math.floor((now.getTime() - (limit - 1 - i) * interval) / 1000);
    const open = prices[i];
    const close = i < limit - 1 ? prices[i + 1] : endPrice;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;
    
    candles.push({
      time,
      open: parseFloat(open.toFixed(decimals)),
      high: parseFloat(high.toFixed(decimals)),
      low: parseFloat(low.toFixed(decimals)),
      close: parseFloat(close.toFixed(decimals)),
      volume: Math.floor(Math.random() * 10000) + 1000
    });
  }
  
  return candles;
}

export const useMetaApiCandles = (): UseMetaApiCandlesReturn => {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'yahoo' | 'metaapi' | 'mock' | null>(null);

  const fetchCandles = useCallback(async (symbol: string, timeframe: string, limit = 200, currentLivePrice?: number | null) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useMetaApiCandles] Fetching ${limit} ${timeframe} candles for ${symbol}${currentLivePrice ? ` (live: ${currentLivePrice})` : ''}`);
      
      const { data, error: fnError } = await supabase.functions.invoke('get-metaapi-candles', {
        body: { symbol, timeframe, limit }
      });

      if (fnError) {
        console.warn('[useMetaApiCandles] Edge function error, using mock data anchored to live price:', fnError);
        // Fallback to client-side mock data anchored to live price
        const mockCandles = generateMockCandles(symbol, timeframe, limit, currentLivePrice);
        setCandles(mockCandles);
        setSource('mock');
        return;
      }
      
      if (data?.candles && data.candles.length > 0) {
        console.log(`[useMetaApiCandles] Received ${data.candles.length} candles from ${data.source}`);
        setCandles(data.candles);
        setSource(data.source || 'mock');
      } else {
        console.warn('[useMetaApiCandles] No candles in response, using mock data anchored to live price');
        const mockCandles = generateMockCandles(symbol, timeframe, limit, currentLivePrice);
        setCandles(mockCandles);
        setSource('mock');
      }
    } catch (err) {
      console.warn('[useMetaApiCandles] Failed to fetch candles, using mock data anchored to live price:', err);
      // Fallback to client-side mock data anchored to live price
      const mockCandles = generateMockCandles(symbol, timeframe, limit, currentLivePrice);
      setCandles(mockCandles);
      setSource('mock');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCandles = useCallback(() => {
    setCandles([]);
    setSource(null);
    setError(null);
  }, []);

  return { candles, isLoading, error, source, fetchCandles, clearCandles };
};

export default useMetaApiCandles;
