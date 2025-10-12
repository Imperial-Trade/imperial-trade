-- Migration: Cleanup Legacy Approved Accounts Without Auth Users
-- Purpose: Reset approved accounts that don't have corresponding auth users back to pending
-- This ensures all users go through the new password authentication flow

-- First, let's identify the affected accounts (for logging)
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Count accounts that will be reset
  SELECT COUNT(*) INTO affected_count
  FROM public.account_requests ar
  WHERE ar.status = 'approved'
    AND NOT EXISTS (
      SELECT 1 FROM auth.users au 
      WHERE lower(au.email) = lower(ar.email)
    );
  
  -- Log the cleanup action
  INSERT INTO public.cron_job_logs (
    job_name, 
    execution_time, 
    records_affected, 
    status, 
    error_message
  )
  VALUES (
    'cleanup_legacy_approved_accounts', 
    NOW(), 
    affected_count, 
    'success',
    'Reset approved accounts without auth users back to pending status'
  );
  
  RAISE NOTICE 'Found % approved accounts without auth users to reset', affected_count;
END $$;

-- Reset approved accounts without auth users back to pending
UPDATE public.account_requests ar
SET 
  status = 'pending',
  approved_by = NULL,
  updated_at = NOW()
WHERE ar.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE lower(au.email) = lower(ar.email)
  );

-- Add a helpful comment to track this cleanup
COMMENT ON COLUMN public.account_requests.status IS 
  'Account request status. Legacy approved accounts without auth users were reset to pending on 2025-10-12.';