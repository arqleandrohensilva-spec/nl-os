-- Drop ALL identified dependent policies
DROP POLICY IF EXISTS "Access project files via token" ON arquivos_projeto;
DROP POLICY IF EXISTS "Public select project files" ON arquivos_projeto;
DROP POLICY IF EXISTS "Public select projects by token" ON projetos;
DROP POLICY IF EXISTS "Public select project stages" ON projeto_etapas;
DROP POLICY IF EXISTS "Public insert messages with valid project token" ON mensagens_cliente;
DROP POLICY IF EXISTS "Public insert approvals with valid project" ON aprovacoes;

-- Change column type to text
ALTER TABLE projetos ALTER COLUMN token_cliente TYPE text USING token_cliente::text;

-- Drop functions to avoid return type or signature mismatch errors
DROP FUNCTION IF EXISTS get_project_by_token_or_slug(text);
DROP FUNCTION IF EXISTS get_project_stages_by_token(text);
DROP FUNCTION IF EXISTS get_project_files_by_token(text);

-- Recreate RPC Functions
CREATE OR REPLACE FUNCTION get_project_by_token_or_slug(p_val text)
RETURNS TABLE (
  id uuid,
  nome_cliente text,
  tipo text,
  cidade text,
  area_m2 numeric,
  data_inicio timestamptz,
  etapa_atual text,
  status_geral text,
  token_cliente text,
  cliente_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome_cliente, tipo, cidade, area_m2, data_inicio, etapa_atual, status_geral, token_cliente, cliente_id
  FROM projetos
  WHERE token_cliente = p_val
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_project_stages_by_token(p_val text)
RETURNS TABLE (
  id uuid, 
  etapa text, 
  status text, 
  data_entrega timestamptz, 
  aprovado_por text, 
  data_aprovacao timestamptz, 
  updated_at timestamptz, 
  criado_em timestamptz
)
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT pe.id, pe.etapa, pe.status, pe.data_entrega, pe.aprovado_por, pe.data_aprovacao, pe.updated_at, pe.criado_em
  FROM projeto_etapas pe
  JOIN projetos p ON p.id = pe.projeto_id
  WHERE p.token_cliente = p_val;
$$;

CREATE OR REPLACE FUNCTION get_project_files_by_token(p_val text)
RETURNS TABLE (
  id uuid, 
  nome_arquivo text, 
  dropbox_path text, 
  etapa text, 
  liberado boolean
)
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT ap.id, ap.nome_arquivo, ap.dropbox_path, ap.etapa, ap.liberado
  FROM arquivos_projeto ap
  JOIN projetos p ON p.id = ap.projeto_id
  WHERE p.token_cliente = p_val;
$$;

GRANT EXECUTE ON FUNCTION get_project_by_token_or_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_project_stages_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_project_files_by_token(text) TO anon, authenticated;

-- Restore Policies
CREATE POLICY "Public select projects by token" ON projetos 
FOR SELECT TO anon, authenticated 
USING (token_cliente IS NOT NULL);

CREATE POLICY "Public select project stages" ON projeto_etapas
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM projetos p 
  WHERE p.id = projeto_etapas.projeto_id 
  AND p.token_cliente IS NOT NULL
));

CREATE POLICY "Public select project files" ON arquivos_projeto
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM projetos p 
  WHERE p.id = arquivos_projeto.projeto_id 
  AND p.token_cliente IS NOT NULL
));

CREATE POLICY "Public insert messages with valid project token" ON mensagens_cliente
FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM projetos p 
  WHERE p.id = mensagens_cliente.projeto_id 
  AND p.token_cliente IS NOT NULL
));

CREATE POLICY "Public insert approvals with valid project" ON aprovacoes
FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM projetos p 
  WHERE p.id = aprovacoes.projeto_id 
  AND p.token_cliente IS NOT NULL
));
