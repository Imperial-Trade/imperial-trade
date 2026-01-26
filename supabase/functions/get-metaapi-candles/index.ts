import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Map our symbols to Yahoo Finance symbols
function getYahooSymbol(symbol: string): string {
  const symbolMap: Record<string, string> = {
    'XAUUSD': 'GC=F',      // Gold Futures
    'BTCUSD': 'BTC-USD',   // Bitcoin
    'U30USD': 'YM=F',      // Dow Jones Futures
    'SPXUSD': 'ES=F',      // S&P 500 Futures
    'NDXUSD': 'NQ=F',      // Nasdaq Futures
    'EURUSD': 'EURUSD=X',  // EUR/USD
    'GBPUSD': 'GBPUSD=X',  // GBP/USD
  };
  return symbolMap[symbol] || symbol;
}

// Map timeframe to Yahoo Finance interval
function getYahooInterval(tf: string): { interval: string; range: string } {
  const tfMap: Record<string, { interval: string; range: string }> = {
    '1m': { interval: '1m', range: '1d' },
    '5m': { interval: '5m', range: '5d' },
    '15m': { interval: '15m', range: '5d' },
    '30m': { interval: '30m', range: '1mo' },
    '1h': { interval: '1h', range: '1mo' },
    '4h': { interval: '1h', range: '3mo' }, // Yahoo doesn't have 4h, use 1h
    '1d': { interval: '1d', range: '1y' },
    '1w': { interval: '1wk', range: '5y' },
  };
  return tfMap[tf] || { interval: '1h', range: '1mo' };
}

// Map common symbols to MetaApi format
function normalizeSymbolForMetaApi(symbol: string): string {
  const symbolMap: Record<string, string> = {
    'XAUUSD': 'XAUUSD',
    'BTCUSD': 'BTCUSD',
    'U30USD': 'US30',
    'SPXUSD': 'SPX500',
    'NDXUSD': 'NAS100',
    'EURUSD': 'EURUSD',
    'GBPUSD': 'GBPUSD',
  };
  return symbolMap[symbol] || symbol;
}

// Map MetaApi timeframe format
function normalizeTimeframeForMetaApi(tf: string): string {
  const tfMap: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1w',
  };
  return tfMap[tf] || '1h';
}

// Fetch historical data from Yahoo Finance (free, no API key needed)
async function fetchYahooCandles(symbol: string, timeframe: string, limit: number): Promise<CandleData[] | null> {
  try {
    const yahooSymbol = getYahooSymbol(symbol);
    const { interval, range } = getYahooInterval(timeframe);
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
    
    console.log('Fetching from Yahoo Finance:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('Yahoo Finance error:', response.status);
      return null;
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      console.error('Invalid Yahoo Finance response structure');
      return null;
    }
    
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    
    const candles: CandleData[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      // Skip if any OHLC value is null
      if (quote.open[i] == null || quote.high[i] == null || quote.low[i] == null || quote.close[i] == null) {
        continue;
      }
      
      candles.push({
        time: timestamps[i],
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume?.[i] || 0
      });
    }
    
    // Sort by time and limit
    candles.sort((a, b) => a.time - b.time);
    
    // Return last N candles
    const limitedCandles = candles.slice(-limit);
    
    console.log(`Yahoo Finance returned ${limitedCandles.length} candles for ${symbol}`);
    return limitedCandles;
    
  } catch (error) {
    console.error('Yahoo Finance fetch error:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframe, limit = 200, startTime } = await req.json();
    
    console.log('Historical candles request:', { symbol, timeframe, limit });

    // Try Yahoo Finance first (free, no API key needed)
    const yahooCandles = await fetchYahooCandles(symbol, timeframe, limit);
    if (yahooCandles && yahooCandles.length > 0) {
      return new Response(JSON.stringify({ candles: yahooCandles, source: 'yahoo' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Fallback to MetaApi if available
    const metaApiToken = Deno.env.get('META_API_TOKEN');
    const metaApiAccountId = Deno.env.get('META_API_ACCOUNT_ID');
    const region = Deno.env.get('META_API_REGION') || 'new-york';

    // If no MetaApi credentials, generate mock data
    if (!metaApiToken || !metaApiAccountId) {
      console.log('No data sources available, generating mock data');
      const mockCandles = generateMockCandles(symbol, timeframe, limit);
      return new Response(JSON.stringify({ candles: mockCandles, source: 'mock' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Normalize symbol and timeframe for MetaApi
    const metaApiSymbol = normalizeSymbolForMetaApi(symbol);
    const metaApiTimeframe = normalizeTimeframeForMetaApi(timeframe);

    // MetaApi historical candles REST endpoint
    const startTimeParam = startTime || new Date().toISOString();
    const url = `https://mt-market-data-client-api-v1.${region}.agiliumtrade.ai/users/current/accounts/${metaApiAccountId}/historical-market-data/symbols/${metaApiSymbol}/timeframes/${metaApiTimeframe}/candles?startTime=${startTimeParam}&limit=${limit}`;

    console.log('Fetching from MetaApi:', url.replace(metaApiAccountId, 'xxx'));

    const response = await fetch(url, {
      headers: {
        'auth-token': metaApiToken,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MetaApi error:', response.status, errorText);
      // Fallback to mock data on error
      const mockCandles = generateMockCandles(symbol, timeframe, limit);
      return new Response(JSON.stringify({ candles: mockCandles, source: 'mock', error: errorText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const metaApiCandles = await response.json();
    
    // Map to Lightweight Charts format (time as Unix seconds)
    const candles: CandleData[] = metaApiCandles.map((c: any) => ({
      time: Math.floor(new Date(c.time).getTime() / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.tickVolume || c.volume || 0
    })).sort((a: CandleData, b: CandleData) => a.time - b.time);

    console.log(`Returning ${candles.length} candles from MetaApi`);

    return new Response(JSON.stringify({ candles, source: 'metaapi' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function generateMockCandles(symbol: string, timeframe: string, limit: number): CandleData[] {
  const candles: CandleData[] = [];
  const now = new Date();
  
  // Determine interval in milliseconds
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

  // Base price by symbol
  let basePrice = 100;
  if (symbol.includes('XAU') || symbol.includes('GOLD')) basePrice = 2650;
  else if (symbol.includes('BTC')) basePrice = 95000;
  else if (symbol.includes('U30') || symbol.includes('US30')) basePrice = 43000;
  else if (symbol.includes('SPX') || symbol.includes('SP500')) basePrice = 5900;
  else if (symbol.includes('NDX') || symbol.includes('NAS')) basePrice = 21000;
  else if (symbol.includes('EUR')) basePrice = 1.08;
  else if (symbol.includes('GBP')) basePrice = 1.27;

  let price = basePrice;
  const volatility = basePrice * 0.002; // 0.2% volatility
  
  for (let i = limit - 1; i >= 0; i--) {
    const time = Math.floor((now.getTime() - i * interval) / 1000);
    const change = (Math.random() - 0.5) * volatility;
    
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    
    // Determine decimal places based on price magnitude
    const decimals = basePrice < 10 ? 5 : basePrice < 100 ? 4 : 2;
    
    candles.push({
      time,
      open: parseFloat(open.toFixed(decimals)),
      high: parseFloat(high.toFixed(decimals)),
      low: parseFloat(low.toFixed(decimals)),
      close: parseFloat(close.toFixed(decimals)),
      volume: Math.floor(Math.random() * 10000) + 1000
    });
    
    price = close;
  }
  
  return candles;
}
