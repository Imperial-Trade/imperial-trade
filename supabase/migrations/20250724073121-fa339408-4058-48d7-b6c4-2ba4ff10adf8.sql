-- Add indexes for economic_events table to optimize query performance
CREATE INDEX IF NOT EXISTS idx_economic_events_date_time ON economic_events (event_date, event_time);
CREATE INDEX IF NOT EXISTS idx_economic_events_currency ON economic_events (currency_code);
CREATE INDEX IF NOT EXISTS idx_economic_events_impact ON economic_events (impact);
CREATE INDEX IF NOT EXISTS idx_economic_events_date_currency ON economic_events (event_date, currency_code);
CREATE INDEX IF NOT EXISTS idx_economic_events_date_impact ON economic_events (event_date, impact);

-- Create a composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_economic_events_query_optimized 
ON economic_events (event_date, currency_code, impact, event_time);

-- Add index for external_id to prevent duplicates more efficiently
CREATE INDEX IF NOT EXISTS idx_economic_events_external_id ON economic_events (external_id);

-- Create a partial index for recent events (events not older than a fixed date)
CREATE INDEX IF NOT EXISTS idx_economic_events_recent 
ON economic_events (event_date, currency_code, impact) 
WHERE event_date >= '2025-01-01';