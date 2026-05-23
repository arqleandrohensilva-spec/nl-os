-- Secure Data Fetching Functions
CREATE OR REPLACE FUNCTION public.get_briefing_by_token(p_token text)
RETURNS SETOF public.briefings
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM briefings WHERE token = p_token;
$$;

CREATE OR REPLACE FUNCTION public.get_project_by_token(p_token text)
RETURNS SETOF public.projetos
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM projetos WHERE token_cliente::text = p_token;
$$;

CREATE OR REPLACE FUNCTION public.get_survey_by_token(p_token text)
RETURNS SETOF public.pesquisas_satisfacao
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM pesquisas_satisfacao WHERE token = p_token;
$$;

-- Policy Cleanup and Hardening
DO $$ 
BEGIN
    -- Briefings
    DROP POLICY IF EXISTS "briefings_select_by_token" ON public.briefings;
    DROP POLICY IF EXISTS "briefings_update_by_token" ON public.briefings;
    DROP POLICY IF EXISTS "briefings_insert_anon" ON public.briefings;
    DROP POLICY IF EXISTS "briefings_auth_all" ON public.briefings;
    DROP POLICY IF EXISTS "briefings_anon_select" ON public.briefings;
    DROP POLICY IF EXISTS "briefings_anon_update" ON public.briefings;
    DROP POLICY IF EXISTS "briefings_anon_insert" ON public.briefings;

    -- Contratos
    DROP POLICY IF EXISTS "Anyone can view contracts" ON public.contratos;
    DROP POLICY IF EXISTS "Anyone can insert contracts" ON public.contratos;
    DROP POLICY IF EXISTS "Anyone can update contracts" ON public.contratos;
    DROP POLICY IF EXISTS "contratos_auth_all" ON public.contratos;

    -- Documento Links
    DROP POLICY IF EXISTS "Allow public access to document_links by token" ON public.documento_links;
    DROP POLICY IF EXISTS "documento_links_public_read" ON public.documento_links;
    DROP POLICY IF EXISTS "documento_links_auth_all" ON public.documento_links;
    DROP POLICY IF EXISTS "documento_links_anon_select" ON public.documento_links;

    -- Pesquisas Satisfação
    DROP POLICY IF EXISTS "Public can view survey by token" ON public.pesquisas_satisfacao;
    DROP POLICY IF EXISTS "Public can update survey by token" ON public.pesquisas_satisfacao;
    DROP POLICY IF EXISTS "pesquisas_public_insert" ON public.pesquisas_satisfacao;
    DROP POLICY IF EXISTS "pesquisas_auth_all" ON public.pesquisas_satisfacao;
    DROP POLICY IF EXISTS "pesquisas_anon_insert" ON public.pesquisas_satisfacao;
    DROP POLICY IF EXISTS "pesquisas_anon_select" ON public.pesquisas_satisfacao;

    -- Projetos
    DROP POLICY IF EXISTS "Permitir leitura pública de projeto por token" ON public.projetos;
    DROP POLICY IF EXISTS "Public select projects" ON public.projetos;
    DROP POLICY IF EXISTS "projetos_auth_all" ON public.projetos;
    DROP POLICY IF EXISTS "projetos_anon_select" ON public.projetos;

    -- Proposals
    DROP POLICY IF EXISTS "Public select proposals" ON public.proposals;
    DROP POLICY IF EXISTS "proposals_public_read" ON public.proposals;
    DROP POLICY IF EXISTS "Public can view specific proposal" ON public.proposals;
    DROP POLICY IF EXISTS "proposals_auth_all" ON public.proposals;
    DROP POLICY IF EXISTS "proposals_anon_select" ON public.proposals;

    -- Propostas Clientes
    DROP POLICY IF EXISTS "allow_public_select" ON public.propostas_clientes;
    DROP POLICY IF EXISTS "allow_public_update_stats" ON public.propostas_clientes;
    DROP POLICY IF EXISTS "allow_public_insert" ON public.propostas_clientes;
    DROP POLICY IF EXISTS "propostas_clientes_auth_all" ON public.propostas_clientes;
    DROP POLICY IF EXISTS "propostas_clientes_anon_select" ON public.propostas_clientes;
END $$;

-- Auth policies
CREATE POLICY "briefings_auth_all" ON public.briefings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "contratos_auth_all" ON public.contratos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "documento_links_auth_all" ON public.documento_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pesquisas_auth_all" ON public.pesquisas_satisfacao FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "projetos_auth_all" ON public.projetos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "proposals_auth_all" ON public.proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "propostas_clientes_auth_all" ON public.propostas_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon/Public policies - Limited to necessary actions
CREATE POLICY "briefings_anon_insert" ON public.briefings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "briefings_anon_update" ON public.briefings FOR UPDATE TO anon USING (token IS NOT NULL) WITH CHECK (token IS NOT NULL); -- Still needs check, but SELECT will be restricted to RPC

CREATE POLICY "pesquisas_anon_insert" ON public.pesquisas_satisfacao FOR INSERT TO anon WITH CHECK (true);

-- For SELECT on tables that need token-based access, we disable them for anon 
-- and force usage of the security definer functions above.
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisas_satisfacao ENABLE ROW LEVEL SECURITY;

-- Secure search_path for all public functions
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema_name, p.proname as function_name, pg_get_function_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.oid = p.pronamespace
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE 'ALTER FUNCTION ' || quote_ident(func_record.schema_name) || '.' || quote_ident(func_record.function_name) || '(' || func_record.args || ') SET search_path = public';
    END LOOP;
END $$;
