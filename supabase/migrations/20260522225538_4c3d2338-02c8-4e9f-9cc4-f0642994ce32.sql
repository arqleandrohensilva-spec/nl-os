ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS proposta_id UUID REFERENCES public.proposals(id);
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id);
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id);
