ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS revisao INTEGER DEFAULT 1;

-- Update existing records to have revisao 1 if null
UPDATE public.contratos SET revisao = 1 WHERE revisao IS NULL;
