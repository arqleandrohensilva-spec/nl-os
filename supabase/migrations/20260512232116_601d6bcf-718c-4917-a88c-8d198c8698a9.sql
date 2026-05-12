ALTER TABLE public.financeiro_parcelas 
ADD COLUMN IF NOT EXISTS iss_aliquota NUMERIC DEFAULT 2,
ADD COLUMN IF NOT EXISTS iss_valor NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS nf_emitida BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nf_numero TEXT,
ADD COLUMN IF NOT EXISTS nf_data_emissao DATE;

-- Update existing records to calculate valor_liquido if possible
UPDATE public.financeiro_parcelas 
SET valor_liquido = valor - (valor * (iss_aliquota / 100)),
    iss_valor = valor * (iss_aliquota / 100)
WHERE valor_liquido = 0 AND valor > 0;