
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
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    
    console.log('Historical data request:', { symbol, interval, startDate, endDate });

    if (!apiKey) {
      console.log('No Twelve Data API key found, generating mock historical data');
      
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

    // Use Twelve Data API for real historical data
    const response = await fetch(
      `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&start_date=${startDate}&end_date=${endDate}&apikey=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(`API error: ${data.message}`);
    }
    
    const historicalData: HistoricalDataPoint[] = data.values?.map((item: any) => ({
      timestamp: item.datetime,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseInt(item.volume) || 0
    })) || [];

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
