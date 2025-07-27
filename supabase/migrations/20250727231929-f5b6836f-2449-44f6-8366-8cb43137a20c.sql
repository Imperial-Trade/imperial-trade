-- Fix security issue by updating the function with proper search path
CREATE OR REPLACE FUNCTION public.update_trading_profile_from_analysis(
  p_user_id UUID,
  p_analysis_data JSONB
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
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
$$;