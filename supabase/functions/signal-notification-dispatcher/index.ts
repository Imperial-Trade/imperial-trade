
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { signal_id, message, notification_type } = await req.json()

    // Get signal followers
    const { data: followers } = await supabase
      .from('signal_followers')
      .select(`
        follower_id,
        notification_preferences,
        profiles!inner(display_name)
      `)
      .eq('signal_id', signal_id)

    if (!followers || followers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No followers to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send notifications based on preferences
    const notifications = []
    
    for (const follower of followers) {
      const prefs = follower.notification_preferences

      // Browser push notification
      if (prefs.push) {
        notifications.push(sendPushNotification(follower.follower_id, message))
      }

      // Email notification
      if (prefs.email) {
        notifications.push(sendEmailNotification(follower.follower_id, message))
      }

      // Discord webhook (if configured)
      if (prefs.discord) {
        notifications.push(sendDiscordNotification(message))
      }

      // Telegram webhook (if configured)
      if (prefs.telegram) {
        notifications.push(sendTelegramNotification(message))
      }
    }

    await Promise.allSettled(notifications)

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: followers.length,
        message: 'Notifications dispatched'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Notification dispatcher error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function sendPushNotification(userId: string, message: string) {
  // Implementation for browser push notifications
  console.log(`Push notification to ${userId}: ${message}`)
}

async function sendEmailNotification(userId: string, message: string) {
  // Implementation for email notifications
  console.log(`Email notification to ${userId}: ${message}`)
}

async function sendDiscordNotification(message: string) {
  const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL')
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨 **Trade Signal Update** 🚨\n${message}`,
        username: 'Imperial Trade Bot'
      })
    })
  } catch (error) {
    console.error('Discord notification error:', error)
  }
}

async function sendTelegramNotification(message: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
  
  if (!botToken || !chatId) return

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚨 *Trade Signal Update* 🚨\n${message}`,
        parse_mode: 'Markdown'
      })
    })
  } catch (error) {
    console.error('Telegram notification error:', error)
  }
}
