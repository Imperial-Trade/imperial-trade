
-- Add 'all_tps_hit' to the close_reason enum type
ALTER TYPE close_reason ADD VALUE 'all_tps_hit';

-- Add 'partially_profited' to the trade_alert_status enum type  
ALTER TYPE trade_alert_status ADD VALUE 'partially_profited';
