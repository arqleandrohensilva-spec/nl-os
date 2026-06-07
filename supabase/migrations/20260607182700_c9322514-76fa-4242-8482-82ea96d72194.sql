CREATE TABLE IF NOT EXISTS public.snapshots_financeiros (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_referencia text NOT NULL UNIQUE,
  custo_hora numeric NOT NULL DEFAULT 0,
  receita_total numeric NOT NULL DEFAULT 0,
  horas_faturadas numeric NOT NULL DEFAULT 0,
  num_projetos_ativos integer NOT NULL DEFAULT 0,
  margem_real numeric NOT NULL DEFAULT 0,
  total_custos numeric NOT NULL DEFAULT 0,
  criado_em timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.snapshots_financeiros TO authenticated;
GRANT ALL ON public.snapshots_financeiros TO service_role;

ALTER TABLE public.snapshots_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own snapshots" ON public.snapshots_financeiros
  FOR ALL USING (true) WITH CHECK (true);
