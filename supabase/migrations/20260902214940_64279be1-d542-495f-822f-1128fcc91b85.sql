DROP POLICY IF EXISTS "Project owners can upload project documents" ON storage.objects;
DROP POLICY IF EXISTS "Project owners can read linked project documents" ON storage.objects;
DROP POLICY IF EXISTS "Project owners can delete linked project documents" ON storage.objects;

DROP FUNCTION IF EXISTS public.can_access_project_document(text);
DROP FUNCTION IF EXISTS public.user_owns_project(uuid);

CREATE POLICY "Project owners can upload project documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos_projetos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.projetos p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND (
          p.criado_por = auth.uid()::text
          OR lower(p.criado_por) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
    )
  )
);

CREATE POLICY "Project owners can read linked project documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos_projetos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.projetos p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND (
          p.criado_por = auth.uid()::text
          OR lower(p.criado_por) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
        AND (
          EXISTS (
            SELECT 1 FROM public.documentos d
            WHERE d.projeto_id = p.id
              AND (d.url = name OR d.url LIKE '%/' || name OR d.url LIKE '%' || replace(name, ' ', '%20') || '%')
          )
          OR EXISTS (
            SELECT 1 FROM public.documentos_checklist dc
            WHERE dc.projeto_id = p.id
              AND (dc.url_arquivo = name OR dc.url_arquivo LIKE '%/' || name OR dc.url_arquivo LIKE '%' || replace(name, ' ', '%20') || '%')
          )
          OR EXISTS (
            SELECT 1 FROM public.arquivos_projeto ap
            WHERE ap.projeto_id = p.id
              AND (ap.dropbox_path = name OR ap.dropbox_path LIKE '%/' || name)
          )
        )
    )
  )
);

CREATE POLICY "Project owners can delete linked project documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos_projetos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.projetos p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND (
          p.criado_por = auth.uid()::text
          OR lower(p.criado_por) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
        AND (
          EXISTS (
            SELECT 1 FROM public.documentos d
            WHERE d.projeto_id = p.id
              AND (d.url = name OR d.url LIKE '%/' || name OR d.url LIKE '%' || replace(name, ' ', '%20') || '%')
          )
          OR EXISTS (
            SELECT 1 FROM public.documentos_checklist dc
            WHERE dc.projeto_id = p.id
              AND (dc.url_arquivo = name OR dc.url_arquivo LIKE '%/' || name OR dc.url_arquivo LIKE '%' || replace(name, ' ', '%20') || '%')
          )
          OR EXISTS (
            SELECT 1 FROM public.arquivos_projeto ap
            WHERE ap.projeto_id = p.id
              AND (ap.dropbox_path = name OR ap.dropbox_path LIKE '%/' || name)
          )
        )
    )
  )
);