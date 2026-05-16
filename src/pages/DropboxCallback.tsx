import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function DropboxCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    
    if (!code) {
      setStatus('error');
      setErrorMsg('Código de autorização não encontrado na URL.');
      return;
    }

    supabase.functions.invoke('dropbox-auth', {
      body: { code, redirect_uri: 'https://app.nl.arq.br/dropbox-callback' }
    }).then(({ data, error }) => {
      if (error || !data?.success) {
        setStatus('error');
        setErrorMsg(error?.message || data?.error || 'Erro desconhecido');
      } else {
        setStatus('success');
        setTimeout(() => {
          if (window.opener) {
            // Se foi aberto em uma nova aba (popup), avisa a aba principal e fecha
            try {
              window.opener.location.reload();
            } catch (e) {
              console.error("Não foi possível recarregar a aba principal", e);
            }
            window.close();
          } else {
            navigate('/sistema/configuracoes');
          }
        }, 2000);
      }
    }).catch((err) => {
      setStatus('error');
      setErrorMsg(err.message || 'Erro inesperado');
    });
  }, [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1A1816', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
      {status === 'loading' && (
        <>
          <div style={{ fontSize: 24, marginBottom: 16 }}>Conectando ao Dropbox...</div>
          <div style={{ color: '#777' }}>Aguarde um momento.</div>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: 24, marginBottom: 16, color: '#8B7355' }}>✓ Dropbox conectado!</div>
          <div style={{ color: '#777' }}>Redirecionando...</div>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: 24, marginBottom: 16, color: '#8B2020' }}>Erro ao conectar</div>
          <div style={{ color: '#777', marginBottom: 24 }}>{errorMsg}</div>
          <button onClick={() => navigate('/sistema/configuracoes')} style={{ padding: '12px 24px', background: '#8B7355', color: '#FFF', border: 'none', cursor: 'pointer' }}>
            Voltar às Configurações
          </button>
        </>
      )}
    </div>
  );
}
