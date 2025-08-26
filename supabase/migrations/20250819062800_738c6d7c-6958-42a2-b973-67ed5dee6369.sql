-- First, let's clean up duplicates more aggressively using ROW_NUMBER
WITH ranked_alerts AS (
    SELECT id, 
           ROW_NUMBER() OVER (
               PARTITION BY signal_id, alert_type 
               ORDER BY created_at DESC
           ) as rn
    FROM public.alert_monitoring
)
DELETE FROM public.alert_monitoring 
WHERE id IN (
    SELECT id FROM ranked_alerts WHERE rn > 1
);

-- Now try to add the unique constraint
ALTER TABLE public.alert_monitoring 
ADD CONSTRAINT unique_signal_alert_type 
UNIQUE (signal_id, alert_type);

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_alert_monitoring_active_priority 
ON public.alert_monitoring (is_active, priority_level, symbol) 
WHERE is_active = true;