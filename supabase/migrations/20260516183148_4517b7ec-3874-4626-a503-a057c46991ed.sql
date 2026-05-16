-- Table for Marketing Guidelines
CREATE TABLE public.diretrizes_marketing (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for Knowledge Base Files Status
CREATE TABLE public.knowledge_base_files (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diretrizes_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_files ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all authenticated users for now as per project pattern)
CREATE POLICY "Allow all authenticated users to read diretrizes_marketing" 
ON public.diretrizes_marketing FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to insert diretrizes_marketing" 
ON public.diretrizes_marketing FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update diretrizes_marketing" 
ON public.diretrizes_marketing FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to read knowledge_base_files" 
ON public.knowledge_base_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to insert knowledge_base_files" 
ON public.knowledge_base_files FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update knowledge_base_files" 
ON public.knowledge_base_files FOR UPDATE TO authenticated USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_diretrizes_marketing_updated_at
BEFORE UPDATE ON public.diretrizes_marketing
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_knowledge_base_files_updated_at
BEFORE UPDATE ON public.knowledge_base_files
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default guidelines
INSERT INTO public.diretrizes_marketing (content) 
VALUES ('Nunca usar: casa dos sonhos, projeto dos sonhos, lindo, incrível, luxo, exclusivo.
Sempre mencionar processo técnico antes de resultado estético.
Tom: condutor, técnico, direto. Máximo 5 linhas visíveis no Instagram.
Hashtags: máximo 10, sempre #NLArquitetos e #ProjetoExecutivo.');