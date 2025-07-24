-- Add new columns to economic_events table for human-readable data
ALTER TABLE public.economic_events 
ADD COLUMN IF NOT EXISTS human_readable_title text,
ADD COLUMN IF NOT EXISTS trader_explanation text,
ADD COLUMN IF NOT EXISTS difficulty_level text,
ADD COLUMN IF NOT EXISTS typical_reaction text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS formatted_actual text,
ADD COLUMN IF NOT EXISTS formatted_forecast text,
ADD COLUMN IF NOT EXISTS formatted_previous text;