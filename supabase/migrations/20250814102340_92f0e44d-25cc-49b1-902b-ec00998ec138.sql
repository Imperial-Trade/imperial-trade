-- Update the auto_notify_signal_creation function to work with Supabase realtime
-- Remove pg_notify since we'll use postgres_changes events instead
CREATE OR REPLACE FUNCTION public.auto_notify_signal_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only trigger for signals created by admins or educators
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id 
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    -- The realtime listener will automatically pick up this INSERT via postgres_changes
    -- No need for pg_notify since we're using Supabase realtime subscription
    NULL;
  END IF;
  
  RETURN NEW;
END;
$function$

-- Ensure the trigger is properly attached to trade_alerts table
DROP TRIGGER IF EXISTS auto_notify_signal_creation_trigger ON public.trade_alerts;
CREATE TRIGGER auto_notify_signal_creation_trigger
    AFTER INSERT ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_notify_signal_creation();

-- Ensure realtime is enabled for trade_alerts table
ALTER TABLE public.trade_alerts REPLICA IDENTITY FULL;

-- Add trade_alerts to realtime publication if not already added
-- This ensures postgres_changes events are published
DO $$
BEGIN
    -- Check if the table is already in the publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'trade_alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_alerts;
    END IF;
END $$;