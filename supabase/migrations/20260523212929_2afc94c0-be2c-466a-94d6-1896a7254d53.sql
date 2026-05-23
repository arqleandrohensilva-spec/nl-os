CREATE OR REPLACE FUNCTION public.increment_proposal_access(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE propostas_clientes 
  SET acessos = COALESCE(acessos, 0) + 1,
      ultimo_acesso = now()
  WHERE id = p_id;
END;
$$;
