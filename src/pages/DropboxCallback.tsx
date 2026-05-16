import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const DropboxCallback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log('DropboxCallback: Component mounted');
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');
    
    if (errorParam || errorDescription) {
      setError(errorDescription || errorParam || 'Erro retornado pelo Dropbox.');
      setLoading(false);
      return;
    }

    if (!code) {
      setError('Código de autorização não encontrado na URL.');
      setLoading(false);
      return;
    }

    const exchangeToken = async () => {
      try {
        const { data, error: functionError } = await supabase.functions.invoke('dropbox-auth', {
          body: { 
            code: code,
            redirect_uri: 'https://app.nl.arq.br/dropbox-callback'
          }
        });

        if (functionError) throw new Error(functionError.message || 'Erro ao comunicar com o servidor.');
        if (data?.error) throw new Error(data.error);

        setSuccess(true);
        setLoading(false);
        
        setTimeout(() => {
          navigate('/sistema/configuracoes');
        }, 2000);
      } catch (err: any) {
        console.error('DropboxCallback: Catch block error:', err);
        setError(err.message || 'Erro desconhecido ao conectar com o Dropbox.');
        setLoading(false);
      }
    };

    exchangeToken();
  }, [navigate]);

  return (
    <div style={{ 
      minHeight: '100 screen', 
      backgroundColor: '#0F0F0F', 
      color: 'white', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        {loading && (
          <div>
            <h1 style={{ fontSize: '24px' }}>Conectando ao Dropbox...</h1>
            <p style={{ opacity: 0.6 }}>Processando autorização</p>
          </div>
        )}

        {success && (
          <div style={{ color: '#4ade80' }}>
            <h1 style={{ fontSize: '24px' }}>Dropbox conectado com sucesso!</h1>
            <p style={{ color: 'white', opacity: 0.6 }}>Redirecionando...</p>
          </div>
        )}

        {error && (
          <div style={{ color: '#ef4444' }}>
            <h1 style={{ fontSize: '24px' }}>Erro na Conexão</h1>
            <p style={{ color: 'white', opacity: 0.8, marginBottom: '20px' }}>{error}</p>
            <button 
              onClick={() => navigate('/sistema/configuracoes')}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: 'rgba(255,255,255,0.1)', 
                color: 'white', 
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer'
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DropboxCallback;
