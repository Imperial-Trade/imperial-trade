
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage their own trade alerts" ON public.trade_alerts;

-- Create separate policies for different operations

-- SELECT policy: Allow all authenticated users to view trade alerts from educators/admins
CREATE POLICY "Anyone can view educator and admin trade alerts"
ON public.trade_alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = trade_alerts.user_id
    AND (
      profiles.user_type = 'educator'::user_type_enum OR 
      profiles.user_type = 'admin'::user_type_enum OR
      profiles.access_level = 'admin'::access_level_enum OR
      profiles.access_level = 'moderator'::access_level_enum OR
      profiles.role = 'educator' OR
      profiles.role = 'admin'
    )
  )
);

-- INSERT policy: Allow only educators and admins to create trade alerts for themselves
CREATE POLICY "Educators and admins can create trade alerts"
ON public.trade_alerts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.user_type = 'educator'::user_type_enum OR 
      profiles.user_type = 'admin'::user_type_enum OR
      profiles.access_level = 'admin'::access_level_enum OR
      profiles.access_level = 'moderator'::access_level_enum OR
      profiles.role = 'educator' OR
      profiles.role = 'admin'
    )
  )
);

-- UPDATE policy: Allow signal creators and admins to update trade alerts
CREATE POLICY "Creators and admins can update trade alerts"
ON public.trade_alerts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.access_level = 'admin'::access_level_enum OR
      profiles.role = 'admin'
    )
  )
);

-- DELETE policy: Allow signal creators and admins to delete trade alerts
CREATE POLICY "Creators and admins can delete trade alerts"
ON public.trade_alerts
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.access_level = 'admin'::access_level_enum OR
      profiles.role = 'admin'
    )
  )
);
