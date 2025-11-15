-- ================================================================
-- USER NOTIFICATIONS TABLE
-- ================================================================
-- This table stores notifications for each user in the database
-- so they persist across devices and logout/login sessions
-- ================================================================

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type text NOT NULL CHECK (notification_type IN (
    'new_signal', 
    'pending_limit', 
    'tp_hit', 
    'stop_loss', 
    'trade_closed', 
    'limit_activated', 
    'notes_updated', 
    'manual_close', 
    'all_tps_hit'
  )),
  
  title text NOT NULL,
  message text NOT NULL,
  
  -- Metadata (stored as JSONB for flexibility)
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Tracking
  event_key text, -- For deduplication
  delivery_channel text DEFAULT 'realtime',
  priority integer DEFAULT 1,
  is_read boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  
  -- Indexes
  CONSTRAINT unique_event_key UNIQUE NULLS NOT DISTINCT (user_id, event_key)
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- Index for fetching user's notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id_created 
ON public.user_notifications(user_id, created_at DESC);

-- Index for checking duplicates by event_key
CREATE INDEX IF NOT EXISTS idx_user_notifications_event_key 
ON public.user_notifications(user_id, event_key) 
WHERE event_key IS NOT NULL;

-- Index for filtering unread notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread 
ON public.user_notifications(user_id, is_read, created_at DESC) 
WHERE is_read = false;

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.user_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own notifications
CREATE POLICY "Users can insert their own notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.user_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.user_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Policy: System can insert notifications for any user (for backend triggers)
CREATE POLICY "System can insert notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (true);

-- ================================================================
-- AUTOMATIC CLEANUP - Keep only last 100 notifications per user
-- ================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete notifications older than the 100 most recent for this user
  DELETE FROM public.user_notifications
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id 
    FROM public.user_notifications
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 100
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to cleanup old notifications after each insert
CREATE TRIGGER trigger_cleanup_old_notifications
AFTER INSERT ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_old_notifications();

-- ================================================================
-- HELPER FUNCTION - Get user's recent notifications
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_user_notifications(
  p_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_unread_only boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  notification_type text,
  title text,
  message text,
  metadata jsonb,
  event_key text,
  delivery_channel text,
  priority integer,
  is_read boolean,
  created_at timestamptz,
  read_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  RETURN QUERY
  SELECT 
    un.id,
    un.notification_type,
    un.title,
    un.message,
    un.metadata,
    un.event_key,
    un.delivery_channel,
    un.priority,
    un.is_read,
    un.created_at,
    un.read_at
  FROM public.user_notifications un
  WHERE un.user_id = v_user_id
    AND (NOT p_unread_only OR un.is_read = false)
  ORDER BY un.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ================================================================
-- HELPER FUNCTION - Mark notification as read
-- ================================================================

CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_notifications
  SET 
    is_read = true,
    read_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
    
  RETURN FOUND;
END;
$$;

-- ================================================================
-- HELPER FUNCTION - Mark all notifications as read
-- ================================================================

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.user_notifications
  SET 
    is_read = true,
    read_at = now()
  WHERE user_id = auth.uid()
    AND is_read = false;
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE public.user_notifications IS 
'Stores notifications for each user. Persists across devices and logout/login. Automatically keeps last 100 per user.';

COMMENT ON FUNCTION public.get_user_notifications IS 
'Retrieves notifications for a user. Use p_unread_only=true to get only unread notifications.';

COMMENT ON FUNCTION public.mark_notification_read IS 
'Marks a single notification as read. Returns true if successful.';

COMMENT ON FUNCTION public.mark_all_notifications_read IS 
'Marks all unread notifications for the current user as read. Returns count of marked notifications.';

