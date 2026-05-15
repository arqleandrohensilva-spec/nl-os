CREATE TABLE public.contratos_historico (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    acao TEXT NOT NULL, -- 'GERADO', 'DOWNLOAD', 'DROPBOX', 'CANCELADO'
    observacao TEXT,
    arquivo_url TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contratos_historico ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view contract history" 
ON public.contratos_historico 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert contract history" 
ON public.contratos_historico 
FOR INSERT 
WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_contratos_historico_contrato_id ON public.contratos_historico(contrato_id);
CREATE INDEX idx_contratos_historico_numero ON public.contratos_historico(numero);