-- Apply the ui_activity_sessions table creation that was missing
-- This table is needed for proper session deduplication and activity tracking

CREATE TABLE IF NOT EXISTS public.ui_activity_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    symbols text[] DEFAULT '{}',
    last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Prevent duplicate sessions for same session_id
    CONSTRAINT unique_session_id UNIQUE (session_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ui_activity_sessions_session_id ON public.ui_activity_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_ui_activity_sessions_user_id ON public.ui_activity_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ui_activity_sessions_last_activity ON public.ui_activity_sessions(last_activity_at);

-- Enable RLS
ALTER TABLE public.ui_activity_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for ui_activity_sessions
CREATE POLICY "Users can view their own activity sessions" 
ON public.ui_activity_sessions 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can create their own activity sessions" 
ON public.ui_activity_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update their own activity sessions" 
ON public.ui_activity_sessions 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can delete their own activity sessions" 
ON public.ui_activity_sessions 
FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Create or replace the register_ui_activity_enhanced function
CREATE OR REPLACE FUNCTION public.register_ui_activity_enhanced(
    p_session_id text,
    p_user_id uuid DEFAULT NULL,
    p_symbols text[] DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Validate session_id
    IF p_session_id IS NULL OR p_session_id = '' THEN
        RAISE EXCEPTION 'Invalid session_id provided';
    END IF;
    
    -- Insert or update session activity
    INSERT INTO public.ui_activity_sessions (session_id, user_id, symbols, last_activity_at, updated_at)
    VALUES (p_session_id, p_user_id, p_symbols, now(), now())
    ON CONFLICT (session_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        symbols = EXCLUDED.symbols,
        last_activity_at = now(),
        updated_at = now();
        
    -- Clean up old sessions (older than 10 minutes)
    DELETE FROM public.ui_activity_sessions 
    WHERE last_activity_at < now() - interval '10 minutes';
    
    -- Also clean up the old ui_price_listeners table if it exists
    DELETE FROM public.ui_price_listeners 
    WHERE last_seen_at < now() - interval '10 minutes';
    
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the operation
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
        'register_ui_activity_enhanced', 
        now(), 
        0, 
        'error',
        'Failed to register UI activity: ' || SQLERRM
    );
END;
$$;

-- Clean up any existing duplicate sessions immediately
DELETE FROM public.ui_price_listeners 
WHERE last_seen_at < now() - interval '5 minutes';

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_ui_activity_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_ui_activity_sessions_updated_at_trigger ON public.ui_activity_sessions;
CREATE TRIGGER update_ui_activity_sessions_updated_at_trigger
    BEFORE UPDATE ON public.ui_activity_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_ui_activity_sessions_updated_at();