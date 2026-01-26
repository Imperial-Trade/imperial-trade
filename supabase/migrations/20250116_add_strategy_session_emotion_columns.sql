-- Add strategy, session, and emotion columns to trade_journal_entries
-- These fields are used for Top Performing Strats and Preferred Session analytics

ALTER TABLE public.trade_journal_entries 
ADD COLUMN IF NOT EXISTS strategy TEXT DEFAULT NULL;

ALTER TABLE public.trade_journal_entries 
ADD COLUMN IF NOT EXISTS session TEXT DEFAULT NULL;

ALTER TABLE public.trade_journal_entries 
ADD COLUMN IF NOT EXISTS emotion TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.trade_journal_entries.strategy IS 'Trading strategy used for this trade';
COMMENT ON COLUMN public.trade_journal_entries.session IS 'Trading session (Sydney, London, New York)';
COMMENT ON COLUMN public.trade_journal_entries.emotion IS 'Emotional state during trade';

