-- Create a table for active marketing context
CREATE TABLE IF NOT EXISTS public.contexto_marketing_ativo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente TEXT NOT NULL,
    tipo TEXT,
    etapa_atual TEXT,
    status TEXT,
    proxima_entrega TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contexto_marketing_ativo ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own marketing context" 
ON public.contexto_marketing_ativo 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_contexto_marketing_user ON public.contexto_marketing_ativo(user_id);
