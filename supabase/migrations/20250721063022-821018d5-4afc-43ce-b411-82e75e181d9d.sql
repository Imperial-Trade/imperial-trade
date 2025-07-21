
-- First, add missing columns to existing trades table
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add check constraints to trades table
ALTER TABLE public.trades 
ADD CONSTRAINT IF NOT EXISTS trades_status_check CHECK (status IN ('open', 'closed')),
ADD CONSTRAINT IF NOT EXISTS trades_direction_check CHECK (direction IN ('long', 'short')),
ADD CONSTRAINT IF NOT EXISTS positive_position_size CHECK (position_size > 0);

-- Create indexes on trades table for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS trades_user_id_idx ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS trades_symbol_idx ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS trades_status_idx ON public.trades(status);

-- Enable RLS on trades table (if not already enabled)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can insert their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can delete their own trades" ON public.trades;

-- Create RLS policies for trades table
CREATE POLICY "Users can view their own trades" 
    ON public.trades 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades" 
    ON public.trades 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" 
    ON public.trades 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades" 
    ON public.trades 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Create trade_metrics table for additional metrics
CREATE TABLE IF NOT EXISTS public.trade_metrics (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    trade_id BIGINT NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    risk_reward_ratio NUMERIC(10, 2),
    win_loss TEXT CHECK (win_loss IN ('win', 'loss', 'breakeven')),
    risk_percentage NUMERIC(10, 2),
    fees NUMERIC(19, 4),
    slippage NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on trade_metrics
CREATE INDEX IF NOT EXISTS trade_metrics_trade_id_idx ON public.trade_metrics(trade_id);

-- Enable RLS on trade_metrics table
ALTER TABLE public.trade_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trade_metrics table
CREATE POLICY "Users can view their own trade metrics" 
    ON public.trade_metrics 
    FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_metrics.trade_id 
        AND trades.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own trade metrics" 
    ON public.trade_metrics 
    FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_metrics.trade_id 
        AND trades.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own trade metrics" 
    ON public.trade_metrics 
    FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_metrics.trade_id 
        AND trades.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_metrics.trade_id 
        AND trades.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own trade metrics" 
    ON public.trade_metrics 
    FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_metrics.trade_id 
        AND trades.user_id = auth.uid()
    ));

-- Create trade_screenshots table
CREATE TABLE IF NOT EXISTS public.trade_screenshots (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    trade_id BIGINT NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on trade_screenshots
CREATE INDEX IF NOT EXISTS trade_screenshots_trade_id_idx ON public.trade_screenshots(trade_id);

-- Enable RLS on trade_screenshots table
ALTER TABLE public.trade_screenshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trade_screenshots table
CREATE POLICY "Users can view their own trade screenshots" 
    ON public.trade_screenshots 
    FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_screenshots.trade_id 
        AND trades.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own trade screenshots" 
    ON public.trade_screenshots 
    FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_screenshots.trade_id 
        AND trades.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own trade screenshots" 
    ON public.trade_screenshots 
    FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_screenshots.trade_id 
        AND trades.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_screenshots.trade_id 
        AND trades.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own trade screenshots" 
    ON public.trade_screenshots 
    FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_screenshots.trade_id 
        AND trades.user_id = auth.uid()
    ));

-- Create trade_tags table
CREATE TABLE IF NOT EXISTS public.trade_tags (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    trade_id BIGINT NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(trade_id, tag_name)
);

-- Create indexes on trade_tags
CREATE INDEX IF NOT EXISTS trade_tags_trade_id_idx ON public.trade_tags(trade_id);
CREATE INDEX IF NOT EXISTS trade_tags_tag_name_idx ON public.trade_tags(tag_name);

-- Enable RLS on trade_tags table
ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trade_tags table
CREATE POLICY "Users can view their own trade tags" 
    ON public.trade_tags 
    FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_tags.trade_id 
        AND trades.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own trade tags" 
    ON public.trade_tags 
    FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_tags.trade_id 
        AND trades.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own trade tags" 
    ON public.trade_tags 
    FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM public.trades 
        WHERE trades.id = trade_tags.trade_id 
        AND trades.user_id = auth.uid()
    ));

-- Create ai_coach_feedback table
CREATE TABLE IF NOT EXISTS public.ai_coach_feedback (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trade_id BIGINT NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    feedback TEXT NOT NULL,
    prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes on ai_coach_feedback
CREATE INDEX IF NOT EXISTS ai_coach_feedback_user_id_idx ON public.ai_coach_feedback(user_id);
CREATE INDEX IF NOT EXISTS ai_coach_feedback_trade_id_idx ON public.ai_coach_feedback(trade_id);

-- Enable RLS on ai_coach_feedback table
ALTER TABLE public.ai_coach_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_coach_feedback table
CREATE POLICY "Users can view their own AI feedback" 
    ON public.ai_coach_feedback 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI feedback" 
    ON public.ai_coach_feedback 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI feedback" 
    ON public.ai_coach_feedback 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update updated_at (drop first if they exist)
DROP TRIGGER IF EXISTS update_trades_updated_at ON public.trades;
DROP TRIGGER IF EXISTS update_trade_metrics_updated_at ON public.trade_metrics;
DROP TRIGGER IF EXISTS update_trade_screenshots_updated_at ON public.trade_screenshots;

CREATE TRIGGER update_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trade_metrics_updated_at
BEFORE UPDATE ON public.trade_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trade_screenshots_updated_at
BEFORE UPDATE ON public.trade_screenshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
