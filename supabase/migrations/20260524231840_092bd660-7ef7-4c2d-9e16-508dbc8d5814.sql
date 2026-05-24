-- Add scheduling columns to clientes table
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS reuniao_data TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reuniao_local TEXT,
ADD COLUMN IF NOT EXISTS reuniao_link TEXT,
ADD COLUMN IF NOT EXISTS reuniao_notas TEXT;

-- Ensure historico_clientes exists (it seems to be already in use based on code, but let's be safe or just note it)
-- The code already uses historico_clientes, so we just need to ensure the schema supports the 'reagendamento' type.
-- Usually 'tipo' is a text field, so no change needed there if it exists.
