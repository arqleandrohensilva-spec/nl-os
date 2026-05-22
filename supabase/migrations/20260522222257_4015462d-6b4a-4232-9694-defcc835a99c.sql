ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS briefing_preenchido BOOLEAN DEFAULT FALSE;
ALTER TABLE public.briefings ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id);