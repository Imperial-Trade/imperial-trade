-- Fix security warnings by setting search_path for functions that don't have it set
-- These functions currently have mutable search paths which is a security risk

-- Fix function search paths for security
ALTER FUNCTION public.set_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_post_likes_count() SET search_path = 'public';
ALTER FUNCTION public.set_activation_timestamp() SET search_path = 'public';
ALTER FUNCTION public.log_account_request_changes() SET search_path = 'public';
ALTER FUNCTION public.cleanup_old_rate_limits() SET search_path = 'public';
ALTER FUNCTION public.update_trading_profile_from_analysis(uuid, jsonb) SET search_path = 'public';
ALTER FUNCTION public.deactivate_alert_monitoring() SET search_path = 'public';
ALTER FUNCTION public.handle_triggered_alert(uuid, uuid, text, numeric) SET search_path = 'public';
ALTER FUNCTION public.process_price_alerts(text, numeric) SET search_path = 'public';
ALTER FUNCTION public.update_replies_count() SET search_path = 'public';
ALTER FUNCTION public.prevent_active_trade_modifications() SET search_path = 'public';
ALTER FUNCTION public.create_alert_monitoring_entries() SET search_path = 'public';
ALTER FUNCTION public.upsert_market_price(text, numeric, numeric, numeric, timestamp with time zone) SET search_path = 'public';
ALTER FUNCTION public.delete_comment_single(uuid) SET search_path = 'public';
ALTER FUNCTION public.process_price_alerts_enhanced(text, numeric, numeric) SET search_path = 'public';
ALTER FUNCTION public.delete_comment_cascade(uuid) SET search_path = 'public';
ALTER FUNCTION public.delete_post_cascade(uuid) SET search_path = 'public';
ALTER FUNCTION public.notify_trade_alert_changes() SET search_path = 'public';
ALTER FUNCTION public.upsert_daily_telemetry(integer, integer, numeric, numeric, numeric, integer, jsonb) SET search_path = 'public';
ALTER FUNCTION public.cleanup_inactive_symbol_cache() SET search_path = 'public';
ALTER FUNCTION public.auto_notify_price_alerts() SET search_path = 'public';
ALTER FUNCTION public.auto_notify_signal_changes() SET search_path = 'public';
ALTER FUNCTION public.set_trade_alert_user_id() SET search_path = 'public';
ALTER FUNCTION public.calculate_trading_metrics(numeric, numeric, numeric, text) SET search_path = 'public';
ALTER FUNCTION public.get_market_session() SET search_path = 'public';
ALTER FUNCTION public.get_trader_stats(uuid) SET search_path = 'public';