-- Enhanced Xeon Stream notification system
-- Add Xeon Stream subscription tracking and signal processing capabilities

-- Add xeon_stream_subscription column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS xeon_stream_subscription boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS xeon_stream_activated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"xeon_stream": {"enabled": true, "alert_types": ["tp_hit", "sl_hit", "all_tp_hit", "manual_close"]}, "trading": {"enabled": true}, "education": {"enabled": true}}'::jsonb;

-- Add tp_hit_mask column to trade_alerts for efficient TP tracking
ALTER TABLE public.trade_alerts 
ADD COLUMN IF NOT EXISTS tp_hit_mask integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_xeon_stream boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS provider_name text DEFAULT 'Imperial Trading';

-- Create index for efficient xeon stream signal processing
CREATE INDEX IF NOT EXISTS idx_trade_alerts_xeon_active 
ON public.trade_alerts (is_xeon_stream, status) 
WHERE is_xeon_stream = true AND status = 'active';

-- Create index for tradermade symbol lookups
CREATE INDEX IF NOT EXISTS idx_trade_alerts_tradermade_symbol 
ON public.trade_alerts (tradermade_symbol) 
WHERE status = 'active';

-- Create notification delivery tracking table
CREATE TABLE IF NOT EXISTS public.xeon_notification_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trade_alert_id uuid REFERENCES public.trade_alerts(id) ON DELETE CASCADE,
    notification_type text NOT NULL,
    target_users uuid[] NOT NULL,
    sent_at timestamp with time zone NOT NULL DEFAULT now(),
    delivery_status jsonb DEFAULT '{"sent": 0, "delivered": 0, "failed": 0}'::jsonb,
    onesignal_notification_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notification log
ALTER TABLE public.xeon_notification_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification log
CREATE POLICY "Admins can view all xeon notification logs"
ON public.xeon_notification_log FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND access_level = 'admin'::access_level_enum
));

CREATE POLICY "System can manage xeon notification logs"
ON public.xeon_notification_log FOR ALL
USING (true);

-- Update RLS policy for profiles to allow reading xeon subscription status
CREATE POLICY "Users can view xeon subscription status" 
ON public.profiles FOR SELECT 
USING (true);

-- Create function to get Xeon Stream subscribers
CREATE OR REPLACE FUNCTION public.get_xeon_stream_subscribers()
RETURNS TABLE(
    user_id uuid,
    onesignal_player_id text,
    display_name text,
    notification_preferences jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.onesignal_player_id,
        p.display_name,
        p.notification_preferences
    FROM public.profiles p
    WHERE p.account_status = 'active'
    AND p.xeon_stream_subscription = true
    AND p.push_subscription_active = true
    AND p.onesignal_player_id IS NOT NULL
    AND p.onesignal_subscription_status = 'subscribed';
END;
$$;

-- Create function to process TP hits using bitmask
CREATE OR REPLACE FUNCTION public.process_tp_hits(
    p_trade_id uuid,
    p_current_price numeric,
    p_is_buy boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    trade_record RECORD;
    current_mask INTEGER;
    new_mask INTEGER;
    tp_prices NUMERIC[];
    tp_hit_this_cycle INTEGER[];
    total_tps INTEGER;
    hit_count INTEGER;
    result JSONB;
BEGIN
    -- Get trade record
    SELECT * INTO trade_record
    FROM public.trade_alerts
    WHERE id = p_trade_id AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Trade not found or not active');
    END IF;
    
    current_mask := COALESCE(trade_record.tp_hit_mask, 0);
    new_mask := current_mask;
    tp_hit_this_cycle := ARRAY[]::INTEGER[];
    
    -- Build TP array and check hits
    tp_prices := ARRAY[
        trade_record.tp1, trade_record.tp2, trade_record.tp3, 
        trade_record.tp4, trade_record.tp5
    ];
    
    total_tps := 0;
    hit_count := 0;
    
    FOR i IN 1..5 LOOP
        IF tp_prices[i] IS NOT NULL AND tp_prices[i] > 0 THEN
            total_tps := total_tps + 1;
            
            -- Check if already hit
            IF (current_mask & (1 << (i-1))) > 0 THEN
                hit_count := hit_count + 1;
                CONTINUE;
            END IF;
            
            -- Check if should hit now
            IF (p_is_buy AND p_current_price >= tp_prices[i]) OR 
               (NOT p_is_buy AND p_current_price <= tp_prices[i]) THEN
                new_mask := new_mask | (1 << (i-1));
                tp_hit_this_cycle := array_append(tp_hit_this_cycle, i);
                hit_count := hit_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    -- Update database if mask changed
    IF new_mask != current_mask THEN
        UPDATE public.trade_alerts 
        SET tp_hit_mask = new_mask,
            updated_at = now()
        WHERE id = p_trade_id;
    END IF;
    
    result := jsonb_build_object(
        'tp_hits_this_cycle', tp_hit_this_cycle,
        'total_tps_hit', hit_count,
        'total_tps_defined', total_tps,
        'all_tps_hit', (total_tps > 0 AND hit_count = total_tps),
        'mask_updated', (new_mask != current_mask),
        'old_mask', current_mask,
        'new_mask', new_mask
    );
    
    RETURN result;
END;
$$;