CREATE TABLE public.diagnosticos_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo text DEFAULT 'base_financeira',
  conteudo text NOT NULL,
  status text CHECK (status IN ('critico', 'atencao', 'saudavel')),
  custo_hora_momento numeric,
  criado_em timestamptz DEFAULT now(),
  criado_por text
);

ALTER TABLE public.diagnosticos_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to diagnostics"
ON public.diagnosticos_ia
FOR ALL
TO authenticated
USING (true);
