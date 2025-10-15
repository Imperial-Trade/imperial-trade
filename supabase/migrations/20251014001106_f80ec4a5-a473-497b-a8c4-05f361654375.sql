-- ============================================
-- CRITICAL FIX: Close stuck Gold SELL signal
-- ============================================
-- Signal ID: 0276c599-aa63-4818-92e6-9bc6d37bf440
-- Issue: Price $4,129.62 exceeded stop loss $4,100.86 but signal never closed
-- Root Cause: No cron job was running to monitor prices

UPDATE public.trade_alerts 
SET 
  status = 'closed',
  close_reason = 'stop_loss',
  updated_at = now()
WHERE id = '0276c599-aa63-4818-92e6-9bc6d37bf440'
  AND status = 'active';  -- Safety check: only close if still active

-- Log the manual closure for audit trail
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'manual_stop_loss_closure', 
  NOW(), 
  1, 
  'success',
  'Manually closed stuck Gold SELL signal - Price $4,129.62 exceeded SL $4,100.86 - Issue: No cron schedule was configured'
);

-- Verify the closure
SELECT 
  id, 
  asset_name, 
  trade_type, 
  entry_price, 
  stop_loss, 
  status, 
  close_reason,
  updated_at
FROM public.trade_alerts 
WHERE id = '0276c599-aa63-4818-92e6-9bc6d37bf440';