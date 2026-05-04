
-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  whats TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Arq+Int',
  area INTEGER NOT NULL DEFAULT 0,
  orcamento BIGINT NOT NULL DEFAULT 0,
  origem TEXT NOT NULL DEFAULT 'Outro',
  temp TEXT NOT NULL DEFAULT 'Frio',
  score INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'Novo Lead',
  obs TEXT NOT NULL DEFAULT '',
  criado TEXT NOT NULL DEFAULT '',
  etapa_desde TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_em TIMESTAMPTZ,
  proxima_acao_tipo TEXT,
  proxima_acao_nota TEXT,
  proxima_acao_data TEXT,
  criado_por TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lead_logs table
CREATE TABLE public.lead_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nota TEXT NOT NULL DEFAULT '',
  data TIMESTAMPTZ NOT NULL DEFAULT now(),
  autor TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_logs ENABLE ROW LEVEL SECURITY;

-- Open access policies (internal NL OS tool — uses session-based login, not Supabase auth)
CREATE POLICY "Anyone can view leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update leads" ON public.leads FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete leads" ON public.leads FOR DELETE USING (true);

CREATE POLICY "Anyone can view lead_logs" ON public.lead_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert lead_logs" ON public.lead_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update lead_logs" ON public.lead_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete lead_logs" ON public.lead_logs FOR DELETE USING (true);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.lead_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_logs;
