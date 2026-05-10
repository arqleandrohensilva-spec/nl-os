-- Create proposals table
CREATE TABLE public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ArqInt', 'Interiores', 'Comercial')),
    cidade TEXT,
    estado TEXT,
    area NUMERIC,
    objetivo TEXT,
    valor_executivo NUMERIC,
    valor_completo NUMERIC,
    validade INTEGER DEFAULT 30,
    data DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Enviada' CHECK (status IN ('Enviada', 'Vista', 'Aprovada', 'Recusada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for proposals
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Create policies for proposals
CREATE POLICY "Enable all for authenticated users" ON public.proposals
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for anyone with ID" ON public.proposals
    FOR SELECT USING (true);

-- Create proposal_views table
CREATE TABLE public.proposal_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for proposal_views
ALTER TABLE public.proposal_views ENABLE ROW LEVEL SECURITY;

-- Create policies for proposal_views
CREATE POLICY "Enable read for authenticated users" ON public.proposal_views
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for anyone" ON public.proposal_views
    FOR INSERT WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
