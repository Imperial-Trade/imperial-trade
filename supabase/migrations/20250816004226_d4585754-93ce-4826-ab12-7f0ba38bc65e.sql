-- Phase 1.1: Enhanced Notification Preferences Schema
-- Add comprehensive notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "alerts": {
    "critical": {"push": true, "in_app": true, "email": true, "sound": "high"},
    "important": {"push": true, "in_app": true, "email": false, "sound": "medium"}, 
    "standard": {"push": true, "in_app": true, "email": false, "sound": "low"},
    "info": {"push": false, "in_app": true, "email": false, "sound": "none"}
  },
  "trading": {
    "signal_created": {"enabled": true, "priority": "high", "sound": "signal_alert"},
    "signal_updated": {"enabled": true, "priority": "medium", "sound": "update_chime"},
    "price_alerts": {"enabled": true, "priority": "high", "sound": "price_alert"},
    "tp_hit": {"enabled": true, "priority": "high", "sound": "success_ding"},
    "stop_loss": {"enabled": true, "priority": "critical", "sound": "warning_tone"}
  },
  "schedule": {
    "quiet_hours": {"enabled": false, "start": "22:00", "end": "07:00"},
    "market_hours_only": false,
    "weekend_alerts": true
  },
  "channels": {
    "push": {"enabled": true, "priority_threshold": "standard"},
    "in_app": {"enabled": true, "priority_threshold": "info"},
    "email": {"enabled": false, "priority_threshold": "critical"}
  },
  "device": {
    "vibration": true,
    "led_flash": false,
    "priority_bypass": true
  }
}'::jsonb;