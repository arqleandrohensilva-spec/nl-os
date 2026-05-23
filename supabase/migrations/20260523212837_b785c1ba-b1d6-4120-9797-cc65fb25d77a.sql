DROP FUNCTION IF EXISTS public.get_briefing_by_token(text);

CREATE OR REPLACE FUNCTION public.get_briefing_by_token(p_token text)
RETURNS TABLE (
    id uuid,
    lead_id uuid,
    cliente_id uuid,
    nome text,
    whatsapp text,
    email text,
    cidade text,
    origem text,
    status text,
    tipo_projeto text,
    respostas jsonb,
    token text,
    criado_em timestamptz,
    preenchido_em timestamptz,
    leads jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id, b.lead_id, b.cliente_id, b.nome, b.whatsapp, b.email, 
        b.cidade, b.origem, b.status, b.tipo_projeto, b.respostas, 
        b.token, b.criado_em, b.preenchido_em,
        to_jsonb(l.*) as leads
    FROM briefings b
    LEFT JOIN leads l ON b.lead_id = l.id
    WHERE b.token = p_token;
END;
$$;
