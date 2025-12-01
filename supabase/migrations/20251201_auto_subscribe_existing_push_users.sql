-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔔 AUTO-SUBSCRIBE EXISTING PUSH USERS TO ALL SIGNAL PROVIDERS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Auto-subscribe all users who already enabled push notifications
-- to ALL signal providers (educators and admins who create signals)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Get all users who have push notifications enabled
-- and all signal providers, then create subscriptions
INSERT INTO signal_subscriptions (user_id, provider_id, is_active, subscribed_at)
SELECT DISTINCT
  subscribers.id as user_id,
  providers.id as provider_id,
  true as is_active,
  NOW() as subscribed_at
FROM 
  (
    -- All users with active push subscriptions
    SELECT DISTINCT id
    FROM profiles
    WHERE xeon_stream_subscription = true
      AND device_token IS NOT NULL
  ) AS subscribers
CROSS JOIN
  (
    -- All signal providers (educators and admins who have created signals)
    SELECT DISTINCT p.id
    FROM profiles p
    WHERE p.user_type IN ('educator', 'admin')
  ) AS providers
ON CONFLICT (user_id, provider_id) 
DO UPDATE SET
  is_active = true,
  subscribed_at = NOW(),
  updated_at = NOW();

-- Log the migration result
DO $$
DECLARE
  subscription_count INTEGER;
  user_count INTEGER;
  provider_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO subscription_count FROM signal_subscriptions WHERE is_active = true;
  SELECT COUNT(DISTINCT user_id) INTO user_count FROM signal_subscriptions WHERE is_active = true;
  SELECT COUNT(DISTINCT provider_id) INTO provider_count FROM signal_subscriptions WHERE is_active = true;
  
  RAISE NOTICE '✅ Auto-Subscribe Migration Complete:';
  RAISE NOTICE '   • Total subscriptions: %', subscription_count;
  RAISE NOTICE '   • Subscribed users: %', user_count;
  RAISE NOTICE '   • Signal providers: %', provider_count;
END $$;

