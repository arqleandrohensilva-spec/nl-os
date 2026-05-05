-- Create Projetos table
CREATE TABLE public.projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cliente_nome text,
  lead_id uuid REFERENCES public.leads(id),
  tipo text CHECK (tipo IN ('Arq+Int','Interiores','Comercial')),
  area_m2 numeric,
  valor_proposta numeric DEFAULT 0,
  horas_estimadas numeric DEFAULT 0,
  horas_briefing numeric DEFAULT 20,
  horas_anteprojeto numeric DEFAULT 120,
  horas_executivo numeric DEFAULT 100,
  horas_acompanhamento numeric DEFAULT 40,
  etapa_atual text DEFAULT 'Briefing',
  status text DEFAULT 'ativo' CHECK (status IN ('ativo','concluido','pausado')),
  criado_em timestamptz DEFAULT now(),
  criado_por text
);

-- Create Sessões de Trabalho table
CREATE TABLE public.sessoes_horas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE CASCADE,
  etapa text CHECK (etapa IN ('Briefing','Anteprojeto','Projeto Executivo','Acompanhamento de Obra')),
  responsavel text CHECK (responsavel IN ('Leandro','Neandro')),
  inicio timestamptz NOT NULL,
  fim timestamptz,
  duracao_minutos numeric,
  observacao text,
  criado_em timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_horas ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies (allow all authenticated users for now as per existing pattern)
CREATE POLICY "Allow all for authenticated users on projetos" ON public.projetos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users on sessoes_horas" ON public.sessoes_horas FOR ALL USING (auth.role() = 'authenticated');

-- Insert initial sample data for projetos
INSERT INTO public.projetos (nome, cliente_nome, tipo, area_m2, valor_proposta, horas_estimadas, horas_briefing, horas_anteprojeto, horas_executivo, horas_acompanhamento, etapa_atual, status)
VALUES 
  ('Residência Mendonça', 'Carlos Mendonça', 'Arq+Int', 340, 45000, 280, 20, 120, 100, 40, 'Anteprojeto', 'ativo'),
  ('Escritório Teixeira Corp', 'Rodrigo Teixeira', 'Comercial', 520, 85000, 380, 30, 160, 140, 50, 'Briefing', 'ativo'),
  ('Apartamento Lima', 'André Lima', 'Arq+Int', 300, 38000, 240, 15, 100, 90, 35, 'Briefing', 'ativo');

-- Insert initial sample data for sessions (using subqueries to get project IDs)
INSERT INTO public.sessoes_horas (projeto_id, etapa, responsavel, duracao_minutos, observacao, inicio, fim)
SELECT id, 'Briefing', 'Leandro', 90, 'Reunião inicial com cliente', '2026-04-18 09:00:00', '2026-04-18 10:30:00' FROM public.projetos WHERE nome = 'Residência Mendonça';

INSERT INTO public.sessoes_horas (projeto_id, etapa, responsavel, duracao_minutos, observacao, inicio, fim)
SELECT id, 'Briefing', 'Neandro', 60, 'Visita ao terreno', '2026-04-19 14:00:00', '2026-04-19 15:00:00' FROM public.projetos WHERE nome = 'Residência Mendonça';

INSERT INTO public.sessoes_horas (projeto_id, etapa, responsavel, duracao_minutos, observacao, inicio, fim)
SELECT id, 'Anteprojeto', 'Leandro', 135, 'Plantas baixas pavimento térreo', '2026-04-22 08:30:00', '2026-04-22 10:45:00' FROM public.projetos WHERE nome = 'Residência Mendonça';

INSERT INTO public.sessoes_horas (projeto_id, etapa, responsavel, duracao_minutos, observacao, inicio, fim)
SELECT id, 'Anteprojeto', 'Neandro', 180, 'Cortes e fachadas', '2026-04-23 09:00:00', '2026-04-23 12:00:00' FROM public.projetos WHERE nome = 'Residência Mendonça';

INSERT INTO public.sessoes_horas (projeto_id, etapa, responsavel, duracao_minutos, observacao, inicio, fim)
SELECT id, 'Anteprojeto', 'Leandro', 120, 'Revisão e ajustes cliente', '2026-04-28 10:00:00', '2026-04-28 12:00:00' FROM public.projetos WHERE nome = 'Residência Mendonça';

INSERT INTO public.sessoes_horas (projeto_id, etapa, responsavel, duracao_minutos, observacao, inicio, fim)
SELECT id, 'Briefing', 'Leandro', 120, 'Briefing completo com diretoria', '2026-04-25 14:00:00', '2026-04-25 16:00:00' FROM public.projetos WHERE nome = 'Escritório Teixeira Corp';
