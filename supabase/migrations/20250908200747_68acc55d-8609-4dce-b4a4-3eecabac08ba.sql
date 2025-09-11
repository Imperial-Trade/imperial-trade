-- Phase 2: Create alert cooldown table for debouncing alerts
CREATE TABLE IF NOT EXISTS public.alert_cooldowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_symbol TEXT NOT NULL,
    alert_type TEXT NOT NULL, -- e.g., 'TP2_HIT', 'SL_HIT', 'take_profit_1', 'stop_loss'
    last_triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (asset_symbol, alert_type)
);

-- Enable RLS for alert cooldowns
ALTER TABLE public.alert_cooldowns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "System can manage alert cooldowns" ON public.alert_cooldowns FOR ALL USING (true);

-- Add indexes for performance
CREATE INDEX idx_alert_cooldowns_symbol_type ON public.alert_cooldowns (asset_symbol, alert_type);
CREATE INDEX idx_alert_cooldowns_last_triggered ON public.alert_cooldowns (last_triggered_at);

-- Create function for checking and enforcing alert cooldowns
CREATE OR REPLACE FUNCTION public.check_alert_cooldown(
    p_asset_symbol TEXT,
    p_alert_type TEXT,
    p_cooldown_seconds INTEGER DEFAULT 120
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_triggered TIMESTAMPTZ;
    should_trigger BOOLEAN := TRUE;
BEGIN
    -- Get the last triggered timestamp for this alert type and symbol
    SELECT last_triggered_at INTO last_triggered
    FROM public.alert_cooldowns
    WHERE asset_symbol = p_asset_symbol AND alert_type = p_alert_type;
    
    -- If we have a previous trigger, check if cooldown period has passed
    IF last_triggered IS NOT NULL THEN
        IF EXTRACT(EPOCH FROM (NOW() - last_triggered)) < p_cooldown_seconds THEN
            should_trigger := FALSE;
        END IF;
    END IF;
    
    -- If we should trigger, update or insert the timestamp
    IF should_trigger THEN
        INSERT INTO public.alert_cooldowns (asset_symbol, alert_type, last_triggered_at)
        VALUES (p_asset_symbol, p_alert_type, NOW())
        ON CONFLICT (asset_symbol, alert_type) 
        DO UPDATE SET 
            last_triggered_at = NOW();
    END IF;
    
    RETURN should_trigger;
END;
$$;

-- Create function to get active alert symbols for optimized monitoring
CREATE OR REPLACE FUNCTION public.get_active_alert_symbols()
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN ARRAY(
        SELECT DISTINCT symbol
        FROM public.alert_monitoring
        WHERE is_active = true
    );
END;
$$;

-- Create enhanced alert processing function with cooldown integration
CREATE OR REPLACE FUNCTION public.handle_triggered_alert_enhanced(
    p_alert_id UUID,
    p_signal_id UUID,
    p_alert_type TEXT,
    p_triggered_price NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    tp_level INTEGER;
    signal_symbol TEXT;
    should_notify BOOLEAN := TRUE;
BEGIN
    -- Get signal symbol for cooldown check
    SELECT tradermade_symbol INTO signal_symbol
    FROM public.trade_alerts
    WHERE id = p_signal_id;
    
    -- Check cooldown (2 minutes = 120 seconds)
    should_notify := public.check_alert_cooldown(signal_symbol, p_alert_type, 120);
    
    -- Only proceed with alert handling if cooldown allows
    IF should_notify THEN
        -- Call the existing alert handling function
        SELECT public.handle_triggered_alert(p_alert_id, p_signal_id, p_alert_type, p_triggered_price)
        INTO result;
        
        -- Add cooldown info to result
        result := result || jsonb_build_object('cooldown_applied', true, 'notified', true);
    ELSE
        -- Return cooldown blocked result
        result := jsonb_build_object(
            'action', 'cooldown_blocked',
            'alert_type', p_alert_type,
            'cooldown_applied', true,
            'notified', false,
            'message', 'Alert blocked by cooldown period'
        );
    END IF;
    
    -- Always deactivate the triggered alert
    UPDATE public.alert_monitoring 
    SET is_active = false, updated_at = NOW()
    WHERE id = p_alert_id;
    
    RETURN result;
END;
$$;