-- Drop existing "Anyone can" policies
DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can update leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can delete leads" ON public.leads;

DROP POLICY IF EXISTS "Anyone can view lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Anyone can insert lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Anyone can update lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Anyone can delete lead_logs" ON public.lead_logs;

-- Create secure policies for authenticated users
CREATE POLICY "Authenticated users can view leads" ON public.leads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leads" ON public.leads
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete leads" ON public.leads
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view lead_logs" ON public.lead_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert lead_logs" ON public.lead_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update lead_logs" ON public.lead_logs
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete lead_logs" ON public.lead_logs
  FOR DELETE TO authenticated USING (true);
