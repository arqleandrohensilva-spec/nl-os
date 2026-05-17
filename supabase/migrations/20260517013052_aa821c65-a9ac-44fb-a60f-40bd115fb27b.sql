-- Create notifications table
CREATE TYPE notification_type AS ENUM ('urgente', 'financeiro', 'projeto', 'satisfacao', 'lead');

CREATE TABLE public.notificacoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    tipo notification_type NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    modulo TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" 
ON public.notificacoes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notificacoes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" 
ON public.notificacoes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.notificacoes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notificacoes_updated_at
BEFORE UPDATE ON public.notificacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_notificacoes_user_lida ON public.notificacoes(user_id, lida);
CREATE INDEX idx_notificacoes_created_at ON public.notificacoes(created_at DESC);