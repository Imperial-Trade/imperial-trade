-- Add revenge_trade column to trade_journal_entries table for testing Patience calculation
ALTER TABLE public.trade_journal_entries 
ADD COLUMN IF NOT EXISTS revenge_trade BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.trade_journal_entries.revenge_trade IS 'Flag for testing: Marks trade as revenge trade for Patience calculation';

