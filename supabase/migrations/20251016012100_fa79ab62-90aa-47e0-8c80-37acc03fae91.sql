-- ============================================
-- BUG FIX: Prevent TP Hits on Pending Orders
-- ============================================
-- Issue: Pending orders were showing TPs as "hit" before order activation
-- Solution: Add constraint + clean existing bad data

-- Step 1: Clean up any existing bad data (pending orders with tp_hits)
UPDATE trade_alerts 
SET tp_hits = '{}', 
    updated_at = NOW()
WHERE status = 'pending' 
  AND tp_hits IS NOT NULL 
  AND tp_hits != '{}';

-- Step 2: Add constraint to prevent future occurrences
-- This ensures tp_hits can only be populated when status is NOT 'pending'
ALTER TABLE trade_alerts 
ADD CONSTRAINT check_tp_hits_only_when_active 
CHECK (
  (status = 'pending' AND (tp_hits IS NULL OR tp_hits = '{}')) 
  OR 
  status != 'pending'
);