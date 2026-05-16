ALTER TABLE public.pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_dropbox_path TEXT;