-- Create enhanced trade_history table for AI Trade Analyst
CREATE TABLE IF NOT EXISTS public.trade_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis_result JSONB NULL,
  screenshots_analyzed INTEGER DEFAULT 0,
  total_trades_identified INTEGER DEFAULT 0,
  overall_analysis TEXT NULL,
  performance_metrics JSONB NULL,
  strengths JSONB DEFAULT '[]'::jsonb,
  areas_for_improvement JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  risk_management_score DECIMAL(3,1) NULL,
  confidence_score DECIMAL(3,2) NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own trade analysis history" 
ON public.trade_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trade analysis" 
ON public.trade_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trade analysis" 
ON public.trade_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade analysis" 
ON public.trade_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trade_history_updated_at
BEFORE UPDATE ON public.trade_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_trade_history_user_id ON public.trade_history(user_id);
CREATE INDEX idx_trade_history_created_at ON public.trade_history(created_at DESC);