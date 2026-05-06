-- Create services table
CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  horas_estimadas NUMERIC NOT NULL,
  tipo TEXT CHECK (tipo IN ('por_projeto', 'por_hora', 'por_m2')),
  ativo BOOLEAN DEFAULT true,
  vezes_usado INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Create scope templates table
CREATE TABLE public.templates_escopo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  servicos_ids UUID[] NOT NULL,
  ajuste_area BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_escopo ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Acesso por usuário autenticado" ON public.servicos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso por usuário autenticado" ON public.templates_escopo FOR ALL USING (auth.role() = 'authenticated');
