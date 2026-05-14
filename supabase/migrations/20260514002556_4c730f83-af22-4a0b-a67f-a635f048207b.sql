ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT,
ADD COLUMN IF NOT EXISTS categoria_cancelamento TEXT,
ADD COLUMN IF NOT EXISTS data_cancelamento TIMESTAMP WITH TIME ZONE;