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

        // Type cast or access property safely
        const project = data as any;

        if (error || !project || !project.slug_cliente) {
          console.log('Redirecionando via token:', token);
          navigate(`/cliente/${token}`, { replace: true });
          return;
        }

        console.log('Redirecionando via slug:', project.slug_cliente);
        navigate(`/cliente/${project.slug_cliente}`, { replace: true });
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
