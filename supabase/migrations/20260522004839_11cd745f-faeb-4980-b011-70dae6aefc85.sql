CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir leitura para todos usuários autenticados" ON public.configuracoes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir inserção para usuários autenticados" ON public.configuracoes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir atualização para usuários autenticados" ON public.configuracoes
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Inserir links úteis padrão se não existirem
INSERT INTO public.configuracoes (key, value)
VALUES ('links_uteis', '[
    {"id": "briefing", "label": "PRÉ-BRIEFING", "url": "app.nl.arq.br/briefing", "desc": "Envie para novos clientes antes da reunião", "icon": "ClipboardList", "editable": false},
    {"id": "google", "label": "GOOGLE MEU NEGÓCIO", "url": "", "desc": "Link direto para avaliações", "icon": "Star", "editable": true},
    {"id": "instagram", "label": "INSTAGRAM", "url": "", "desc": "Perfil da NL Arquitetos", "icon": "Instagram", "editable": true},
    {"id": "whatsapp", "label": "WHATSAPP", "url": "", "desc": "Número comercial da NL", "icon": "MessageCircle", "editable": true}
]')
ON CONFLICT (key) DO NOTHING;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();