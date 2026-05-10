-- Fix function search path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix proposal_views insert policy to be more specific
DROP POLICY "Enable insert for anyone" ON public.proposal_views;
CREATE POLICY "Enable insert for anyone" ON public.proposal_views
    FOR INSERT WITH CHECK (proposal_id IS NOT NULL);
