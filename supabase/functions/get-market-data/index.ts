
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=5, stale-while-revalidate=10', // Cache for 5 seconds
}

interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

// Simple in-memory cache with TTL
const cache = new Map<string, { data: MarketDataPoint, expires: number }>();
const CACHE_TTL = 5000; // 5 seconds

// Rate limiting map
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute per IP

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
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
    const { symbols, includeVolume } = await req.json();
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    
    console.log('Market data request for symbols:', symbols);

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

    // If all data is cached, return immediately
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
      console.log('No Twelve Data API key found, using mock data');
      
      // Generate realistic mock data for uncached symbols
      const mockData: MarketDataPoint[] = uncachedSymbols.map((symbol: string) => {
        const basePrice = symbol === 'XAU/USD' ? 2050 : 43500;
        const mockPoint = {
          symbol,
          price: basePrice + (Math.random() - 0.5) * (basePrice * 0.02), // ±2% variation
          change: (Math.random() - 0.5) * 20,
          changePercent: (Math.random() - 0.5) * 5,
          volume: includeVolume ? Math.floor(Math.random() * 1000000) + 100000 : undefined,
          timestamp: new Date().toISOString()
        };
        
        // Cache the mock data
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

    // Fetch data for uncached symbols with optimized batch processing
    const marketData: MarketDataPoint[] = [...cachedResults];
    const fetchPromises = uncachedSymbols.map(async (symbol) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch(
          `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error(`Failed to fetch data for ${symbol}:`, response.status);
          return null;
        }
        
        const data = await response.json();
        
        if (data.status === 'error') {
          console.error(`API error for ${symbol}:`, data.message);
          return null;
        }
        
        const dataPoint: MarketDataPoint = {
          symbol: data.symbol || symbol,
          price: parseFloat(data.close) || 0,
          change: parseFloat(data.change) || 0,
          changePercent: parseFloat(data.percent_change) || 0,
          volume: includeVolume ? parseInt(data.volume) || undefined : undefined,
          timestamp: new Date().toISOString()
        };
        
        // Cache the fetched data
        setCachedData(symbol, dataPoint);
        return dataPoint;
        
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        return null;
      }
    });

    // Wait for all requests to complete with a reasonable timeout
    const results = await Promise.allSettled(fetchPromises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        marketData.push(result.value);
      }
    });

    console.log('Returning market data for', marketData.length, 'symbols');

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
    console.error('Market data error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch market data',
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
