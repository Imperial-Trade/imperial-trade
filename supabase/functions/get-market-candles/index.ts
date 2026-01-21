import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Map our symbols to Yahoo Finance tickers
const YAHOO_SYMBOLS: Record<string, string> = {
  'XAUUSD': 'GC=F',        // Gold Futures
  'BTCUSD': 'BTC-USD',     // Bitcoin
  'U30USD': 'YM=F',        // Dow Futures
  'SPXUSD': 'ES=F',        // S&P 500 Futures
  'NDXUSD': 'NQ=F',        // Nasdaq Futures
};

// Map timeframes to Yahoo Finance intervals
const YAHOO_INTERVALS: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '1h',  // Yahoo doesn't support 4h, we'll aggregate
  '1d': '1d',
  '1w': '1wk',
};

// Map timeframes to Yahoo Finance ranges
const YAHOO_RANGES: Record<string, string> = {
  '1m': '1d',
  '5m': '5d',
  '15m': '5d',
  '30m': '5d',
  '1h': '1mo',
  '4h': '3mo',
  '1d': '6mo',
  '1w': '2y',
};

// Map our symbols to OANDA instruments (for fallback)
const OANDA_SYMBOLS: Record<string, string> = {
  'XAUUSD': 'XAU_USD',
  'BTCUSD': 'BTC_USD',
  'U30USD': 'US30_USD',
  'SPXUSD': 'SPX500_USD',
  'NDXUSD': 'NAS100_USD',
};

// Map timeframes to OANDA granularity
const OANDA_GRANULARITY: Record<string, string> = {
  '1m': 'M1',
  '5m': 'M5',
  '15m': 'M15',
  '30m': 'M30',
  '1h': 'H1',
  '4h': 'H4',
  '1d': 'D',
  '1w': 'W',
};

async function fetchFromYahoo(symbol: string, timeframe: string, count: number): Promise<{ candles: CandleData[], source: string } | null> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol];
  const interval = YAHOO_INTERVALS[timeframe];
  const range = YAHOO_RANGES[timeframe];

  if (!yahooSymbol || !interval) {
    console.log(`[Yahoo] Symbol ${symbol} or timeframe ${timeframe} not supported`);
    return null;
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`;
  console.log(`[Yahoo] Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    if (!response.ok) {
      console.error(`[Yahoo] HTTP error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      console.error('[Yahoo] Invalid response structure');
      return null;
    }

    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    const candles: CandleData[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open[i] !== null && quote.close[i] !== null) {
        candles.push({
          time: timestamps[i],
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume[i] || 0,
        });
      }
    }

    // If 4h timeframe, aggregate from 1h candles
    if (timeframe === '4h' && candles.length > 0) {
      const aggregated: CandleData[] = [];
      for (let i = 0; i < candles.length; i += 4) {
        const chunk = candles.slice(i, Math.min(i + 4, candles.length));
        if (chunk.length > 0) {
          aggregated.push({
            time: chunk[0].time,
            open: chunk[0].open,
            high: Math.max(...chunk.map(c => c.high)),
            low: Math.min(...chunk.map(c => c.low)),
            close: chunk[chunk.length - 1].close,
            volume: chunk.reduce((sum, c) => sum + c.volume, 0),
          });
        }
      }
      return { candles: aggregated.slice(-count), source: 'yahoo' };
    }

    // Return the last 'count' candles
    return { candles: candles.slice(-count), source: 'yahoo' };
  } catch (error) {
    console.error('[Yahoo] Error:', error);
    return null;
  }
}

async function fetchFromOanda(symbol: string, timeframe: string, count: number): Promise<{ candles: CandleData[], source: string } | null> {
  const oandaToken = Deno.env.get('OANDA_API_TOKEN');
  const accountType = Deno.env.get('OANDA_ACCOUNT_TYPE') || 'practice';
  
  if (!oandaToken) {
    console.log('[OANDA] No API token configured');
    return null;
  }

  const oandaSymbol = OANDA_SYMBOLS[symbol];
  const granularity = OANDA_GRANULARITY[timeframe];

  if (!oandaSymbol || !granularity) {
    console.log(`[OANDA] Symbol ${symbol} or timeframe ${timeframe} not supported`);
    return null;
  }

  const baseUrl = accountType === 'live' 
    ? 'https://api-fxtrade.oanda.com'
    : 'https://api-fxpractice.oanda.com';

  const url = `${baseUrl}/v3/instruments/${oandaSymbol}/candles?granularity=${granularity}&count=${count}&price=M`;
  console.log(`[OANDA] Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${oandaToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OANDA] API error ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data.candles || data.candles.length === 0) {
      console.warn('[OANDA] No candles returned');
      return null;
    }

    const candles: CandleData[] = data.candles
      .filter((c: any) => c.complete)
      .map((c: any) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: parseFloat(c.mid.o),
        high: parseFloat(c.mid.h),
        low: parseFloat(c.mid.l),
        close: parseFloat(c.mid.c),
        volume: c.volume || 0,
      }));

    return { candles, source: 'oanda' };
  } catch (error) {
    console.error('[OANDA] Error:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const symbol = body.symbol;
    const timeframe = body.timeframe?.toLowerCase() || '1h'; // Normalize to lowercase
    const count = body.count || 100;
    
    console.log(`[Candles] Fetching ${count} ${timeframe} candles for ${symbol}`);

    // Try Yahoo Finance first (free, no API key needed)
    let result = await fetchFromYahoo(symbol, timeframe, count);
    
    // If Yahoo fails, try OANDA
    if (!result || result.candles.length === 0) {
      console.log('[Candles] Yahoo failed, trying OANDA...');
      result = await fetchFromOanda(symbol, timeframe, count);
    }

    // If both fail, return error
    if (!result || result.candles.length === 0) {
      console.error('[Candles] All data sources failed');
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch market data. Please try again later.',
        candles: [],
        source: 'error'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Candles] Returning ${result.candles.length} candles from ${result.source}`);

    return new Response(JSON.stringify({ 
      candles: result.candles,
      source: result.source,
      symbol,
      timeframe,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Candles] Error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      candles: [],
      source: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
