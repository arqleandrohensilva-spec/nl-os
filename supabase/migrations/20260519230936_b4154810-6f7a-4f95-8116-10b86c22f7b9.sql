-- Ensure RLS is enabled
ALTER TABLE public.propostas_clientes ENABLE ROW LEVEL SECURITY;

-- Allow public viewing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'propostas_clientes' AND policyname = 'allow_public_select'
    ) THEN
        CREATE POLICY "allow_public_select" ON public.propostas_clientes
        FOR SELECT USING (true);
    END IF;
END $$;

-- Allow public updates to access statistics
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'propostas_clientes' AND policyname = 'allow_public_update_stats'
    ) THEN
        CREATE POLICY "allow_public_update_stats" ON public.propostas_clientes
        FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Allow public insertion (requested by user previously for the generator)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'propostas_clientes' AND policyname = 'allow_public_insert'
    ) THEN
        CREATE POLICY "allow_public_insert" ON public.propostas_clientes
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;
