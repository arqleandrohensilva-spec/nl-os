-- assets
DROP POLICY IF EXISTS "Authenticated users can access assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
CREATE POLICY "Authenticated users can access assets" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'assets' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can upload assets" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assets' AND auth.uid() IS NOT NULL);

-- briefing-anexos
DROP POLICY IF EXISTS "Token scoped briefing attachment upload" ON storage.objects;
DROP POLICY IF EXISTS "Token scoped briefing attachment read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated staff delete briefing attachments" ON storage.objects;
CREATE POLICY "Token scoped briefing attachment upload"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'briefing-anexos'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM public.briefings b WHERE b.token = (storage.foldername(name))[1])
    OR EXISTS (
      SELECT 1 FROM public.projetos p
      WHERE p.token_cliente = (storage.foldername(name))[1]
         OR p.slug_cliente = (storage.foldername(name))[1]
    )
  )
);
CREATE POLICY "Token scoped briefing attachment read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'briefing-anexos'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM public.briefings b WHERE b.token = (storage.foldername(name))[1])
    OR EXISTS (
      SELECT 1 FROM public.projetos p
      WHERE p.token_cliente = (storage.foldername(name))[1]
         OR p.slug_cliente = (storage.foldername(name))[1]
    )
  )
);
CREATE POLICY "Authenticated staff delete briefing attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'briefing-anexos');

-- mkt-biblioteca-visual
DROP POLICY IF EXISTS "Authenticated manage mkt visual library" ON storage.objects;
CREATE POLICY "Authenticated manage mkt visual library"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'mkt-biblioteca-visual' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'mkt-biblioteca-visual' AND auth.uid() IS NOT NULL);

-- documentos_projetos
DROP POLICY IF EXISTS "Project owners can upload project documents" ON storage.objects;
DROP POLICY IF EXISTS "Project owners can read linked project documents" ON storage.objects;
DROP POLICY IF EXISTS "Project owners can delete linked project documents" ON storage.objects;
CREATE POLICY "Project owners can upload project documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos_projetos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.projetos p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND (p.criado_por = auth.uid()::text OR lower(p.criado_por) = lower(COALESCE(auth.jwt() ->> 'email', '')))
    )
  )
);
CREATE POLICY "Project owners can read linked project documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos_projetos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.projetos p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND (p.criado_por = auth.uid()::text OR lower(p.criado_por) = lower(COALESCE(auth.jwt() ->> 'email', '')))
        AND (
          EXISTS (SELECT 1 FROM public.documentos d WHERE d.projeto_id = p.id AND (d.url = name OR d.url LIKE '%/' || name OR d.url LIKE '%' || replace(name, ' ', '%20') || '%'))
          OR EXISTS (SELECT 1 FROM public.documentos_checklist dc WHERE dc.projeto_id = p.id AND (dc.url_arquivo = name OR dc.url_arquivo LIKE '%/' || name OR dc.url_arquivo LIKE '%' || replace(name, ' ', '%20') || '%'))
          OR EXISTS (SELECT 1 FROM public.arquivos_projeto ap WHERE ap.projeto_id = p.id AND (ap.dropbox_path = name OR ap.dropbox_path LIKE '%/' || name))
        )
    )
  )
);
CREATE POLICY "Project owners can delete linked project documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos_projetos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.projetos p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND (p.criado_por = auth.uid()::text OR lower(p.criado_por) = lower(COALESCE(auth.jwt() ->> 'email', '')))
        AND (
          EXISTS (SELECT 1 FROM public.documentos d WHERE d.projeto_id = p.id AND (d.url = name OR d.url LIKE '%/' || name OR d.url LIKE '%' || replace(name, ' ', '%20') || '%'))
          OR EXISTS (SELECT 1 FROM public.documentos_checklist dc WHERE dc.projeto_id = p.id AND (dc.url_arquivo = name OR dc.url_arquivo LIKE '%/' || name OR dc.url_arquivo LIKE '%' || replace(name, ' ', '%20') || '%'))
          OR EXISTS (SELECT 1 FROM public.arquivos_projeto ap WHERE ap.projeto_id = p.id AND (ap.dropbox_path = name OR ap.dropbox_path LIKE '%/' || name))
        )
    )
  )
);