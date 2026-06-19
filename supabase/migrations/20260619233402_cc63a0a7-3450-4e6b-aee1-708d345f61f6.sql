CREATE POLICY "Anyone can upload briefing attachments"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'briefing-anexos');

CREATE POLICY "Anyone can read briefing attachments"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'briefing-anexos');