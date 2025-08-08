-- Migration: Harden search_path for all public functions lacking explicit setting
-- Purpose: Fix Supabase linter warnings about search_path and reduce risk of path hijacking in SECURITY DEFINER functions

-- Idempotent ALTERs – safe to run multiple times
ALTER FUNCTION public.update_post_likes_count() SET search_path TO public;
ALTER FUNCTION public.update_replies_count() SET search_path TO public;
ALTER FUNCTION public.get_community_tier_info(integer) SET search_path TO public;
ALTER FUNCTION public.update_user_engagement() SET search_path TO public;
ALTER FUNCTION public.check_account_request_rate_limit(p_email text, p_ip_address text) SET search_path TO public;
ALTER FUNCTION public.handle_new_user() SET search_path TO public;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path TO public;