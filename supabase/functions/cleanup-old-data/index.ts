import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting optimized data cleanup job...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let totalCleaned = 0;

    // Clean old cron job logs (3 days instead of unlimited - COST OPTIMIZED)
    console.log('🧹 Cleaning old cron job logs (3-day retention)...');
    const { data: cronResult, error: cronError } = await supabase
      .rpc('cleanup_old_cron_logs_optimized');
    
    if (cronError) {
      console.error('Error cleaning cron logs:', cronError);
    } else {
      totalCleaned += cronResult || 0;
      console.log(`✅ Cleaned ${cronResult || 0} old cron job logs`);
    }

    // Clean old rate limits (optimized timing - COST OPTIMIZED)
    console.log('🧹 Cleaning old rate limits...');
    const { data: rateResult, error: rateLimitError } = await supabase
      .rpc('cleanup_old_rate_limits_optimized');
    
    if (rateLimitError) {
      console.error('Error cleaning rate limits:', rateLimitError);
    } else {
      totalCleaned += rateResult || 0;
      console.log(`✅ Cleaned ${rateResult || 0} rate limit records`);
    }

    // Clean old notification logs (older than 14 days)
    console.log('Cleaning old notification logs...');
    const { error: notificationError } = await supabase
      .from('notification_delivery_log')
      .delete()
      .lt('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    if (notificationError) {
      console.error('Error cleaning notification logs:', notificationError);
    } else {
      console.log('Notification logs cleaned successfully');
    }

    // Clean old function deprecation hits (older than 7 days)
    console.log('Cleaning old function deprecation hits...');
    const { error: deprecationError } = await supabase
      .from('function_deprecation_hits')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (deprecationError) {
      console.error('Error cleaning deprecation hits:', deprecationError);
    } else {
      console.log('Function deprecation hits cleaned successfully');
    }

    // Log the cleanup job execution
    const { error: logError } = await supabase
      .from('cron_job_logs')
      .insert({
        job_name: 'optimized_data_cleanup',
        execution_time: new Date().toISOString(),
        records_affected: totalCleaned,
        status: 'success',
        error_message: null
      });

    if (logError) {
      console.error('Error logging cleanup job:', logError);
    }

    console.log(`Optimized cleanup completed. Total records cleaned: ${totalCleaned}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Optimized data cleanup completed',
        records_cleaned: totalCleaned
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Optimized cleanup job failed:', error);

    // Log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from('cron_job_logs')
        .insert({
          job_name: 'optimized_data_cleanup',
          execution_time: new Date().toISOString(),
          records_affected: 0,
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
    } catch (logError) {
      console.error('Error logging cleanup failure:', logError);
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