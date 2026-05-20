CREATE TABLE public.calculos_proposta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  fases JSONB NOT NULL DEFAULT '[]'::jsonb,
  horas_total NUMERIC NOT NULL DEFAULT 0,
  complexidade NUMERIC NOT NULL DEFAULT 1.0,
  valor_executivo NUMERIC NOT NULL DEFAULT 0,
  valor_completo NUMERIC NOT NULL DEFAULT 0,
  custo_hora_momento NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calculos_proposta ENABLE ROW LEVEL SECURITY;

-- Create policies (authenticated users can do everything)
CREATE POLICY "Users can manage calculos_proposta" 
ON public.calculos_proposta 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_calculos_proposta_updated_at
BEFORE UPDATE ON public.calculos_proposta
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();