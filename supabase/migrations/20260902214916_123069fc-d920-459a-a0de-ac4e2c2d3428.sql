DROP POLICY IF EXISTS "Allow authenticated users to upload to documentos_projetos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read from documentos_projetos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from documentos_projetos" ON storage.objects;

CREATE OR REPLACE FUNCTION public.user_owns_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.projetos p
      WHERE p.id = p_project_id
        AND (
          p.criado_por = auth.uid()::text
          OR lower(p.criado_por) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_project_document(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.projetos p
      LEFT JOIN public.documentos d
        ON d.projeto_id = p.id
       AND (
         d.url = p_object_name
         OR d.url LIKE '%/' || p_object_name
         OR d.url LIKE '%' || replace(p_object_name, ' ', '%20') || '%'
       )
      LEFT JOIN public.documentos_checklist dc
        ON dc.projeto_id = p.id
       AND (
         dc.url_arquivo = p_object_name
         OR dc.url_arquivo LIKE '%/' || p_object_name
         OR dc.url_arquivo LIKE '%' || replace(p_object_name, ' ', '%20') || '%'
       )
      LEFT JOIN public.arquivos_projeto ap
        ON ap.projeto_id = p.id
       AND (
         ap.dropbox_path = p_object_name
         OR ap.dropbox_path LIKE '%/' || p_object_name
       )
      WHERE p.id::text = (storage.foldername(p_object_name))[1]
        AND (
          p.criado_por = auth.uid()::text
          OR lower(p.criado_por) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        )
        AND (d.id IS NOT NULL OR dc.id IS NOT NULL OR ap.id IS NOT NULL)
    );
$$;

REVOKE ALL ON FUNCTION public.user_owns_project(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_project_document(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_project(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_project_document(text) TO authenticated, service_role;

CREATE POLICY "Project owners can upload project documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos_projetos'
  AND public.user_owns_project(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Project owners can read linked project documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos_projetos'
  AND public.can_access_project_document(name)
);

CREATE POLICY "Project owners can delete linked project documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos_projetos'
  AND public.can_access_project_document(name)
);