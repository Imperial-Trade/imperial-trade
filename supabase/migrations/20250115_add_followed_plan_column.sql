-- Add followed_plan column to trade_journal_entries table
ALTER TABLE public.trade_journal_entries 
ADD COLUMN IF NOT EXISTS followed_plan BOOLEAN DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.trade_journal_entries.followed_plan IS 'Whether the trader followed their trading plan for this trade';

