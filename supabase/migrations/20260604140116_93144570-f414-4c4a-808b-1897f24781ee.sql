ALTER TABLE contratos ADD COLUMN IF NOT EXISTS enviado_dropbox boolean DEFAULT false;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS enviado_dropbox_em timestamptz;

-- Update the view to include the new columns
CREATE OR REPLACE VIEW contratos_clientes AS
 SELECT id,
    cliente_id,
    status,
    criado_em,
    numero,
    COALESCE(valores ->> 'totalCompleto'::text, valores ->> 'totalExecutivo'::text, valores ->> 'valor_total'::text) AS valor_total,
    COALESCE(valores ->> 'marco1'::text, valores ->> 'marco1_valor'::text) AS marco1_valor,
    COALESCE(valores ->> 'marco2'::text, valores ->> 'marco2_valor'::text) AS marco2_valor,
    COALESCE(valores ->> 'marco3'::text, valores ->> 'marco3_valor'::text) AS marco3_valor,
    enviado_dropbox,
    enviado_dropbox_em
   FROM contratos;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos_clientes TO authenticated;
GRANT ALL ON public.contratos_clientes TO service_role;