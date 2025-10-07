-- ============================================
-- FINAL FIX #1: Prevent Pending Status Reversion After Activation
-- ============================================

-- Modify set_activation_timestamp trigger to lock status when activated
CREATE OR REPLACE FUNCTION public.set_activation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Set activated_at when status changes from pending to active
  IF OLD.status = 'pending' AND NEW.status = 'active' THEN
    NEW.activated_at = now();
    -- Store the actual activation price
    NEW.activation_price = NEW.entry_price;
  END IF;
  
  -- CRITICAL: Prevent status reversion from active back to pending after activation
  IF OLD.status = 'active' AND NEW.status = 'pending' AND OLD.activated_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot revert signal status from active to pending after activation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add comment for documentation
COMMENT ON FUNCTION public.set_activation_timestamp() IS 'Prevents status reversion from active to pending after limit order activation';
