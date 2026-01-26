-- Create table to store deconstructor analysis results
CREATE TABLE IF NOT EXISTS public.deconstructor_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  journal_entry_id UUID REFERENCES public.trade_journal_entries(id) ON DELETE SET NULL,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, photo_url)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_deconstructor_analyses_user_photo 
ON public.deconstructor_analyses(user_id, photo_url);

CREATE INDEX IF NOT EXISTS idx_deconstructor_analyses_journal_entry 
ON public.deconstructor_analyses(journal_entry_id);

-- Index for rating filtering (extract rating from JSONB)
CREATE INDEX IF NOT EXISTS idx_deconstructor_analyses_rating
ON public.deconstructor_analyses(user_id, ((analysis_result->>'overall_rating')::text));

-- Index for created_at for sorting
CREATE INDEX IF NOT EXISTS idx_deconstructor_analyses_created_at
ON public.deconstructor_analyses(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.deconstructor_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analyses"
ON public.deconstructor_analyses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
ON public.deconstructor_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
ON public.deconstructor_analyses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
ON public.deconstructor_analyses FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_deconstructor_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deconstructor_analyses_updated_at
BEFORE UPDATE ON public.deconstructor_analyses
FOR EACH ROW
EXECUTE FUNCTION update_deconstructor_analyses_updated_at();
