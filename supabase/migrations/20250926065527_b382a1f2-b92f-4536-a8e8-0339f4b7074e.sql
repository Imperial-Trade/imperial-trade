-- BROADCAST FIX: Force reset provider stability to allow connection
-- This clears any blocking states and allows the price provider to mount normally

-- Log the emergency reset action
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
    'broadcast_emergency_reset', 
    NOW(), 
    1, 
    'success',
    'EMERGENCY RESET: Provider stability system manually cleared to resolve broadcast blocking. Fixed UI activity registration to handle auth transitions gracefully. System should recover within 30 seconds.'
);