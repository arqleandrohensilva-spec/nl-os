-- Drop the old foreign key that points to leads if it still exists
ALTER TABLE public.projetos DROP CONSTRAINT IF EXISTS projetos_lead_id_fkey;

-- Clear invalid references that prevent the new FK
UPDATE public.projetos 
SET cliente_id = NULL 
WHERE cliente_id IS NOT NULL 
AND cliente_id NOT IN (SELECT id FROM public.clientes);

-- Add the correct foreign key pointing to clientes
ALTER TABLE public.projetos 
ADD CONSTRAINT projetos_cliente_id_fkey 
FOREIGN KEY (cliente_id) 
REFERENCES public.clientes(id) 
ON DELETE SET NULL;

-- Standardize check constraints
ALTER TABLE public.projetos DROP CONSTRAINT IF EXISTS projetos_tipo_check;
ALTER TABLE public.projetos ADD CONSTRAINT projetos_tipo_check 
CHECK (tipo = ANY (ARRAY['Arq+Int', 'Interiores', 'Comercial']));

ALTER TABLE public.projetos DROP CONSTRAINT IF EXISTS projetos_status_check;
ALTER TABLE public.projetos ADD CONSTRAINT projetos_status_check 
CHECK (status_geral = ANY (ARRAY['ativo', 'concluido', 'pausado']));
