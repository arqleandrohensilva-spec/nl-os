-- Add columns for detailed history tracking
ALTER TABLE public.historico_clientes 
ADD COLUMN IF NOT EXISTS tipo TEXT,
ADD COLUMN IF NOT EXISTS descricao TEXT;
