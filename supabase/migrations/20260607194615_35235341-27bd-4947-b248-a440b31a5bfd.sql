CREATE OR REPLACE FUNCTION get_project_parcelas_by_token(p_val text)
RETURNS TABLE (
  id uuid,
  valor numeric,
  valor_recebido numeric,
  status text,
  data_vencimento timestamptz,
  data_recebimento timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fp.id, fp.valor, fp.valor_recebido, fp.status, fp.data_vencimento, fp.data_recebimento
  FROM financeiro_parcelas fp
  JOIN projetos p ON p.id = fp.projeto_id
  WHERE p.token_cliente = p_val;
$$;

GRANT EXECUTE ON FUNCTION get_project_parcelas_by_token(text) TO anon, authenticated;