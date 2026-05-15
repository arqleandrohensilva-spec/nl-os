-- Create the checklist table
CREATE TABLE public.documentos_checklist (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    categoria TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDENTE',
    data_recebimento TIMESTAMP WITH TIME ZONE,
    observacao TEXT,
    url_arquivo TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.documentos_checklist ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all access for authenticated users" 
ON public.documentos_checklist 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.documentos_checklist
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
