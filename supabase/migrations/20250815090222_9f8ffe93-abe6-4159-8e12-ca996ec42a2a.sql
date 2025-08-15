-- Phase 2: Enhanced notification content and user preferences (fixed)
-- Check if table exists first, if not create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notification_preferences') THEN
    CREATE TABLE public.user_notification_preferences (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      
      -- Signal notification preferences
      signal_created BOOLEAN NOT NULL DEFAULT true,
      signal_updated BOOLEAN NOT NULL DEFAULT true,
      signal_closed BOOLEAN NOT NULL DEFAULT true,
      tp_hits BOOLEAN NOT NULL DEFAULT true,
      stop_loss_hits BOOLEAN NOT NULL DEFAULT true,
      price_alerts BOOLEAN NOT NULL DEFAULT true,
      
      -- Delivery channel preferences
      push_notifications BOOLEAN NOT NULL DEFAULT true,
      in_app_notifications BOOLEAN NOT NULL DEFAULT true,
      discord_notifications BOOLEAN NOT NULL DEFAULT false,
      telegram_notifications BOOLEAN NOT NULL DEFAULT false,
      
      -- Advanced preferences
      include_own_signals BOOLEAN NOT NULL DEFAULT false,
      minimum_priority_level INTEGER NOT NULL DEFAULT 1,
      quiet_hours_start TIME WITHOUT TIME ZONE,
      quiet_hours_end TIME WITHOUT TIME ZONE,
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      
      UNIQUE(user_id)
    );

    -- Enable RLS on notification preferences
    ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies for notification preferences
    CREATE POLICY "Users can manage their own notification preferences"
    ON public.user_notification_preferences
    FOR ALL
    USING (auth.uid() = user_id);

    -- Create updated_at trigger for notification preferences
    CREATE TRIGGER update_user_notification_preferences_updated_at
      BEFORE UPDATE ON public.user_notification_preferences
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Check if notification batch queue table exists, if not create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_batch_queue') THEN
    CREATE TABLE public.notification_batch_queue (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      signal_id UUID NOT NULL,
      user_id UUID NOT NULL,
      notification_types TEXT[] NOT NULL DEFAULT '{}',
      scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      processed_at TIMESTAMP WITH TIME ZONE,
      delivery_status JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      
      -- Prevent duplicate notifications for same signal/user combination
      UNIQUE(signal_id, user_id)
    );

    -- Enable RLS on notification batch queue  
    ALTER TABLE public.notification_batch_queue ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies for notification batch queue
    CREATE POLICY "System can manage notification batch queue"
    ON public.notification_batch_queue
    FOR ALL
    USING (true);
  END IF;
END $$;

-- Update the auto_notify_signal_changes function to respect user preferences
CREATE OR REPLACE FUNCTION public.auto_notify_signal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  author_profile RECORD;
  notification_payload JSONB;
  request_id BIGINT;
  service_role_key TEXT;
  function_url TEXT;
  change_types TEXT[] := '{}';
  is_significant_change BOOLEAN := false;
  priority_level INTEGER := 1;
  target_users UUID[];
  u_id UUID;
BEGIN
  -- Only trigger for signals created by admins or educators
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = COALESCE(NEW.user_id, OLD.user_id)
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get service role key and function URL
  service_role_key := current_setting('app.settings.service_role_key', true);
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  END IF;
  
  function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/signal-notification-dispatcher';

  -- Fetch author information
  SELECT display_name, avatar_url 
  INTO author_profile
  FROM public.public_profiles 
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  -- Handle INSERT (signal creation) - already handled by existing trigger
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Handle UPDATE - detect what changed and determine if notification is needed
  IF TG_OP = 'UPDATE' THEN
    -- Status change (pending -> active, active -> closed)
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      change_types := array_append(change_types, 'status_change');
      is_significant_change := true;
      -- Higher priority for status changes
      priority_level := CASE 
        WHEN NEW.status = 'closed' THEN 2
        WHEN NEW.status = 'active' THEN 2
        ELSE 1 
      END;
    END IF;

    -- TP hits change
    IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits THEN
      change_types := array_append(change_types, 'tp_hits');
      is_significant_change := true;
      priority_level := 2; -- High priority for TP hits
    END IF;

    -- Manual closure (close_reason added)
    IF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IS NOT NULL THEN
      change_types := array_append(change_types, 'manual_close');
      is_significant_change := true;
      priority_level := 2; -- High priority for manual closure
    END IF;

    -- Notes update (only if substantive change)
    IF OLD.notes IS DISTINCT FROM NEW.notes AND 
       (OLD.notes IS NULL OR NEW.notes IS NULL OR 
        length(COALESCE(NEW.notes, '')) - length(COALESCE(OLD.notes, '')) > 10) THEN
      change_types := array_append(change_types, 'notes_update');
      is_significant_change := true;
      priority_level := 1; -- Normal priority for notes
    END IF;

    -- Trade parameter changes (entry, stop loss, TPs) - only if signal is not active
    IF NEW.status != 'active' AND (
      OLD.entry_price IS DISTINCT FROM NEW.entry_price OR
      OLD.stop_loss IS DISTINCT FROM NEW.stop_loss OR
      OLD.tp1 IS DISTINCT FROM NEW.tp1 OR
      OLD.tp2 IS DISTINCT FROM NEW.tp2 OR
      OLD.tp3 IS DISTINCT FROM NEW.tp3 OR
      OLD.tp4 IS DISTINCT FROM NEW.tp4 OR
      OLD.tp5 IS DISTINCT FROM NEW.tp5
    ) THEN
      change_types := array_append(change_types, 'parameters_update');
      is_significant_change := true;
      priority_level := 1; -- Normal priority for parameter updates
    END IF;

    -- Skip notification if no significant changes
    IF NOT is_significant_change THEN
      RETURN NEW;
    END IF;

    -- Get users who should receive this notification based on preferences
    SELECT array_agg(p.id) INTO target_users
    FROM public.profiles p
    WHERE p.account_status = 'active'
    AND p.push_subscription_active = true
    AND public.should_user_receive_notification(
      p.id, 
      NEW.user_id, 
      'signal_updated', 
      priority_level
    );

    -- Only proceed if we have users to notify
    IF target_users IS NULL OR array_length(target_users, 1) = 0 THEN
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_signal_changes', 
        NOW(), 
        0, 
        'skipped',
        'No users eligible for notification - Signal: ' || NEW.asset_name || ' - Changes: ' || array_to_string(change_types, ', ')
      );
      RETURN NEW;
    END IF;

    -- Build notification payload for signal updates
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
          'updated_at', NEW.updated_at,
          'notification_type', 'signal_updated',
          'alert_type', 'signal_updated',
          'target_price', NEW.entry_price,
          'triggered_price', NEW.entry_price,
          'status', NEW.status,
          'tp_hits', NEW.tp_hits,
          'close_reason', NEW.close_reason,
          'notes', NEW.notes,
          'change_types', change_types,
          'priority_level', priority_level,
          'author_id', NEW.user_id,
          'author_name', COALESCE(author_profile.display_name, 'Unknown'),
          'author_avatar_url', author_profile.avatar_url,
          'delivery_channels', ARRAY['push', 'in_app'],
          'user_ids', target_users,
          'include_creator', false
        )
      )
    );

    -- Make HTTP call to signal-notification-dispatcher
    BEGIN
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key,
          'User-Agent', 'Supabase-Trigger/1.0'
        ),
        body := notification_payload,
        timeout_milliseconds := 10000
      ) INTO request_id;
      
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_signal_changes', 
        NOW(), 
        array_length(target_users, 1), 
        'success',
        'Signal update notification queued - Request ID: ' || COALESCE(request_id::text, 'null') || 
        ' - Signal: ' || NEW.asset_name || ' - Changes: ' || array_to_string(change_types, ', ') ||
        ' - Users: ' || array_length(target_users, 1)::text || ' - Priority: ' || priority_level::text
      );
      
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_signal_changes', 
        NOW(), 
        0, 
        'error', 
        'HTTP request failed: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
      );
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'auto_notify_signal_changes', 
    NOW(), 
    0, 
    'error', 
    'Trigger exception: ' || SQLERRM || ' - Signal ID: ' || COALESCE(NEW.id::text, OLD.id::text)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;