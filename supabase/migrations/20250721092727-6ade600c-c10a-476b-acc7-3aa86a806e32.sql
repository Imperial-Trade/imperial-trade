-- Create storage bucket for trade screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-screenshots', 'trade-screenshots', true);

-- Create RLS policies for the trade-screenshots bucket
CREATE POLICY "Anyone can view trade screenshots" ON storage.objects
FOR SELECT USING (bucket_id = 'trade-screenshots');

CREATE POLICY "Authenticated users can upload trade screenshots" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'trade-screenshots' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own trade screenshots" ON storage.objects
FOR UPDATE USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = owner);

CREATE POLICY "Users can delete their own trade screenshots" ON storage.objects
FOR DELETE USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = owner);