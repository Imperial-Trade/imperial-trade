-- ============================================
-- Phase 1.8: Add 'educator' role to app_role enum
-- ============================================

-- Add 'educator' to the app_role enum type
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'educator';