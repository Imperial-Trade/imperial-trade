-- Add stream_embed_url field to live_sessions table for in-app video streaming
ALTER TABLE public.live_sessions 
ADD COLUMN stream_embed_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.live_sessions.stream_embed_url IS 'Embed URL for streaming platforms (YouTube Live, Facebook Live, Twitch, etc.) to allow in-app video viewing';