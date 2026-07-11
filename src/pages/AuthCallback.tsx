import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Rota de conveniência: recebe uma sessão vinda do NL OS HUB
 * (mesmo Supabase) via access_token / refresh_token na URL e
 * estabelece a sessão local sem exigir novo login.
 *
 * Não altera o fluxo normal de login (e-mail/senha, esqueci senha).
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Tokens podem vir na query (?access_token=...) ou no hash (#access_token=...)
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      const accessToken = search.get('access_token') || hash.get('access_token');
      const refreshToken = search.get('refresh_token') || hash.get('refresh_token');

      // Limpa a URL imediatamente para não expor os tokens na barra de
      // endereço nem salvá-los no histórico do navegador.
      window.history.replaceState({}, document.title, '/auth/callback');

      if (!accessToken || !refreshToken) {
        if (!cancelled) navigate('/login', { replace: true });
        return;
      }

      try {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (cancelled) return;

        if (sessionError || !data.session) {
          navigate('/login', { replace: true });
          return;
        }

        navigate('/dashboard', { replace: true });
      } catch {
        if (!cancelled) {
          setError(true);
          navigate('/login', { replace: true });
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-bronze/20 border-t-bronze rounded-full animate-spin" />
        <p className="text-[10px] uppercase tracking-widest text-black/40">
          {error ? 'Redirecionando...' : 'Autenticando...'}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
