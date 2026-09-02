
-- BRIEFINGS ------------------------------------------------------------
DROP POLICY IF EXISTS "Public select briefings by token" ON public.briefings;
DROP POLICY IF EXISTS "briefings_anon_update" ON public.briefings;
DROP POLICY IF EXISTS "briefings_anon_insert" ON public.briefings;
DROP POLICY IF EXISTS "Public insert briefings" ON public.briefings;

-- Visitantes só podem criar um briefing público novo (sem token, sem vínculo)
CREATE POLICY "Public insert new briefings" ON public.briefings
FOR INSERT TO anon
WITH CHECK (token IS NULL AND lead_id IS NULL AND cliente_id IS NULL);

CREATE OR REPLACE FUNCTION public.submit_briefing_by_token(
  p_token text,
  p_respostas jsonb,
  p_tipo_projeto text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_briefing public.briefings%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_briefing FROM public.briefings WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.briefings
     SET status = 'preenchido',
         respostas = p_respostas,
         tipo_projeto = p_tipo_projeto,
         preenchido_em = now()
   WHERE id = v_briefing.id;

  IF v_briefing.cliente_id IS NOT NULL THEN
    UPDATE public.clientes
       SET tipo_projeto = COALESCE(p_tipo_projeto, tipo_projeto),
           area_m2 = COALESCE(NULLIF(p_respostas->>'area_estimada','')::numeric,
                              NULLIF(p_respostas->>'area_terreno','')::numeric,
                              area_m2),
           orcamento = COALESCE(NULLIF(p_respostas->>'orcamento',''), orcamento),
           briefing_preenchido = true,
           etapa_fluxo = 'pre_briefing',
           updated_at = now()
     WHERE id = v_briefing.cliente_id;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_briefing_by_token(text, jsonb, text) TO anon, authenticated;

-- DOCUMENTOS -----------------------------------------------------------
DROP POLICY IF EXISTS "Permitir leitura de documentos por projeto" ON public.documentos;

-- PESQUISAS DE SATISFAÇÃO ---------------------------------------------
DROP POLICY IF EXISTS "Public can update satisfaction via token" ON public.pesquisas_satisfacao;
DROP POLICY IF EXISTS "Public insert satisfaction" ON public.pesquisas_satisfacao;
DROP POLICY IF EXISTS "pesquisas_anon_insert" ON public.pesquisas_satisfacao;
DROP POLICY IF EXISTS "Public insert testimonials" ON public.depoimentos;

CREATE OR REPLACE FUNCTION public.submit_survey_by_token(
  p_token text,
  p_nota_geral integer,
  p_avaliacao_processo text,
  p_avaliacao_resultado text,
  p_comentario text,
  p_video_url text DEFAULT NULL,
  p_video_path text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survey public.pesquisas_satisfacao%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_survey FROM public.pesquisas_satisfacao WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.pesquisas_satisfacao
     SET nota_geral = p_nota_geral,
         avaliacao_processo = p_avaliacao_processo,
         avaliacao_resultado = p_avaliacao_resultado,
         comentario = p_comentario,
         video_url = p_video_url,
         video_dropbox_path = p_video_path,
         status = 'RESPONDIDA',
         respondida_em = now()
   WHERE id = v_survey.id;

  IF p_nota_geral >= 9 THEN
    INSERT INTO public.depoimentos (pesquisa_id, cliente_nome, projeto_id, texto_formatado, status)
    VALUES (
      v_survey.id,
      v_survey.cliente_nome,
      v_survey.projeto_id,
      '"' || COALESCE(NULLIF(p_comentario,''), 'Experiência excelente com a NL Arquitetos!') ||
      '"' || chr(10) || chr(10) || '— ' || v_survey.cliente_nome ||
      ' (Avaliação Geral: ' || p_nota_geral || '/10)',
      'PENDENTE'
    );
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_survey_by_token(text, integer, text, text, text, text, text) TO anon, authenticated;
