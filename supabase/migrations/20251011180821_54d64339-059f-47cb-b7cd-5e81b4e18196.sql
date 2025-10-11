-- Allow anonymous users to check account request status
-- This enables the direct database fallback in useAccountStatus hook
-- when the edge function fails or is not yet deployed
CREATE POLICY "Anonymous users can check account status"
ON public.account_requests
FOR SELECT
TO anon
USING (true);