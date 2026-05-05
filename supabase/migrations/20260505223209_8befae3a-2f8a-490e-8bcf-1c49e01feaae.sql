-- Add 'mercados' column to config_escritorio if it doesn't exist
ALTER TABLE public.config_escritorio 
ADD COLUMN IF NOT EXISTS mercados TEXT[] DEFAULT '{}';

-- Update RLS if needed (usually handled by existing policies on this table, but being explicit)
-- Assuming config_escritorio already has RLS enabled.
