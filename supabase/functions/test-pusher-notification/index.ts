import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ✅ Allow anonymous testing (no auth check)
  console.log('🧪 Test notification endpoint called');

  try {
    const PUSHER_INSTANCE_ID = Deno.env.get('PUSHER_INSTANCE_ID');
    const PUSHER_SECRET_KEY = Deno.env.get('PUSHER_SECRET_KEY');

    if (!PUSHER_INSTANCE_ID || !PUSHER_SECRET_KEY) {
      throw new Error('Pusher credentials not configured');
    }

    console.log('📤 Sending test notification to trade_alerts interest...');

    // Send notification via Pusher Beams
    const response = await fetch(
      `https://${PUSHER_INSTANCE_ID}.pushnotifications.pusher.com/publish_api/v1/instances/${PUSHER_INSTANCE_ID}/publishes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PUSHER_SECRET_KEY}`,
        },
        body: JSON.stringify({
          interests: ['trade_alerts'],
          web: {
            notification: {
              title: '🚀 Test Notification from Supabase',
              body: 'Pusher Beams + Supabase Edge Functions = Working! 🎉',
              icon: 'https://tradeimperial.com/icon-192.png',
              deep_link: 'https://tradeimperial.com/dashboard/signal-stream',
            },
            data: {
              test: true,
              timestamp: new Date().toISOString(),
            },
          },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Pusher Beams API error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: result }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Notification sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test notification sent!',
        publishId: result.publishId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

