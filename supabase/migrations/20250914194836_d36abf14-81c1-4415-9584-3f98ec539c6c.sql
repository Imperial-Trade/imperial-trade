-- Phase 1: Clean up duplicate triggers and create unified notification system

-- Drop all existing duplicate notification triggers
DROP TRIGGER IF EXISTS notify_price_alerts ON public.alert_monitoring;
DROP TRIGGER IF EXISTS trigger_auto_notify_price_alerts ON public.alert_monitoring;
DROP TRIGGER IF EXISTS notify_signal_changes ON public.trade_alerts;
DROP TRIGGER IF EXISTS trigger_auto_notify_signal_changes ON public.trade_alerts;
DROP TRIGGER IF EXISTS notify_signal_creation_enhanced ON public.trade_alerts;
DROP TRIGGER IF EXISTS trigger_auto_notify_signal_creation ON public.trade_alerts;
DROP TRIGGER IF EXISTS notify_signal_updates_enhanced ON public.trade_alerts;
DROP TRIGGER IF EXISTS trigger_auto_notify_signal_updates ON public.trade_alerts;
DROP TRIGGER IF EXISTS optimized_signal_notifications_trigger ON public.trade_alerts;

-- Drop old function definitions if they exist
DROP FUNCTION IF EXISTS auto_notify_price_alerts();
DROP FUNCTION IF EXISTS auto_notify_signal_changes();
DROP FUNCTION IF EXISTS optimized_signal_notifications();

-- Create enhanced notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_created BOOLEAN DEFAULT true,
  signal_updated BOOLEAN DEFAULT true,
  tp_hits BOOLEAN DEFAULT true,
  stop_loss_hits BOOLEAN DEFAULT true,
  signal_closed BOOLEAN DEFAULT false,
  batch_notifications BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  timezone TEXT DEFAULT 'UTC',
  delivery_preferences JSONB DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on notification preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for notification preferences
CREATE POLICY "Users can manage their own notification preferences" 
ON public.notification_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- Create notification rate limiting table
CREATE TABLE IF NOT EXISTS public.notification_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  count_in_window INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- Enable RLS on rate limits
ALTER TABLE public.notification_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for rate limits (system managed)
CREATE POLICY "System can manage notification rate limits" 
ON public.notification_rate_limits 
FOR ALL 
USING (true);

-- Create notification audit trail table
CREATE TABLE IF NOT EXISTS public.notification_audit_trail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES public.trade_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  delivery_channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit trail
ALTER TABLE public.notification_audit_trail ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit trail
CREATE POLICY "Users can view their own notification audit trail" 
ON public.notification_audit_trail 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage notification audit trail" 
ON public.notification_audit_trail 
FOR ALL 
USING (true);

-- Create the unified enhanced notification pipeline function
CREATE OR REPLACE FUNCTION public.enhanced_notification_pipeline()
RETURNS TRIGGER AS $$
DECLARE
  author_profile RECORD;
  notification_payload JSONB;
  request_id BIGINT;
  service_role_key TEXT;
  function_url TEXT;
  eligible_users UUID[];
  change_types TEXT[] := '{}';
  is_significant_change BOOLEAN := false;
  priority_level INTEGER := 1;
BEGIN
  -- Only trigger for signals created by admins or educators
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    RETURN NEW;
  END IF;

  -- Configuration
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';

  -- Detect operation type and significant changes
  IF TG_OP = 'INSERT' THEN
    change_types := array_append(change_types, 'signal_created');
    is_significant_change := true;
    priority_level := 2; -- High priority for new signals
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect specific changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      change_types := array_append(change_types, 'status_change');
      is_significant_change := true;
      priority_level := CASE 
        WHEN NEW.status = 'closed' THEN 2
        WHEN NEW.status = 'active' THEN 2
        ELSE 1 
      END;
    END IF;

    IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits THEN
      change_types := array_append(change_types, 'tp_hits');
      is_significant_change := true;
      priority_level := 2;
    END IF;

    IF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IS NOT NULL THEN
      change_types := array_append(change_types, 'manual_close');
      is_significant_change := true;
      priority_level := 2;
    END IF;
  END IF;

  -- Skip if no significant changes for updates
  IF TG_OP = 'UPDATE' AND NOT is_significant_change THEN
    RETURN NEW;
  END IF;

  -- Fetch author information
  SELECT display_name, avatar_url
  INTO author_profile
  FROM public.public_profiles 
  WHERE id = NEW.user_id;

  -- Get eligible users with notification preferences
  SELECT array_agg(p.id) INTO eligible_users
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON p.id = np.user_id
  WHERE p.account_status = 'active'
  AND p.push_subscription_active = true
  AND p.onesignal_player_id IS NOT NULL
  AND p.onesignal_subscription_status IN ('subscribed', 'subscribed_dev')
  AND p.id != NEW.user_id -- Don't notify creator
  AND (
    np.id IS NULL OR -- Default to enabled if no preferences set
    (TG_OP = 'INSERT' AND COALESCE(np.signal_created, true)) OR
    (TG_OP = 'UPDATE' AND COALESCE(np.signal_updated, true))
  );

  -- Only proceed if we have eligible users
  IF eligible_users IS NULL OR array_length(eligible_users, 1) = 0 THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'enhanced_notification_pipeline', 
      NOW(), 
      0, 
      'skipped',
      'No eligible users found - Signal: ' || NEW.asset_name || ' - Changes: ' || array_to_string(change_types, ', ')
    );
    RETURN NEW;
  END IF;

  -- Build enhanced notification payload
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
        'notification_type', CASE 
          WHEN TG_OP = 'INSERT' THEN 'signal_created'
          ELSE 'signal_updated'
        END,
        'alert_type', CASE 
          WHEN TG_OP = 'INSERT' THEN 'signal_created'
          ELSE 'signal_updated'
        END,
        'target_price', NEW.entry_price,
        'triggered_price', NEW.entry_price,
        'status', NEW.status,
        'tp_hits', NEW.tp_hits,
        'close_reason', NEW.close_reason,
        'notes', NEW.notes,
        'change_types', change_types,
        'priority_level', priority_level,
        'author_id', NEW.user_id,
        'author_name', COALESCE(author_profile.display_name, 'Unknown Trader'),
        'author_avatar_url', author_profile.avatar_url,
        'delivery_channels', ARRAY['push', 'in_app'],
        'user_ids', eligible_users,
        'include_creator', false
      )
    )
  );

  -- Send enhanced notification
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key,
        'User-Agent', 'Supabase-Enhanced-Pipeline/2.0'
      ),
      body := notification_payload,
      timeout_milliseconds := 15000
    ) INTO request_id;
    
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'enhanced_notification_pipeline', 
      NOW(), 
      array_length(eligible_users, 1), 
      'success',
      'Enhanced notification sent - Request ID: ' || COALESCE(request_id::text, 'null') || 
      ' - Signal: ' || NEW.asset_name || ' - Operation: ' || TG_OP ||
      ' - Changes: ' || array_to_string(change_types, ', ') ||
      ' - Users: ' || array_length(eligible_users, 1)::text || 
      ' - Priority: ' || priority_level::text
    );
    
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'enhanced_notification_pipeline', 
      NOW(), 
      0, 
      'error', 
      'Enhanced notification failed: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text || ' - Operation: ' || TG_OP
    );
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'enhanced_notification_pipeline', 
    NOW(), 
    0, 
    'error', 
    'Enhanced pipeline exception: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text || ' - Operation: ' || TG_OP
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the unified triggers using the enhanced pipeline
CREATE TRIGGER enhanced_signal_notification_pipeline_insert
  AFTER INSERT ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_notification_pipeline();

CREATE TRIGGER enhanced_signal_notification_pipeline_update
  AFTER UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_notification_pipeline();

-- Create function to populate alert monitoring for existing signals
CREATE OR REPLACE FUNCTION public.populate_alert_monitoring_for_existing_signals()
RETURNS INTEGER AS $$
DECLARE
  signal_record RECORD;
  created_count INTEGER := 0;
BEGIN
  -- Process all active signals that don't have monitoring entries
  FOR signal_record IN 
    SELECT id, tradermade_symbol, stop_loss, tp1, tp2, tp3, tp4, tp5
    FROM public.trade_alerts 
    WHERE status = 'active'
    AND id NOT IN (
      SELECT DISTINCT signal_id 
      FROM public.alert_monitoring 
      WHERE signal_id IS NOT NULL
    )
  LOOP
    -- Create stop loss monitoring
    IF signal_record.stop_loss IS NOT NULL THEN
      INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
      VALUES (signal_record.id, signal_record.tradermade_symbol, 'stop_loss', signal_record.stop_loss, 1)
      ON CONFLICT (signal_id, alert_type) DO NOTHING;
      created_count := created_count + 1;
    END IF;
    
    -- Create take profit monitoring entries
    IF signal_record.tp1 IS NOT NULL THEN
      INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
      VALUES (signal_record.id, signal_record.tradermade_symbol, 'take_profit_1', signal_record.tp1, 2)
      ON CONFLICT (signal_id, alert_type) DO NOTHING;
      created_count := created_count + 1;
    END IF;
    
    IF signal_record.tp2 IS NOT NULL THEN
      INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
      VALUES (signal_record.id, signal_record.tradermade_symbol, 'take_profit_2', signal_record.tp2, 2)
      ON CONFLICT (signal_id, alert_type) DO NOTHING;
      created_count := created_count + 1;
    END IF;
    
    IF signal_record.tp3 IS NOT NULL THEN
      INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
      VALUES (signal_record.id, signal_record.tradermade_symbol, 'take_profit_3', signal_record.tp3, 2)
      ON CONFLICT (signal_id, alert_type) DO NOTHING;
      created_count := created_count + 1;
    END IF;
    
    IF signal_record.tp4 IS NOT NULL THEN
      INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
      VALUES (signal_record.id, signal_record.tradermade_symbol, 'take_profit_4', signal_record.tp4, 2)
      ON CONFLICT (signal_id, alert_type) DO NOTHING;
      created_count := created_count + 1;
    END IF;
    
    IF signal_record.tp5 IS NOT NULL THEN
      INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
      VALUES (signal_record.id, signal_record.tradermade_symbol, 'take_profit_5', signal_record.tp5, 2)
      ON CONFLICT (signal_id, alert_type) DO NOTHING;
      created_count := created_count + 1;
    END IF;
  END LOOP;
  
  -- Log the operation
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'populate_alert_monitoring', 
    NOW(), 
    created_count, 
    'success',
    'Alert monitoring entries created for existing active signals'
  );
  
  RETURN created_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the population function
SELECT public.populate_alert_monitoring_for_existing_signals();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_rate_limits_user_type ON public.notification_rate_limits(user_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_audit_trail_user_signal ON public.notification_audit_trail(user_id, signal_id);
CREATE INDEX IF NOT EXISTS idx_alert_monitoring_symbol_active ON public.alert_monitoring(symbol, is_active) WHERE is_active = true;