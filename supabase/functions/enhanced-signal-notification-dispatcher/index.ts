import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  notifications: Array<{
    signal_id: string
    notification_type: string
    priority_level?: string
    asset_name: string
    trade_type: string
    entry_price: number
    status: string
    tp_hits?: number[]
    created_by: string
    include_creator?: boolean
    delivery_channels: string[]
    user_ids?: string[]
  }>
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

    const payload: NotificationPayload = await req.json()
    console.log('📨 Enhanced Signal Notification Dispatcher received:', JSON.stringify(payload, null, 2))

    const oneSignalApiKey = Deno.env.get('ONESIGNAL_API_KEY')
    if (!oneSignalApiKey) {
      console.error('❌ ONESIGNAL_API_KEY not configured')
      throw new Error('OneSignal API key not configured')
    }

    let totalNotificationsSent = 0

    for (const notification of payload.notifications) {
      console.log(`🎯 Processing notification for signal: ${notification.asset_name}`)
      
      // Get target users based on notification settings
      let targetUsers: string[] = []
      
      if (notification.user_ids && notification.user_ids.length > 0) {
        targetUsers = notification.user_ids
      } else {
        // Get all users with Xeon Stream enabled
        const { data: xeonUsers, error: usersError } = await supabase
          .rpc('get_xeon_stream_subscribers')

        if (usersError) {
          console.error('❌ Error fetching Xeon Stream users:', usersError)
          continue
        }

        targetUsers = xeonUsers?.map((user: any) => user.user_id) || []
      }

      if (!notification.include_creator) {
        targetUsers = targetUsers.filter(userId => userId !== notification.created_by)
      }

      console.log(`👥 Targeting ${targetUsers.length} users for notification`)

      if (targetUsers.length === 0) {
        console.log('⚠️ No users to notify')
        continue
      }

      // Get OneSignal player IDs for target users
      const { data: deviceData, error: deviceError } = await supabase
        .from('profiles')
        .select('id, onesignal_player_id, display_name')
        .in('id', targetUsers)
        .not('onesignal_player_id', 'is', null)
        .eq('push_subscription_active', true)

      if (deviceError) {
        console.error('❌ Error fetching device data:', deviceError)
        continue
      }

      const playerIds = deviceData?.map(user => user.onesignal_player_id).filter(Boolean) || []
      
      if (playerIds.length === 0) {
        console.log('⚠️ No valid OneSignal player IDs found')
        continue
      }

      // Create notification content based on type
      let title = 'Trade Imperial Alert'
      let message = ''
      
      switch (notification.notification_type) {
        case 'signal_created':
          title = '🔥 New Trading Signal'
          message = `${notification.asset_name} ${notification.trade_type.toUpperCase()} @ ${notification.entry_price}`
          break
        case 'signal_activated':
          title = '✅ Signal Activated'
          message = `${notification.asset_name} signal is now ACTIVE`
          break
        case 'signal_closed':
          title = '🏁 Signal Closed'
          message = `${notification.asset_name} signal has been closed`
          break
        case 'tp_hit':
          title = '🎯 Take Profit Hit'
          message = `${notification.asset_name} TP${notification.tp_hits?.[notification.tp_hits.length - 1]} reached!`
          break
        default:
          message = `${notification.asset_name} - ${notification.notification_type}`
      }

      // Send OneSignal notification
      const oneSignalPayload = {
        app_id: 'c776609b-8750-4d5e-aa48-95d6ae6b9d68',
        include_player_ids: playerIds,
        headings: { en: title },
        contents: { en: message },
        data: {
          signal_id: notification.signal_id,
          notification_type: notification.notification_type,
          asset_name: notification.asset_name,
          trade_type: notification.trade_type,
          url: `/dashboard/signal-stream`
        },
        web_url: `https://www.tradeimperial.com/dashboard/signal-stream`,
        url: `https://www.tradeimperial.com/dashboard/signal-stream`,
        priority: notification.priority_level === 'high' ? 10 : 5
      }

      console.log(`📱 Sending OneSignal notification to ${playerIds.length} devices`)

      const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${oneSignalApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(oneSignalPayload)
      })

      const oneSignalResult = await oneSignalResponse.json()
      
      if (oneSignalResponse.ok) {
        console.log('✅ OneSignal notification sent successfully:', oneSignalResult.id)
        totalNotificationsSent += playerIds.length

        // Log successful deliveries
        for (const userId of targetUsers) {
          const userDevice = deviceData?.find(d => d.id === userId)
          if (userDevice?.onesignal_player_id) {
            await supabase
              .from('notification_delivery_log')
              .insert({
                user_id: userId,
                signal_id: notification.signal_id,
                notification_type: notification.notification_type,
                delivery_channel: 'push',
                status: 'sent',
                metadata: {
                  onesignal_id: oneSignalResult.id,
                  title: title,
                  message: message
                }
              })
          }
        }
      } else {
        console.error('❌ OneSignal error:', oneSignalResult)
        
        // Log failed deliveries
        for (const userId of targetUsers) {
          await supabase
            .from('notification_delivery_log')
            .insert({
              user_id: userId,
              signal_id: notification.signal_id,
              notification_type: notification.notification_type,
              delivery_channel: 'push',
              status: 'failed',
              error_message: JSON.stringify(oneSignalResult),
              metadata: {
                title: title,
                message: message
              }
            })
        }
      }
    }

    console.log(`📊 Total notifications sent: ${totalNotificationsSent}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_sent: totalNotificationsSent,
        message: 'Enhanced notifications dispatched successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Enhanced notification dispatcher error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})