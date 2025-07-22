
-- Add user_readable_text field to agent_outputs table for storing user-friendly feedback
ALTER TABLE public.agent_outputs 
ADD COLUMN user_readable_text TEXT;

-- Add a comment to explain the new field
COMMENT ON COLUMN public.agent_outputs.user_readable_text IS 'User-friendly version of the agent output with proper names instead of technical IDs';
