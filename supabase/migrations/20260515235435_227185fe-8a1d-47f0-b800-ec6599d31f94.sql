-- Create table for Dropbox settings
CREATE TABLE IF NOT EXISTS public.dropbox_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dropbox_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can manage these settings
CREATE POLICY "Users can view dropbox settings" ON public.dropbox_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert/update dropbox settings" ON public.dropbox_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE TRIGGER update_dropbox_settings_updated_at
BEFORE UPDATE ON public.dropbox_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();