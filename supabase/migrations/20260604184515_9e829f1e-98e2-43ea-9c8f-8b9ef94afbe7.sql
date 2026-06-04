ALTER TABLE public.depoimentos 
ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
ADD COLUMN IF NOT EXISTS projeto_id UUID REFERENCES public.projetos(id),
ADD COLUMN IF NOT EXISTS depoimento_instagram TEXT,
ADD COLUMN IF NOT EXISTS depoimento_google TEXT,
ADD COLUMN IF NOT EXISTS frase_destaque TEXT;

ALTER TABLE public.pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS notas_internas TEXT;