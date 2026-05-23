ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS etapa_fluxo TEXT DEFAULT 'ficha' CHECK (etapa_fluxo IN ('ficha', 'pre_briefing', 'reuniao', 'proposta', 'contrato', 'projeto'));

-- Backfill based on briefing_preenchido
UPDATE public.clientes 
SET etapa_fluxo = 'pre_briefing' 
WHERE briefing_preenchido = true AND etapa_fluxo = 'ficha';

-- You could add more logic for reunification, proposal etc if fields existed, 
-- but for now we'll start with these and let the UI handle transitions.
