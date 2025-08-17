
-- 1) Allow admins and moderators (via public.user_roles) to create trade alerts,
--    independent of the profiles row existing or being synced
CREATE POLICY "Admins and moderators (roles) can create trade alerts"
  ON public.trade_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    )
  );

-- 2) Safety trigger: ensure NEW.user_id always matches the authenticated user,
--    preventing accidental RLS failures due to mismatched user_id values
CREATE OR REPLACE FUNCTION public.set_trade_alert_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL OR NEW.user_id <> auth.uid() THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_set_trade_alert_user_id'
  ) THEN
    CREATE TRIGGER trg_set_trade_alert_user_id
    BEFORE INSERT ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_trade_alert_user_id();
  END IF;
END $$;
