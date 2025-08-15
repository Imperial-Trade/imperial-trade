-- Enhanced OneSignal notification delivery for all platforms
-- Update the signal creation trigger to include all user roles and better targeting

-- First, improve the auto_notify_signal_creation function to target all users properly
CREATE OR REPLACE FUNCTION public.auto_notify_signal_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  author_profile RECORD;
  trader_stats JSONB;
  trading_metrics JSONB;
  market_session TEXT;
  notification_payload JSONB;
  request_id BIGINT;
  service_role_key TEXT;
  function_url TEXT;
  eligible_users UUID[];
BEGIN
  -- Only trigger for signals created by admins or educators
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id 
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    
    -- Get service configuration
    service_role_key := current_setting('app.settings.service_role_key', true);
    IF service_role_key IS NULL OR service_role_key = '' THEN
      service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
    END IF;
    
    function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/signal-notification-dispatcher';
    
    -- Fetch enhanced author information and stats
    SELECT display_name, avatar_url, trader_level, community_tier
    INTO author_profile
    FROM public.public_profiles 
    WHERE id = NEW.user_id;
    
    -- Get eligible users - ALL users with active push notifications regardless of role
    SELECT array_agg(p.id) INTO eligible_users
    FROM public.profiles p
    WHERE p.account_status = 'active'
    AND p.push_subscription_active = true
    AND p.onesignal_player_id IS NOT NULL
    AND p.onesignal_subscription_status = 'subscribed'
    AND p.id != NEW.user_id; -- Don't notify the creator
    
    -- Get trader performance stats
    trader_stats := public.get_trader_stats(NEW.user_id);
    
    -- Calculate trading metrics
    trading_metrics := public.calculate_trading_metrics(
      NEW.entry_price,
      NEW.stop_loss,
      NEW.tp1,
      NEW.trade_type
    );
    
    -- Get current market session
    market_session := public.get_market_session();
    
    -- Build enhanced notification payload with trading intelligence
    notification_payload := jsonb_build_object(
      'notifications', jsonb_build_array(
        jsonb_build_object(
          'signal_id', NEW.id,
          'user_id', NEW.user_id,
          'asset_name', NEW.asset_name,
          'trade_type', NEW.trade_type,
          'entry_price', NEW.entry_price,
          'stop_loss', NEW.stop_loss,
          'tp1', NEW.tp1,
          'tp2', NEW.tp2,
          'tp3', NEW.tp3,
          'tp4', NEW.tp4,
          'tp5', NEW.tp5,
          'symbol', NEW.tradermade_symbol,
          'tradermade_symbol', NEW.tradermade_symbol,
          'created_at', NEW.created_at,
          'notification_type', 'signal_created',
          'alert_type', 'signal_created',
          'target_price', NEW.entry_price,
          'triggered_price', NEW.entry_price,
          'status', NEW.status,
          -- Enhanced author information
          'author_id', NEW.user_id,
          'author_name', COALESCE(author_profile.display_name, 'Unknown'),
          'author_avatar_url', author_profile.avatar_url,
          'trader_level', COALESCE(trader_stats->>'trader_level', 'Trader'),
          'win_rate', (trader_stats->>'win_rate')::NUMERIC,
          -- Trading intelligence
          'risk_reward_ratio', (trading_metrics->>'risk_reward_ratio')::NUMERIC,
          'market_session', market_session,
          'volatility_level', trading_metrics->>'volatility_level',
          'position_size_hint', trading_metrics->>'position_size_hint',
          'time_sensitivity', CASE 
            WHEN NEW.trade_type LIKE '%limit%' THEN 'Pending Entry'
            ELSE 'Immediate'
          END,
          'delivery_channels', ARRAY['push', 'in_app'],
          'user_ids', eligible_users,
          'include_creator', false
        )
      )
    );
    
    -- Send enhanced notification only if we have eligible users
    IF eligible_users IS NOT NULL AND array_length(eligible_users, 1) > 0 THEN
      BEGIN
        SELECT net.http_post(
          url := function_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key,
            'User-Agent', 'Supabase-Enhanced-Trigger/1.0'
          ),
          body := notification_payload,
          timeout_milliseconds := 10000
        ) INTO request_id;
        
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
          'enhanced_auto_notify_signal_creation', 
          NOW(), 
          array_length(eligible_users, 1), 
          'success',
          'Enhanced trading notification sent - Request ID: ' || COALESCE(request_id::text, 'null') || 
          ' - Signal: ' || NEW.asset_name || ' - R:R: ' || COALESCE((trading_metrics->>'risk_reward_ratio')::TEXT, 'N/A') ||
          ' - Session: ' || market_session || ' - Users: ' || array_length(eligible_users, 1)
        );
        
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
          'enhanced_auto_notify_signal_creation', 
          NOW(), 
          0, 
          'error', 
          'Enhanced notification failed: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
        );
      END;
    ELSE
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'enhanced_auto_notify_signal_creation', 
        NOW(), 
        0, 
        'skipped',
        'No eligible users found for notification - Signal: ' || NEW.asset_name
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'enhanced_auto_notify_signal_creation', 
    NOW(), 
    0, 
    'error', 
    'Enhanced trigger exception: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
  );
  
  RETURN NEW;
END;
$function$;

-- Update the should_user_receive_notification function to be more inclusive
CREATE OR REPLACE FUNCTION public.should_user_receive_notification(p_user_id uuid, p_signal_author_id uuid, p_notification_type text, p_priority_level integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Don't send to signal creator unless specifically requested
  IF p_user_id = p_signal_author_id AND p_notification_type != 'signal_created' THEN
    RETURN false;
  END IF;
  
  -- Check if user has push notifications enabled with comprehensive checks
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id 
    AND account_status = 'active'
    AND push_subscription_active = true 
    AND onesignal_player_id IS NOT NULL
    AND onesignal_subscription_status = 'subscribed'
  );
END;
$function$;