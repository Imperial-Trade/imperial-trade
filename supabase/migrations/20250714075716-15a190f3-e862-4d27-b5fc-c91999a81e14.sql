-- Add Zoom SDK fields to live_sessions table
ALTER TABLE public.live_sessions 
ADD COLUMN zoom_sdk_enabled boolean DEFAULT false,
ADD COLUMN zoom_meeting_number text;

-- Create index for better performance on zoom_sdk_enabled queries
CREATE INDEX idx_live_sessions_zoom_sdk_enabled ON public.live_sessions(zoom_sdk_enabled);

-- Update the updated_at trigger to include new columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;