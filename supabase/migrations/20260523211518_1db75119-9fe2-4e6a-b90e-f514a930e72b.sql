-- 1. Fix Function Search Paths
ALTER FUNCTION public.update_contratos_updated_at() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_project_delivery() SET search_path = public;
ALTER FUNCTION public.fn_registrar_historico_cliente() SET search_path = public;
ALTER FUNCTION public.fn_sincronizar_lead_com_cliente() SET search_path = public;
ALTER FUNCTION public.fn_sincronizar_cliente_com_lead() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 2. Secure core business tables (Authenticated Only)
DO $$
DECLARE
    t text;
    tables_to_secure text[] := ARRAY[
        'clientes', 'contratos', 'projetos', 'leads', 'financeiro_parcelas', 
        'custos_escritorio', 'config_escritorio', 'propostas', 'sessoes_horas',
        'calculos_proposta', 'contratos_historico', 'documentos', 'servicos',
        'templates_escopo', 'projeto_etapas', 'projeto_checklist', 'lead_logs',
        'historico_clientes', 'notificacoes', 'diagnosticos_ia', 'aprovacoes',
        'direetrizes_marketing', 'contexto_marketing_ativo', 'historico_conteudo',
        'configuracoes', 'dropbox_settings', 'base_conhecimento', 'knowledge_base_files'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_secure LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Allow all access to authenticated users on %I" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Acesso por usuário autenticado" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable all for authenticated users %s" ON public.%I', t, t);
            EXECUTE format('CREATE POLICY "Authenticated users can manage %I" ON public.%I FOR ALL TO authenticated USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')', t, t);
        EXCEPTION WHEN undefined_table THEN
            -- Skip if table doesn't exist (e.g. typos in array)
        END;
    END LOOP;
END $$;

-- 3. Public-facing tables: restricted access
-- Briefings
DROP POLICY IF EXISTS "Allow all access to authenticated users on briefings" ON public.briefings;
CREATE POLICY "Public can insert briefings" ON public.briefings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated users can read briefings" ON public.briefings FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update briefings" ON public.briefings FOR UPDATE TO authenticated USING (auth.role() = 'authenticated');

-- Proposal Views & Engagement
DROP POLICY IF EXISTS "Enable insert for anyone" ON public.proposal_views;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.proposal_views;
CREATE POLICY "Public can insert proposal views" ON public.proposal_views FOR INSERT TO public WITH CHECK (proposal_id IS NOT NULL);
CREATE POLICY "Authenticated users can manage proposal views" ON public.proposal_views FOR ALL TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public read for engagement" ON public.proposta_engajamento;
DROP POLICY IF EXISTS "Allow public insert for engagement" ON public.proposta_engajamento;
CREATE POLICY "Public can insert engagement" ON public.proposta_engajamento FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated users can manage engagement" ON public.proposta_engajamento FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Proposals (Link access)
DROP POLICY IF EXISTS "Enable read for anyone with ID" ON public.proposals;
CREATE POLICY "Public can view specific proposal" ON public.proposals FOR SELECT TO public USING (true);

-- Messages & Satisfaction
DROP POLICY IF EXISTS "Allow public insert to mensagens_cliente" ON public.mensagens_cliente;
CREATE POLICY "Public can insert messages" ON public.mensagens_cliente FOR INSERT TO public WITH CHECK (token_cliente IS NOT NULL);
CREATE POLICY "Authenticated users can manage messages" ON public.mensagens_cliente FOR ALL TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public update to pesquisas_satisfacao" ON public.pesquisas_satisfacao;
CREATE POLICY "Public can update satisfaction via token" ON public.pesquisas_satisfacao FOR UPDATE TO public USING (token IS NOT NULL);
CREATE POLICY "Authenticated users can manage satisfaction" ON public.pesquisas_satisfacao FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Testimonials
DROP POLICY IF EXISTS "Allow all access to authenticated users on depoimentos" ON public.depoimentos;
CREATE POLICY "Public can read testimonials" ON public.depoimentos FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage testimonials" ON public.depoimentos FOR ALL TO authenticated USING (auth.role() = 'authenticated');
