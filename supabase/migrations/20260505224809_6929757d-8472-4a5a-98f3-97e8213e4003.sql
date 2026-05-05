-- Add 'meta_custo_hora' column to config_escritorio if it doesn't exist
ALTER TABLE public.config_escritorio 
ADD COLUMN IF NOT EXISTS meta_custo_hora DECIMAL(10,2);