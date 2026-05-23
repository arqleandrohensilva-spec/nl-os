DROP FUNCTION IF EXISTS public.get_project_by_token(text);

CREATE OR REPLACE FUNCTION public.get_project_by_token_or_slug(p_val text)
RETURNS SETOF public.projetos
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM projetos 
  WHERE token_cliente::text = p_val OR slug_cliente = p_val;
$$;

CREATE OR REPLACE FUNCTION public.get_project_stages_by_token(p_val text)
RETURNS SETOF public.projeto_etapas
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.* FROM projeto_etapas e
  JOIN projetos p ON e.projeto_id = p.id
  WHERE p.token_cliente::text = p_val OR p.slug_cliente = p_val;
$$;

CREATE OR REPLACE FUNCTION public.get_project_files_by_token(p_val text)
RETURNS SETOF public.arquivos_projeto
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.* FROM arquivos_projeto a
  JOIN projetos p ON a.projeto_id = p.id
  WHERE p.token_cliente::text = p_val OR p.slug_cliente = p_val;
$$;
