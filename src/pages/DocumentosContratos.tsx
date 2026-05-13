import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  ChevronDown, 
  Download, 
  Upload, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Search, 
  Folder,
  Send,
  Eye,
  MoreVertical,
  Calendar,
  User,
  MapPin,
  ClipboardList,
  Share2,
  Cloud,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DocumentosContratos = () => {
  const [activeTab, setActiveTab] = useState('briefing');
  const [leads, setLeads] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [briefings, setBriefings] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropboxFiles, setDropboxFiles] = useState<any[]>([]);
  const [dropboxLoading, setDropboxLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  
  // Modals
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [selectedProjetoId, setSelectedProjetoId] = useState('');
  const [tipoContrato, setTipoContrato] = useState('ArqInt');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        { data: lData },
        { data: pData },
        { data: bData },
        { data: cData },
        { data: dData }
      ] = await Promise.all([
        supabase.from('leads').select('*').order('nome', { ascending: true }),
        supabase.from('projetos').select('*').order('nome', { ascending: true }),
        supabase.from('briefings').select('*, leads(nome)').order('criado_em', { ascending: false }),
        supabase.from('contratos').select('*, projetos(nome, nome_cliente)').order('criado_em', { ascending: false }),
        supabase.from('documentos').select('*, projetos(nome)').order('criado_em', { ascending: false })
      ]);

      setLeads(lData || []);
      setProjetos(pData || []);
      setBriefings(bData || []);
      setContratos(cData || []);
      setDocumentos(dData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleGerarBriefing = async () => {
    if (!selectedLeadId) return;
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const { error } = await supabase.from('briefings').insert({
        lead_id: selectedLeadId,
        token,
        status: 'Enviado'
      });

      if (error) throw error;
      
      const publicUrl = `${window.location.origin}/briefing/${token}`;
      navigator.clipboard.writeText(publicUrl);
      toast.success('Link do Briefing gerado e copiado!');
      setIsBriefingModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erro ao gerar briefing');
    }
  };

  const handleGerarContrato = async () => {
    if (!selectedProjetoId) return;
    try {
      const projeto = projetos.find(p => p.id === selectedProjetoId);
      const { error } = await supabase.from('contratos').insert({
        projeto_id: selectedProjetoId,
        tipo: tipoContrato,
        status: 'Gerado',
        conteudo: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS - ${tipoContrato}`
      });

      if (error) throw error;
      toast.success('Contrato gerado com sucesso!');
      setIsContratoModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erro ao gerar contrato');
    }
  };

  const fetchDropboxFiles = async (path = '/NL Arquitetos') => {
    try {
      setDropboxLoading(true);
      const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'list_folder', path }
      });

      if (error) {
        console.error('Dropbox error from function:', error);
        throw error;
      }
      
      if (data.error) {
        throw new Error(data.error_summary || data.error || 'Erro desconhecido no Dropbox');
      }

      setDropboxFiles(data.entries || []);
      setCurrentPath(path);
    } catch (error: any) {
      console.error('Dropbox error:', error);
      toast.error(error.message || 'Erro ao conectar com Dropbox');
    } finally {
      setDropboxLoading(false);
    }
  };

  const handleDownloadDropbox = async (path: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'get_temporary_link', path }
      });

      if (error) throw error;
      window.open(data.link, '_blank');
    } catch (error) {
      toast.error('Erro ao baixar arquivo do Dropbox');
    }
  };

  useEffect(() => {
    if (activeTab === 'arquivos') {
      fetchDropboxFiles();
    }
  }, [activeTab]);

  return (
    <div className="flex min-h-screen bg-[#1A1816] text-white">
      <Sidebar user="Sócio" />
      
      <main className="flex-1 ml-[230px] p-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">08 · Documentos e Contratos</h1>
          <p className="text-[#8B7355] text-[11px] uppercase tracking-[0.2em] font-bold">BRIEFING · CONTRATOS · ARQUIVOS</p>
        </header>

        <Tabs defaultValue="briefing" className="space-y-6" onValueChange={setActiveTab}>
          <div className="flex justify-between items-center">
            <TabsList className="bg-[#242220] border border-white/10 p-1">
              <TabsTrigger value="briefing" className="data-[state=active]:bg-[#1A1816] data-[state=active]:text-white uppercase text-[10px] tracking-widest px-6">BRIEFING</TabsTrigger>
              <TabsTrigger value="contratos" className="data-[state=active]:bg-[#1A1816] data-[state=active]:text-white uppercase text-[10px] tracking-widest px-6">CONTRATOS</TabsTrigger>
              <TabsTrigger value="arquivos" className="data-[state=active]:bg-[#1A1816] data-[state=active]:text-white uppercase text-[10px] tracking-widest px-6">ARQUIVOS</TabsTrigger>
            </TabsList>

            {activeTab === 'briefing' && (
              <Button onClick={() => setIsBriefingModalOpen(true)} className="bg-bronze hover:bg-bronze/80 text-white rounded-none h-9 px-6 text-[10px] tracking-widest uppercase">
                <Plus size={14} className="mr-2" /> GERAR LINK DE BRIEFING
              </Button>
            )}
            {activeTab === 'contratos' && (
              <Button onClick={() => setIsContratoModalOpen(true)} className="bg-bronze hover:bg-bronze/80 text-white rounded-none h-9 px-6 text-[10px] tracking-widest uppercase">
                <Plus size={14} className="mr-2" /> NOVO CONTRATO
              </Button>
            )}
          </div>

          <TabsContent value="briefing">
            <div className="bg-[#242220] border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-black/20 text-white/40 uppercase tracking-widest border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-bold">Lead</th>
                      <th className="px-6 py-4 font-bold">Data de Envio</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {briefings.map((b) => (
                      <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-medium">{b.leads?.nome}</td>
                        <td className="px-6 py-4 text-white/60">{format(parseISO(b.criado_em), 'dd/MM/yyyy HH:mm')}</td>
                        <td className="px-6 py-4">
                          <Badge className={cn(
                            "rounded-none text-[8px] uppercase tracking-widest",
                            b.status === 'Preenchido' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          )}>
                            {b.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="text-bronze hover:text-white hover:bg-bronze h-7 text-[9px]">
                            VER RESPOSTAS
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {briefings.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-white/20 italic">
                          Nenhum briefing enviado no momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contratos">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contratos.map((c) => (
                <div key={c.id} className="bg-[#242220] border border-white/10 p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">{c.projetos?.nome}</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">{c.tipo} · {c.projetos?.nome_cliente}</p>
                    </div>
                    <Badge className="bg-bronze/10 text-bronze border-bronze/20 text-[8px] uppercase tracking-tighter">
                      {c.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5 text-[9px] uppercase tracking-widest h-8 rounded-none">
                      <Download size={12} className="mr-2" /> PDF
                    </Button>
                    <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5 text-[9px] uppercase tracking-widest h-8 rounded-none">
                      <ExternalLink size={12} className="mr-2" /> ASSINAR
                    </Button>
                  </div>
                </div>
              ))}
              {contratos.length === 0 && (
                <div className="col-span-3 bg-[#242220] border border-white/10 p-20 text-center text-white/20 italic">
                  Nenhum contrato gerado.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="arquivos">
            <div className="flex gap-6 h-[600px]">
              {/* Pasta Tree */}
              <div className="w-64 bg-[#242220] border border-white/10 p-4 flex flex-col">
                <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-4">Dropbox Integration</h3>
                
                <div className="flex-1 overflow-y-auto space-y-1">
                  <div 
                    onClick={() => fetchDropboxFiles('')}
                    className={cn(
                      "p-2 hover:bg-white/5 cursor-pointer flex items-center gap-2 text-[11px]",
                      currentPath === '' && "bg-white/5 border-l-2 border-bronze"
                    )}
                  >
                    <Cloud size={14} className="text-blue-400" />
                    <span>Raiz Dropbox</span>
                  </div>

                  <div className="h-px bg-white/5 my-4" />
                  
                  <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-2 px-2">PROJETOS LOCAIS</h3>
                  {projetos.map(p => (
                    <div key={p.id} className="p-2 hover:bg-white/5 cursor-pointer flex items-center gap-2 text-[11px]">
                      <Folder size={14} className="text-bronze" />
                      <span className="truncate">{p.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* File List */}
              <div className="flex-1 bg-[#242220] border border-white/10 p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-tight">
                      {currentPath || "Arquivos do Dropbox"}
                    </h3>
                    {dropboxLoading && <Loader2 size={14} className="animate-spin text-bronze" />}
                  </div>
                  <div className="flex gap-2">
                    {currentPath && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const parts = currentPath.split('/');
                          parts.pop();
                          fetchDropboxFiles(parts.join('/'));
                        }}
                        className="border-white/10 hover:bg-white/5 text-white rounded-none text-[9px] uppercase tracking-widest"
                      >
                        VOLTAR
                      </Button>
                    )}
                    <Button size="sm" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-none text-[9px] uppercase tracking-widest">
                      <Upload size={12} className="mr-2" /> UPLOAD
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {dropboxFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-black/20 border border-white/5 hover:border-bronze/30 transition-colors">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => file['.tag'] === 'folder' ? fetchDropboxFiles(file.path_display) : handleDownloadDropbox(file.path_display)}
                      >
                        {file['.tag'] === 'folder' ? (
                          <Folder size={16} className="text-blue-400" />
                        ) : (
                          <FileText size={16} className="text-white/40" />
                        )}
                        <div>
                          <p className="text-[11px] font-medium">{file.name}</p>
                          <p className="text-[9px] text-white/40 uppercase tracking-widest">
                            {file['.tag'] === 'folder' ? 'Pasta' : `${(file.size / 1024).toFixed(1)} KB`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {file['.tag'] !== 'folder' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDownloadDropbox(file.path_display)}
                            className="h-7 w-7 text-white/40 hover:text-white"
                          >
                            <Download size={14} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white">
                          <Share2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {dropboxFiles.length === 0 && !dropboxLoading && (
                    <div className="text-center py-20 text-white/20 italic text-[11px]">
                      Nenhum arquivo encontrado nesta pasta do Dropbox.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Briefing Modal */}
        <Dialog open={isBriefingModalOpen} onOpenChange={setIsBriefingModalOpen}>
          <DialogContent className="bg-[#1A1816] border border-white/10 text-white rounded-none">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold uppercase tracking-widest">GERAR LINK DE BRIEFING</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">SELECIONAR LEAD</label>
                <Select onValueChange={setSelectedLeadId}>
                  <SelectTrigger className="bg-black/20 border-white/10 rounded-none focus:ring-bronze">
                    <SelectValue placeholder="Escolha um lead..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#242220] border-white/10 text-white">
                    {leads.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGerarBriefing} disabled={!selectedLeadId} className="bg-bronze hover:bg-bronze/80 text-white rounded-none w-full uppercase text-[10px] tracking-widest h-10">
                GERAR E COPIAR LINK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contrato Modal */}
        <Dialog open={isContratoModalOpen} onOpenChange={setIsContratoModalOpen}>
          <DialogContent className="bg-[#1A1816] border border-white/10 text-white rounded-none">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold uppercase tracking-widest">GERAR NOVO CONTRATO</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">PROJETO</label>
                <Select onValueChange={setSelectedProjetoId}>
                  <SelectTrigger className="bg-black/20 border-white/10 rounded-none focus:ring-bronze">
                    <SelectValue placeholder="Selecione o projeto..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#242220] border-white/10 text-white">
                    {projetos.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">TIPO DE CONTRATO</label>
                <Select value={tipoContrato} onValueChange={setTipoContrato}>
                  <SelectTrigger className="bg-black/20 border-white/10 rounded-none focus:ring-bronze">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#242220] border-white/10 text-white">
                    <SelectItem value="ArqInt">Contrato ArqInt</SelectItem>
                    <SelectItem value="Interiores">Contrato Interiores</SelectItem>
                    <SelectItem value="Comercial">Contrato Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGerarContrato} disabled={!selectedProjetoId} className="bg-bronze hover:bg-bronze/80 text-white rounded-none w-full uppercase text-[10px] tracking-widest h-10">
                GERAR CONTRATO
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default DocumentosContratos;
