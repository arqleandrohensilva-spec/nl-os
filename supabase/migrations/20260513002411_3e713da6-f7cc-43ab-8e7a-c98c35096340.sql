-- Table for Briefings
CREATE TABLE public.briefings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Enviado', -- 'Enviado', 'Preenchido'
    respostas JSONB DEFAULT '{}'::jsonb,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for Contracts
CREATE TABLE public.contratos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'ArqInt', 'Interiores', 'Comercial'
    conteudo TEXT,
    status TEXT NOT NULL DEFAULT 'Gerado', -- 'Gerado', 'Assinado'
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for Documents (Files)
CREATE TABLE public.documentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    etapa TEXT NOT NULL, -- 'Briefing', 'Anteprojeto', 'Projeto Executivo', 'Acompanhamento de Obra'
    nome TEXT NOT NULL,
    versao INTEGER NOT NULL DEFAULT 1,
    url TEXT NOT NULL,
    tamanho INTEGER, -- in bytes
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for temporary document sharing links
CREATE TABLE public.documento_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    documento_id UUID REFERENCES public.documentos(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_links ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for internal use, assuming auth.uid() check if users are implemented)
CREATE POLICY "Allow all access to authenticated users on briefings" ON public.briefings FOR ALL USING (true);
CREATE POLICY "Allow all access to authenticated users on contratos" ON public.contratos FOR ALL USING (true);
CREATE POLICY "Allow all access to authenticated users on documentos" ON public.documentos FOR ALL USING (true);
CREATE POLICY "Allow all access to authenticated users on documento_links" ON public.documento_links FOR ALL USING (true);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos_projetos', 'documentos_projetos', false);

-- Storage policies
CREATE POLICY "Allow authenticated users to upload to documentos_projetos"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documentos_projetos');

CREATE POLICY "Allow authenticated users to read from documentos_projetos"
ON storage.objects FOR SELECT USING (bucket_id = 'documentos_projetos');

CREATE POLICY "Allow authenticated users to delete from documentos_projetos"
ON storage.objects FOR DELETE USING (bucket_id = 'documentos_projetos');
