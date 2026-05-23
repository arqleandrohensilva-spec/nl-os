-- Enable RLS and set default Authenticated policies for all management tables
DO $$ 
DECLARE 
    t text;
    tables text[] := ARRAY[
        'servicos', 'arquivos_projeto', 'base_conhecimento', 'templates_escopo', 
        'documentos_checklist', 'contratos_historico', 'clientes', 'historico_conteudo', 
        'proposta_engajamento', 'projetos', 'dropbox_settings', 'sessoes_horas', 
        'config_escritorio', 'leads', 'contexto_marketing_ativo', 'lead_logs', 
        'propostas_clientes', 'financeiro_parcelas', 'pesquisas_satisfacao', 'contratos', 
        'calculos_proposta', 'historico_clientes', 'projeto_checklist', 'diagnosticos_ia', 
        'notificacoes', 'briefings', 'proposals', 'proposal_views', 'depoimentos', 
        'aprovacoes', 'mensagens_cliente', 'diretrizes_marketing', 'propostas', 
        'knowledge_base_files', 'documento_links', 'configuracoes', 'documentos', 
        'projeto_etapas', 'custos_escritorio'
    ];
BEGIN 
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Enable all for authenticated users" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t);
    END LOOP;
END $$;

-- SPECIFIC PUBLIC POLICIES FOR CUSTOMER-FACING FEATURES

-- Briefings: Public can insert and select by token
CREATE POLICY "Public insert briefings" ON public.briefings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public select briefings by token" ON public.briefings FOR SELECT TO anon USING (true);

-- Proposals & Engagements: Public tracking
CREATE POLICY "Public insert engagement" ON public.proposta_engajamento FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public insert views" ON public.proposal_views FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public select proposals" ON public.proposals FOR SELECT TO anon USING (true);

-- Customer Portal (Project viewing, Approval, Messages, Satisfaction)
CREATE POLICY "Public select projects" ON public.projetos FOR SELECT TO anon USING (true);
CREATE POLICY "Public select project stages" ON public.projeto_etapas FOR SELECT TO anon USING (true);
CREATE POLICY "Public select project files" ON public.arquivos_projeto FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert messages" ON public.mensagens_cliente FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public insert satisfaction" ON public.pesquisas_satisfacao FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public insert approvals" ON public.aprovacoes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public insert testimonials" ON public.depoimentos FOR INSERT TO anon WITH CHECK (true);
