import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const DropboxCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processando autorização...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error(`Erro na autorização do Dropbox: ${error}`);
      navigate('/sistema/configuracoes');
      return;
    }

    if (!code) {
      toast.error('Código de autorização não encontrado');
      navigate('/sistema/configuracoes');
      return;
    }

    const exchangeToken = async () => {
      try {
        const { data, error: functionError } = await supabase.functions.invoke('dropbox-auth', {
          body: { action: 'exchange_token', code }
        });

        if (functionError || data.error) {
          throw new Error(data?.error || functionError?.message || 'Erro ao trocar código por token');
        }

        toast.success('Dropbox conectado com sucesso!');
        navigate('/sistema/configuracoes');
      } catch (err: any) {
        console.error('Error exchanging token:', err);
        toast.error(`Erro: ${err.message}`);
        setStatus('Erro ao conectar. Redirecionando...');
        setTimeout(() => navigate('/sistema/configuracoes'), 3000);
      }
    };

    exchangeToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center text-white p-4">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="w-16 h-16 bg-bronze/10 rounded-full flex items-center justify-center">
          <Loader2 className="text-bronze animate-spin" size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-cormorant italic">Conectando ao Dropbox</h1>
          <p className="text-white/40 text-sm uppercase tracking-[0.2em] font-bold">
            {status}
          </p>
        </div>
        <p className="text-white/20 text-[10px] leading-relaxed">
          Estamos configurando sua conta para garantir que todos os documentos e contratos sejam gerados e armazenados com segurança.
        </p>
      </div>
    </div>
  );
};

export default DropboxCallback;
