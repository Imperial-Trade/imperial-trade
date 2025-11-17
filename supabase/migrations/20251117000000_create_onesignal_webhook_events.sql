-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 ONESIGNAL WEBHOOK EVENTS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Stores notification analytics from OneSignal webhooks
-- Tracks: displayed, clicked, dismissed events
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Table to store OneSignal webhook events
CREATE TABLE IF NOT EXISTS onesignal_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- 'notification.displayed', 'notification.clicked', 'notification.dismissed'
  notification_id text NOT NULL,
  player_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Event data
  app_id text NOT NULL,
  heading text,
  content text,
  url text,
  icon text,
  
  -- Metadata
  delivery_status text, -- 'sent', 'delivered', 'failed'
  platform text, -- 'chrome', 'safari', 'firefox', 'ios', 'android'
  device_type text, -- 'desktop', 'mobile', 'tablet'
  
  -- Timestamps
  event_timestamp timestamptz,
  created_at timestamptz DEFAULT now(),
  
  -- Raw payload for debugging
  raw_payload jsonb
);

-- Indexes
CREATE INDEX idx_webhook_events_user_id ON onesignal_webhook_events(user_id);
CREATE INDEX idx_webhook_events_notification_id ON onesignal_webhook_events(notification_id);
CREATE INDEX idx_webhook_events_type ON onesignal_webhook_events(event_type);
CREATE INDEX idx_webhook_events_created_at ON onesignal_webhook_events(created_at DESC);

-- RLS Policies
ALTER TABLE onesignal_webhook_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all events
CREATE POLICY "Admins can view all webhook events"
  ON onesignal_webhook_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'educator')
    )
  );

-- Users can view their own events
CREATE POLICY "Users can view their own webhook events"
  ON onesignal_webhook_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

