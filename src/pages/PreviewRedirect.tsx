import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function PreviewRedirect() {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    async function redirect() {
      if (!token) {
        navigate('/404', { replace: true });
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('get_project_by_token_or_slug', { p_val: token })
          .maybeSingle();

        if (error || !data || !data.slug) {
          console.error('Projeto não encontrado para o token:', token, error);
          // Fallback: se não encontrar o slug mas o token existir, tenta abrir direto no /cliente/:token
          // pois a PaginaCliente também aceita token.
          navigate(`/cliente/${token}`, { replace: true });
          return;
        }

        navigate(`/cliente/${data.slug}`, { replace: true });
      } catch (err) {
        console.error('Erro ao redirecionar:', err);
        navigate(`/cliente/${token}`, { replace: true });
      }
    }

    redirect();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="animate-pulse text-white/20 font-cormorant text-2xl italic tracking-widest uppercase">
        NL ARQUITETOS
      </div>
    </div>
  );
}
