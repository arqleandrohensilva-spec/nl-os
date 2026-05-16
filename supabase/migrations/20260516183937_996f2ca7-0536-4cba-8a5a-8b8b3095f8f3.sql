-- Criar tabela base_conhecimento se não existir
CREATE TABLE IF NOT EXISTS public.base_conhecimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.base_conhecimento ENABLE ROW LEVEL SECURITY;

-- Políticas para base_conhecimento
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'base_conhecimento' AND policyname = 'Permitir tudo para usuários autenticados') THEN
        CREATE POLICY "Permitir tudo para usuários autenticados" ON public.base_conhecimento FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Garantir que diretrizes_marketing existe (já vimos que sim, mas para segurança)
CREATE TABLE IF NOT EXISTS public.diretrizes_marketing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para diretrizes_marketing
ALTER TABLE public.diretrizes_marketing ENABLE ROW LEVEL SECURITY;

-- Políticas para diretrizes_marketing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diretrizes_marketing' AND policyname = 'Permitir tudo para usuários autenticados') THEN
        CREATE POLICY "Permitir tudo para usuários autenticados" ON public.diretrizes_marketing FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at ON public.base_conhecimento;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.base_conhecimento
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.diretrizes_marketing;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.diretrizes_marketing
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
