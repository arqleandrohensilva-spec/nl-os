-- 1. Table RLS Hardening (Restricting based on auth.uid())

-- Drop existing broad policies to replace with specific ones
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Define common policies for office collaboration (authenticated access)
-- Since it's a shared office environment, all authenticated users share data but must be valid users.

-- Leads Table
CREATE POLICY "Leads viewing" ON public.leads FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Leads inserting" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Leads updating" ON public.leads FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Leads deleting" ON public.leads FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Lead Logs Table
CREATE POLICY "Lead logs viewing" ON public.lead_logs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Lead logs inserting" ON public.lead_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Lead logs updating" ON public.lead_logs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Lead logs deleting" ON public.lead_logs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Config Escritorio Table
CREATE POLICY "Config access" ON public.config_escritorio FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Custos Escritorio Table
CREATE POLICY "Costs access" ON public.custos_escritorio FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Diagnosticos IA Table
CREATE POLICY "Diagnostics access" ON public.diagnosticos_ia FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Projetos Table
CREATE POLICY "Projects access" ON public.projetos FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Sessoes Horas Table
CREATE POLICY "Sessions access" ON public.sessoes_horas FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);


-- 2. Storage Security Hardening
-- Make assets bucket private
UPDATE storage.buckets SET public = false WHERE id = 'assets';

-- Secure storage objects
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public asset viewing" ON storage.objects;
    DROP POLICY IF EXISTS "Assets are publicly readable" ON storage.objects;
    DROP POLICY IF EXISTS "Give public read access to assets bucket" ON storage.objects;
    DROP POLICY IF EXISTS "Assets are public" ON storage.objects;
END $$;

CREATE POLICY "Authenticated users can access assets" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload assets" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assets' AND auth.uid() IS NOT NULL);
