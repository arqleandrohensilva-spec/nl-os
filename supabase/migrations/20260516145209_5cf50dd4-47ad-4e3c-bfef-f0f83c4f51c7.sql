-- Create satisfaction surveys table
CREATE TABLE IF NOT EXISTS public.pesquisas_satisfacao (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    cliente_nome TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ENVIADA', -- ENVIADA, RESPONDIDA
    nota_geral INTEGER CHECK (nota_geral >= 0 AND nota_geral <= 10),
    avaliacao_processo TEXT, -- Excelente, Bom, Regular, Ruim
    avaliacao_resultado TEXT, -- Superou, Atendeu, Parcialmente, Não atendeu
    comentario TEXT,
    respondida_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create testimonials table
CREATE TABLE IF NOT EXISTS public.depoimentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pesquisa_id UUID REFERENCES public.pesquisas_satisfacao(id) ON DELETE CASCADE,
    texto_formatado TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDENTE APROVAÇÃO', -- PENDENTE APROVAÇÃO, APROVADO, PUBLICADO
    aprovado_em TIMESTAMP WITH TIME ZONE,
    publicado_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pesquisas_satisfacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depoimentos ENABLE ROW LEVEL SECURITY;

-- Policies for pesquisas_satisfacao
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all surveys') THEN
        CREATE POLICY "Users can view all surveys" ON public.pesquisas_satisfacao FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert surveys') THEN
        CREATE POLICY "Users can insert surveys" ON public.pesquisas_satisfacao FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update surveys') THEN
        CREATE POLICY "Users can update surveys" ON public.pesquisas_satisfacao FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view survey by token') THEN
        CREATE POLICY "Public can view survey by token" ON public.pesquisas_satisfacao FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can update survey by token') THEN
        CREATE POLICY "Public can update survey by token" ON public.pesquisas_satisfacao FOR UPDATE USING (true);
    END IF;
END $$;

-- Policies for depoimentos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all testimonials') THEN
        CREATE POLICY "Users can view all testimonials" ON public.depoimentos FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage testimonials') THEN
        CREATE POLICY "Users can manage testimonials" ON public.depoimentos FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_pesquisas_satisfacao_updated_at ON public.pesquisas_satisfacao;
CREATE TRIGGER update_pesquisas_satisfacao_updated_at BEFORE UPDATE ON public.pesquisas_satisfacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_depoimentos_updated_at ON public.depoimentos;
CREATE TRIGGER update_depoimentos_updated_at BEFORE UPDATE ON public.depoimentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle project status change to 'Entregue'
CREATE OR REPLACE FUNCTION public.handle_project_delivery()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Entregue' AND (OLD.status IS NULL OR OLD.status != 'Entregue')) THEN
        INSERT INTO public.pesquisas_satisfacao (projeto_id, cliente_nome, token, status)
        VALUES (NEW.id, NEW.cliente, encode(gen_random_bytes(12), 'hex'), 'ENVIADA');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for project delivery
DROP TRIGGER IF EXISTS on_project_delivery ON public.projetos;
CREATE TRIGGER on_project_delivery
AFTER UPDATE ON public.projetos
FOR EACH ROW
EXECUTE FUNCTION public.handle_project_delivery();
