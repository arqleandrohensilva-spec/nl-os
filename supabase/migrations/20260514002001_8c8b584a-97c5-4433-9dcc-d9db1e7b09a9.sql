-- Add missing columns to contratos table
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id),
ADD COLUMN IF NOT EXISTS numero TEXT,
ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
ADD COLUMN IF NOT EXISTS plano TEXT,
ADD COLUMN IF NOT EXISTS dados_gerais JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS prazos JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS valores JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_contratos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger for updated_at
DROP TRIGGER IF EXISTS tr_update_contratos_updated_at ON public.contratos;
CREATE TRIGGER tr_update_contratos_updated_at
    BEFORE UPDATE ON public.contratos
    FOR EACH ROW
    EXECUTE FUNCTION update_contratos_updated_at();

-- Ensure RLS is enabled
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Add policies if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contratos' AND policyname = 'Anyone can view contracts') THEN
        CREATE POLICY "Anyone can view contracts" ON public.contratos FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contratos' AND policyname = 'Anyone can insert contracts') THEN
        CREATE POLICY "Anyone can insert contracts" ON public.contratos FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contratos' AND policyname = 'Anyone can update contracts') THEN
        CREATE POLICY "Anyone can update contracts" ON public.contratos FOR UPDATE USING (true);
    END IF;
END $$;
