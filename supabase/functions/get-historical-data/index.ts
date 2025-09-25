
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HistoricalDataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, interval, startDate, endDate } = await req.json();
    const traderMadeApiKey = Deno.env.get('TRADERMADE_API_KEY');
    
    console.log('Historical data request:', { symbol, interval, startDate, endDate });

    if (!traderMadeApiKey) {
      console.log('No TraderMade API key found, generating mock historical data');
      
      // Generate mock historical data
      const mockData: HistoricalDataPoint[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayMs = 24 * 60 * 60 * 1000;
      
      let basePrice = 100;
      
      for (let date = new Date(start); date <= end; date.setTime(date.getTime() + dayMs)) {
        const volatility = 0.02; // 2% volatility
        const change = (Math.random() - 0.5) * volatility;
        
        const open = basePrice;
        const close = open * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        
        mockData.push({
          timestamp: date.toISOString(),
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume: Math.floor(Math.random() * 1000000) + 100000
        });
        
        basePrice = close;
      }

      return new Response(
        JSON.stringify({ historical: mockData }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Use TraderMade API for real historical data (or fallback to enhanced mock)
    let historicalData: HistoricalDataPoint[] = [];
    
    try {
      // Try TraderMade historical API first
      const response = await fetch(
        `https://marketdata.tradermade.com/api/v1/timeseries?currency=${symbol}&api_key=${traderMadeApiKey}&start_date=${startDate}&end_date=${endDate}&format=records`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.quotes && Array.isArray(data.quotes)) {
          historicalData = data.quotes.map((item: any) => ({
            timestamp: item.date,
            open: parseFloat(item.open) || parseFloat(item.mid) || 100,
            high: parseFloat(item.high) || parseFloat(item.mid) * 1.01 || 101,
            low: parseFloat(item.low) || parseFloat(item.mid) * 0.99 || 99,
            close: parseFloat(item.close) || parseFloat(item.mid) || 100,
            volume: Math.floor(Math.random() * 1000000) + 100000
          }));
          console.log('Using TraderMade historical data');
        }
      }
    } catch (error) {
      console.log('TraderMade historical API failed, using enhanced mock:', (error as Error).message);
    }
    
    // Enhanced mock data if TraderMade fails
    if (historicalData.length === 0) {
      console.log('Generating enhanced mock historical data');
      historicalData = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayMs = 24 * 60 * 60 * 1000;
      
      let basePrice = 100;
      if (symbol.includes('XAU') || symbol.includes('GOLD')) basePrice = 2000;
      if (symbol.includes('BTC')) basePrice = 45000;
      
      for (let date = new Date(start); date <= end; date.setTime(date.getTime() + dayMs)) {
        const volatility = 0.015; // 1.5% volatility
        const trend = (Math.random() - 0.5) * 0.001; // Slight trend
        const change = (Math.random() - 0.5) * volatility + trend;
        
        const open = basePrice;
        const close = open * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.008);
        const low = Math.min(open, close) * (1 - Math.random() * 0.008);
        
        historicalData.push({
          timestamp: date.toISOString(),
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume: Math.floor(Math.random() * 2000000) + 500000
        });
        
        basePrice = close;
      }
    }

    console.log('Returning historical data points:', historicalData.length);

    return new Response(
      JSON.stringify({ historical: historicalData }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Historical data error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch historical data',
        details: (error as Error).message 
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
