
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EconomicEvent {
  id: string;
  time: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  event: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  date: string;
  description: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dateFrom, dateTo, currencies, impacts } = await req.json();
    
    console.log('Economic calendar request:', { dateFrom, dateTo, currencies, impacts });

    // For now, we'll use a comprehensive mock dataset that simulates real economic events
    // In production, you would integrate with services like ForexFactory, TradingEconomics, etc.
    const mockEvents: EconomicEvent[] = [
      {
        id: '1',
        time: '08:30',
        currency: 'USD',
        impact: 'high',
        event: 'Non-Farm Payrolls',
        actual: '',
        forecast: '180K',
        previous: '150K',
        date: new Date().toISOString(),
        description: 'Change in the number of employed people during the previous month.'
      },
      {
        id: '2',
        time: '10:00',
        currency: 'USD',
        impact: 'medium',
        event: 'Unemployment Rate',
        actual: '',
        forecast: '4.2%',
        previous: '4.2%',
        date: new Date().toISOString(),
        description: 'Percentage of the total work force that is unemployed.'
      },
      {
        id: '3',
        time: '14:00',
        currency: 'EUR',
        impact: 'high',
        event: 'ECB Interest Rate Decision',
        actual: '',
        forecast: '4.50%',
        previous: '4.50%',
        date: new Date().toISOString(),
        description: 'European Central Bank monetary policy decision.'
      },
      {
        id: '4',
        time: '15:30',
        currency: 'GBP',
        impact: 'medium',
        event: 'GDP Growth Rate',
        actual: '',
        forecast: '0.2%',
        previous: '0.1%',
        date: new Date().toISOString(),
        description: 'Quarterly gross domestic product growth rate.'
      },
      {
        id: '5',
        time: '21:30',
        currency: 'JPY',
        impact: 'low',
        event: 'Industrial Production',
        actual: '',
        forecast: '1.5%',
        previous: '1.2%',
        date: new Date().toISOString(),
        description: 'Monthly change in industrial production.'
      }
    ];

    // Filter events based on request parameters
    let filteredEvents = mockEvents;

    if (currencies && currencies.length > 0) {
      filteredEvents = filteredEvents.filter(event => currencies.includes(event.currency));
    }

    if (impacts && impacts.length > 0) {
      filteredEvents = filteredEvents.filter(event => impacts.includes(event.impact));
    }

    console.log('Returning filtered events:', filteredEvents.length);

    return new Response(
      JSON.stringify({ events: filteredEvents }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Economic calendar error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch economic events',
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
