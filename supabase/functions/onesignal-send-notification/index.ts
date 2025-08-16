// Supabase Edge Function: onesignal-send-notification
// Direct user targeting for OneSignal notifications
// Supports various notification types and delivery channels

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationRequest {
  user_ids?: string[];
  player_ids?: string[];
  notification_type: string;
  title: string;
  message: string;
  url?: string;
  signal_id?: string;
  metadata?: Record<string, any>;
  delivery_channels?: string[];
  respect_preferences?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication check for sensitive operations
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Allow service role key for system operations
    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!isServiceRole) {
      // For non-service requests, verify JWT with Supabase
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return new Response(
          JSON.stringify({ error: 'Server configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    const apiKey = Deno.env.get('ONESIGNAL_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!appId || !apiKey || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: NotificationRequest = await req.json();
    const { 
      user_ids, 
      player_ids, 
      notification_type, 
      title, 
      message, 
      url, 
      signal_id, 
      metadata = {}, 
      delivery_channels = ['push'],
      respect_preferences = true 
    } = body;

    // Validate welcome notification restrictions
    if (notification_type === 'welcome' && (!isServiceRole && user_ids && user_ids.length > 1)) {
      return new Response(
        JSON.stringify({ error: 'Welcome notifications can only be sent to single users' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Notification request:', {
      user_ids: user_ids?.length || 0,
      player_ids: player_ids?.length || 0,
      notification_type,
      title: title.substring(0, 50) + '...'
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    let targetPlayerIds: string[] = [];
    let targetUserIds: string[] = [];

    // Get player IDs from user IDs if needed
    if (user_ids && user_ids.length > 0) {
      let query = supabase
        .from('profiles')
        .select('id, onesignal_player_id')
        .in('id', user_ids)
        .not('onesignal_player_id', 'is', null);

      // Check user preferences if requested
      if (respect_preferences) {
        const { data: preferences } = await supabase
          .from('user_notification_preferences')
          .select('user_id, push_enabled, ' + notification_type)
          .in('user_id', user_ids);

        const allowedUserIds = preferences
          ?.filter(p => p.push_enabled && p[notification_type as keyof typeof p])
          ?.map(p => p.user_id) || user_ids;

        if (allowedUserIds.length === 0) {
          console.log('🚫 No users have enabled this notification type');
          return new Response(
            JSON.stringify({ success: true, message: 'No eligible users for notification' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        query = query.in('id', allowedUserIds);
      }

      const { data: profiles } = await query;
      
      targetPlayerIds = profiles
        ?.map(p => p.onesignal_player_id)
        ?.filter(Boolean) || [];
      targetUserIds = profiles?.map(p => p.id) || [];
    }

    // Add explicitly provided player IDs
    if (player_ids && player_ids.length > 0) {
      targetPlayerIds.push(...player_ids);
    }

    if (targetPlayerIds.length === 0) {
      console.log('⚠️ No valid player IDs found for notification');
      return new Response(
        JSON.stringify({ success: false, error: 'No valid recipients found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Sending to ${targetPlayerIds.length} players`);

    // Send OneSignal notification
    const notificationPayload = {
      app_id: appId,
      include_player_ids: targetPlayerIds,
      headings: { en: title },
      contents: { en: message },
      url: url || undefined,
      data: {
        signal_id,
        notification_type,
        ...metadata
      }
    };

    const oneSignalResponse = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify(notificationPayload)
    });

    const oneSignalResult = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
      console.error('❌ OneSignal API error:', oneSignalResult);
      throw new Error(`OneSignal API error: ${oneSignalResult.errors?.join(', ') || 'Unknown error'}`);
    }

    console.log('✅ OneSignal notification sent:', oneSignalResult.id);

    // Log notification history for each user
    if (targetUserIds.length > 0) {
      const historyRecords = targetUserIds.map(userId => ({
        user_id: userId,
        notification_type,
        title,
        message,
        delivery_channels,
        delivery_status: { onesignal_id: oneSignalResult.id, status: 'sent' },
        metadata: { ...metadata, signal_id },
        signal_id,
        sent_at: new Date().toISOString()
      }));

      const { error: historyError } = await supabase
        .from('user_notification_history')
        .insert(historyRecords);

      if (historyError) {
        console.warn('⚠️ Failed to log notification history:', historyError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        onesignal_id: oneSignalResult.id,
        recipients: oneSignalResult.recipients || targetPlayerIds.length,
        message: 'Notification sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Notification sending failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});