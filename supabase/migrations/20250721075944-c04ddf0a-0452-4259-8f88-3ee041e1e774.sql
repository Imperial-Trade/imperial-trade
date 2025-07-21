
-- Create ai_coach_feedback table to store detailed Gemini coaching analysis
CREATE TABLE public.ai_coach_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  journal_entry_id UUID NOT NULL REFERENCES public.trade_journal_entries(id) ON DELETE CASCADE,
  coaching_analysis JSONB NOT NULL,
  feedback_type TEXT NOT NULL DEFAULT 'gemini_coach',
  model_used TEXT NOT NULL DEFAULT 'gemini-1.5-pro',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.ai_coach_feedback ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT their own coaching feedback
CREATE POLICY "Users can view their own ai coaching feedback" 
  ON public.ai_coach_feedback 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to INSERT their own coaching feedback
CREATE POLICY "Users can create their own ai coaching feedback" 
  ON public.ai_coach_feedback 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to UPDATE their own coaching feedback
CREATE POLICY "Users can update their own ai coaching feedback" 
  ON public.ai_coach_feedback 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy that allows users to DELETE their own coaching feedback
CREATE POLICY "Users can delete their own ai coaching feedback" 
  ON public.ai_coach_feedback 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_ai_coach_feedback_journal_entry_id ON public.ai_coach_feedback(journal_entry_id);
CREATE INDEX idx_ai_coach_feedback_user_id ON public.ai_coach_feedback(user_id);
