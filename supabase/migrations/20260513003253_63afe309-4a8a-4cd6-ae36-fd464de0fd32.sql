-- Create briefings table
CREATE TABLE IF NOT EXISTS public.briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Pendente',
    respostas JSONB DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Create contratos table
CREATE TABLE IF NOT EXISTS public.contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    conteudo TEXT,
    status TEXT DEFAULT 'Rascunho',
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Create documentos table
CREATE TABLE IF NOT EXISTS public.documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    etapa TEXT,
    nome TEXT NOT NULL,
    versao TEXT DEFAULT '1.0',
    url TEXT,
    tamanho BIGINT,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- Create documento_links table
CREATE TABLE IF NOT EXISTS public.documento_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID REFERENCES public.documentos(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expira_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_links ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all for authenticated users)
CREATE POLICY "Allow all for authenticated users briefings" ON public.briefings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users contratos" ON public.contratos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users documentos" ON public.documentos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users documento_links" ON public.documento_links FOR ALL USING (auth.role() = 'authenticated');

-- Public access for briefings by token
CREATE POLICY "Allow public access to briefings by token" ON public.briefings FOR SELECT USING (true);
CREATE POLICY "Allow public update to briefings by token" ON public.briefings FOR UPDATE USING (true);

-- Public access for document_links by token
CREATE POLICY "Allow public access to document_links by token" ON public.documento_links FOR SELECT USING (true);
