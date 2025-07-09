
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols, includeVolume } = await req.json();
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    
    console.log('Market data request for symbols:', symbols);

    if (!apiKey) {
      console.log('No Twelve Data API key found, using mock data');
      
      // Generate realistic mock data for requested symbols
      const mockData: MarketDataPoint[] = symbols.map((symbol: string) => ({
        symbol,
        price: Math.random() * 1000 + 100, // Random price between 100-1100
        change: (Math.random() - 0.5) * 20, // Random change between -10 to +10
        changePercent: (Math.random() - 0.5) * 5, // Random percent change between -2.5% to +2.5%
        volume: includeVolume ? Math.floor(Math.random() * 1000000) + 100000 : undefined,
        timestamp: new Date().toISOString()
      }));

      return new Response(
        JSON.stringify({ prices: mockData }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Use Twelve Data API for real market data
    const marketData: MarketDataPoint[] = [];
    
    for (const symbol of symbols) {
      try {
        const response = await fetch(
          `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`
        );
        
        if (!response.ok) {
          console.error(`Failed to fetch data for ${symbol}:`, response.status);
          continue;
        }
        
        const data = await response.json();
        
        if (data.status === 'error') {
          console.error(`API error for ${symbol}:`, data.message);
          continue;
        }
        
        marketData.push({
          symbol: data.symbol || symbol,
          price: parseFloat(data.close) || 0,
          change: parseFloat(data.change) || 0,
          changePercent: parseFloat(data.percent_change) || 0,
          volume: includeVolume ? parseInt(data.volume) || undefined : undefined,
          timestamp: new Date().toISOString()
        });
        
        // Add small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
      }
    }

    console.log('Returning market data for', marketData.length, 'symbols');

    return new Response(
      JSON.stringify({ prices: marketData }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
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
