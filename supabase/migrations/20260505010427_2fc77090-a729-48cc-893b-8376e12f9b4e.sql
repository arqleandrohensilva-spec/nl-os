-- Create configuration table for the office
CREATE TABLE IF NOT EXISTS public.config_escritorio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horas_dia NUMERIC DEFAULT 8,
  dias_mes NUMERIC DEFAULT 22,
  percentual_produtivo NUMERIC DEFAULT 70,
  num_arquitetos INTEGER DEFAULT 2,
  margem_lucro NUMERIC DEFAULT 40,
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config_escritorio ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all access for authenticated users" ON public.config_escritorio
  FOR ALL TO authenticated USING (true);

-- Create costs table
CREATE TABLE IF NOT EXISTS public.custos_escritorio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT CHECK (categoria IN ('fixo','prolabore','softwares','variavel','impostos','reservas')),
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  frequencia TEXT CHECK (frequencia IN ('mensal','anual','percentual')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custos_escritorio ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all access for authenticated users" ON public.custos_escritorio
  FOR ALL TO authenticated USING (true);

-- Insert default config
INSERT INTO public.config_escritorio (id, horas_dia, dias_mes, percentual_produtivo, num_arquitetos, margem_lucro)
VALUES ('00000000-0000-0000-0000-000000000001', 8, 22, 70, 2, 40)
ON CONFLICT (id) DO NOTHING;

-- Insert example data
INSERT INTO public.custos_escritorio (categoria, nome, valor, frequencia) VALUES
  ('fixo', 'Aluguel do escritório', 2500, 'mensal'),
  ('fixo', 'Energia elétrica', 300, 'mensal'),
  ('fixo', 'Internet', 150, 'mensal'),
  ('fixo', 'Telefone', 120, 'mensal'),
  ('prolabore', 'Pró-labore Leandro', 5000, 'mensal'),
  ('prolabore', 'Pró-labore Neandro', 5000, 'mensal'),
  ('softwares', 'AutoCAD', 3600, 'anual'),
  ('softwares', 'Pacote Adobe', 300, 'mensal'),
  ('softwares', 'Revit', 4800, 'anual'),
  ('softwares', 'Lovable Pro', 135, 'mensal'),
  ('softwares', 'Supabase', 0, 'mensal'),
  ('variavel', 'Deslocamentos', 400, 'mensal'),
  ('variavel', 'Material de escritório', 200, 'mensal'),
  ('variavel', 'Plotagens e impressões', 300, 'mensal'),
  ('impostos', 'Simples Nacional (6%)', 6, 'percentual'),
  ('reservas', 'Fundo de emergência', 500, 'mensal');
