-- Update economic_events table for comprehensive economic calendar data
-- Add columns for detailed event information and deduplication

ALTER TABLE economic_events 
ADD COLUMN IF NOT EXISTS event_time TIME,
ADD COLUMN IF NOT EXISTS forecast TEXT,
ADD COLUMN IF NOT EXISTS previous_value TEXT,
ADD COLUMN IF NOT EXISTS actual_value TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'finnhub',
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create unique constraint to prevent duplicates
-- Use event_name, country, and event_date as composite key
ALTER TABLE economic_events 
DROP CONSTRAINT IF EXISTS unique_economic_event;

ALTER TABLE economic_events 
ADD CONSTRAINT unique_economic_event 
UNIQUE (event_name, country, event_date::date);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_economic_events_date ON economic_events (event_date);
CREATE INDEX IF NOT EXISTS idx_economic_events_country ON economic_events (country);
CREATE INDEX IF NOT EXISTS idx_economic_events_impact ON economic_events (impact);
CREATE INDEX IF NOT EXISTS idx_economic_events_currency ON economic_events (currency_code);
CREATE INDEX IF NOT EXISTS idx_economic_events_external_id ON economic_events (external_id);

-- Update existing RLS policies to handle the new structure
DROP POLICY IF EXISTS "Anyone can view economic events" ON economic_events;
CREATE POLICY "Anyone can view economic events" ON economic_events
  FOR SELECT USING (true);

-- Add policy for system to insert/update economic events data
CREATE POLICY "System can manage economic events" ON economic_events
  FOR ALL USING (true);

-- Create function to clean up old economic events (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_economic_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM economic_events 
  WHERE event_date < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status)
  VALUES ('cleanup_old_economic_events', NOW(), deleted_count, 'success');
  
  RETURN deleted_count;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('cleanup_old_economic_events', NOW(), 0, 'error', SQLERRM);
  
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;