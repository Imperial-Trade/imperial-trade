-- Create table to store Insight XX Pro Analysis results
CREATE TABLE IF NOT EXISTS public.insight_xx_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  trading_style TEXT NOT NULL,
  current_price DECIMAL(18, 8) NOT NULL,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_insight_xx_analyses_user_id 
ON public.insight_xx_analyses(user_id);

CREATE INDEX IF NOT EXISTS idx_insight_xx_analyses_created_at
ON public.insight_xx_analyses(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_insight_xx_analyses_symbol
ON public.insight_xx_analyses(user_id, symbol);

-- Index for conviction grade filtering
CREATE INDEX IF NOT EXISTS idx_insight_xx_analyses_conviction
ON public.insight_xx_analyses(user_id, ((analysis_result->'tradeSetup'->>'convictionGrade')::text));

-- Enable RLS
ALTER TABLE public.insight_xx_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analyses"
ON public.insight_xx_analyses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
ON public.insight_xx_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
ON public.insight_xx_analyses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
ON public.insight_xx_analyses FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_insight_xx_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_insight_xx_analyses_updated_at
BEFORE UPDATE ON public.insight_xx_analyses
FOR EACH ROW
EXECUTE FUNCTION update_insight_xx_analyses_updated_at();
