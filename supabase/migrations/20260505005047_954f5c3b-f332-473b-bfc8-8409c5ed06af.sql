INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Assets are public" ON storage.objects FOR SELECT USING (bucket_id = 'assets');