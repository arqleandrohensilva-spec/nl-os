DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='dropbox_settings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.dropbox_settings', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public.dropbox_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.dropbox_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropbox_settings TO authenticated;
GRANT ALL ON public.dropbox_settings TO service_role;

CREATE POLICY "Admins can manage dropbox settings"
ON public.dropbox_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));