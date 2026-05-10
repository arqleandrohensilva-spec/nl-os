-- Alter projetos table to match requested schema without dropping it
DO $$ 
BEGIN
    -- Rename columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projetos' AND column_name = 'status') THEN
        ALTER TABLE public.projetos RENAME COLUMN status TO status_geral;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projetos' AND column_name = 'lead_id') THEN
        ALTER TABLE public.projetos RENAME COLUMN lead_id TO cliente_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projetos' AND column_name = 'cliente_nome') THEN
        ALTER TABLE public.projetos RENAME COLUMN cliente_nome TO nome_cliente;
    END IF;

    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projetos' AND column_name = 'cidade') THEN
        ALTER TABLE public.projetos ADD COLUMN cidade TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projetos' AND column_name = 'data_inicio') THEN
        ALTER TABLE public.projetos ADD COLUMN data_inicio DATE DEFAULT CURRENT_DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projetos' AND column_name = 'prazo_final') THEN
        ALTER TABLE public.projetos ADD COLUMN prazo_final DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projetos' AND column_name = 'updated_at') THEN
        ALTER TABLE public.projetos ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Create table projeto_etapas
CREATE TABLE IF NOT EXISTS public.projeto_etapas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    etapa TEXT NOT NULL, -- briefing/anteprojeto/executivo/acompanhamento
    status TEXT DEFAULT 'Em andamento', -- Em andamento / Aguardando aprovação / Aprovado
    data_inicio DATE,
    data_entrega DATE,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    notas TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table projeto_checklist
CREATE TABLE IF NOT EXISTS public.projeto_checklist (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    etapa TEXT NOT NULL,
    item TEXT NOT NULL,
    concluido BOOLEAN DEFAULT false,
    concluido_em TIMESTAMP WITH TIME ZONE,
    concluido_por TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto_checklist ENABLE ROW LEVEL SECURITY;

-- Policies (using existing policy logic or adding new ones if missing)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projetos' AND policyname = 'Enable all for authenticated users projects') THEN
        CREATE POLICY "Enable all for authenticated users projects" ON public.projetos FOR ALL USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projeto_etapas' AND policyname = 'Enable all for authenticated users etapas') THEN
        CREATE POLICY "Enable all for authenticated users etapas" ON public.projeto_etapas FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projeto_checklist' AND policyname = 'Enable all for authenticated users checklist') THEN
        CREATE POLICY "Enable all for authenticated users checklist" ON public.projeto_checklist FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Ensure triggers exist for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projetos_updated_at ON public.projetos;
CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON public.projetos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_projeto_etapas_updated_at ON public.projeto_etapas;
CREATE TRIGGER update_projeto_etapas_updated_at BEFORE UPDATE ON public.projeto_etapas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();