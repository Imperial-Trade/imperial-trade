import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EconomicEvent {
  event_name: string;
  country: string;
  event_date: string;
  event_time: string;
  impact: 'high' | 'medium' | 'low';
  currency_code: string;
  actual_value?: string;
  forecast?: string;
  previous_value?: string;
  description?: string;
  external_id: string;
  human_readable_title?: string;
  trader_explanation?: string;
  difficulty_level?: string;
  typical_reaction?: string;
  category?: string;
  formatted_actual?: string;
  formatted_forecast?: string;
  formatted_previous?: string;
}

// Event descriptions mapping for human-readable content
const eventDescriptions: Record<string, {
  title: string;
  explanation: string;
  traderImpact: string;
  difficulty: string;
  typicalReaction: string;
  category: string;
}> = {
  'non_farm_payrolls': {
    title: 'US Jobs Report',
    explanation: 'Shows how many jobs were created or lost in the US economy, excluding farm workers. This is the most important monthly economic indicator.',
    traderImpact: 'Major USD movement expected. Higher than expected = USD strength, Lower = USD weakness',
    difficulty: 'beginner',
    typicalReaction: 'high_volatility',
    category: 'Employment'
  },
  'unemployment_rate': {
    title: 'US Unemployment Rate',
    explanation: 'Percentage of people actively looking for work but unable to find jobs. Lower is better for the economy.',
    traderImpact: 'Lower unemployment typically strengthens USD. Watch for divergence with jobs data.',
    difficulty: 'beginner',
    typicalReaction: 'bullish_on_low',
    category: 'Employment'
  },
  'consumer_price_index': {
    title: 'US Inflation Report',
    explanation: 'Measures how much prices have increased for everyday goods and services. Key indicator for Federal Reserve policy.',
    traderImpact: 'Higher inflation may signal Fed rate hikes, strengthening USD short-term but concerning long-term.',
    difficulty: 'intermediate',
    typicalReaction: 'mixed',
    category: 'Inflation'
  },
  'gdp': {
    title: 'Economic Growth Report',
    explanation: 'Total value of all goods and services produced. The ultimate measure of economic health and growth.',
    traderImpact: 'Higher GDP growth = stronger currency. Watch quarterly trends more than single releases.',
    difficulty: 'intermediate',
    typicalReaction: 'bullish_on_high',
    category: 'Growth'
  },
  'federal_funds_rate': {
    title: 'Fed Interest Rate Decision',
    explanation: 'The interest rate banks charge each other. Directly affects borrowing costs throughout the economy.',
    traderImpact: 'Rate hikes typically strengthen USD immediately. More important than the actual decision is the future guidance.',
    difficulty: 'advanced',
    typicalReaction: 'high_volatility',
    category: 'Monetary Policy'
  }
};

function getEventDescription(eventName: string) {
  const normalizedName = eventName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
  
  // Try exact match first
  if (eventDescriptions[normalizedName]) {
    return eventDescriptions[normalizedName];
  }
  
  // Try partial matches
  for (const [key, description] of Object.entries(eventDescriptions)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return description;
    }
  }
  
  // Default for unknown events
  return {
    title: eventName,
    explanation: 'Economic data release that may impact market movements.',
    traderImpact: 'Monitor market reaction and volume for trading opportunities.',
    difficulty: 'intermediate',
    typicalReaction: 'mixed',
    category: 'Economic Data'
  };
}

function formatValue(value: string | undefined, eventType: string): string {
  if (!value || value === '' || value === 'N/A') return 'N/A';
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;
  
  const eventLower = eventType.toLowerCase();
  
  if (eventLower.includes('rate') || eventLower.includes('inflation') || eventLower.includes('unemployment')) {
    return `${numValue}%`;
  }
  
  if (eventLower.includes('gdp') && Math.abs(numValue) < 10) {
    return `${numValue}%`;
  }
  
  if (Math.abs(numValue) >= 1000000) {
    return `${(numValue / 1000000).toFixed(1)}M`;
  }
  
  if (Math.abs(numValue) >= 1000) {
    return `${(numValue / 1000).toFixed(1)}K`;
  }
  
  return numValue.toString();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting economic events fetch job...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const twelveDataApiKey = Deno.env.get('TWELVE_DATA_API_KEY');

    if (!twelveDataApiKey) {
      throw new Error('TWELVE_DATA_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch economic events from Twelve Data API
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = nextWeek.toISOString().split('T')[0];

    console.log(`Fetching events from ${fromDate} to ${toDate}`);

    const apiUrl = `https://api.twelvedata.com/economic_calendar?apikey=${twelveDataApiKey}&start_date=${fromDate}&end_date=${toDate}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Received ${data.data?.length || 0} events from API`);

    if (!data.data || !Array.isArray(data.data)) {
      console.log('No events data received from API');
      return new Response(
        JSON.stringify({ success: true, message: 'No new events to process', events_processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform API data to match our schema
    const transformedEvents: EconomicEvent[] = data.data.map((event: any) => {
      // Determine impact level based on event name and country
      let impact: 'high' | 'medium' | 'low' = 'medium';
      
      const eventName = event.event?.toLowerCase() || '';
      const country = event.country || 'US';
      
      // High impact events
      if (eventName.includes('gdp') || 
          eventName.includes('employment') || 
          eventName.includes('inflation') ||
          eventName.includes('interest rate') ||
          eventName.includes('unemployment') ||
          eventName.includes('nonfarm payrolls')) {
        impact = 'high';
      }
      // Low impact events
      else if (eventName.includes('pending') || 
               eventName.includes('building permits') ||
               eventName.includes('housing starts')) {
        impact = 'low';
      }

      // Get human-readable description
      const eventDescription = getEventDescription(event.event || 'Economic Event');
      
      return {
        event_name: event.event || 'Economic Event',
        country: country,
        event_date: event.date || fromDate,
        event_time: event.time || '00:00:00',
        impact: impact,
        currency_code: event.currency || (country === 'US' ? 'USD' : 'EUR'),
        actual_value: event.actual || null,
        forecast: event.forecast || null,
        previous_value: event.previous || null,
        description: eventDescription.explanation,
        external_id: `twelve_${event.date}_${event.event}_${event.country}`.replace(/[^a-zA-Z0-9_]/g, '_'),
        human_readable_title: eventDescription.title,
        trader_explanation: eventDescription.traderImpact,
        difficulty_level: eventDescription.difficulty,
        typical_reaction: eventDescription.typicalReaction,
        category: eventDescription.category,
        formatted_actual: formatValue(event.actual, event.event || ''),
        formatted_forecast: formatValue(event.forecast, event.event || ''),
        formatted_previous: formatValue(event.previous, event.event || '')
      };
    });

    let eventsProcessed = 0;
    let eventsSkipped = 0;

    // Insert events with upsert logic
    for (const event of transformedEvents) {
      try {
        // Check if event already exists
        const { data: existingEvent, error: checkError } = await supabase
          .from('economic_events')
          .select('id')
          .eq('external_id', event.external_id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing event:', checkError);
          continue;
        }

        if (existingEvent) {
          eventsSkipped++;
          continue;
        }

        // Insert new event
        const { error: insertError } = await supabase
          .from('economic_events')
          .insert({
            event_name: event.event_name,
            country: event.country,
            event_date: event.event_date,
            event_time: event.event_time,
            impact: event.impact,
            currency_code: event.currency_code,
            actual_value: event.actual_value,
            forecast: event.forecast,
            previous_value: event.previous_value,
            description: event.description,
            external_id: event.external_id,
            source: 'twelve_data',
            human_readable_title: event.human_readable_title,
            trader_explanation: event.trader_explanation,
            difficulty_level: event.difficulty_level,
            typical_reaction: event.typical_reaction,
            category: event.category,
            formatted_actual: event.formatted_actual,
            formatted_forecast: event.formatted_forecast,
            formatted_previous: event.formatted_previous
          });

        if (insertError) {
          console.error('Error inserting event:', insertError);
        } else {
          eventsProcessed++;
        }
      } catch (error) {
        console.error('Error processing event:', error);
      }
    }

    // Log the job execution
    const { error: logError } = await supabase
      .from('cron_job_logs')
      .insert({
        job_name: 'fetch_economic_events',
        execution_time: new Date().toISOString(),
        records_affected: eventsProcessed,
        status: 'success',
        error_message: null
      });

    if (logError) {
      console.error('Error logging job execution:', logError);
    }

    console.log(`Job completed successfully. Processed: ${eventsProcessed}, Skipped: ${eventsSkipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Economic events fetch completed',
        events_processed: eventsProcessed,
        events_skipped: eventsSkipped
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Economic events fetch job failed:', error);

    // Log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from('cron_job_logs')
        .insert({
          job_name: 'fetch_economic_events',
          execution_time: new Date().toISOString(),
          records_affected: 0,
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
    } catch (logError) {
      console.error('Error logging job failure:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});