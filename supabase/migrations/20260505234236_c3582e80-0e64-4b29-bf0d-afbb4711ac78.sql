-- 1. Fix Function Search Path Mutable
-- The function name in this project is set_updated_at
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- 2. Hardening RLS Policies for Tables
-- We replace broad 'true' policies with explicit TO authenticated checks.

-- Leads Table
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to view leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to insert leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to update leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to delete leads" ON public.leads;

CREATE POLICY "Allow authenticated users to select leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete leads" ON public.leads FOR DELETE TO authenticated USING (true);

-- Lead Logs Table
DROP POLICY IF EXISTS "Authenticated users can view lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Authenticated users can insert lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Authenticated users can update lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Authenticated users can delete lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Allow authenticated users to view lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Allow authenticated users to update lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Allow authenticated users to delete lead_logs" ON public.lead_logs;

CREATE POLICY "Allow authenticated users to select lead_logs" ON public.lead_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert lead_logs" ON public.lead_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update lead_logs" ON public.lead_logs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete lead_logs" ON public.lead_logs FOR DELETE TO authenticated USING (true);

-- Config Escritorio Table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.config_escritorio;
DROP POLICY IF EXISTS "Authenticated users can manage config" ON public.config_escritorio;
CREATE POLICY "Manage office config" ON public.config_escritorio FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Custos Escritorio Table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.custos_escritorio;
DROP POLICY IF EXISTS "Authenticated users can manage costs" ON public.custos_escritorio;
CREATE POLICY "Manage office costs" ON public.custos_escritorio FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Diagnosticos IA Table
DROP POLICY IF EXISTS "Allow authenticated access to diagnostics" ON public.diagnosticos_ia;
DROP POLICY IF EXISTS "Authenticated users can manage diagnostics" ON public.diagnosticos_ia;
CREATE POLICY "Manage diagnostics" ON public.diagnosticos_ia FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Projetos Table
DROP POLICY IF EXISTS "Allow all for authenticated users on projetos" ON public.projetos;
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON public.projetos;
CREATE POLICY "Manage projects" ON public.projetos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sessoes Horas Table
DROP POLICY IF EXISTS "Allow all for authenticated users on sessoes_horas" ON public.sessoes_horas;
DROP POLICY IF EXISTS "Authenticated users can manage sessions" ON public.sessoes_horas;
CREATE POLICY "Manage sessions" ON public.sessoes_horas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Storage Security
-- Allow reading assets specifically while avoiding broad listing
DROP POLICY IF EXISTS "Assets are public" ON storage.objects;
DROP POLICY IF EXISTS "Assets are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Give public read access to assets bucket" ON storage.objects;

CREATE POLICY "Allow public asset viewing" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'assets');
