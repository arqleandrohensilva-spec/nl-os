-- Add token_cliente to projects
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS token_cliente UUID DEFAULT gen_random_uuid();

-- Create table for client messages
CREATE TABLE IF NOT EXISTS public.mensagens_cliente (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
    token_cliente UUID,
    mensagem TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for formal approvals
CREATE TABLE IF NOT EXISTS public.aprovacoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
    etapa TEXT NOT NULL,
    documento TEXT,
    nome_aprovador TEXT NOT NULL,
    data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ip_address TEXT,
    token_cliente UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mensagens_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprovacoes ENABLE ROW LEVEL SECURITY;

-- Policies for public (anonymous) access to projects by token
-- Note: We drop existing policies if they exist to avoid errors on retry
DROP POLICY IF EXISTS "Permitir leitura pública de projeto por token" ON public.projetos;
CREATE POLICY "Permitir leitura pública de projeto por token" 
ON public.projetos 
FOR SELECT 
TO anon, authenticated
USING (true); -- We will filter by token in the application

-- Policies for project stages and checklist
DROP POLICY IF EXISTS "Permitir leitura de etapas por projeto" ON public.projeto_etapas;
CREATE POLICY "Permitir leitura de etapas por projeto" 
ON public.projeto_etapas 
FOR SELECT 
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir leitura de checklist por projeto" ON public.projeto_checklist;
CREATE POLICY "Permitir leitura de checklist por projeto" 
ON public.projeto_checklist 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Policies for documents
DROP POLICY IF EXISTS "Permitir leitura de documentos por projeto" ON public.documentos;
CREATE POLICY "Permitir leitura de documentos por projeto" 
ON public.documentos 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Policies for client messages
DROP POLICY IF EXISTS "Clientes podem enviar mensagens" ON public.mensagens_cliente;
CREATE POLICY "Clientes podem enviar mensagens" 
ON public.mensagens_cliente 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Escritório pode ver mensagens" ON public.mensagens_cliente;
CREATE POLICY "Escritório pode ver mensagens" 
ON public.mensagens_cliente 
FOR SELECT 
TO authenticated
USING (true);

-- Policies for approvals
DROP POLICY IF EXISTS "Clientes podem registrar aprovações" ON public.aprovacoes;
CREATE POLICY "Clientes podem registrar aprovações" 
ON public.aprovacoes 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Escritório pode ver aprovações" ON public.aprovacoes;
CREATE POLICY "Escritório pode ver aprovações" 
ON public.aprovacoes 
FOR SELECT 
TO authenticated
USING (true);
