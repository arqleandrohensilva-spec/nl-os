DROP POLICY IF EXISTS "Token scoped briefing attachment read" ON storage.objects;
CREATE POLICY "Authenticated staff read briefing attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'briefing-anexos');