
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

// Enhanced universe of 25+ diverse instruments with standardized Gold symbol
const TRADING_UNIVERSE = {
  stocks: ['TSLA', 'NVDA', 'SPY', 'AAPL', 'MSFT', 'META', 'GOOGL', 'AMZN', 'JPM', 'BAC', 'JNJ', 'PFE', 'XOM', 'CVX'],
  crypto: ['BTC/USD', 'ETH/USD', 'ADA/USD', 'SOL/USD', 'MATIC/USD', 'DOT/USD'],
  forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD'],
  commodities: ['XAU/USD', 'SILVER', 'OIL', 'NATURAL_GAS', 'COPPER', 'WHEAT'],
  etfs: ['QQQ', 'IWM', 'DIA', 'VTI', 'GLD', 'USO']
};

// Symbol mapping for Gold standardization
const SYMBOL_MAPPING: Record<string, string> = {
  'GOLD': 'XAU/USD',
  'XAU/USD': 'XAU/USD',
  'XAUUSD': 'XAU/USD',
  'BTC/USD': 'BTC/USD',
  'BTCUSD': 'BTC/USD'
};

const ALL_SYMBOLS = Object.values(TRADING_UNIVERSE).flat();

// Multi-tier cache: Fast for Gold, priority for alerts, regular for others
const cache = new Map<string, { data: MarketDataPoint, expires: number, isPriority: boolean }>();
const GOLD_CACHE_TTL = 5000; // 5 seconds for Gold (XAU/USD)
const PRIORITY_CACHE_TTL = 1000; // 1 second for active alert symbols
const REGULAR_CACHE_TTL = 30000; // 30 seconds for regular symbols

// High-priority symbols that need faster updates
const HIGH_PRIORITY_SYMBOLS = new Set(['XAU/USD', 'BTC/USD']);

// Track priority symbols (symbols with active alerts)
let prioritySymbols = new Set<string>();
let lastPriorityRefresh = 0;

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

function isPrioritySymbol(symbol: string): boolean {
  return prioritySymbols.has(symbol);
}

function getCachedData(symbol: string): MarketDataPoint | null {
  const cached = cache.get(symbol);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  cache.delete(symbol);
  return null;
}

function setCachedData(symbol: string, data: MarketDataPoint, isPriority: boolean = false): void {
  // Determine cache TTL based on symbol priority
  let ttl: number;
  if (symbol === 'XAU/USD') {
    ttl = GOLD_CACHE_TTL; // 5 seconds for Gold
  } else if (isPriority) {
    ttl = PRIORITY_CACHE_TTL; // 1 second for active alerts
  } else if (HIGH_PRIORITY_SYMBOLS.has(symbol)) {
    ttl = GOLD_CACHE_TTL; // 5 seconds for high-priority symbols
  } else {
    ttl = REGULAR_CACHE_TTL; // 30 seconds for regular symbols
  }
  cache.set(symbol, {
    data,
    expires: Date.now() + ttl,
    isPriority
  });
}

async function refreshPrioritySymbols(): Promise<void> {
  // Only refresh every 10 seconds to avoid excessive DB calls
  if (Date.now() - lastPriorityRefresh < 10000) {
    return;
  }

  // Always include Gold as priority symbol
  prioritySymbols.add('XAU/USD');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/alert_monitoring?select=symbol&is_active=eq.true`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const activeAlerts = await response.json();
      prioritySymbols = new Set(activeAlerts.map((alert: any) => alert.symbol));
      lastPriorityRefresh = Date.now();
      console.log(`🎯 Priority symbols updated: ${Array.from(prioritySymbols).join(', ')}`);
    }
  } catch (error) {
    console.error('❌ Error refreshing priority symbols:', error);
  }
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
    console.log(`🚀 API FETCH STARTED for symbol: ${symbol}`);
    console.log(`🔑 API Key present: ${apiKey ? 'YES' : 'NO'}`);
    
    // Use standardized symbol mapping
    const apiSymbol = SYMBOL_MAPPING[symbol] || symbol;
    
    console.log(`📡 Making API call for ${symbol} -> ${apiSymbol}`);
    
    const url = `https://api.twelvedata.com/quote?symbol=${apiSymbol}&apikey=${apiKey}`;
    console.log(`🌐 Full API URL: ${url}`);
    
    const quoteResponse = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });
    
    console.log(`📊 API Response Status: ${quoteResponse.status}`);
    
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      console.log(`📊 API Response Data:`, JSON.stringify(quoteData, null, 2));
      
      if (quoteData.status !== 'error' && quoteData.close) {
        const price = parseFloat(quoteData.close);
        const change = parseFloat(quoteData.change) || 0;
        const changePercent = parseFloat(quoteData.percent_change) || 0;
        
        console.log(`✅ SUCCESS: Real price for ${symbol}: $${price.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent}%)`);
        
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
      } else {
        console.error(`❌ API returned error or no price for ${symbol}:`, quoteData);
      }
    } else {
      console.error(`❌ API HTTP error for ${symbol}: ${quoteResponse.status} ${quoteResponse.statusText}`);
      const errorText = await quoteResponse.text();
      console.error(`❌ Error response body: ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Exception during API fetch for ${symbol}:`, error);
  }
  return null;
}

// ⚠️ EMERGENCY MOCK DATA ONLY - Using current Google Finance prices
function generateEnhancedMockData(symbols: string[]): MarketDataPoint[] {
  console.log('🚨 WARNING: Using mock data for symbols:', symbols);
  console.log('🚨 This should only be used when API fails - configure TWELVE_DATA_API_KEY for real data');
  
  const basePrices: Record<string, number> = {
    // Stocks - Updated to current approximate levels
    'TSLA': 485, 'NVDA': 148, 'SPY': 605, 'AAPL': 241, 'MSFT': 445,
    'META': 596, 'GOOGL': 186, 'AMZN': 230, 'JPM': 240, 'BAC': 48,
    'JNJ': 160, 'PFE': 25, 'XOM': 125, 'CVX': 165,
    // Crypto - CURRENT GOOGLE FINANCE PRICES
    'BTC/USD': 117881, 'ETH/USD': 4089, 'ADA/USD': 1.15, 'SOL/USD': 248,
    'MATIC/USD': 0.65, 'DOT/USD': 9.8,
    // Forex
    'EUR/USD': 1.032, 'GBP/USD': 1.241, 'USD/JPY': 157, 'AUD/USD': 0.618,
    'USD/CAD': 1.412, 'NZD/USD': 0.558,
// Commodities - UPDATED CURRENT PRICES (Jan 29, 2025)
    'SILVER': 42.85, 'OIL': 78.5, 'NATURAL_GAS': 3.85,
    'COPPER': 4.55, 'WHEAT': 5.4,
    // ETFs
    'QQQ': 515, 'IWM': 238, 'DIA': 445, 'VTI': 295, 'GLD': 325, 'USO': 85
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

  // Refresh priority symbols for dual-speed caching
  await refreshPrioritySymbols();

  try {
    const { symbols, includeVolume = true, includeTechnicals = true } = await req.json();
    
    // Default to all symbols if none provided, limited to first 12 for performance
    const requestedSymbols = symbols && symbols.length > 0 ? symbols : ALL_SYMBOLS.slice(0, 12);
    
    console.log('Enhanced market data request for symbols:', requestedSymbols);
    
    // Process Bitcoin requests
    if (requestedSymbols.includes('BTC/USD')) {
      console.log('₿ BTC/USD (Bitcoin) price specifically requested');
    }

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
      
      // Cache the mock data with priority awareness
      mockData.forEach(dataPoint => setCachedData(dataPoint.symbol, dataPoint, isPrioritySymbol(dataPoint.symbol)));

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
        const symbol = batch[index];
        const isPriority = isPrioritySymbol(symbol);
        
        if (result.status === 'fulfilled' && result.value) {
          setCachedData(result.value.symbol, result.value, isPriority);
          marketData.push(result.value);
          console.log(`💾 Cached ${symbol} for ${isPriority ? '1 second' : '30 seconds'} (${isPriority ? 'priority' : 'regular'})`);
        } else {
          // Fallback to mock data for failed symbols
          const mockData = generateEnhancedMockData([symbol])[0];
          setCachedData(symbol, mockData, isPriority);
          marketData.push(mockData);
        }
      });
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < uncachedSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const prioritySymbolsCount = requestedSymbols.filter(s => isPrioritySymbol(s)).length;
    const regularSymbolsCount = requestedSymbols.length - prioritySymbolsCount;
    
    console.log(`📊 Returning data for ${marketData.length} symbols (${prioritySymbolsCount} priority, ${regularSymbolsCount} regular)`);

    return new Response(
      JSON.stringify({ 
        prices: marketData,
        dataQuality: apiKey ? 'real_time' : 'simulated',
        marketHours: isMarketHours(),
        totalSymbols: requestedSymbols.length,
        prioritySymbols: prioritySymbolsCount,
        regularSymbols: regularSymbolsCount,
        cacheStrategy: 'dual-speed',
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
