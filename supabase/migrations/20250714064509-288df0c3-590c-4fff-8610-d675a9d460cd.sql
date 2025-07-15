-- Update RLS policies for live_sessions table to support session management
-- Allow admins and educators to create, update, and manage live sessions

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view live sessions" ON public.live_sessions;

-- Create comprehensive RLS policies for live_sessions
CREATE POLICY "Anyone can view live sessions"
ON public.live_sessions
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all live sessions"
ON public.live_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.access_level = 'admin'
  )
);

CREATE POLICY "Educators can create live sessions"
ON public.live_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.user_type = 'educator' OR profiles.access_level IN ('admin', 'moderator'))
  )
);

CREATE POLICY "Educators can manage their own live sessions"
ON public.live_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.user_type = 'educator' OR profiles.access_level IN ('admin', 'moderator'))
  )
);

CREATE POLICY "Educators can delete their own live sessions"
ON public.live_sessions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.user_type = 'educator' OR profiles.access_level IN ('admin', 'moderator'))
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_live_sessions_session_date ON public.live_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON public.live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_host ON public.live_sessions(host_name);

-- Enable realtime for live_sessions table
ALTER TABLE public.live_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;