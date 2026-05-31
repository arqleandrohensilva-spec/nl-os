ALTER TABLE public.dropbox_settings ADD COLUMN IF NOT EXISTS contract_template_path TEXT DEFAULT '/NL Arquitetos/07 - Projetos NL OS/00 - Templates/NL_Contrato_Final.docx';

-- No need for new GRANTs as we're adding a column to an existing table that should already have them.
-- But let's be safe and ensure service_role can see it for the edge function.
GRANT SELECT, UPDATE ON public.dropbox_settings TO service_role;
GRANT SELECT, UPDATE ON public.dropbox_settings TO authenticated;
