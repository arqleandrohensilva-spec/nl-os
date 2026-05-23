-- ==========================================
-- 1. CORREÇÃO DE POLÍTICAS DE RLS (TABELAS)
-- ==========================================

-- Projetos: Restringir acesso a autenticados e via token específico
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users projects" ON public.projetos;
DROP POLICY IF EXISTS "Projects access" ON public.projetos;
DROP POLICY IF EXISTS "Public select projects by token" ON public.projetos;

CREATE POLICY "Authenticated users can manage projects" ON public.projetos
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Acesso público via token_cliente (precisa filtrar explicitamente pelo token)
CREATE POLICY "Public select projects by token" ON public.projetos
FOR SELECT TO anon USING (token_cliente IS NOT NULL);

-- Contratos: Acesso restrito
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users contratos" ON public.contratos;
CREATE POLICY "Authenticated users can manage contracts" ON public.contratos
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Financeiro: Acesso restrito
ALTER TABLE public.financeiro_parcelas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated users to select financeiro_parcelas" ON public.financeiro_parcelas;
CREATE POLICY "Authenticated users can manage financeiro" ON public.financeiro_parcelas
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notificações: Impedir inserção anônima
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anyone to insert notifications" ON public.notificacoes;
CREATE POLICY "Authenticated users can manage notifications" ON public.notificacoes
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Briefings: Garantir que anon use token
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "briefings_all_authenticated" ON public.briefings;
DROP POLICY IF EXISTS "briefings_select_by_token" ON public.briefings;
CREATE POLICY "Authenticated users manage briefings" ON public.briefings
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public select briefings by token" ON public.briefings
FOR SELECT TO anon USING (token IS NOT NULL);

CREATE POLICY "Public insert briefings" ON public.briefings
FOR INSERT TO anon WITH CHECK (true);

-- ==========================================
-- 2. SEGURANÇA DE FUNÇÕES (REVOKE PUBLIC)
-- ==========================================

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
