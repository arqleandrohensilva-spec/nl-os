-- Create the parcelas table
CREATE TABLE IF NOT EXISTS public.financeiro_parcelas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    cliente_nome TEXT NOT NULL,
    numero_parcela INTEGER NOT NULL,
    total_parcelas INTEGER NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'EM ABERTO',
    data_recebimento TIMESTAMP WITH TIME ZONE,
    valor_recebido DECIMAL(12,2),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financeiro_parcelas ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing authenticated users for now as per system pattern)
CREATE POLICY "Allow all authenticated users to select financeiro_parcelas"
    ON public.financeiro_parcelas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to insert financeiro_parcelas"
    ON public.financeiro_parcelas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update financeiro_parcelas"
    ON public.financeiro_parcelas FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to delete financeiro_parcelas"
    ON public.financeiro_parcelas FOR DELETE TO authenticated USING (true);

-- Add column for total value in projetos if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'projetos' AND COLUMN_NAME = 'valor_total') THEN
        ALTER TABLE public.projetos ADD COLUMN valor_total DECIMAL(12,2);
    END IF;
END $$;