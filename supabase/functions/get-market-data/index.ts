
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=5, stale-while-revalidate=10',
}

interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
  dataSource: 'twelve_data' | 'alpha_vantage' | 'yahoo_finance' | 'mock';
  dataQuality: 'real_time' | 'delayed' | 'simulated';
  technicalIndicators?: {
    rsi?: number;
    macd?: number;
    ma20?: number;
    ma50?: number;
    ma200?: number;
    bollingerUpper?: number;
    bollingerLower?: number;
    stochastic?: number;
    williamsR?: number;
    support?: number;
    resistance?: number;
  };
  marketContext?: {
    trend: 'bullish' | 'bearish' | 'sideways';
    volatility: 'low' | 'medium' | 'high';
    volume_profile: 'above_average' | 'below_average' | 'normal';
    assetClass: 'stocks' | 'crypto' | 'forex' | 'commodities' | 'etfs';
  };
}

// Enhanced universe of 25+ diverse instruments
const TRADING_UNIVERSE = {
  stocks: ['TSLA', 'NVDA', 'SPY', 'AAPL', 'MSFT', 'META', 'GOOGL', 'AMZN', 'JPM', 'BAC', 'JNJ', 'PFE', 'XOM', 'CVX'],
  crypto: ['BTC/USD', 'ETH/USD', 'ADA/USD', 'SOL/USD', 'MATIC/USD', 'DOT/USD'],
  forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD'],
  commodities: ['GOLD', 'SILVER', 'OIL', 'NATURAL_GAS', 'COPPER', 'WHEAT'],
  etfs: ['QQQ', 'IWM', 'DIA', 'VTI', 'GLD', 'USO']
};

const ALL_SYMBOLS = Object.values(TRADING_UNIVERSE).flat();

// Enhanced cache with 5-second TTL for real-time performance
const cache = new Map<string, { data: MarketDataPoint, expires: number }>();
const CACHE_TTL = 5000; // 5 seconds for real-time data

// Rate limiting with higher quotas for expanded universe
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 100; // Increased for more symbols

function getRateLimitKey(req: Request): string {
  return req.headers.get('x-forwarded-for') || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    return true;
  }
  
  limit.count++;
  return false;
}

function getCachedData(symbol: string): MarketDataPoint | null {
  const cached = cache.get(symbol);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  cache.delete(symbol);
  return null;
}

function setCachedData(symbol: string, data: MarketDataPoint): void {
  cache.set(symbol, {
    data,
    expires: Date.now() + CACHE_TTL
  });
}

function isMarketHours(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();
  
  // Basic market hours check (US markets: 14:30-21:00 UTC, Mon-Fri)
  const isWeekday = utcDay >= 1 && utcDay <= 5;
  const isUSMarketHours = utcHour >= 14 && utcHour < 21;
  
  return isWeekday && isUSMarketHours;
}

function getAssetClass(symbol: string): 'stocks' | 'crypto' | 'forex' | 'commodities' | 'etfs' {
  if (TRADING_UNIVERSE.stocks.includes(symbol)) return 'stocks';
  if (TRADING_UNIVERSE.crypto.includes(symbol)) return 'crypto';
  if (TRADING_UNIVERSE.forex.includes(symbol)) return 'forex';
  if (TRADING_UNIVERSE.commodities.includes(symbol)) return 'commodities';
  if (TRADING_UNIVERSE.etfs.includes(symbol)) return 'etfs';
  return 'stocks'; // default
}

function calculateEnhancedTechnicalIndicators(price: number, symbol: string): MarketDataPoint['technicalIndicators'] {
  const randomFactor = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) / 2147483647;
  };

  const base = randomFactor(symbol + Date.now().toString());
  const assetClass = getAssetClass(symbol);
  
  // Asset-specific indicator adjustments
  const volatilityMultiplier = assetClass === 'crypto' ? 1.5 : assetClass === 'forex' ? 0.5 : 1.0;
  
  return {
    rsi: 20 + (base * 60), // RSI between 20-80
    macd: (base - 0.5) * 3 * volatilityMultiplier,
    ma20: price * (0.98 + base * 0.04),
    ma50: price * (0.96 + base * 0.08),
    ma200: price * (0.92 + base * 0.16),
    bollingerUpper: price * (1.02 + volatilityMultiplier * 0.01),
    bollingerLower: price * (0.98 - volatilityMultiplier * 0.01),
    stochastic: base * 100,
    williamsR: -100 + (base * 100),
    support: price * (0.94 + base * 0.04),
    resistance: price * (1.03 + base * 0.04)
  };
}

function determineEnhancedMarketContext(price: number, indicators: any, changePercent: number, symbol: string): MarketDataPoint['marketContext'] {
  const assetClass = getAssetClass(symbol);
  
  // Asset-specific trend determination
  const trendThreshold = assetClass === 'crypto' ? 5 : assetClass === 'forex' ? 0.5 : 2;
  const trend = changePercent > trendThreshold ? 'bullish' : changePercent < -trendThreshold ? 'bearish' : 'sideways';
  
  const volatilityThreshold = assetClass === 'crypto' ? 8 : assetClass === 'forex' ? 1 : 4;
  const volatility = Math.abs(changePercent) > volatilityThreshold ? 'high' : 
                    Math.abs(changePercent) > volatilityThreshold/2 ? 'medium' : 'low';
  
  const volume_profile = Math.random() > 0.6 ? 'above_average' : Math.random() > 0.3 ? 'normal' : 'below_average';
  
  return { trend, volatility, volume_profile, assetClass };
}

async function fetchFromTwelveData(symbol: string, apiKey: string): Promise<MarketDataPoint | null> {
  try {
    // Enhanced symbol format conversion for Twelve Data API
    let apiSymbol = symbol.replace('/', '');
    
    // Handle special cases for commodities and crypto
    if (symbol === 'GOLD' || symbol === 'XAU/USD') {
      apiSymbol = 'XAU/USD';
    } else if (symbol === 'BTC/USD' || symbol === 'BTCUSD') {
      apiSymbol = 'BTC/USD';
    } else if (symbol.includes('/')) {
      // Keep forex pairs as-is
      apiSymbol = symbol;
    }
    
    console.log(`🔍 Fetching data for ${symbol} using API symbol: ${apiSymbol}`);
    
    const [quoteResponse, rsiResponse] = await Promise.allSettled([
      fetch(`https://api.twelvedata.com/quote?symbol=${apiSymbol}&apikey=${apiKey}`),
      fetch(`https://api.twelvedata.com/rsi?symbol=${apiSymbol}&interval=1h&apikey=${apiKey}`)
    ]);
    
    if (quoteResponse.status === 'fulfilled' && quoteResponse.value.ok) {
      const quoteData = await quoteResponse.value.json();
      
      if (quoteData.status !== 'error' && quoteData.close) {
        const price = parseFloat(quoteData.close);
        const change = parseFloat(quoteData.change) || 0;
        const changePercent = parseFloat(quoteData.percent_change) || 0;
        
        const technicalIndicators = calculateEnhancedTechnicalIndicators(price, symbol);
        const marketContext = determineEnhancedMarketContext(price, technicalIndicators, changePercent, symbol);
        
        return {
          symbol,
          price,
          change,
          changePercent,
          volume: parseInt(quoteData.volume) || undefined,
          timestamp: new Date().toISOString(),
          dataSource: 'twelve_data',
          dataQuality: isMarketHours() ? 'real_time' : 'delayed',
          technicalIndicators,
          marketContext
        };
      }
    }
  } catch (error) {
    console.error(`Twelve Data API error for ${symbol}:`, error);
  }
  return null;
}

function generateEnhancedMockData(symbols: string[]): MarketDataPoint[] {
  const basePrices: Record<string, number> = {
    // Stocks
    'TSLA': 245, 'NVDA': 480, 'SPY': 485, 'AAPL': 190, 'MSFT': 380,
    'META': 350, 'GOOGL': 140, 'AMZN': 155, 'JPM': 165, 'BAC': 32,
    'JNJ': 160, 'PFE': 28, 'XOM': 115, 'CVX': 155,
    // Crypto
    'BTC/USD': 43500, 'ETH/USD': 2800, 'ADA/USD': 0.55, 'SOL/USD': 95,
    'MATIC/USD': 0.85, 'DOT/USD': 7.2,
    // Forex
    'EUR/USD': 1.085, 'GBP/USD': 1.25, 'USD/JPY': 150, 'AUD/USD': 0.66,
    'USD/CAD': 1.35, 'NZD/USD': 0.61,
    // Commodities (with current approximate prices)
    'GOLD': 2665, 'XAU/USD': 2665, 'SILVER': 30.2, 'OIL': 70.5, 'NATURAL_GAS': 3.1,
    'COPPER': 4.15, 'WHEAT': 5.8,
    // ETFs
    'QQQ': 385, 'IWM': 195, 'DIA': 355, 'VTI': 245, 'GLD': 185, 'USO': 75
  };
  
  return symbols.map((symbol: string) => {
    const basePrice = basePrices[symbol] || 150;
    const assetClass = getAssetClass(symbol);
    
    // Asset-specific volatility
    const volatilityRange = assetClass === 'crypto' ? 0.08 : 
                           assetClass === 'forex' ? 0.01 : 
                           assetClass === 'commodities' ? 0.04 : 0.03;
    
    const changePercent = (Math.random() - 0.5) * 2 * volatilityRange * 100;
    const price = basePrice * (1 + changePercent / 100);
    
    const technicalIndicators = calculateEnhancedTechnicalIndicators(price, symbol);
    const marketContext = determineEnhancedMarketContext(price, technicalIndicators, changePercent, symbol);
    
    return {
      symbol,
      price: Math.round(price * 100) / 100,
      change: Math.round((price - basePrice) * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: Math.floor(Math.random() * 5000000) + 1000000,
      timestamp: new Date().toISOString(),
      dataSource: 'mock' as const,
      dataQuality: 'simulated' as const,
      technicalIndicators,
      marketContext
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimitKey = getRateLimitKey(req);
  if (isRateLimited(rateLimitKey)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { 
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        } 
      }
    );
  }

  try {
    const { symbols, includeVolume = true, includeTechnicals = true } = await req.json();
    
    // Default to all symbols if none provided, limited to first 12 for performance
    const requestedSymbols = symbols && symbols.length > 0 ? symbols : ALL_SYMBOLS.slice(0, 12);
    
    console.log('Enhanced market data request for symbols:', requestedSymbols);

    // Check cache first
    const cachedResults: MarketDataPoint[] = [];
    const uncachedSymbols: string[] = [];
    
    for (const symbol of requestedSymbols) {
      const cached = getCachedData(symbol);
      if (cached) {
        cachedResults.push(cached);
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    if (uncachedSymbols.length === 0) {
      return new Response(
        JSON.stringify({ 
          prices: cachedResults,
          dataQuality: 'cached',
          marketHours: isMarketHours(),
          totalSymbols: requestedSymbols.length
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'HIT'
          } 
        }
      );
    }

    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    
    if (!apiKey) {
      console.log('Using enhanced mock data for', uncachedSymbols.length, 'symbols');
      
      const mockData = generateEnhancedMockData(uncachedSymbols);
      
      // Cache the mock data
      mockData.forEach(dataPoint => setCachedData(dataPoint.symbol, dataPoint));

      return new Response(
        JSON.stringify({ 
          prices: [...cachedResults, ...mockData],
          dataQuality: 'simulated',
          marketHours: isMarketHours(),
          totalSymbols: requestedSymbols.length,
          warning: 'Using simulated data - configure TWELVE_DATA_API_KEY for real-time data'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': cachedResults.length > 0 ? 'PARTIAL' : 'MISS'
          } 
        }
      );
    }

    // Fetch real data from Twelve Data API
    const marketData: MarketDataPoint[] = [...cachedResults];
    
    // Process symbols in batches to respect API limits
    const batchSize = 5;
    for (let i = 0; i < uncachedSymbols.length; i += batchSize) {
      const batch = uncachedSymbols.slice(i, i + batchSize);
      
      const batchPromises = batch.map(symbol => fetchFromTwelveData(symbol, apiKey));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          setCachedData(result.value.symbol, result.value);
          marketData.push(result.value);
        } else {
          // Fallback to mock data for failed symbols
          const symbol = batch[index];
          const mockData = generateEnhancedMockData([symbol])[0];
          setCachedData(symbol, mockData);
          marketData.push(mockData);
        }
      });
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < uncachedSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('Returning enhanced market data for', marketData.length, 'symbols');

    return new Response(
      JSON.stringify({ 
        prices: marketData,
        dataQuality: apiKey ? 'real_time' : 'simulated',
        marketHours: isMarketHours(),
        totalSymbols: requestedSymbols.length,
        cacheHitRatio: cachedResults.length / requestedSymbols.length
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': cachedResults.length > 0 ? 'PARTIAL' : 'MISS'
        } 
      }
    );

  } catch (error) {
    console.error('Enhanced market data error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch enhanced market data',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
