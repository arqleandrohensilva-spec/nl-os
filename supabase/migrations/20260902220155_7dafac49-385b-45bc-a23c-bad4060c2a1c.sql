DROP FUNCTION IF EXISTS public.submit_project_message_by_token(text, uuid, text, text, text);

CREATE POLICY "Portal inserts message with exact project token"
ON public.mensagens_cliente FOR INSERT TO anon
WITH CHECK (
  token_cliente IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.projetos p
    WHERE p.id = mensagens_cliente.projeto_id
      AND p.token_cliente = mensagens_cliente.token_cliente::text
  )
);