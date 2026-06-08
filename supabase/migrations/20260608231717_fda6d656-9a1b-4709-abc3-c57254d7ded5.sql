CREATE TABLE IF NOT EXISTS public.briefings_completos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  respostas JSONB NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

GRANT INSERT ON public.briefings_completos TO anon, authenticated;
GRANT ALL ON public.briefings_completos TO service_role;

ALTER TABLE public.briefings_completos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a briefing" ON public.briefings_completos FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all briefings" ON public.briefings_completos FOR SELECT TO authenticated USING (true);