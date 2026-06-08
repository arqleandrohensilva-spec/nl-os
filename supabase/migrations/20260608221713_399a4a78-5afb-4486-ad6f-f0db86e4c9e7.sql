DROP FUNCTION IF EXISTS public.get_project_by_token_or_slug(text);

CREATE OR REPLACE FUNCTION public.get_project_by_token_or_slug(p_val text)
 RETURNS TABLE(id uuid, nome_cliente text, tipo text, cidade text, area_m2 numeric, data_inicio timestamp with time zone, etapa_atual text, status_geral text, token_cliente text, cliente_id uuid, slug_cliente text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, nome_cliente, tipo, cidade, area_m2, data_inicio, etapa_atual, status_geral, token_cliente, cliente_id, slug_cliente
  FROM projetos
  WHERE token_cliente = p_val OR slug_cliente = p_val
  LIMIT 1;
$function$;