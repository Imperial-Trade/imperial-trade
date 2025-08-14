-- Create trigger function to automatically send push notifications when signals are created
CREATE OR REPLACE FUNCTION public.auto_notify_signal_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for signals created by admins or educators
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id 
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    -- Call the signal notification dispatcher edge function
    PERFORM pg_notify('signal_created', json_build_object(
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
      'tradermade_symbol', NEW.tradermade_symbol,
      'created_at', NEW.created_at
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;