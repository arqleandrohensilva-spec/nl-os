CREATE TABLE IF NOT EXISTS public.projeto_horas_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE CASCADE,
  etapa_id uuid,
  etapa_nome text,
  horas numeric NOT NULL,
  usuario text,
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE public.projeto_horas_log ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projeto_horas_log' 
    AND policyname = 'Allow all on projeto_horas_log'
  ) THEN
    CREATE POLICY "Allow all on projeto_horas_log" ON public.projeto_horas_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON public.projeto_horas_log TO authenticated;
GRANT ALL ON public.projeto_horas_log TO anon;
GRANT ALL ON public.projeto_horas_log TO service_role;