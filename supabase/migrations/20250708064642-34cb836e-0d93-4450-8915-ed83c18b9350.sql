
-- Add the website column to account_requests table for honeypot bot detection
ALTER TABLE public.account_requests 
ADD COLUMN website text DEFAULT '';
