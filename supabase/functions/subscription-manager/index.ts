import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// PHASE 3: Subscription Management Infrastructure
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [SUBSCRIPTION] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [SUBSCRIPTION] ${message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, user_id, player_id, platform, tags, external_user_id } = await req.json();

    log(`Processing subscription action: ${action}`);

    switch (action) {
      case 'subscribe': {
        if (!user_id || !player_id || !platform) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: user_id, player_id, platform' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Upsert subscription
        const { data, error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id,
            onesignal_player_id: player_id,
            platform,
            subscription_active: true,
            tags: tags || {},
            external_user_id: external_user_id || user_id,
            last_seen_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          log('Failed to create subscription:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update user profile
        await supabase
          .from('profiles')
          .update({
            onesignal_player_id: player_id,
            push_subscription_active: true,
            onesignal_subscription_status: 'subscribed',
            onesignal_last_verified_at: new Date().toISOString()
          })
          .eq('id', user_id);

        log('Subscription created successfully:', { user_id, player_id, platform });

        return new Response(
          JSON.stringify({ success: true, subscription: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'unsubscribe': {
        if (!user_id || !player_id) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: user_id, player_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Deactivate subscription
        const { error } = await supabase
          .from('push_subscriptions')
          .update({
            subscription_active: false,
            last_seen_at: new Date().toISOString()
          })
          .eq('user_id', user_id)
          .eq('onesignal_player_id', player_id);

        if (error) {
          log('Failed to deactivate subscription:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to deactivate subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update user profile
        await supabase
          .from('profiles')
          .update({
            push_subscription_active: false,
            onesignal_subscription_status: 'unsubscribed'
          })
          .eq('id', user_id);

        log('Subscription deactivated successfully:', { user_id, player_id });

        return new Response(
          JSON.stringify({ success: true, message: 'Subscription deactivated' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'status': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'Missing required field: user_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get subscription status
        const { data: subscriptions, error } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', user_id)
          .eq('subscription_active', true);

        if (error) {
          log('Failed to fetch subscription status:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch subscription status' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            subscriptions: subscriptions || [],
            active_count: subscriptions?.length || 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cleanup': {
        // Clean up old inactive subscriptions (older than 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('subscription_active', false)
          .lt('last_seen_at', thirtyDaysAgo);

        if (error) {
          log('Failed to cleanup old subscriptions:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to cleanup subscriptions' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        log('Cleanup completed successfully');

        return new Response(
          JSON.stringify({ success: true, message: 'Cleanup completed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: subscribe, unsubscribe, status, cleanup' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    log('Fatal error in subscription manager:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});