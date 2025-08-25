-- Create private bucket for journal chart uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('journal-charts', 'journal-charts', false, 15728640, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

-- Add screenshot_urls column to trade_journal_entries for multiple images
ALTER TABLE public.trade_journal_entries 
ADD COLUMN IF NOT EXISTS screenshot_urls text[] DEFAULT '{}';

-- Migrate existing screenshot_url data to the new array column
UPDATE public.trade_journal_entries 
SET screenshot_urls = ARRAY[screenshot_url] 
WHERE screenshot_url IS NOT NULL 
  AND (screenshot_urls IS NULL OR array_length(screenshot_urls, 1) IS NULL);

-- RLS policies for journal-charts bucket
CREATE POLICY "Users can upload their own journal charts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'journal-charts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own journal charts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'journal-charts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own journal charts"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'journal-charts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own journal charts"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'journal-charts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);