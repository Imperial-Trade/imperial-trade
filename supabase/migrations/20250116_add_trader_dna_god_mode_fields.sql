-- Add Trader DNA God Mode fields to trade_journal_entries table
-- These fields are AI-extracted/analyzed from trading screenshots

-- Add target_hit_by_market: AI-analyzed boolean indicating if market price reached planned target
ALTER TABLE public.trade_journal_entries 
ADD COLUMN IF NOT EXISTS target_hit_by_market BOOLEAN DEFAULT NULL;

-- Add planned_target_price: AI-extracted take profit price from trading screenshot
ALTER TABLE public.trade_journal_entries 
ADD COLUMN IF NOT EXISTS planned_target_price DECIMAL DEFAULT NULL;

-- Add planned_stop_loss: AI-extracted stop loss price from trading screenshot
ALTER TABLE public.trade_journal_entries 
ADD COLUMN IF NOT EXISTS planned_stop_loss DECIMAL DEFAULT NULL;

-- Add monthly_goal to profiles table for goal progress tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS monthly_goal DECIMAL DEFAULT 5000;

-- Add comments for documentation
COMMENT ON COLUMN public.trade_journal_entries.target_hit_by_market IS 'AI-analyzed: Whether market price reached planned_target_price during trade window';
COMMENT ON COLUMN public.trade_journal_entries.planned_target_price IS 'AI-extracted: Take profit price extracted from trading screenshot';
COMMENT ON COLUMN public.trade_journal_entries.planned_stop_loss IS 'AI-extracted: Stop loss price extracted from trading screenshot';
COMMENT ON COLUMN public.profiles.monthly_goal IS 'User-set monthly profit goal (default 5000)';

