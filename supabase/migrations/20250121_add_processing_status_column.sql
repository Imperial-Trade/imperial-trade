-- Add processing_status column to track AI analysis state
-- This column tracks when screenshot analysis is in progress so the UI can show a "processing" indicator

ALTER TABLE trade_journal_entries 
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'complete';

-- Add index for faster queries on processing status
CREATE INDEX IF NOT EXISTS idx_trade_journal_processing_status 
ON trade_journal_entries(processing_status);

-- Add comment for documentation
COMMENT ON COLUMN trade_journal_entries.processing_status IS 
'Tracks AI screenshot analysis status: pending, analyzing, complete, failed';

