import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function DropboxCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    console.log("DropboxCallback: Iniciando captura de código...");
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (error) {
      console.error("DropboxCallback Error:", error, errorDescription);
      setStatus('error');
      setErrorMsg(errorDescription || error);
      return;
    }

    if (!code) {
      console.error("DropboxCallback: Nenhum código encontrado na URL");
      setStatus('error');
      setErrorMsg('Código de autorização não encontrado na URL.');
      return;
    }

    console.log("DropboxCallback: Código encontrado, chamando edge function...");

    supabase.functions.invoke('dropbox-auth', {
      body: { 
        code, 
        redirect_uri: 'https://app.nl.arq.br/dropbox-callback' 
      }
    }).then(({ data, error: invokeError }) => {
      if (invokeError) {
        console.error("DropboxCallback: Erro ao invocar função:", invokeError);
        setStatus('error');
        setErrorMsg(invokeError.message || 'Erro ao processar autenticação');
      } else if (!data?.success) {
        console.error("DropboxCallback: Função retornou erro:", data);
        setStatus('error');
        setErrorMsg(data?.error || 'Erro desconhecido retornado pela função');
      } else {
        console.log("DropboxCallback: Sucesso!");
        setStatus('success');
        setTimeout(() => {
          if (window.opener) {
            try {
              window.opener.location.reload();
              window.close();
            } catch (e) {
              console.error("Não foi possível fechar a janela ou recarregar opener", e);
              navigate('/sistema/configuracoes');
            }
          } else {
            navigate('/sistema/configuracoes');
          }
        }, 2000);
      }
    }).catch((err) => {
      console.error("DropboxCallback: Erro inesperado:", err);
      setStatus('error');
      setErrorMsg(err.message || 'Erro inesperado no cliente');
    });
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      background: '#0F0F0F', 
      color: '#FFFFFF', 
      fontFamily: 'Inter, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 24, marginBottom: 16, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif' }}>
              Conectando ao Dropbox...
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              Aguarde enquanto processamos sua autorização
            </div>
            <div style={{ marginTop: 24, height: '2px', background: 'rgba(255,255,255,0.1)', width: '100%', position: 'relative', overflow: 'hidden' }}>
              <div style={{ 
                position: 'absolute', 
                height: '100%', 
                background: '#8B7355', 
                width: '30%', 
                left: '-30%',
                animation: 'loading-bar 1.5s infinite linear'
              }} />
            </div>
            <style>{`
              @keyframes loading-bar {
                0% { left: -30%; width: 30%; }
                50% { width: 60%; }
                100% { left: 100%; width: 30%; }
              }
            `}</style>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div style={{ fontSize: 24, marginBottom: 16, color: '#8B7355', fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif' }}>
              ✓ Dropbox Conectado!
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              Sua conta foi vinculada com sucesso. Redirecionando...
            </div>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div style={{ fontSize: 24, marginBottom: 16, color: '#FF4D4D', fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif' }}>
              Falha na Conexão
            </div>
            <div style={{ 
              background: 'rgba(255,77,77,0.05)', 
              border: '1px solid rgba(255,77,77,0.1)', 
              padding: '16px', 
              borderRadius: '2px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
              marginBottom: 24,
              wordBreak: 'break-word'
            }}>
              {errorMsg}
            </div>
            <button 
              onClick={() => navigate('/sistema/configuracoes')} 
              style={{ 
                padding: '12px 24px', 
                background: 'transparent', 
                color: '#FFF', 
                border: '1px solid rgba(255,255,255,0.2)', 
                cursor: 'pointer',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                fontWeight: 'bold',
                transition: 'margin 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Voltar às Configurações
            </button>
          </>
        )}
      </div>
    </div>
  );
}