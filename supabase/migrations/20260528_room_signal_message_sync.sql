-- Sync room_messages signal snapshot when room_signals row is updated
CREATE OR REPLACE FUNCTION public.tg_signal_sync_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.room_messages
  SET content = jsonb_build_object(
    'symbol', NEW.symbol,
    'side', NEW.side,
    'entry', NEW.entry,
    'sl', NEW.sl,
    'tps', NEW.tps,
    'status', NEW.status,
    'pips', NEW.pips,
    'notes', NEW.notes
  )
  WHERE signal_id = NEW.id AND type = 'signal';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_signal_sync_message ON public.room_signals;
CREATE TRIGGER trg_signal_sync_message
AFTER UPDATE ON public.room_signals
FOR EACH ROW EXECUTE FUNCTION public.tg_signal_sync_message();
