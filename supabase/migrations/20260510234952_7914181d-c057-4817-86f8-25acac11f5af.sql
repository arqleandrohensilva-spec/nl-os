ALTER TABLE public.projeto_etapas ADD COLUMN IF NOT EXISTS moodboard_url TEXT;
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS link_apresentacao TEXT;