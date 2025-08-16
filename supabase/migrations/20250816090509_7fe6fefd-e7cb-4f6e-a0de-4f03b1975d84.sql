
-- SOFT RESET ALL USERS' PUSH SUBSCRIPTION STATE
-- This script conditionally updates only when tables/columns exist, to avoid errors.

-- 1) Reset profiles push state
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    -- push_subscription_active -> false
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'push_subscription_active'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
      ) THEN
        EXECUTE 'UPDATE public.profiles SET push_subscription_active = false, updated_at = now()';
      ELSE
        EXECUTE 'UPDATE public.profiles SET push_subscription_active = false';
      END IF;
    END IF;

    -- onesignal_player_id -> NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onesignal_player_id'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
      ) THEN
        EXECUTE 'UPDATE public.profiles SET onesignal_player_id = NULL, updated_at = now()';
      ELSE
        EXECUTE 'UPDATE public.profiles SET onesignal_player_id = NULL';
      END IF;
    END IF;

    -- onesignal_subscription_status -> 'unknown'
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onesignal_subscription_status'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
      ) THEN
        EXECUTE 'UPDATE public.profiles SET onesignal_subscription_status = ''unknown'', updated_at = now()';
      ELSE
        EXECUTE 'UPDATE public.profiles SET onesignal_subscription_status = ''unknown''';
      END IF;
    END IF;
  END IF;
END
$$;

-- 2) Reset device_subscriptions state
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'device_subscriptions'
  ) THEN
    -- is_active -> false, onesignal_player_id -> NULL, welcome_sent -> false, notification_performance -> DEFAULT, updated_at -> now()
    -- (SET column = DEFAULT uses the table's default JSON value)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'device_subscriptions' AND column_name = 'updated_at'
    ) THEN
      EXECUTE '
        UPDATE public.device_subscriptions 
        SET 
          is_active = false,
          onesignal_player_id = NULL,
          welcome_sent = false,
          notification_performance = DEFAULT,
          updated_at = now()
      ';
    ELSE
      EXECUTE '
        UPDATE public.device_subscriptions 
        SET 
          is_active = false,
          onesignal_player_id = NULL,
          welcome_sent = false,
          notification_performance = DEFAULT
      ';
    END IF;
  END IF;
END
$$;

-- 3) If a push_subscriptions table exists, deactivate or purge safely
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'push_subscriptions'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'is_active'
    ) THEN
      EXECUTE 'UPDATE public.push_subscriptions SET is_active = false';
    ELSE
      -- Fallback: if is_active doesn't exist, perform a full cleanup
      EXECUTE 'DELETE FROM public.push_subscriptions';
    END IF;
  END IF;
END
$$;
