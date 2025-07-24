
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Build database query
    let query = supabase
      .from('economic_events')
      .select('*')
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true });

    // Apply date filtering
    if (dateFrom) {
      query = query.gte('event_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('event_date', dateTo);
    }

    // Apply currency filtering
    if (currencies && currencies.length > 0) {
      query = query.in('currency_code', currencies);
    }

    // Apply impact filtering with case conversion
    if (impacts && impacts.length > 0) {
      // Convert lowercase impacts to capitalized format for database
      const capitalizedImpacts = impacts.map(impact => 
        impact.charAt(0).toUpperCase() + impact.slice(1).toLowerCase()
      );
      query = query.in('impact', capitalizedImpacts);
    }

    const { data: dbEvents, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Retrieved events from database:', dbEvents?.length || 0);

    // Transform database results to match frontend interface
    const events: EconomicEvent[] = (dbEvents || []).map(dbEvent => ({
      id: dbEvent.id,
      time: dbEvent.event_time || '00:00',
      currency: dbEvent.currency_code || 'USD',
      impact: dbEvent.impact?.toLowerCase() as 'high' | 'medium' | 'low',
      event: dbEvent.event_name,
      actual: dbEvent.actual_value || '',
      forecast: dbEvent.forecast || '',
      previous: dbEvent.previous_value || '',
      date: dbEvent.event_date,
      description: dbEvent.description || ''
    }));

    console.log('Returning transformed events:', events.length);

    return new Response(
      JSON.stringify({ events }),
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
