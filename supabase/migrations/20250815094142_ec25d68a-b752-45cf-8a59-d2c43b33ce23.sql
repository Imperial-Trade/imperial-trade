-- Fix OneSignal Player ID Issues: Reset broken subscription states and add monitoring
-- This migration addresses the tag limit issue and database inconsistencies

-- Step 1: Reset false positive subscription states for users missing Player IDs
UPDATE public.profiles 
SET 
  push_subscription_active = false,
  onesignal_subscription_status = 'unsubscribed',
  updated_at = now()
WHERE push_subscription_active = true 
  AND (onesignal_player_id IS NULL OR onesignal_player_id = '');

-- Step 2: Create monitoring table for OneSignal API issues
CREATE TABLE IF NOT EXISTS public.onesignal_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action_type TEXT NOT NULL, -- 'api_call', 'tag_limit_error', 'player_id_capture', etc.
  status TEXT NOT NULL, -- 'success', 'error', 'warning'
  error_message TEXT,
  tag_count INTEGER,
  api_endpoint TEXT,
  response_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on monitoring table
ALTER TABLE public.onesignal_monitoring ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all monitoring data
CREATE POLICY "Admins can view OneSignal monitoring" ON public.onesignal_monitoring
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND access_level = 'admin'::access_level_enum
    )
  );

-- Allow system to insert monitoring data
CREATE POLICY "System can insert OneSignal monitoring" ON public.onesignal_monitoring
  FOR INSERT WITH CHECK (true);

-- Step 3: Create function to validate and limit OneSignal tags
CREATE OR REPLACE FUNCTION public.validate_onesignal_tags(input_tags JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  essential_tags JSONB := '{}'::jsonb;
  tag_count INTEGER;
BEGIN
  -- Count incoming tags
  tag_count := jsonb_object_keys(input_tags)::text[] |> array_length(#, 1);
  
  -- Log if too many tags
  IF tag_count > 2 THEN
    INSERT INTO public.onesignal_monitoring (
      action_type, status, error_message, tag_count
    ) VALUES (
      'tag_validation', 'warning', 
      'Excessive tags detected, limiting to essential only', tag_count
    );
  END IF;
  
  -- Only allow essential tags
  IF input_tags ? 'role' THEN
    essential_tags := essential_tags || jsonb_build_object('role', input_tags->>'role');
  END IF;
  
  -- Always set platform to 'web' to avoid complexity
  essential_tags := essential_tags || jsonb_build_object('platform', 'web');
  
  RETURN essential_tags;
END;
$$;

-- Step 4: Create emergency recovery trigger for broken users
CREATE OR REPLACE FUNCTION public.trigger_emergency_player_id_recovery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If user has push enabled but no player ID, mark for emergency sync
  IF NEW.push_subscription_active = true 
     AND (NEW.onesignal_player_id IS NULL OR NEW.onesignal_player_id = '') 
     AND OLD.push_subscription_active = false THEN
    
    -- Log the recovery need
    INSERT INTO public.onesignal_monitoring (
      user_id, action_type, status, error_message
    ) VALUES (
      NEW.id, 'recovery_needed', 'warning', 
      'User enabled push without Player ID - emergency sync required'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for emergency recovery
DROP TRIGGER IF EXISTS emergency_player_id_recovery ON public.profiles;
CREATE TRIGGER emergency_player_id_recovery
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_emergency_player_id_recovery();