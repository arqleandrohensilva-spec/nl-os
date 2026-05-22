-- Adiciona suporte a status de triagem na tabela de leads ou briefings conforme necessário
-- Primeiro, vamos garantir que a tabela briefings pode receber inserções públicas sem token
ALTER TABLE public.briefings ALTER COLUMN token DROP NOT NULL;

-- Adiciona colunas de contato na tabela briefings para quando não há lead vinculado
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'briefings' AND COLUMN_NAME = 'nome') THEN
        ALTER TABLE public.briefings ADD COLUMN nome TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'briefings' AND COLUMN_NAME = 'whatsapp') THEN
        ALTER TABLE public.briefings ADD COLUMN whatsapp TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'briefings' AND COLUMN_NAME = 'email') THEN
        ALTER TABLE public.briefings ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'briefings' AND COLUMN_NAME = 'cidade') THEN
        ALTER TABLE public.briefings ADD COLUMN cidade TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'briefings' AND COLUMN_NAME = 'origem') THEN
        ALTER TABLE public.briefings ADD COLUMN origem TEXT;
    END IF;
END $$;

-- Atualiza a política de RLS para permitir INSERT público na tabela briefings
-- Verificamos se a política já existe ou criamos uma nova
DROP POLICY IF EXISTS "Permitir inserção pública de briefings" ON public.briefings;
CREATE POLICY "Permitir inserção pública de briefings" 
ON public.briefings 
FOR INSERT 
WITH CHECK (true);

-- Atualiza o status possível para incluir 'aguardando_triagem'
-- Nota: Se status for uma coluna de texto simples, não precisa de alteração de tipo
-- Se for um enum, precisaríamos adicionar o valor. Vamos assumir texto conforme uso anterior.
