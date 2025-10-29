-- =====================================================
-- Migration: Create signal_subscriptions table
-- Purpose: Track user subscriptions to signal providers for push notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS public.signal_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider_id)
);

-- Enable Row Level Security
ALTER TABLE public.signal_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscriptions"
  ON public.signal_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
  ON public.signal_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON public.signal_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON public.signal_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX idx_signal_subscriptions_user_id 
  ON public.signal_subscriptions(user_id);

CREATE INDEX idx_signal_subscriptions_provider_id 
  ON public.signal_subscriptions(provider_id);

CREATE INDEX idx_signal_subscriptions_active 
  ON public.signal_subscriptions(is_active) 
  WHERE is_active = true;

-- Comments
COMMENT ON TABLE public.signal_subscriptions IS 'Tracks user subscriptions to signal providers for push notifications';
COMMENT ON COLUMN public.signal_subscriptions.user_id IS 'User who is subscribing to receive signal notifications';
COMMENT ON COLUMN public.signal_subscriptions.provider_id IS 'Signal provider (educator) whose signals the user wants to receive';
COMMENT ON COLUMN public.signal_subscriptions.is_active IS 'Whether subscription is currently active';