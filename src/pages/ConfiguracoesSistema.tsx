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
  Save,
  DollarSign,
  UserPlus,
  ArrowUpRight,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const ProjetosModelo = () => {
  const [modelos, setModelos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchModelos = async () => {
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .ilike('nome', '[MODELO]%');
      
      console.log('Modelos encontrados:', data, error);
      if (data) setModelos(data);
    } catch (err) {
      console.error("Erro ao carregar modelos:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome');
      if (data) setClientes(data);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    }
  };

  useEffect(() => {
    fetchModelos();
    fetchClientes();
  }, []);

  const criarProjetosModelo = async () => {
    setIsCreating(true);
    const modelosNovos = [
      { nome: '[MODELO] ARQ+INT', tipo: 'ARQ+INT', cidade: 'São José dos Campos', area_m2: 250, status_geral: 'em_andamento' },
      { nome: '[MODELO] Interiores', tipo: 'Interiores', cidade: 'São José dos Campos', area_m2: 120, status_geral: 'em_andamento' },
      { nome: '[MODELO] Comercial', tipo: 'Comercial', cidade: 'São José dos Campos', area_m2: 180, status_geral: 'em_andamento' },
    ];

    try {
      for (const modelo of modelosNovos) {
        const token = Math.random().toString(36).substring(2, 14);
        await supabase.from('projetos').insert({
          ...modelo,
          token_cliente: token,
          nome_cliente: 'Modelo de Teste',
        });
      }
      toast.success("Projetos modelo criados com sucesso!");
      fetchModelos();
    } catch (err) {
      console.error("Erro ao criar modelos:", err);
      toast.error("Erro ao criar projetos modelo");
    } finally {
      setIsCreating(false);
    }
  };

  const vincularACliente = async (projetoId: string, clienteId: string, nomeAtual: string) => {
    try {
      const novoNome = nomeAtual.replace('[MODELO] ', '');
      const { error } = await supabase
        .from('projetos')
        .update({ 
          cliente_id: clienteId,
          nome: novoNome 
        })
        .eq('id', projetoId);

      if (error) throw error;
      toast.success("Projeto vinculado ao cliente com sucesso!");
      fetchModelos();
    } catch (err) {
      console.error("Erro ao vincular cliente:", err);
      toast.error("Erro ao vincular cliente ao projeto");
    }
  };

  const copyBriefingLink = (token: string) => {
    const url = `${window.location.origin}/briefing-completo/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link do briefing copiado!");
  };

  const abrirPortal = (token: string) => {
    window.open(`/portal-cliente/${token}`, '_blank');
  };

  const abrirBriefing = (token: string) => {
    window.open(`/briefing-completo/${token}`, '_blank');
  };

  if (loading) return null;

  return (
    <section className="mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
      <header className="mb-8 border-b border-white/5 pb-4 flex justify-between items-center">
        <p className="font-mono text-[10px] text-bronze uppercase tracking-[0.5em] font-bold">PROJETOS MODELO</p>
        {modelos.length === 0 && (
          <Button 
            onClick={criarProjetosModelo}
            disabled={isCreating}
            className="h-8 bg-bronze hover:bg-bronze/80 text-black text-[9px] uppercase tracking-widest font-bold px-4 rounded-[1px]"
          >
            {isCreating ? <RefreshCcw size={12} className="animate-spin mr-2" /> : <Layout size={12} className="mr-2" />}
            Criar Projetos Modelo
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modelos.map((modelo) => (
          <div key={modelo.id} className="bg-[#1A1816] border border-[#2A2A2A] p-6 hover:border-bronze transition-all rounded-[1px] relative group">
            <div className="absolute top-4 right-4">
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px] uppercase tracking-tighter rounded-[1px]">MODELO</Badge>
            </div>
            
            <div className="mb-6">
              <h4 className="text-[12px] font-bold text-white tracking-[0.1em] uppercase mb-1">{modelo.nome}</h4>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">{modelo.cidade}</p>
            </div>

            <div className="space-y-2 mb-6">
              <Button 
                variant="outline"
                onClick={() => copyBriefingLink(modelo.token_cliente)}
                className="w-full justify-start h-9 border-white/5 bg-white/5 hover:bg-bronze hover:text-black transition-all text-[9px] uppercase tracking-widest font-bold rounded-[1px] group/btn"
              >
                <Copy size={12} className="mr-3 text-bronze group-hover/btn:text-black" />
                COPIAR LINK BRIEFING
              </Button>
              <Button 
                variant="outline"
                onClick={() => abrirPortal(modelo.token_cliente)}
                className="w-full justify-start h-9 border-white/5 bg-white/5 hover:bg-bronze hover:text-black transition-all text-[9px] uppercase tracking-widest font-bold rounded-[1px] group/btn"
              >
                <ExternalLink size={12} className="mr-3 text-bronze group-hover/btn:text-black" />
                ABRIR PORTAL
              </Button>
              <Button 
                variant="outline"
                onClick={() => abrirBriefing(modelo.token_cliente)}
                className="w-full justify-start h-9 border-white/5 bg-white/5 hover:bg-bronze hover:text-black transition-all text-[9px] uppercase tracking-widest font-bold rounded-[1px] group/btn"
              >
                <Eye size={12} className="mr-3 text-bronze group-hover/btn:text-black" />
                ABRIR BRIEFING
              </Button>
            </div>

            <div className="pt-4 border-t border-white/5">
              <Label className="text-[8px] uppercase tracking-widest text-white/30 mb-2 block">VINCULAR A CLIENTE</Label>
              <Select onValueChange={(value) => vincularACliente(modelo.id, value, modelo.nome)}>
                <SelectTrigger className="h-9 bg-black/40 border-white/10 rounded-[1px] text-[10px] text-white/70">
                  <SelectValue placeholder="Selecionar Cliente" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1816] border-[#2A2A2A] text-white">
                  {clientes.map(cliente => (
                    <SelectItem key={cliente.id} value={cliente.id} className="text-[10px] uppercase tracking-widest focus:bg-bronze focus:text-black">
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
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
  const [monthlyGoal, setMonthlyGoal] = useState('15000');
  const [originalGoal, setOriginalGoal] = useState('15000');
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const fetchConfigData = async () => {
    setDropboxStatus('loading');
    try {
      // Fetch Dropbox Settings
      const { data: dropboxData, error: dropboxError } = await supabase
        .from('dropbox_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (!dropboxError && dropboxData && dropboxData.refresh_token) {
        setDropboxStatus('connected');
        setLastSync(new Date(dropboxData.updated_at).toLocaleString('pt-BR'));
        const path = (dropboxData as any).contract_template_path || '/NL Arquitetos/07 - Projetos NL OS/00 - Templates/NL_Contrato_Final.docx';
        const vPath = (dropboxData as any).vendor_template_path || '';
        setContractTemplatePath(path);
        setOriginalTemplatePath(path);
        setVendorTemplatePath(vPath);
        setOriginalVendorPath(vPath);
        checkTemplateExists(path, 'client');
        if (vPath) checkTemplateExists(vPath, 'vendor');
      } else {
        setDropboxStatus('disconnected');
      }

      // Fetch Monthly Goal
      const { data: configData, error: configError } = await supabase
        .from('configuracoes')
        .select('value')
        .eq('key', 'meta_mensal_receita')
        .maybeSingle();
      
      if (!configError && configData) {
        setMonthlyGoal(String(configData.value));
        setOriginalGoal(String(configData.value));
      }
    } catch (err) {
      console.error("Erro ao carregar configurações:", err);
    }
  };

  useEffect(() => {
    fetchConfigData();
  }, []);

  const checkTemplateExists = async (path: string, type: 'client' | 'vendor') => {
    if (!path || dropboxStatus !== 'connected') return;
    
    const setStatus = type === 'client' ? setTemplateStatus : setVendorStatus;
    setStatus('checking');
    try {
      const response = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'get_metadata', path }
      });
      
      if (response.data && !response.data.error) {
        setStatus('found');
      } else {
        setStatus('not_found');
      }
    } catch (err) {
      setStatus('not_found');
    }
  };

  const handleConnectDropbox = () => {
    const clientId = 'zjdj0yszvqy7wvz';
    const redirectUri = 'https://app.nl.arq.br/dropbox-callback';
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&token_access_type=offline`;
    const newWindow = window.open(authUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      toast.warning("O bloqueador de popups impediu a abertura automática. Redirecionando nesta aba...");
      setTimeout(() => { window.location.href = authUrl; }, 2000);
    } else {
      toast.info("Uma nova aba foi aberta para autorização do Dropbox.");
      setDropboxStatus('loading');
      setTimeout(fetchConfigData, 15000);
    }
  };

  const handleSaveTemplatePath = async (type: 'client' | 'vendor') => {
    const path = type === 'client' ? contractTemplatePath : vendorTemplatePath;
    const original = type === 'client' ? originalTemplatePath : originalVendorPath;
    if (path === original) return;
    
    setIsSavingTemplate(true);
    try {
      const updateData = type === 'client' 
        ? { contract_template_path: path }
        : { vendor_template_path: path };

      const { error } = await supabase
        .from('dropbox_settings')
        .update(updateData as any)
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;
      
      if (type === 'client') setOriginalTemplatePath(path);
      else setOriginalVendorPath(path);
      
      toast.success("Caminho do template atualizado!");
      checkTemplateExists(path, type);
    } catch (err) {
      console.error("Erro ao salvar template:", err);
      toast.error("Erro ao salvar o caminho do template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveGoal = async () => {
    if (monthlyGoal === originalGoal) return;
    setIsSavingGoal(true);
    try {
      // Use upsert to create or update the configuration
      const { error } = await supabase
        .from('configuracoes')
        .upsert({ 
          key: 'meta_mensal_receita', 
          value: monthlyGoal,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      
      setOriginalGoal(monthlyGoal);
      toast.success("Meta mensal atualizada com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar meta:", err);
      toast.error("Erro ao salvar a meta mensal");
    } finally {
      setIsSavingGoal(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0F0F0F]">
      <Sidebar user={sessionStorage.getItem('nl_user') || 'Sócio'} />
      <main className="flex-1 transition-[margin] duration-300 ml-[var(--sidebar-width)]">
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
            <ProjetosModelo />

            {/* Seção Meta Mensal */}
            <section className="mb-12 bg-white/[0.03] border border-white/5 p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign size={80} className="text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-bronze/10 flex items-center justify-center rounded-[1px]">
                    <DollarSign size={20} className="text-bronze" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-[0.1em] uppercase">Meta Mensal</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Definição de objetivos de faturamento</p>
                  </div>
                </div>
                
                <div className="max-w-xs space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Valor da Meta (R$)</Label>
                    <Input 
                      type="number"
                      value={monthlyGoal}
                      onChange={(e) => setMonthlyGoal(e.target.value)}
                      placeholder="15000"
                      className="bg-black/40 border-white/10 rounded-[1px] text-[11px] text-white focus:ring-bronze h-11"
                    />
                  </div>
                  <Button
                    onClick={handleSaveGoal}
                    disabled={isSavingGoal || monthlyGoal === originalGoal}
                    className="w-full h-11 rounded-[2px] bg-bronze hover:bg-bronze/80 text-white text-[10px] uppercase tracking-[0.2em] font-bold transition-all"
                  >
                    {isSavingGoal ? <RefreshCcw size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                    Salvar Meta
                  </Button>
                </div>
              </div>
            </section>


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
                      <h3 className="text-sm font-bold text-white tracking-[0.1em] uppercase">Templates de Contrato</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">Configuração de arquivos no Dropbox</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-[9px] uppercase tracking-widest text-white/40">Contrato Padrão (.docx)</Label>
                      <Badge className={cn(
                        "text-[8px] uppercase tracking-tighter rounded-[1px]",
                        templateStatus === 'found' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        templateStatus === 'not_found' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                        "bg-white/5 text-white/40 border-white/10"
                      )}>
                        {templateStatus === 'found' ? 'Localizado' : templateStatus === 'not_found' ? 'Não Encontrado' : 'Aguardando'}
                      </Badge>
                    </div>
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
                        onClick={() => checkTemplateExists(contractTemplatePath, 'client')}
                        className="h-11 w-11 border-white/10 bg-white/5 hover:bg-white/10"
                      >
                        <Search size={16} className="text-white/60" />
                      </Button>
                    </div>
                    <Button
                      onClick={() => handleSaveTemplatePath('client')}
                      disabled={isSavingTemplate || contractTemplatePath === originalTemplatePath}
                      className="w-full h-10 rounded-[2px] bg-bronze hover:bg-bronze/80 text-white text-[10px] uppercase tracking-[0.2em] font-bold transition-all"
                    >
                      {isSavingTemplate ? <RefreshCcw size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                      Salvar Padrão
                    </Button>
                  </div>
                  <div className="h-px bg-white/5 my-4" />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-[9px] uppercase tracking-widest text-white/40">Contrato Fornecedor (.docx)</Label>
                      <Badge className={cn(
                        "text-[8px] uppercase tracking-tighter rounded-[1px]",
                        vendorStatus === 'found' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        vendorStatus === 'not_found' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                        "bg-white/5 text-white/40 border-white/10"
                      )}>
                        {vendorStatus === 'found' ? 'Localizado' : vendorStatus === 'not_found' ? 'Não Encontrado' : 'Aguardando'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        value={vendorTemplatePath}
                        onChange={(e) => setVendorTemplatePath(e.target.value)}
                        placeholder="/NL Arquitetos/..."
                        className="bg-black/40 border-white/10 rounded-[1px] text-[11px] text-white focus:ring-bronze h-11"
                      />
                      <Button 
                        variant="outline"
                        size="icon"
                        onClick={() => checkTemplateExists(vendorTemplatePath, 'vendor')}
                        className="h-11 w-11 border-white/10 bg-white/5 hover:bg-white/10"
                      >
                        <Search size={16} className="text-white/60" />
                      </Button>
                    </div>
                    <Button
                      onClick={() => handleSaveTemplatePath('vendor')}
                      disabled={isSavingTemplate || vendorTemplatePath === originalVendorPath}
                      className="w-full h-10 rounded-[2px] bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] uppercase tracking-[0.2em] font-bold transition-all"
                    >
                      {isSavingTemplate ? <RefreshCcw size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                      Salvar Fornecedor
                    </Button>
                  </div>
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
