-- Adiciona coluna slug_cliente na tabela projetos
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS slug_cliente TEXT UNIQUE;

-- Garante que mensagens_cliente possa ser inserida sem auth (já que é o portal público)
-- Se a política já existir, ela será mantida ou atualizada
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'mensagens_cliente' AND policyname = 'Anyone can insert messages via portal'
    ) THEN
        CREATE POLICY "Anyone can insert messages via portal" 
        ON public.mensagens_cliente 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END $$;
