-- Alterar tabela clientes para adicionar campos faltantes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS tipo_projeto TEXT,
ADD COLUMN IF NOT EXISTS area_m2 NUMERIC,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Criar tabela de histórico de clientes
CREATE TABLE IF NOT EXISTS public.historico_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    status_anterior TEXT,
    status_novo TEXT,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT now(),
    autor_id UUID REFERENCES auth.users(id)
);

-- Habilitar RLS na tabela de histórico
ALTER TABLE public.historico_clientes ENABLE ROW LEVEL SECURITY;

-- Criar políticas para historico_clientes
CREATE POLICY "Users can view all historico_clientes" ON public.historico_clientes FOR SELECT USING (true);
CREATE POLICY "Users can insert historico_clientes" ON public.historico_clientes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Adicionar cliente_id na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

-- Função para registrar histórico de alteração de status
CREATE OR REPLACE FUNCTION public.fn_registrar_historico_cliente()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status_comercial IS DISTINCT FROM NEW.status_comercial) THEN
        INSERT INTO public.historico_clientes (cliente_id, status_anterior, status_novo, autor_id)
        VALUES (NEW.id, OLD.status_comercial, NEW.status_comercial, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para histórico de clientes
DROP TRIGGER IF EXISTS tr_registrar_historico_cliente ON public.clientes;
CREATE TRIGGER tr_registrar_historico_cliente
AFTER UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.fn_registrar_historico_cliente();

-- Trigger para manter status do cliente sincronizado com o lead no pipeline
CREATE OR REPLACE FUNCTION public.fn_sincronizar_lead_com_cliente()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status no lead mudar, atualiza o status_comercial no cliente
    UPDATE public.clientes 
    SET status_comercial = NEW.stage,
        updated_at = now()
    WHERE id = NEW.cliente_id AND status_comercial IS DISTINCT FROM NEW.stage;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sincronizar_lead_com_cliente ON public.leads;
CREATE TRIGGER tr_sincronizar_lead_com_cliente
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.fn_sincronizar_lead_com_cliente();

-- Trigger para manter status do lead sincronizado com o cliente
CREATE OR REPLACE FUNCTION public.fn_sincronizar_cliente_com_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status no cliente mudar, atualiza o stage no lead correspondente
    UPDATE public.leads 
    SET stage = NEW.status_comercial,
        updated_at = now()
    WHERE cliente_id = NEW.id AND stage IS DISTINCT FROM NEW.status_comercial;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sincronizar_cliente_com_lead ON public.clientes;
CREATE TRIGGER tr_sincronizar_cliente_com_lead
AFTER UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.fn_sincronizar_cliente_com_lead();
