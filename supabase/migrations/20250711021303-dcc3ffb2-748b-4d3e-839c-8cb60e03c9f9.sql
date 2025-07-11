
-- Add UPDATE policy for admins on account_requests table
CREATE POLICY "Admins can update account requests" 
ON public.account_requests 
FOR UPDATE 
USING (true);

-- Add DELETE policy for admins on account_requests table  
CREATE POLICY "Admins can delete account requests"
ON public.account_requests
FOR DELETE
USING (true);
