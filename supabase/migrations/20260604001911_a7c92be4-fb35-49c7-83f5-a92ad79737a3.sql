ALTER TABLE public.projeto_etapas ADD COLUMN IF NOT EXISTS horas_estimadas numeric DEFAULT 0;
ALTER TABLE public.projeto_etapas ADD COLUMN IF NOT EXISTS horas_lancadas numeric DEFAULT 0;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_etapas TO authenticated;
GRANT ALL ON public.projeto_etapas TO service_role;