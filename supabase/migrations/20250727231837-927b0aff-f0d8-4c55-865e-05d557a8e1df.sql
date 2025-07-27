-- Create user trading profile table for learned patterns
CREATE TABLE public.user_trading_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  trading_style TEXT,
  preferred_assets JSONB DEFAULT '[]'::jsonb,
  risk_tolerance TEXT DEFAULT 'medium',
  platform_detected TEXT,
  session_patterns JSONB DEFAULT '{}'::jsonb,
  chart_preferences JSONB DEFAULT '{}'::jsonb,
  entry_patterns JSONB DEFAULT '[]'::jsonb,
  exit_patterns JSONB DEFAULT '[]'::jsonb,
  performance_benchmarks JSONB DEFAULT '{}'::jsonb,
  learning_progress JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create screenshot analysis history for pattern tracking
CREATE TABLE public.screenshot_analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_session_id UUID,
  screenshot_urls TEXT[] NOT NULL,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  patterns_detected JSONB DEFAULT '[]'::jsonb,
  platform_identified TEXT,
  timeframe_detected TEXT,
  assets_identified TEXT[],
  trading_style_indicators JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  user_feedback_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user preferences for personalized settings
CREATE TABLE public.user_personalization_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  analysis_depth TEXT DEFAULT 'standard',
  focus_areas TEXT[] DEFAULT '{}',
  feedback_style TEXT DEFAULT 'balanced',
  benchmark_comparisons BOOLEAN DEFAULT true,
  historical_context BOOLEAN DEFAULT true,
  progressive_difficulty BOOLEAN DEFAULT true,
  preferred_charts TEXT[],
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_trading_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshot_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_personalization_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_trading_profiles
CREATE POLICY "Users can manage their own trading profile" 
ON public.user_trading_profiles 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for screenshot_analysis_history
CREATE POLICY "Users can manage their own analysis history" 
ON public.screenshot_analysis_history 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for user_personalization_preferences
CREATE POLICY "Users can manage their own preferences" 
ON public.user_personalization_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_trading_profiles_user_id ON public.user_trading_profiles(user_id);
CREATE INDEX idx_screenshot_analysis_history_user_id ON public.screenshot_analysis_history(user_id);
CREATE INDEX idx_screenshot_analysis_history_session_id ON public.screenshot_analysis_history(analysis_session_id);
CREATE INDEX idx_user_personalization_preferences_user_id ON public.user_personalization_preferences(user_id);

-- Create function to update trading profile based on analysis
CREATE OR REPLACE FUNCTION public.update_trading_profile_from_analysis(
  p_user_id UUID,
  p_analysis_data JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_trading_profiles (user_id, trading_style, preferred_assets, platform_detected, performance_benchmarks)
  VALUES (
    p_user_id,
    p_analysis_data->>'trading_style',
    COALESCE(p_analysis_data->'preferred_assets', '[]'::jsonb),
    p_analysis_data->>'platform_detected',
    COALESCE(p_analysis_data->'performance_metrics', '{}'::jsonb)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    trading_style = COALESCE(EXCLUDED.trading_style, user_trading_profiles.trading_style),
    preferred_assets = COALESCE(EXCLUDED.preferred_assets, user_trading_profiles.preferred_assets),
    platform_detected = COALESCE(EXCLUDED.platform_detected, user_trading_profiles.platform_detected),
    performance_benchmarks = user_trading_profiles.performance_benchmarks || EXCLUDED.performance_benchmarks,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_trading_profiles_updated_at
BEFORE UPDATE ON public.user_trading_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_personalization_preferences_updated_at
BEFORE UPDATE ON public.user_personalization_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();