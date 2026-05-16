import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center text-white p-4">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        {loading && (
          <div className="flex flex-col items-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-bronze/10 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="text-bronze animate-spin" size={32} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-cormorant italic">Conectando ao Dropbox...</h1>
              <p className="text-white/40 text-sm uppercase tracking-[0.2em] font-bold">
                Processando autorização
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="text-green-500" size={32} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-cormorant italic">Dropbox conectado com sucesso!</h1>
              <p className="text-white/40 text-sm">
                Redirecionando para as configurações...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <div className="space-y-2 mb-6">
              <h1 className="text-2xl font-cormorant italic text-red-500">Erro na Conexão</h1>
              <p className="text-white/60 text-sm">
                {error}
              </p>
            </div>
            <Button 
              onClick={() => navigate('/sistema/configuracoes')}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        )}

        <p className="text-white/20 text-[10px] leading-relaxed mt-8 max-w-[300px]">
          Estamos configurando sua conta para garantir que todos os documentos e contratos sejam gerados e armazenados com segurança no NL OS.
        </p>
      </div>
    </div>
  );
};

export default DropboxCallback;
