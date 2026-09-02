-- 1. Remove overly permissive policies
DROP POLICY IF EXISTS "Permitir leitura de checklist por projeto" ON public.projeto_checklist;
DROP POLICY IF EXISTS "Enable all for authenticated users checklist" ON public.projeto_checklist;

DROP POLICY IF EXISTS "Permitir leitura de etapas por projeto" ON public.projeto_etapas;
DROP POLICY IF EXISTS "Public select project stages" ON public.projeto_etapas;
DROP POLICY IF EXISTS "Enable all for authenticated users etapas" ON public.projeto_etapas;

DROP POLICY IF EXISTS "Allow all" ON public.projeto_horas_log;
DROP POLICY IF EXISTS "Allow anon on projeto_horas_log" ON public.projeto_horas_log;

DROP POLICY IF EXISTS "Public select projects by token" ON public.projetos;

DROP POLICY IF EXISTS "proposals_public_read_by_link" ON public.proposals;

REVOKE ALL ON public.projeto_horas_log FROM anon;
REVOKE ALL ON public.projeto_checklist FROM anon;
REVOKE ALL ON public.projeto_etapas FROM anon;
REVOKE ALL ON public.projetos FROM anon;
REVOKE ALL ON public.proposals FROM anon;

-- 2. View must run with the querying user's permissions
ALTER VIEW public.contratos_clientes SET (security_invoker = on);

-- 3. Client stage approval via project token
CREATE OR REPLACE FUNCTION public.approve_stage_by_token(p_token text, p_etapa_id uuid, p_nome text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 OR p_nome IS NULL OR length(trim(p_nome)) = 0 THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.projeto_etapas pe
    JOIN public.projetos p ON p.id = pe.projeto_id
    WHERE pe.id = p_etapa_id
      AND (p.token_cliente = p_token OR p.slug_cliente = p_token)
  ) INTO v_ok;

  IF NOT v_ok THEN
    RETURN false;
  END IF;

  UPDATE public.projeto_etapas
     SET status = 'Aprovado',
         aprovado_por = p_nome,
         data_aprovacao = now()
   WHERE id = p_etapa_id;

  RETURN true;
END;
$$;

-- 4. Public proposal lookup returns only the id needed for tracking
CREATE OR REPLACE FUNCTION public.find_proposal_id_by_link(p_tipo text, p_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.proposals
   WHERE link_proposta IS NOT NULL
     AND (lower(link_proposta) LIKE '%/' || lower(p_slug)
          OR lower(link_proposta) LIKE '%/' || lower(p_tipo) || '/' || lower(p_slug) || '%')
   LIMIT 1;
$$;