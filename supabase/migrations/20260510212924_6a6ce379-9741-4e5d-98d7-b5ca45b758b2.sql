CREATE TABLE public.proposta_engajamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  secao_capa_tempo INTEGER DEFAULT 0,
  secao_manifesto_tempo INTEGER DEFAULT 0,
  secao_diagnostico_tempo INTEGER DEFAULT 0,
  secao_escopo_tempo INTEGER DEFAULT 0,
  secao_investimento_tempo INTEGER DEFAULT 0,
  secao_fechamento_tempo INTEGER DEFAULT 0,
  dispositivo TEXT,
  tempo_total INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.proposta_engajamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for engagement" ON public.proposta_engajamento
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert for engagement" ON public.proposta_engajamento
  FOR INSERT WITH CHECK (true);

-- Adicionar índice para performance
CREATE INDEX idx_proposta_engajamento_proposta_id ON public.proposta_engajamento(proposta_id);