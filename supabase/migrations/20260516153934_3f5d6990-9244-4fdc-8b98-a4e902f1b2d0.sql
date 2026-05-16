-- No specific SQL changes needed if status is just a text column without strict constraints, 
-- but let's ensure we have indexes for performance since we'll be filtering.

CREATE INDEX IF NOT EXISTS idx_pesquisas_status ON public.pesquisas_satisfacao(status);
CREATE INDEX IF NOT EXISTS idx_depoimentos_status ON public.depoimentos(status);

-- Update existing data if necessary (e.g. ensure all respondidas are 'RESPONDIDA')
UPDATE public.pesquisas_satisfacao SET status = 'RESPONDIDA' WHERE respondida_em IS NOT NULL AND status = 'PENDENTE';
