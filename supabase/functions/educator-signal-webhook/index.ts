
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  type: string
  table: string
  record: any
  old_record?: any
  schema: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: WebhookPayload = await req.json()
    
    // Log webhook event for audit trail
    await supabase.from('webhook_events').insert({
      event_type: payload.type,
      entity_type: payload.table,
      entity_id: payload.record?.id,
      payload: payload,
      status: 'processing'
    })

    // Handle trade alert events
    if (payload.table === 'trade_alerts') {
      await handleTradeAlertEvent(supabase, payload)
    }

    // Handle educator analytics events
    if (payload.table === 'educator_signal_analytics') {
      await handleAnalyticsEvent(supabase, payload)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function handleTradeAlertEvent(supabase: any, payload: WebhookPayload) {
  const record = payload.record
  
  // Update or create analytics record
  await supabase
    .from('educator_signal_analytics')
    .upsert({
      educator_id: record.user_id,
      signal_id: record.id,
      updated_at: new Date().toISOString()
    })

  // Refresh materialized view for performance summary
  await supabase.rpc('refresh_educator_performance')

  // Send notifications to followers
  if (payload.type === 'UPDATE' && record.status !== payload.old_record?.status) {
    await notifySignalFollowers(supabase, record)
  }
}

async function handleAnalyticsEvent(supabase: any, payload: WebhookPayload) {
  // Refresh performance summary when analytics change
  await supabase.rpc('refresh_educator_performance')
}

async function notifySignalFollowers(supabase: any, signal: any) {
  const { data: followers } = await supabase
    .from('signal_followers')
    .select('follower_id, notification_preferences')
    .eq('signal_id', signal.id)

  if (followers) {
    for (const follower of followers) {
      if (follower.notification_preferences.push) {
        // Queue push notification
        await supabase.from('webhook_events').insert({
          event_type: 'notification',
          entity_type: 'push_notification',
          entity_id: follower.follower_id,
          payload: {
            type: 'signal_update',
            signal_id: signal.id,
            message: `Signal ${signal.asset_name} status updated to ${signal.status}`
          }
        })
      }
    }
  }
}
