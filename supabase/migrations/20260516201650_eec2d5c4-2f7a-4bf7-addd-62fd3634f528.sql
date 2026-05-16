-- Create historico_conteudo table
CREATE TABLE public.historico_conteudo (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('legenda', 'reel', 'calendario')),
    conteudo JSONB NOT NULL,
    input_usado TEXT,
    post_type TEXT,
    favorito BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.historico_conteudo ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all access for now as per current project pattern)
CREATE POLICY "Allow all access to historico_conteudo" ON public.historico_conteudo
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_historico_conteudo_tipo ON public.historico_conteudo(tipo);
CREATE INDEX idx_historico_conteudo_created_at ON public.historico_conteudo(created_at DESC);