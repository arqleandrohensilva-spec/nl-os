CREATE OR REPLACE FUNCTION public.get_proposal_by_slug(p_tipo text, p_slug text)
RETURNS SETOF public.propostas_clientes
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM propostas_clientes WHERE tipo = p_tipo AND slug = p_slug;
$$;
