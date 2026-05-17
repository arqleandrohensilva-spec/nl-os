-- Tabela de mensagens enviadas pelos clientes via portal
CREATE TABLE IF NOT EXISTS public.mensagens_cliente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
  token_cliente TEXT,
  nome_remetente TEXT,
  mensagem TEXT NOT NULL,
  tipo TEXT DEFAULT 'mensagem', -- 'mensagem', 'ajuste'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de arquivos vinculados aos projetos
CREATE TABLE IF NOT EXISTS public.arquivos_projeto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
  dropbox_path TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  etapa TEXT, -- 'Briefing', 'Conceito', etc.
  liberado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.mensagens_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arquivos_projeto ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público via Token
CREATE POLICY "Acesso público por token para mensagens" ON public.mensagens_cliente
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Acesso público por token para visualizar arquivos" ON public.arquivos_projeto
  FOR SELECT USING (true);

-- Garantir que notificações também permitam inserção anônima (se necessário para o portal)
-- Normalmente notificações são internas, mas o portal precisa criar para avisar a equipe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notificacoes' AND policyname = 'Permitir inserção do portal do cliente'
  ) THEN
    ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Permitir inserção do portal do cliente" ON public.notificacoes
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;
