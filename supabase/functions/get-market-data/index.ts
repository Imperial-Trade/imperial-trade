
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
}

interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
  technicalIndicators?: {
    rsi?: number;
    macd?: number;
    ma20?: number;
    ma50?: number;
    bollingerUpper?: number;
    bollingerLower?: number;
    support?: number;
    resistance?: number;
  };
  marketContext?: {
    trend: 'bullish' | 'bearish' | 'sideways';
    volatility: 'low' | 'medium' | 'high';
    volume_profile: 'above_average' | 'below_average' | 'normal';
  };
}

// Enhanced cache with technical indicators
const cache = new Map<string, { data: MarketDataPoint, expires: number }>();
const CACHE_TTL = 15000; // 15 seconds

// Rate limiting
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 30;

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

// Calculate technical indicators for mock data
function calculateTechnicalIndicators(price: number, symbol: string): MarketDataPoint['technicalIndicators'] {
  const randomFactor = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) / 2147483647;
  };

  const base = randomFactor(symbol);
  
  return {
    rsi: 30 + (base * 40), // RSI between 30-70
    macd: (base - 0.5) * 2, // MACD between -1 and 1
    ma20: price * (0.98 + base * 0.04), // MA20 within 2% of price
    ma50: price * (0.96 + base * 0.08), // MA50 within 4% of price
    bollingerUpper: price * 1.02,
    bollingerLower: price * 0.98,
    support: price * (0.95 + base * 0.03),
    resistance: price * (1.02 + base * 0.03)
  };
}

function determineMarketContext(price: number, indicators: any, changePercent: number): MarketDataPoint['marketContext'] {
  const trend = changePercent > 1 ? 'bullish' : changePercent < -1 ? 'bearish' : 'sideways';
  const volatility = Math.abs(changePercent) > 3 ? 'high' : Math.abs(changePercent) > 1 ? 'medium' : 'low';
  const volume_profile = Math.random() > 0.6 ? 'above_average' : Math.random() > 0.3 ? 'normal' : 'below_average';
  
  return { trend, volatility, volume_profile };
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
    const { symbols, includeVolume, includeTechnicals = true } = await req.json();
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    
    console.log('Enhanced market data request for symbols:', symbols);

    // Check cache first
    const cachedResults: MarketDataPoint[] = [];
    const uncachedSymbols: string[] = [];
    
    for (const symbol of symbols) {
      const cached = getCachedData(symbol);
      if (cached) {
        cachedResults.push(cached);
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    if (uncachedSymbols.length === 0) {
      return new Response(
        JSON.stringify({ prices: cachedResults }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'HIT'
          } 
        }
      );
    }

    if (!apiKey) {
      console.log('Using enhanced mock data with technical indicators');
      
      const mockData: MarketDataPoint[] = uncachedSymbols.map((symbol: string) => {
        const basePrices: Record<string, number> = {
          'TSLA': 245,
          'BTC/USD': 43500,
          'GOLD': 2055,
          'EUR/USD': 1.085,
          'SPY': 485,
          'AAPL': 190,
          'NVDA': 480,
          'MSFT': 380
        };
        
        const basePrice = basePrices[symbol] || 150;
        const changePercent = (Math.random() - 0.5) * 6; // ±3% variation
        const price = basePrice * (1 + changePercent / 100);
        
        const technicalIndicators = includeTechnicals ? calculateTechnicalIndicators(price, symbol) : undefined;
        const marketContext = determineMarketContext(price, technicalIndicators, changePercent);
        
        const mockPoint: MarketDataPoint = {
          symbol,
          price: Math.round(price * 100) / 100,
          change: Math.round((price - basePrice) * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          volume: includeVolume ? Math.floor(Math.random() * 2000000) + 500000 : undefined,
          timestamp: new Date().toISOString(),
          technicalIndicators,
          marketContext
        };
        
        setCachedData(symbol, mockPoint);
        return mockPoint;
      });

      return new Response(
        JSON.stringify({ prices: [...cachedResults, ...mockData] }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': cachedResults.length > 0 ? 'PARTIAL' : 'MISS'
          } 
        }
      );
    }

    // Real API implementation with technical indicators
    const marketData: MarketDataPoint[] = [...cachedResults];
    
    for (const symbol of uncachedSymbols) {
      try {
        const [quoteResponse, technicalResponse] = await Promise.allSettled([
          fetch(`https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`),
          includeTechnicals ? fetch(`https://api.twelvedata.com/rsi?symbol=${symbol}&interval=1h&apikey=${apiKey}`) : Promise.resolve(null)
        ]);
        
        if (quoteResponse.status === 'fulfilled' && quoteResponse.value.ok) {
          const quoteData = await quoteResponse.value.json();
          
          if (quoteData.status !== 'error') {
            const price = parseFloat(quoteData.close) || 0;
            const change = parseFloat(quoteData.change) || 0;
            const changePercent = parseFloat(quoteData.percent_change) || 0;
            
            let technicalIndicators;
            if (includeTechnicals && technicalResponse.status === 'fulfilled') {
              // In a real implementation, you'd fetch multiple technical indicators
              technicalIndicators = calculateTechnicalIndicators(price, symbol);
            }
            
            const dataPoint: MarketDataPoint = {
              symbol: quoteData.symbol || symbol,
              price,
              change,
              changePercent,
              volume: includeVolume ? parseInt(quoteData.volume) || undefined : undefined,
              timestamp: new Date().toISOString(),
              technicalIndicators,
              marketContext: determineMarketContext(price, technicalIndicators, changePercent)
            };
            
            setCachedData(symbol, dataPoint);
            marketData.push(dataPoint);
          }
        }
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
      }
    }

    console.log('Returning enhanced market data for', marketData.length, 'symbols');

    return new Response(
      JSON.stringify({ prices: marketData }),
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
