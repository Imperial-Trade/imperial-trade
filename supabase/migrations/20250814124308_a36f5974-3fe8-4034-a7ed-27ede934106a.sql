-- PHASE 1: Fix Critical Database Trigger Issues (COMPLETED ABOVE)

-- PHASE 3: Create Push Subscription Infrastructure (Fix the policy issue)
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON public.user_notification_preferences;

-- Create RLS policies for notification preferences
CREATE POLICY "Users can manage their own notification preferences"
  ON public.user_notification_preferences
  FOR ALL
  USING (auth.uid() = user_id);