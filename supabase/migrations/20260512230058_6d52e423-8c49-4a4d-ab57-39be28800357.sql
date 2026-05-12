-- Adicionar colunas para controle de agendamento e histórico de notificações
ALTER TABLE public.financeiro_parcelas 
ADD COLUMN IF NOT EXISTS agendamento_cobranca JSONB DEFAULT '{"d7": false, "d3": false, "d1": false}'::jsonb,
ADD COLUMN IF NOT EXISTS notificacoes_enviadas JSONB DEFAULT '[]'::jsonb;

-- Comentário para documentação
COMMENT ON COLUMN public.financeiro_parcelas.agendamento_cobranca IS 'Rastreia quais notificações da régua (D-7, D-3, D-1) já foram processadas ou agendadas.';
COMMENT ON COLUMN public.financeiro_parcelas.notificacoes_enviadas IS 'Histórico de notificações enviadas via WhatsApp/E-mail.';
