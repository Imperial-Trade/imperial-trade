-- Add welcome_sent column to device_subscriptions table to track welcome notifications
ALTER TABLE public.device_subscriptions 
ADD COLUMN IF NOT EXISTS welcome_sent BOOLEAN DEFAULT false;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_device_subscriptions_welcome_sent 
ON public.device_subscriptions (user_id, device_fingerprint, welcome_sent);

-- Update existing records to mark as welcome sent if they're old enough
UPDATE public.device_subscriptions 
SET welcome_sent = true 
WHERE created_at < NOW() - INTERVAL '1 day';

-- Add comment
COMMENT ON COLUMN public.device_subscriptions.welcome_sent IS 'Tracks whether a welcome push notification has been sent to this device';