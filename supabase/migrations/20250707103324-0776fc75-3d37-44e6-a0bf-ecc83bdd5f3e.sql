
-- Create videos table for educational content
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT,
  difficulty TEXT,
  duration INTEGER, -- duration in seconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create policy that allows anyone to view videos (educational content should be public)
CREATE POLICY "Anyone can view videos" 
  ON public.videos 
  FOR SELECT 
  USING (true);

-- Add trigger to update updated_at column
CREATE TRIGGER update_videos_updated_at 
  BEFORE UPDATE ON public.videos 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();
