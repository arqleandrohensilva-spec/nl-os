-- Drop potentially conflicting policies before creating new ones
DROP POLICY IF EXISTS "Authenticated users can manage documento_links" ON public.documento_links;
DROP POLICY IF EXISTS "Allow all access to authenticated users on documento_links" ON public.documento_links;
CREATE POLICY "Authenticated users can manage documento_links" 
ON public.documento_links FOR ALL 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage contract history" ON public.contratos_historico;
DROP POLICY IF EXISTS "Users can view contract history" ON public.contratos_historico;
DROP POLICY IF EXISTS "Users can insert contract history" ON public.contratos_historico;
CREATE POLICY "Authenticated users can manage contract history" 
ON public.contratos_historico FOR ALL 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage historico_conteudo" ON public.historico_conteudo;
DROP POLICY IF EXISTS "Allow all access to historico_conteudo" ON public.historico_conteudo;
CREATE POLICY "Authenticated users can manage historico_conteudo" 
ON public.historico_conteudo FOR ALL 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage calculos_proposta" ON public.calculos_proposta;
DROP POLICY IF EXISTS "Users can manage calculos_proposta" ON public.calculos_proposta;
CREATE POLICY "Authenticated users can manage calculos_proposta" 
ON public.calculos_proposta FOR ALL 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage historico_clientes" ON public.historico_clientes;
DROP POLICY IF EXISTS "Users can view all historico_clientes" ON public.historico_clientes;
CREATE POLICY "Authenticated users can manage historico_clientes" 
ON public.historico_clientes FOR ALL 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Access project files via token" ON public.arquivos_projeto;
DROP POLICY IF EXISTS "Acesso público por token para visualizar arquivos" ON public.arquivos_projeto;
CREATE POLICY "Access project files via token" 
ON public.arquivos_projeto FOR SELECT 
TO public 
USING (
    EXISTS (
        SELECT 1 FROM public.projetos p 
        WHERE p.id = arquivos_projeto.projeto_id 
        AND p.token_cliente IS NOT NULL
    )
);

DROP POLICY IF EXISTS "Public insert messages with valid project token" ON public.mensagens_cliente;
DROP POLICY IF EXISTS "Authenticated manage messages" ON public.mensagens_cliente;
DROP POLICY IF EXISTS "Acesso público por token para mensagens" ON public.mensagens_cliente;
DROP POLICY IF EXISTS "Anyone can insert messages via portal" ON public.mensagens_cliente;
DROP POLICY IF EXISTS "Clientes podem enviar mensagens" ON public.mensagens_cliente;
CREATE POLICY "Public insert messages with valid project token" 
ON public.mensagens_cliente FOR INSERT 
TO public 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projetos p 
        WHERE p.id = mensagens_cliente.projeto_id 
        AND p.token_cliente IS NOT NULL
    )
);
CREATE POLICY "Authenticated manage messages" 
ON public.mensagens_cliente FOR ALL 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Public insert approvals with valid project" ON public.aprovacoes;
DROP POLICY IF EXISTS "Authenticated manage approvals" ON public.aprovacoes;
DROP POLICY IF EXISTS "Clientes podem registrar aprovações" ON public.aprovacoes;
CREATE POLICY "Public insert approvals with valid project" 
ON public.aprovacoes FOR INSERT 
TO public 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projetos p 
        WHERE p.id = aprovacoes.projeto_id 
        AND p.token_cliente IS NOT NULL
    )
);
CREATE POLICY "Authenticated manage approvals" 
ON public.aprovacoes FOR ALL 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated manage notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Permitir inserção do portal do cliente" ON public.notificacoes;
CREATE POLICY "Authenticated manage notifications" 
ON public.notificacoes FOR ALL 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated manage financial installments" ON public.financeiro_parcelas;
DROP POLICY IF EXISTS "Allow all authenticated users to insert financeiro_parcelas" ON public.financeiro_parcelas;
DROP POLICY IF EXISTS "Allow all authenticated users to update financeiro_parcelas" ON public.financeiro_parcelas;
DROP POLICY IF EXISTS "Allow all authenticated users to delete financeiro_parcelas" ON public.financeiro_parcelas;
CREATE POLICY "Authenticated manage financial installments" 
ON public.financeiro_parcelas FOR ALL 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated manage marketing guidelines" ON public.diretrizes_marketing;
DROP POLICY IF EXISTS "Allow all authenticated users to insert diretrizes_marketing" ON public.diretrizes_marketing;
DROP POLICY IF EXISTS "Allow all authenticated users to update diretrizes_marketing" ON public.diretrizes_marketing;
CREATE POLICY "Authenticated manage marketing guidelines" 
ON public.diretrizes_marketing FOR ALL 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated manage knowledge base files" ON public.knowledge_base_files;
DROP POLICY IF EXISTS "Allow all authenticated users to insert knowledge_base_files" ON public.knowledge_base_files;
DROP POLICY IF EXISTS "Allow all authenticated users to update knowledge_base_files" ON public.knowledge_base_files;
CREATE POLICY "Authenticated manage knowledge base files" 
ON public.knowledge_base_files FOR ALL 
TO authenticated 
USING (true);
