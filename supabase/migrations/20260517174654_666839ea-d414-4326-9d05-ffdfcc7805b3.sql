-- Fix the function used by the trigger
CREATE OR REPLACE FUNCTION public.handle_project_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Using status_geral instead of status, and nome_cliente instead of cliente
    IF (NEW.status_geral = 'concluido' AND (OLD.status_geral IS NULL OR OLD.status_geral != 'concluido')) THEN
        INSERT INTO public.pesquisas_satisfacao (projeto_id, cliente_nome, token, status)
        VALUES (NEW.id, NEW.nome_cliente, encode(gen_random_bytes(12), 'hex'), 'ENVIADA');
    END IF;
    RETURN NEW;
END;
$function$;

-- Update Julia Ferreira's project with the slug
UPDATE public.projetos 
SET slug_cliente = 'julia-ferreira'
WHERE nome_cliente ILIKE '%Julia Ferreira%';