
-- 1) Allow NULL for device_subscriptions.onesignal_player_id so we can create device rows
--    before OneSignal returns a Player ID, avoiding unique constraint violations.
ALTER TABLE public.device_subscriptions
ALTER COLUMN onesignal_player_id DROP NOT NULL;

-- 2) Normalize any placeholder values to NULL to prevent future conflicts.
UPDATE public.device_subscriptions
SET onesignal_player_id = NULL
WHERE onesignal_player_id = 'pending';
