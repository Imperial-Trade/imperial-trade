-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 PROFESSIONAL NOTIFICATION ANALYTICS & TRACKING
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Created: 2025-11-19
-- Purpose: Track EVERY notification for analytics, debugging, and optimization
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 1. NOTIFICATION ANALYTICS TABLE                                 │
-- └─────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.notification_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Notification Metadata
  signal_id UUID NOT NULL REFERENCES public.trade_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'signal_created', 'tp_hit', 'stop_loss_hit', etc.
  
  -- OneSignal Integration
  onesignal_notification_id TEXT, -- OneSignal's notification ID for tracking
  onesignal_response JSONB, -- Full OneSignal API response
  
  -- Delivery Tracking
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE, -- When OneSignal confirmed delivery
  opened_at TIMESTAMP WITH TIME ZONE, -- When user opened the notification
  clicked_at TIMESTAMP WITH TIME ZONE, -- When user clicked the notification
  dismissed_at TIMESTAMP WITH TIME ZONE, -- When user dismissed without clicking
  failed_at TIMESTAMP WITH TIME ZONE, -- When delivery failed
  failure_reason TEXT, -- Why it failed
  
  -- Performance Metrics
  delivery_latency_ms INTEGER, -- Time from sent_at to delivered_at
  open_latency_ms INTEGER, -- Time from delivered_at to opened_at
  
  -- Device/Platform Info (from OneSignal)
  device_type TEXT, -- 'web', 'ios', 'android'
  browser TEXT, -- 'chrome', 'safari', 'firefox', etc.
  os_version TEXT, -- 'iOS 16.4', 'Android 13', 'Windows 11'
  
  -- Conversion Tracking
  converted BOOLEAN DEFAULT FALSE, -- Did user take action?
  conversion_action TEXT, -- 'viewed_signal', 'copied_trade', 'shared', etc.
  converted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notification_payload JSONB, -- Full notification content for debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 2. INDEXES FOR FAST QUERIES                                     │
-- └─────────────────────────────────────────────────────────────────┘

CREATE INDEX idx_notification_analytics_user ON public.notification_analytics(user_id);
CREATE INDEX idx_notification_analytics_signal ON public.notification_analytics(signal_id);
CREATE INDEX idx_notification_analytics_type ON public.notification_analytics(notification_type);
CREATE INDEX idx_notification_analytics_sent ON public.notification_analytics(sent_at DESC);
CREATE INDEX idx_notification_analytics_onesignal ON public.notification_analytics(onesignal_notification_id);
CREATE INDEX idx_notification_analytics_failed ON public.notification_analytics(failed_at) WHERE failed_at IS NOT NULL;
CREATE INDEX idx_notification_analytics_delivered ON public.notification_analytics(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX idx_notification_analytics_opened ON public.notification_analytics(opened_at) WHERE opened_at IS NOT NULL;

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 3. USER NOTIFICATION PREFERENCES                                │
-- └─────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification Type Preferences
  signal_created BOOLEAN DEFAULT TRUE,
  pending_limit_created BOOLEAN DEFAULT TRUE,
  limit_activated BOOLEAN DEFAULT TRUE,
  tp_hit BOOLEAN DEFAULT TRUE,
  stop_loss_hit BOOLEAN DEFAULT TRUE,
  signal_closed BOOLEAN DEFAULT FALSE, -- Less important
  notes_updated BOOLEAN DEFAULT FALSE, -- Less important
  
  -- Quiet Hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME, -- e.g., '22:00' (10 PM)
  quiet_hours_end TIME, -- e.g., '07:00' (7 AM)
  user_timezone TEXT DEFAULT 'America/New_York',
  
  -- Frequency Limits
  max_notifications_per_hour INTEGER DEFAULT 20,
  max_notifications_per_day INTEGER DEFAULT 100,
  
  -- Sound & Vibration
  sound_enabled BOOLEAN DEFAULT TRUE,
  vibration_enabled BOOLEAN DEFAULT TRUE,
  
  -- Priority Filtering
  only_high_priority BOOLEAN DEFAULT FALSE, -- Only TP/SL notifications
  
  -- Educator Filtering
  only_favorite_educators BOOLEAN DEFAULT FALSE,
  favorite_educator_ids UUID[], -- Array of educator user IDs
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 4. NOTIFICATION RATE LIMITING                                   │
-- └─────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.notification_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  
  -- Rate Limit Windows
  minute_count INTEGER DEFAULT 0,
  hour_count INTEGER DEFAULT 0,
  day_count INTEGER DEFAULT 0,
  
  -- Window Timestamps
  minute_window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  hour_window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  day_window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Last Reset
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, notification_type)
);

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 5. FAILED NOTIFICATIONS QUEUE (FOR RETRY)                       │
-- └─────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.failed_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Original Request
  signal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  payload JSONB NOT NULL, -- Full OneSignal payload
  
  -- Failure Info
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'retrying', 'failed', 'success'
  
  -- Retry Schedule
  next_retry_at TIMESTAMP WITH TIME ZONE,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_failed_notifications_status ON public.failed_notifications(status);
CREATE INDEX idx_failed_notifications_retry ON public.failed_notifications(next_retry_at) WHERE status = 'pending';

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 6. RLS POLICIES                                                 │
-- └─────────────────────────────────────────────────────────────────┘

-- Enable RLS
ALTER TABLE public.notification_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_notifications ENABLE ROW LEVEL SECURITY;

-- Analytics: Admins can see all, users can see their own
CREATE POLICY "notification_analytics_admin_all" ON public.notification_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "notification_analytics_user_own" ON public.notification_analytics
  FOR SELECT USING (user_id = auth.uid());

-- Preferences: Users can manage their own
CREATE POLICY "notification_preferences_user_all" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Rate Limits: Internal use only (service role)
CREATE POLICY "notification_rate_limits_service_role" ON public.notification_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Failed Notifications: Admins only
CREATE POLICY "failed_notifications_admin_only" ON public.failed_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 7. HELPER FUNCTIONS                                             │
-- └─────────────────────────────────────────────────────────────────┘

-- Function to get delivery rate for last 24 hours
CREATE OR REPLACE FUNCTION get_notification_delivery_rate()
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  delivery_rate NUMERIC,
  avg_latency_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_sent,
    COUNT(delivered_at)::BIGINT AS total_delivered,
    COUNT(failed_at)::BIGINT AS total_failed,
    ROUND(
      CASE 
        WHEN COUNT(*) > 0 THEN (COUNT(delivered_at)::NUMERIC / COUNT(*)::NUMERIC) * 100
        ELSE 0
      END,
      2
    ) AS delivery_rate,
    ROUND(AVG(delivery_latency_ms)) AS avg_latency_ms
  FROM public.notification_analytics
  WHERE sent_at >= NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get engagement metrics
CREATE OR REPLACE FUNCTION get_notification_engagement_metrics()
RETURNS TABLE (
  notification_type TEXT,
  total_sent BIGINT,
  total_delivered BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  open_rate NUMERIC,
  click_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    na.notification_type,
    COUNT(*)::BIGINT AS total_sent,
    COUNT(na.delivered_at)::BIGINT AS total_delivered,
    COUNT(na.opened_at)::BIGINT AS total_opened,
    COUNT(na.clicked_at)::BIGINT AS total_clicked,
    ROUND(
      CASE 
        WHEN COUNT(na.delivered_at) > 0 THEN (COUNT(na.opened_at)::NUMERIC / COUNT(na.delivered_at)::NUMERIC) * 100
        ELSE 0
      END,
      2
    ) AS open_rate,
    ROUND(
      CASE 
        WHEN COUNT(na.delivered_at) > 0 THEN (COUNT(na.clicked_at)::NUMERIC / COUNT(na.delivered_at)::NUMERIC) * 100
        ELSE 0
      END,
      2
    ) AS click_rate
  FROM public.notification_analytics na
  WHERE na.sent_at >= NOW() - INTERVAL '7 days'
  GROUP BY na.notification_type
  ORDER BY total_sent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 8. AUTO-UPDATE TIMESTAMPS                                       │
-- └─────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION update_notification_analytics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_analytics_update_timestamp
  BEFORE UPDATE ON public.notification_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_analytics_timestamp();

CREATE TRIGGER notification_preferences_update_timestamp
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_analytics_timestamp();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ MIGRATION COMPLETE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMENT ON TABLE public.notification_analytics IS 'Tracks every notification for analytics, debugging, and optimization';
COMMENT ON TABLE public.notification_preferences IS 'User preferences for notification types, quiet hours, and frequency limits';
COMMENT ON TABLE public.notification_rate_limits IS 'Rate limiting to prevent notification spam';
COMMENT ON TABLE public.failed_notifications IS 'Queue for failed notifications with retry logic';

