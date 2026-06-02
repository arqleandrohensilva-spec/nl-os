-- Add columns to financeiro_parcelas
ALTER TABLE public.financeiro_parcelas ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id);
ALTER TABLE public.financeiro_parcelas ADD COLUMN IF NOT EXISTS descricao TEXT;

-- Create view for easier access to contract data
CREATE OR REPLACE VIEW public.contratos_clientes AS
SELECT 
    id,
    cliente_id,
    status,
    criado_em,
    numero,
    COALESCE(valores->>'totalCompleto', valores->>'totalExecutivo', valores->>'valor_total') as valor_total,
    COALESCE(valores->>'marco1', valores->>'marco1_valor') as marco1_valor,
    COALESCE(valores->>'marco2', valores->>'marco2_valor') as marco2_valor,
    COALESCE(valores->>'marco3', valores->>'marco3_valor') as marco3_valor
FROM public.contratos;

-- Grants
GRANT SELECT ON public.contratos_clientes TO authenticated, service_role, anon;
GRANT ALL ON public.financeiro_parcelas TO authenticated, service_role;
