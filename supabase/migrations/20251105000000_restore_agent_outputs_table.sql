-- Restore agent_outputs table that was mistakenly dropped on 2025-09-05
-- This table is actively used by Coach Agent and Deconstructor Agent
-- It was incorrectly labeled as "unused" and dropped in cost optimization

-- Recreate agent_outputs table for AI agent response storage
CREATE TABLE IF NOT EXISTS public.agent_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  output_text TEXT NOT NULL,
  user_readable_text TEXT, -- Added for user-friendly feedback
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_agent_outputs_user_id ON public.agent_outputs(user_id);

-- Create index for faster queries by agent_name
CREATE INDEX IF NOT EXISTS idx_agent_outputs_agent_name ON public.agent_outputs(agent_name);

-- Create index for faster queries by created_at (for chronological ordering)
CREATE INDEX IF NOT EXISTS idx_agent_outputs_created_at ON public.agent_outputs(created_at DESC);

-- Enable RLS
ALTER TABLE public.agent_outputs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can manage their own agent outputs
DROP POLICY IF EXISTS "Users can manage their own agent outputs" ON public.agent_outputs;
CREATE POLICY "Users can manage their own agent outputs" 
ON public.agent_outputs 
FOR ALL 
USING (auth.uid() = user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_agent_outputs_updated_at ON public.agent_outputs;
CREATE TRIGGER update_agent_outputs_updated_at
BEFORE UPDATE ON public.agent_outputs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to explain the table purpose
COMMENT ON TABLE public.agent_outputs IS 'Stores AI agent outputs from Coach Agent, Deconstructor Agent, and other AI features';
COMMENT ON COLUMN public.agent_outputs.user_readable_text IS 'User-friendly version of the agent output with proper names instead of technical IDs';
COMMENT ON COLUMN public.agent_outputs.metadata IS 'Additional metadata about the agent execution (screenshots analyzed, trades analyzed, etc.)';
