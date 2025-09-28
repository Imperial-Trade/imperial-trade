-- EMERGENCY NOTIFICATION DUPLICATE FIX - PHASE 1: IMMEDIATE STOP-GAP

-- 1. Create Emergency Circuit Breaker Table
CREATE TABLE IF NOT EXISTS public.notification_circuit_breaker (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    signal_id uuid NOT NULL,
    user_id uuid NOT NULL,
    last_notification_at timestamp with time zone NOT NULL DEFAULT now(),
    notification_count integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(signal_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notification_circuit_breaker ENABLE ROW LEVEL SECURITY;

-- RLS Policies for circuit breaker
CREATE POLICY "System can manage notification circuit breaker" ON public.notification_circuit_breaker
FOR ALL USING (true);

CREATE POLICY "Users can view their own circuit breaker status" ON public.notification_circuit_breaker
FOR SELECT USING (auth.uid() = user_id);

-- 2. Create Request Deduplication Table  
CREATE TABLE IF NOT EXISTS public.notification_request_cache (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    request_hash text NOT NULL UNIQUE,
    processed_at timestamp with time zone NOT NULL DEFAULT now(),
    signal_id uuid NOT NULL,
    notification_type text NOT NULL,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Enable RLS 
ALTER TABLE public.notification_request_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage request cache" ON public.notification_request_cache
FOR ALL USING (true);

-- 3. Enhanced Circuit Breaker Function
CREATE OR REPLACE FUNCTION public.check_notification_circuit_breaker(
    p_signal_id uuid,
    p_user_id uuid,
    p_cooldown_minutes integer DEFAULT 5
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    last_sent_at timestamp with time zone;
    should_send boolean := true;
BEGIN
    -- Check if notification was sent recently
    SELECT last_notification_at INTO last_sent_at
    FROM notification_circuit_breaker
    WHERE signal_id = p_signal_id 
    AND user_id = p_user_id;
    
    -- If record exists, check cooldown
    IF last_sent_at IS NOT NULL THEN
        IF last_sent_at > now() - (p_cooldown_minutes || ' minutes')::interval THEN
            should_send := false;
            
            -- Log the blocked notification
            INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
            VALUES (
                'notification_circuit_breaker', 
                now(), 
                0, 
                'blocked',
                format('Blocked duplicate notification - Signal: %s, User: %s, Last sent: %s ago', 
                    p_signal_id, p_user_id, 
                    age(now(), last_sent_at))
            );
        ELSE
            -- Update existing record
            UPDATE notification_circuit_breaker 
            SET last_notification_at = now(),
                notification_count = notification_count + 1
            WHERE signal_id = p_signal_id AND user_id = p_user_id;
        END IF;
    ELSE
        -- Create new record
        INSERT INTO notification_circuit_breaker (signal_id, user_id, last_notification_at, notification_count)
        VALUES (p_signal_id, p_user_id, now(), 1)
        ON CONFLICT (signal_id, user_id) DO UPDATE SET
            last_notification_at = now(),
            notification_count = notification_circuit_breaker.notification_count + 1;
    END IF;
    
    RETURN should_send;
END;
$$;

-- 4. Request-Level Deduplication Function
CREATE OR REPLACE FUNCTION public.check_request_deduplication(
    p_request_hash text,
    p_signal_id uuid,
    p_notification_type text
) RETURNS boolean
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    existing_request_id uuid;
BEGIN
    -- Check if this exact request was processed recently
    SELECT id INTO existing_request_id
    FROM notification_request_cache
    WHERE request_hash = p_request_hash
    AND expires_at > now();
    
    IF existing_request_id IS NOT NULL THEN
        -- Log duplicate request
        INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
            'request_deduplication', 
            now(), 
            0, 
            'blocked',
            format('Blocked duplicate request - Hash: %s, Signal: %s, Type: %s', 
                p_request_hash, p_signal_id, p_notification_type)
        );
        
        RETURN false; -- Block duplicate
    END IF;
    
    -- Store this request
    INSERT INTO notification_request_cache (request_hash, signal_id, notification_type, expires_at)
    VALUES (p_request_hash, p_signal_id, p_notification_type, now() + interval '10 minutes')
    ON CONFLICT (request_hash) DO UPDATE SET
        processed_at = now(),
        expires_at = now() + interval '10 minutes';
        
    RETURN true; -- Allow request
END;
$$;

-- 5. Clean Invalid OneSignal Player IDs
UPDATE public.profiles 
SET onesignal_player_id = NULL,
    onesignal_subscription_status = 'unsubscribed'
WHERE onesignal_player_id IS NOT NULL
AND (
    onesignal_player_id = 'dev_mock_player_id' OR
    length(onesignal_player_id) < 36 OR
    onesignal_player_id !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
);

-- 6. Cleanup Functions for Old Records
CREATE OR REPLACE FUNCTION public.cleanup_notification_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer := 0;
BEGIN
    -- Clean expired request cache
    DELETE FROM notification_request_cache WHERE expires_at < now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean old circuit breaker records (older than 24 hours)
    DELETE FROM notification_circuit_breaker 
    WHERE last_notification_at < now() - interval '24 hours';
    
    -- Clean old phantom notification logs
    DELETE FROM cron_job_logs 
    WHERE job_name = 'enhanced_notification_pipeline'
    AND status = 'success'
    AND error_message LIKE '%Change types: []%'
    AND created_at < now() - interval '1 hour';
    
    RETURN deleted_count;
END;
$$;

-- Log the emergency fix deployment
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
    'emergency_notification_fix', 
    now(), 
    1, 
    'deployed',
    'Phase 1: Emergency circuit breaker and deduplication deployed'
);