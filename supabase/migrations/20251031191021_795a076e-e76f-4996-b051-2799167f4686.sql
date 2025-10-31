-- Allow all authenticated users to view user roles for leaderboard and public displays
CREATE POLICY "Authenticated users can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);