import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🧹 Starting notification cleanup job...');

    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_old_notification_logs');

    if (error) {
      console.error('❌ Cleanup function error:', error);
      throw error;
    }

    const deletedCount = data || 0;
    console.log(`✅ Cleanup completed: ${deletedCount} records deleted`);

    return new Response(JSON.stringify({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} old notification logs`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Notification cleanup error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});