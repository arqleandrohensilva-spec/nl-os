ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id);

-- Migration to link existing contracts if possible (best effort based on lead_id)
UPDATE public.contratos c
SET cliente_id = l.cliente_id
FROM public.leads l
WHERE c.lead_id = l.id AND c.cliente_id IS NULL;
