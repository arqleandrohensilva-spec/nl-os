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
  Search,
  Box,
  ClipboardList,
  Star,
  MessageSquare,
  Copy,
  Link2,
  Layout,
  FileText,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const iconMap: Record<string, any> = {
  ClipboardList,
  Star,
  MessageCircle: MessageSquare,
  MessageSquare,
  Instagram: Link2,
  Link2
};

const UsefulLinks = () => {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracoes')
          .select('value')
          .eq('key', 'links_uteis')
          .maybeSingle();
        
        if (data && data.value) {
          setLinks(data.value as any[]);
        }
      } catch (err) {
        console.error("Erro ao carregar links:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLinks();
  }, []);

  const updateLink = async (id: string, newUrl: string) => {
    const updatedLinks = links.map(link => 
      link.id === id ? { ...link, url: newUrl } : link
    );
    setLinks(updatedLinks);

    const { error } = await supabase
      .from('configuracoes')
      .update({ value: updatedLinks })
      .eq('key', 'links_uteis');

    if (error) {
      toast.error("Erro ao salvar link");
    }
  };

  const copyToClipboard = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link copiado", { 
      duration: 2000,
      style: {
        background: '#1A1816',
        border: '1px solid #8B7355',
        color: '#E8E4DF'
      }
    });
  };

  if (loading || links.length === 0) return null;

  return (
    <section className="mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
      <header className="mb-8 border-b border-white/5 pb-4">
        <p className="font-mono text-[10px] text-bronze uppercase tracking-[0.5em] font-bold">LINKS ÚTEIS</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {links.map((link) => {
          const IconComponent = iconMap[link.icon] || Link2;
          return (
            <div 
              key={link.id}
              className="bg-[#1A1816] border border-[#2A2A2A] p-6 hover:border-bronze transition-all flex items-start gap-4 group rounded-[1px]"
            >
              <div className="p-3 bg-white/5 text-bronze rounded-[1px] group-hover:bg-bronze/10 transition-colors">
                <IconComponent size={18} />
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-white tracking-[0.1em] uppercase">{link.label}</h4>
                  <button 
                    onClick={() => copyToClipboard(link.url)}
                    className="text-[9px] font-bold text-bronze border border-bronze/30 px-3 py-1 uppercase tracking-widest hover:bg-bronze hover:text-black transition-all flex items-center gap-2"
                  >
                    <Copy size={10} />
                    COPIAR
                  </button>
                </div>
                
                {link.editable ? (
                  <input 
                    type="text"
                    value={link.url}
                    onChange={(e) => {
                      const newLinks = links.map(l => l.id === link.id ? { ...l, url: e.target.value } : l);
                      setLinks(newLinks);
                    }}
                    onBlur={(e) => updateLink(link.id, e.target.value)}
                    placeholder="Clique para inserir a URL"
                    className="w-full bg-transparent border-none p-0 text-[11px] text-white/40 focus:text-white/80 focus:ring-0 placeholder:text-white/10 italic transition-colors"
                  />
                ) : (
                  <p className="text-[11px] text-white/40 italic font-medium">{link.url}</p>
                )}
                
                <p className="text-[9px] text-white/20 uppercase tracking-widest">{link.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const ConfiguracoesSistema = () => {
  const [dropboxStatus, setDropboxStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [contractTemplatePath, setContractTemplatePath] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [originalTemplatePath, setOriginalTemplatePath] = useState('');
  const [vendorTemplatePath, setVendorTemplatePath] = useState('');
  const [originalVendorPath, setOriginalVendorPath] = useState('');
  const [templateStatus, setTemplateStatus] = useState<'found' | 'not_found' | 'checking' | 'idle'>('idle');
  const [vendorStatus, setVendorStatus] = useState<'found' | 'not_found' | 'checking' | 'idle'>('idle');

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
        const path = (data as any).contract_template_path || '/NL Arquitetos/07 - Projetos NL OS/00 - Templates/NL_Contrato_Final.docx';
        setContractTemplatePath(path);
        setOriginalTemplatePath(path);
        checkTemplateExists(path);
      }


    } catch (err) {
      setDropboxStatus('disconnected');
    }
  };

  useEffect(() => {
    fetchDropboxStatus();
  }, []);

  const checkTemplateExists = async (path: string) => {
    if (!path || dropboxStatus !== 'connected') return;
    
    setTemplateStatus('checking');
    try {
      const response = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'get_metadata', path }
      });
      
      if (response.data && !response.data.error) {
        setTemplateStatus('found');
      } else {
        setTemplateStatus('not_found');
      }
    } catch (err) {
      setTemplateStatus('not_found');
    }
  };

  const handleConnectDropbox = () => {
    const clientId = 'zjdj0yszvqy7wvz';
    const redirectUri = 'https://app.nl.arq.br/dropbox-callback';
    
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&token_access_type=offline`;
    
    // Tenta abrir em nova aba
    const newWindow = window.open(authUrl, '_blank');
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Se o bloqueador de popup estiver ativo, redireciona na mesma aba
      toast.warning("O bloqueador de popups impediu a abertura automática. Redirecionando nesta aba...");
      setTimeout(() => {
        window.location.href = authUrl;
      }, 2000);
    } else {
      toast.info("Uma nova aba foi aberta para autorização do Dropbox.");
      setDropboxStatus('loading');
      setTimeout(fetchDropboxStatus, 15000);
    }
  };

  const handleSaveTemplatePath = async () => {
    if (contractTemplatePath === originalTemplatePath) return;
    
    setIsSavingTemplate(true);
    try {
      const { error } = await supabase
        .from('dropbox_settings')
        .update({ contract_template_path: contractTemplatePath } as any)
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;
      
      setOriginalTemplatePath(contractTemplatePath);
      toast.success("Caminho do template atualizado!");
    } catch (err) {
      console.error("Erro ao salvar template:", err);
      toast.error("Erro ao salvar o caminho do template");
    } finally {
      setIsSavingTemplate(false);
    }
  };


  return (
    <div className="flex min-h-screen bg-[#0F0F0F]">
      <Sidebar user={sessionStorage.getItem('nl_user') || 'Sócio'} />
      
      <main className="flex-1 ml-[230px]">
        <div className="p-12 max-w-5xl">
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-bronze/10 rounded-[1px]">
                <Settings2 size={20} className="text-bronze" />
              </div>
              <p className="text-[10px] text-bronze uppercase tracking-[0.4em] font-bold">Módulo Administrativo · Sistema</p>
            </div>
            <h1 className="text-4xl font-cormorant italic text-white">Configurações do Sistema</h1>
          </header>
          <UsefulLinks />

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

            {/* Contract Template Card */}
            <div className="bg-white/[0.03] border border-white/5 p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileText size={80} className="text-white" />
              </div>

              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-bronze/10 flex items-center justify-center rounded-[1px]">
                      <FileText size={20} className="text-bronze" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-[0.1em] uppercase">Template do Contrato</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">Caminho do arquivo no Dropbox</p>
                    </div>
                  </div>

                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-[1px] border text-[9px] font-bold uppercase tracking-widest",
                    templateStatus === 'found' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                    templateStatus === 'not_found' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                    "bg-white/5 border-white/10 text-white/40"
                  )}>
                    {templateStatus === 'found' ? (
                      <><CheckCircle2 size={10} /> Arquivo Localizado</>
                    ) : templateStatus === 'not_found' ? (
                      <><XCircle size={10} /> Não Encontrado</>
                    ) : templateStatus === 'checking' ? (
                      <><RefreshCcw size={10} className="animate-spin" /> Verificando</>
                    ) : (
                      <><RefreshCcw size={10} /> Aguardando</>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Caminho Completo (.docx)</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={contractTemplatePath}
                        onChange={(e) => setContractTemplatePath(e.target.value)}
                        placeholder="/NL Arquitetos/..."
                        className="bg-black/40 border-white/10 rounded-[1px] text-[11px] text-white focus:ring-bronze h-11"
                      />
                      <Button 
                        variant="outline"
                        size="icon"
                        onClick={() => checkTemplateExists(contractTemplatePath)}
                        className="h-11 w-11 border-white/10 bg-white/5 hover:bg-white/10"
                        title="Verificar arquivo agora"
                      >
                        <Search size={16} className="text-white/60" />
                      </Button>
                    </div>
                    <p className="text-[9px] text-white/20 italic">Certifique-se de que o arquivo contenha as tags {`{nome_cliente}`}, {`{valor_total}`}, etc.</p>
                  </div>

                  <Button
                    onClick={async () => {
                      await handleSaveTemplatePath();
                      checkTemplateExists(contractTemplatePath);
                    }}
                    disabled={isSavingTemplate || contractTemplatePath === originalTemplatePath}
                    className="w-full h-12 rounded-[2px] bg-bronze hover:bg-bronze/80 text-white text-[10px] uppercase tracking-[0.2em] font-bold transition-all"
                  >
                    {isSavingTemplate ? <RefreshCcw size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                    Salvar Configuração
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

  );
};

export default ConfiguracoesSistema;
