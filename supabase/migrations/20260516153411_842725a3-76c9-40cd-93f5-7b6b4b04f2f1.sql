ALTER TABLE public.pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Pós-Entrega';