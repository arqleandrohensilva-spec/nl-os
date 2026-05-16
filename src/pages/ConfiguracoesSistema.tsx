import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Settings2, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw,
  Box
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ConfiguracoesSistema = () => {
  const [dropboxStatus, setDropboxStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchDropboxStatus = async () => {
    setDropboxStatus('loading');
    try {
      const { data, error } = await supabase
        .from('dropbox_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error || !data || !data.refresh_token) {
        setDropboxStatus('disconnected');
      } else {
        setDropboxStatus('connected');
        setLastSync(new Date(data.updated_at).toLocaleString('pt-BR'));
      }
    } catch (err) {
      setDropboxStatus('disconnected');
    }
  };

  useEffect(() => {
    fetchDropboxStatus();
  }, []);

  const handleConnectDropbox = () => {
    const clientId = 'zjdj0yszvqy7wvz';
    const redirectUri = 'https://app.nl.arq.br/dropbox-callback';
    
    // Mostra loading imediatamente para dar feedback visual
    setDropboxStatus('loading');
    
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&token_access_type=offline`;
    
    // Usar window.top.location para evitar problemas de "Refused to connect" em iframes (como o preview)
    // Se estiver no domínio app.nl.arq.br, window.top é o próprio window.
    try {
      if (window.top) {
        window.top.location.href = authUrl;
      } else {
        window.location.href = authUrl;
      }
    } catch (e) {
      window.location.href = authUrl;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0F0F0F]">
      <Sidebar user={sessionStorage.getItem('nl_user') || 'Sócio'} />
      
      <main className="flex-1 pl-[230px]">
        <div className="p-12 max-w-5xl">
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-bronze/10 rounded-[1px]">
                <Settings2 size={20} className="text-bronze" />
              </div>
              <p className="text-[10px] text-bronze uppercase tracking-[0.4em] font-bold">Módulo 09 · Sistema</p>
            </div>
            <h1 className="text-4xl font-cormorant italic text-white">Configurações do Sistema</h1>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dropbox Card */}
            <div className="bg-white/[0.03] border border-white/5 p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Box size={80} className="text-white" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0061FF]/10 flex items-center justify-center rounded-[1px]">
                      <Box size={20} className="text-[#0061FF]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-[0.1em] uppercase">Dropbox</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">Armazenamento e Templates</p>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-[1px] border text-[9px] font-bold uppercase tracking-widest",
                    dropboxStatus === 'connected' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                    dropboxStatus === 'disconnected' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                    "bg-white/5 border-white/10 text-white/40"
                  )}>
                    {dropboxStatus === 'connected' ? (
                      <><CheckCircle2 size={10} /> Conectado</>
                    ) : dropboxStatus === 'disconnected' ? (
                      <><XCircle size={10} /> Desconectado</>
                    ) : (
                      <><RefreshCcw size={10} className="animate-spin" /> Verificando</>
                    )}
                  </div>
                </div>

                <p className="text-xs text-white/60 leading-relaxed mb-8 h-12">
                  Integração para geração automática de contratos a partir de templates DOCX e armazenamento organizado de documentos dos projetos.
                </p>

                {lastSync && (
                  <p className="text-[9px] text-white/20 uppercase tracking-widest mb-6 italic">
                    Última renovação de token: {lastSync}
                  </p>
                )}

                <Button
                  onClick={handleConnectDropbox}
                  variant="outline"
                  className={cn(
                    "w-full h-12 border-white/10 rounded-[2px] bg-white/[0.02] hover:bg-white/5 text-[10px] uppercase tracking-[0.2em] font-bold transition-all",
                    dropboxStatus === 'connected' ? "text-white/40" : "text-white"
                  )}
                >
                  <RefreshCcw size={14} className="mr-2" />
                  {dropboxStatus === 'connected' ? 'Reconectar Dropbox' : 'Conectar Dropbox'}
                </Button>
              </div>
            </div>

            {/* Outras Configs (Placeholder) */}
            <div className="bg-white/[0.01] border border-white/5 p-8 opacity-40">
              <h3 className="text-sm font-bold text-white/60 tracking-[0.1em] uppercase mb-4 italic">Outras Integrações</h3>
              <div className="space-y-4">
                <div className="h-4 w-3/4 bg-white/5 animate-pulse" />
                <div className="h-4 w-1/2 bg-white/5 animate-pulse" />
                <div className="h-4 w-2/3 bg-white/5 animate-pulse" />
              </div>
              <p className="mt-8 text-[9px] text-white/20 uppercase tracking-widest italic">Expansão em breve...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConfiguracoesSistema;
