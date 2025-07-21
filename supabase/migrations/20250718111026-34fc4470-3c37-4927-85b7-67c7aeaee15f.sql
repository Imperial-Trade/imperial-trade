
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a simple logging table for cron job execution tracking
CREATE TABLE IF NOT EXISTS public.cron_job_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  execution_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  records_affected INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the logging table
ALTER TABLE public.cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view cron job logs
CREATE POLICY "Admins can view cron job logs" 
  ON public.cron_job_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.access_level = 'admin'
    )
  );

-- Create the function to update expired sessions
CREATE OR REPLACE FUNCTION public.update_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  error_msg TEXT;
BEGIN
  -- Update sessions where the session date has passed and status is not completed
  UPDATE public.live_sessions 
  SET 
    status = 'completed'::session_status,
    updated_at = NOW()
  WHERE 
    session_date::date < CURRENT_DATE 
    AND status IN ('scheduled'::session_status, 'live'::session_status);
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log successful execution
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status)
  VALUES ('update_expired_sessions', NOW(), updated_count, 'success');
  
  RETURN updated_count;
  
EXCEPTION WHEN OTHERS THEN
  -- Log any errors that occur
  GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
  
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('update_expired_sessions', NOW(), 0, 'error', error_msg);
  
  -- Re-raise the exception
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run daily at 2:00 AM
SELECT cron.schedule(
  'update-expired-sessions-daily',
  '0 2 * * *', -- Daily at 2:00 AM UTC
  'SELECT public.update_expired_sessions();'
);

-- Test the function immediately to update any existing expired sessions
SELECT public.update_expired_sessions();
