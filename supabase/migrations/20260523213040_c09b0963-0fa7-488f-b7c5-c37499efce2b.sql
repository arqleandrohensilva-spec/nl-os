CREATE OR REPLACE FUNCTION public.get_document_link_by_token(p_token text)
RETURNS SETOF public.documento_links
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM documento_links WHERE token = p_token;
$$;
