-- Remove every anonymous/public policy that permits unvalidated project portal writes or reads.
DROP POLICY IF EXISTS "Public insert approvals" ON public.aprovacoes;
DROP POLICY IF EXISTS "Public insert approvals with valid project" ON public.aprovacoes;
DROP POLICY IF EXISTS "Clientes podem registrar aprovações" ON public.aprovacoes;

DROP POLICY IF EXISTS "Public can insert messages" ON public.mensagens_cliente;
DROP POLICY IF EXISTS "Public insert messages" ON public.mensagens_cliente;
DROP POLICY IF EXISTS "Public insert messages with valid project token" ON public.mensagens_cliente;
DROP POLICY IF EXISTS "mensagens_public_insert" ON public.mensagens_cliente;
DROP POLICY IF EXISTS "Anyone can insert messages via portal" ON public.mensagens_cliente;
DROP POLICY IF EXISTS "Clientes podem enviar mensagens" ON public.mensagens_cliente;
DROP POLICY IF EXISTS "Acesso público por token para mensagens" ON public.mensagens_cliente;

DROP POLICY IF EXISTS "Public select project files" ON public.arquivos_projeto;
DROP POLICY IF EXISTS "Access project files via token" ON public.arquivos_projeto;
DROP POLICY IF EXISTS "Acesso público por token para visualizar arquivos" ON public.arquivos_projeto;

-- Exact-token portal message submission. The caller cannot choose a different project.
CREATE OR REPLACE FUNCTION public.submit_project_message_by_token(
  p_token text,
  p_project_id uuid,
  p_message text,
  p_type text DEFAULT 'mensagem',
  p_sender text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.projetos%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 OR p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_project
  FROM public.projetos
  WHERE id = p_project_id
    AND (token_cliente = p_token OR slug_cliente = p_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.mensagens_cliente (projeto_id, mensagem)
  VALUES (v_project.id, trim(p_message));

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_project_message_by_token(text, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_project_message_by_token(text, uuid, text, text, text) TO anon, authenticated;

-- Exact-token stage approval, including the formal audit record.
CREATE OR REPLACE FUNCTION public.approve_stage_by_token(p_token text, p_etapa_id uuid, p_nome text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_project_token text;
  v_stage_name text;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 OR p_nome IS NULL OR length(trim(p_nome)) = 0 THEN
    RETURN false;
  END IF;

  SELECT p.id, p.token_cliente, pe.etapa
    INTO v_project_id, v_project_token, v_stage_name
  FROM public.projeto_etapas pe
  JOIN public.projetos p ON p.id = pe.projeto_id
  WHERE pe.id = p_etapa_id
    AND (p.token_cliente = p_token OR p.slug_cliente = p_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.projeto_etapas
  SET status = 'Aprovado', aprovado_por = trim(p_nome), data_aprovacao = now()
  WHERE id = p_etapa_id;

  INSERT INTO public.aprovacoes (projeto_id, etapa, nome_aprovador, data)
  VALUES (v_project_id, v_stage_name, trim(p_nome), now());

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_stage_by_token(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_stage_by_token(text, uuid, text) TO anon, authenticated;

-- File lookup remains public only through an exact bearer-token/slug match.
CREATE OR REPLACE FUNCTION public.get_project_files_by_token(p_val text)
RETURNS TABLE(id uuid, nome_arquivo text, dropbox_path text, etapa text, liberado boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ap.id, ap.nome_arquivo, ap.dropbox_path, ap.etapa, ap.liberado
  FROM public.arquivos_projeto ap
  JOIN public.projetos p ON p.id = ap.projeto_id
  WHERE (p.token_cliente = p_val OR p.slug_cliente = p_val)
    AND ap.liberado IS TRUE;
$$;
REVOKE ALL ON FUNCTION public.get_project_files_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_files_by_token(text) TO anon, authenticated;

-- Briefing attachments: first folder must be a valid briefing/project bearer token.
DROP POLICY IF EXISTS "Anyone can read briefing attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload briefing attachments" ON storage.objects;
DROP POLICY IF EXISTS "briefing_anexos_select" ON storage.objects;
DROP POLICY IF EXISTS "briefing_anexos_insert" ON storage.objects;
DROP POLICY IF EXISTS "briefing_anexos_delete" ON storage.objects;

CREATE POLICY "Token scoped briefing attachment upload"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'briefing-anexos'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM public.briefings b WHERE b.token = (storage.foldername(name))[1])
    OR EXISTS (
      SELECT 1 FROM public.projetos p
      WHERE p.token_cliente = (storage.foldername(name))[1]
         OR p.slug_cliente = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Token scoped briefing attachment read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'briefing-anexos'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM public.briefings b WHERE b.token = (storage.foldername(name))[1])
    OR EXISTS (
      SELECT 1 FROM public.projetos p
      WHERE p.token_cliente = (storage.foldername(name))[1]
         OR p.slug_cliente = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Authenticated staff delete briefing attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'briefing-anexos');

-- Only approved/published testimonials are public.
DROP POLICY IF EXISTS "Public can read testimonials" ON public.depoimentos;
DROP POLICY IF EXISTS "Public testimonials" ON public.depoimentos;
CREATE POLICY "Public can read published testimonials"
ON public.depoimentos FOR SELECT TO anon
USING (upper(status) = 'PUBLICADO');