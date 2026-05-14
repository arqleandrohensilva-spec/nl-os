
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
  Loader2,
  RefreshCw,
  FileCheck,
  Ban,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateContractPDF, ContractData } from '@/utils/contractTemplates';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [loading, setLoading] = useState(true);
  const [dropboxFiles, setDropboxFiles] = useState<any[]>([]);
  const [dropboxLoading, setDropboxLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedProjetoArquivos, setSelectedProjetoArquivos] = useState<any>(null);
  const [dropboxProjectsFolders, setDropboxProjectsFolders] = useState<any[]>([]);
  const [projectSubfoldersFiles, setProjectSubfoldersFiles] = useState<Record<string, any[]>>({});
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  
  // Modals
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [selectedProjetoId, setSelectedProjetoId] = useState('');
  const [tipoContrato, setTipoContrato] = useState('Arquitetura + Interiores');
  const [planoContrato, setPlanoContrato] = useState('Executivo');
  
  const [contractFormData, setContractFormData] = useState<ContractData>({
    numero: '',
    cliente: {
      nome: '',
      cpf: '',
      endereco: '',
      nacionalidade: 'Brasileiro(a)',
      estadoCivil: 'Solteiro(a)',
      profissao: ''
    },
    projeto: {
      tipo: 'Arquitetura + Interiores',
      plano: 'Executivo',
      endereco: '',
      tipoImovel: 'Residência',
      areaTerreno: '',
      areaConstruida: '',
      matricula: ''
    },
    prazos: {
      briefing: '',
      estudo: '',
      legal: '',
      executivo: '',
      total: ''
    },
    honorarios: {
      totalExecutivo: '',
      totalCompleto: '',
      marco1: '',
      marco2: '',
      marco3: ''
    },
    nl: {
      cauLeandro: 'A203598-7',
      cauNeandro: 'A203599-5',
      cpfNeandro: '000.000.000-00'
    }
  });


  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState('01 - Briefing');
  const [uploading, setUploading] = useState(false);
  
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  const [newProjectType, setNewProjectType] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pathToDelete, setPathToDelete] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [contractToCancel, setContractToCancel] = useState<any>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [categoriaCancelamento, setCategoriaCancelamento] = useState('');
  const [outroMotivo, setOutroMotivo] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

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
        { data: cData }
      ] = await Promise.all([
        supabase.from('leads').select('*').order('nome', { ascending: true }),
        supabase.from('projetos').select('*').order('nome', { ascending: true }),
        supabase.from('briefings').select('*, leads(nome)').order('criado_em', { ascending: false }),
        supabase.from('contratos').select('*, projetos(nome, nome_cliente)').order('criado_em', { ascending: false })
      ]);

      setLeads(lData || []);
      setProjetos(pData || []);
      setBriefings(bData || []);
      setContratos(cData || []);
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

  const generateContractNumber = async () => {
    const year = new Date().getFullYear();
    const { data: lastContract } = await supabase
      .from('contratos')
      .select('numero')
      .order('criado_em', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastContract && lastContract[0]?.numero) {
      const match = lastContract[0].numero.match(/NL-\d{4}-(\d{3})/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const formattedNumber = `NL-${year}-${String(nextNumber).padStart(3, '0')}`;
    setContractFormData(prev => ({ ...prev, numero: formattedNumber }));
  };

  const handleSelectLeadForContract = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setContractFormData(prev => ({
        ...prev,
        cliente: {
          ...prev.cliente,
          nome: lead.nome || '',
          endereco: lead.cidade ? `${lead.cidade}${lead.estado ? ` - ${lead.estado}` : ''}` : ''
        }
      }));
    }
  };

  const handleGenerateContract = async () => {
    try {
      setLoading(true);
      const doc = generateContractPDF(contractFormData);
      
      // Save to Supabase
      const { error } = await supabase.from('contratos').insert({
        numero: contractFormData.numero,
        lead_id: selectedLeadId,
        cliente_nome: contractFormData.cliente.nome,
        tipo: contractFormData.projeto.tipo,
        plano: contractFormData.projeto.plano,
        dados_gerais: contractFormData.cliente,
        prazos: contractFormData.prazos,
        valores: contractFormData.honorarios,
        status: 'Gerado'
      });

      if (error) throw error;
      
      toast.success('Contrato gerado e registrado com sucesso!');
      
      // Download automatically
      doc.save(`Contrato_${contractFormData.numero}_${contractFormData.cliente.nome}.pdf`);
      
      setIsContratoModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error generating contract:', error);
      toast.error('Erro ao gerar contrato');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExistingContract = (contract: any) => {
    // Reconstruct data from contract record
    const data: ContractData = {
      numero: contract.numero,
      cliente: contract.dados_gerais,
      projeto: {
        tipo: contract.tipo,
        plano: contract.plano,
        endereco: contract.dados_gerais.endereco || '',
        tipoImovel: 'Residência',
        areaTerreno: '',
        areaConstruida: '',
        matricula: ''
      },
      prazos: contract.prazos,
      honorarios: contract.valores,
      nl: {
        cauLeandro: 'A203598-7',
        cauNeandro: 'A203599-5',
        cpfNeandro: '000.000.000-00'
      }
    };
    
    const doc = generateContractPDF(data);
    doc.save(`Contrato_${contract.numero}_${contract.cliente_nome}.pdf`);
  };

  const handleSaveToDropbox = async () => {
    try {
      setLoading(true);
      const doc = generateContractPDF(contractFormData);
      const pdfBlob = doc.output('blob');
      
      // We need a project folder in Dropbox
      // Search for the project folder or use a default one
      const folderName = contractFormData.cliente.nome;
      const path = `/NL Arquitetos/07 - Projetos NL OS/${folderName}/05 - Contrato/Contrato_${contractFormData.numero}.pdf`;

      const arrayBuffer = await pdfBlob.arrayBuffer();
      const dropboxArg = JSON.stringify({
        path: path,
        mode: 'add',
        autorename: true,
        mute: false,
        strict_conflict: false
      });

      const { error } = await supabase.functions.invoke('dropbox-proxy', {
        body: arrayBuffer,
        headers: {
          'x-action': 'upload',
          'dropbox-api-arg': dropboxArg,
          'content-type': 'application/octet-stream'
        }
      });

      if (error) throw error;
      toast.success('Contrato salvo no Dropbox com sucesso!');
    } catch (error) {
      console.error('Dropbox save error:', error);
      toast.error('Erro ao salvar no Dropbox');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExistingToDropbox = async (contract: any) => {
    try {
      setLoading(true);
      
      // Reconstruct data from contract record
      const data: ContractData = {
        numero: contract.numero,
        cliente: contract.dados_gerais,
        projeto: {
          tipo: contract.tipo,
          plano: contract.plano,
          endereco: contract.dados_gerais.endereco || '',
          tipoImovel: 'Residência',
          areaTerreno: '',
          areaConstruida: '',
          matricula: ''
        },
        prazos: contract.prazos,
        honorarios: contract.valores,
        nl: {
          cauLeandro: 'A203598-7',
          cauNeandro: 'A203599-5',
          cpfNeandro: '000.000.000-00'
        }
      };

      const doc = generateContractPDF(data);
      const pdfBlob = doc.output('blob');
      
      const folderName = contract.cliente_nome;
      const path = `/NL Arquitetos/07 - Projetos NL OS/${folderName}/05 - Contrato/Contrato_${contract.numero}.pdf`;

      const arrayBuffer = await pdfBlob.arrayBuffer();
      const dropboxArg = JSON.stringify({
        path: path,
        mode: 'add',
        autorename: true,
        mute: false,
        strict_conflict: false
      });

      const { error } = await supabase.functions.invoke('dropbox-proxy', {
        body: arrayBuffer,
        headers: {
          'x-action': 'upload',
          'dropbox-api-arg': dropboxArg,
          'content-type': 'application/octet-stream'
        }
      });

      if (error) throw error;
      toast.success('Contrato salvo no Dropbox com sucesso!');
    } catch (error) {
      console.error('Dropbox save error:', error);
      toast.error('Erro ao salvar no Dropbox');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelContract = async () => {
    if (!contractToCancel || (!categoriaCancelamento) || (categoriaCancelamento === 'Outro' && !outroMotivo) || !motivoCancelamento) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsCancelling(true);
      const { error } = await supabase
        .from('contratos')
        .update({
          status: 'CANCELADO',
          motivo_cancelamento: motivoCancelamento,
          categoria_cancelamento: categoriaCancelamento === 'Outro' ? outroMotivo : categoriaCancelamento,
          data_cancelamento: new Date().toISOString()
        })
        .eq('id', contractToCancel.id);

      if (error) throw error;

      toast.success('Contrato cancelado com sucesso');
      setIsCancelModalOpen(false);
      setContractToCancel(null);
      setMotivoCancelamento('');
      setCategoriaCancelamento('');
      setOutroMotivo('');
      fetchData();
    } catch (error) {
      console.error('Error cancelling contract:', error);
      toast.error('Erro ao cancelar contrato');
    } finally {
      setIsCancelling(false);
    }
  };

  const fetchDropboxFiles = async (path = '/NL Arquitetos/07 - Projetos NL OS') => {
    try {
      setDropboxLoading(true);
      const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'list_folder', path }
      });

      if (error) throw error;
      
      if (data && (data.error || data.error_summary)) {
        const errorDetail = data.error_summary || 
                           (typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
        throw new Error(errorDetail);
      }

      setDropboxFiles(data.entries || []);
      setCurrentPath(path);
      
      // Sempre que listamos a pasta raiz de projetos, atualizamos a lista lateral
      if (path === '/NL Arquitetos/07 - Projetos NL OS') {
        setDropboxProjectsFolders(data.entries.filter((e: any) => e['.tag'] === 'folder') || []);
      }
    } catch (error: any) {
      console.error('Dropbox error:', error);
      toast.error(error.message || 'Erro ao conectar com Dropbox');
    } finally {
      setDropboxLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (selectedProjetoArquivos) {
      await fetchProjectFiles(selectedProjetoArquivos.path_display);
    } else {
      await fetchDropboxFiles(currentPath);
    }
    toast.success('Listagem atualizada direto do Dropbox');
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

  const handleSelectProjectFolder = async (folder: any) => {
    setSelectedProjetoArquivos(folder);
    setSelectedStage(null);
    await fetchProjectFiles(folder.path_display);
  };

  const fetchProjectFiles = async (basePath: string) => {
    try {
      setDropboxLoading(true);
      const subfolders = [
        '01 - Briefing',
        '02 - Anteprojeto',
        '03 - Projeto Executivo',
        '04 - Acompanhamento de Obra'
      ];

      const filesMap: Record<string, any[]> = {};
      
      for (const sub of subfolders) {
        const fullPath = `${basePath}/${sub}`;
        const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
          body: { action: 'list_folder', path: fullPath }
        });

        if (!error && data && data.entries) {
          filesMap[sub] = data.entries.filter((e: any) => e['.tag'] === 'file');
        } else {
          filesMap[sub] = [];
        }
      }

      setProjectSubfoldersFiles(filesMap);
      setCurrentPath(basePath);
    } catch (error) {
      console.error('Error fetching project files:', error);
    } finally {
      setDropboxLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile || !selectedProjetoArquivos) return;

    try {
      setUploading(true);
      const destinationPath = `${selectedProjetoArquivos.path_display}/${uploadStage}/${uploadFile.name}`;

      const arrayBuffer = await uploadFile.arrayBuffer();
      const dropboxArg = JSON.stringify({
        path: destinationPath,
        mode: 'add',
        autorename: true,
        mute: false,
        strict_conflict: false
      });

      const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
        body: arrayBuffer,
        headers: {
          'x-action': 'upload',
          'dropbox-api-arg': dropboxArg,
          'content-type': 'application/octet-stream'
        }
      });

      if (error) throw error;
      
      toast.success('Arquivo enviado com sucesso!');
      setIsUploadModalOpen(false);
      setUploadFile(null);
      
      await fetchProjectFiles(selectedProjetoArquivos.path_display);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleShareFile = async (path: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'create_shared_link', path }
      });

      if (error) throw error;
      
      const link = data.url || data.link;
      navigator.clipboard.writeText(link);
      toast.success('Link de compartilhamento copiado!');
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Erro ao gerar link de compartilhamento');
    }
  };

  const handleCreateNewProject = async () => {
    if (!newProjectName) return;
    try {
      setIsCreatingProject(true);
      const projectFolderName = `${newProjectClient || 'Cliente'} - ${newProjectType || 'Projeto'}`;
      const projectBasePath = `/NL Arquitetos/07 - Projetos NL OS/${projectFolderName}`;
      
      const subfolders = [
        '01 - Briefing',
        '02 - Anteprojeto',
        '03 - Projeto Executivo',
        '04 - Acompanhamento de Obra'
      ];

      for (const sub of subfolders) {
        await supabase.functions.invoke('dropbox-proxy', {
          body: { action: 'create_folder', folder: `${projectBasePath}/${sub}` }
        });
      }

      toast.success('Projeto criado no Dropbox com sucesso!');
      setIsNewProjectModalOpen(false);
      setNewProjectName('');
      setNewProjectClient('');
      setNewProjectType('');
      fetchDropboxFiles();
    } catch (error) {
      toast.error('Erro ao criar projeto');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeletePath = async () => {
    if (!pathToDelete) return;
    
    try {
      setIsDeleting(true);
      console.log("Deleting path:", pathToDelete);
      
      const { data, error: invokeError } = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'delete', path: pathToDelete }
      });
      
      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data && (data.error || data.error_summary)) {
        const errorDetail = data.error_summary || 
                           (typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
        throw new Error(errorDetail);
      }
      
      toast.success('Pasta removida com sucesso. A listagem foi atualizada.');
      setIsDeleteConfirmOpen(false);
      
      // Update the list
      if (selectedProjetoArquivos) {
        await fetchProjectFiles(selectedProjetoArquivos.path_display);
      } else {
        await fetchDropboxFiles(currentPath);
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Erro ao excluir: ${error.message}. A listagem NÃO foi atualizada.`, {
        duration: 8000
      });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'arquivos' && !selectedProjetoArquivos) {
      fetchDropboxFiles();
    }
  }, [activeTab, selectedProjetoArquivos]);

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
              <Button onClick={() => {
                generateContractNumber();
                setIsContratoModalOpen(true);
              }} className="bg-bronze hover:bg-bronze/80 text-white rounded-none h-9 px-6 text-[10px] tracking-widest uppercase">
                <Plus size={14} className="mr-2" /> NOVO CONTRATO
              </Button>
            )}

            {activeTab === 'arquivos' && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleRefresh} 
                  disabled={dropboxLoading}
                  variant="outline"
                  className="bg-transparent hover:bg-white/5 text-white border-white/10 rounded-none h-9 px-6 text-[10px] tracking-widest uppercase font-bold"
                >
                  <RefreshCw size={14} className={cn("mr-2", dropboxLoading && "animate-spin")} /> ATUALIZAR
                </Button>
                <Button onClick={() => setIsNewProjectModalOpen(true)} className="bg-white hover:bg-white/90 text-black border-none rounded-none h-9 px-6 text-[10px] tracking-widest uppercase font-bold">
                  <Plus size={14} className="mr-2" /> NOVO PROJETO
                </Button>
              </div>
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
                      <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">{c.cliente_nome}</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">{c.numero} · {c.tipo}</p>
                    </div>
                    <Badge className="bg-bronze/10 text-bronze border-bronze/20 text-[8px] uppercase tracking-tighter">
                      {c.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleDownloadExistingContract(c)}
                      className="flex-1 border-white/10 hover:bg-white/5 text-[9px] uppercase tracking-widest h-8 rounded-none"
                    >
                      <Download size={12} className="mr-2" /> PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => toast.info("Integração com ClickSign em breve. Baixe o PDF e envie manualmente.")}
                      className="flex-1 border-white/10 hover:bg-white/5 text-[9px] uppercase tracking-widest h-8 rounded-none"
                    >
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
            <div className="flex gap-6 min-h-[600px]">
              <div className="w-64 bg-[#242220] border border-white/10 p-4 flex flex-col">
                <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-4">Dropbox Integration</h3>
                <div className="flex-1 overflow-y-auto space-y-1">
                  <div 
                    onClick={() => {
                      setSelectedProjetoArquivos(null);
                      fetchDropboxFiles('/NL Arquitetos/07 - Projetos NL OS');
                    }}
                    className={cn(
                      "p-2 hover:bg-white/5 cursor-pointer flex items-center gap-2 text-[11px]",
                      (!selectedProjetoArquivos && (currentPath === '/NL Arquitetos/07 - Projetos NL OS' || currentPath === '')) && "bg-white/5 border-l-2 border-bronze"
                    )}
                  >
                    <Cloud size={14} className="text-blue-400" />
                    <span>07 - Projetos NL OS</span>
                  </div>
                  <div className="h-px bg-white/5 my-4" />
                  <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-2 px-2">PROJETOS NL OS</h3>
                  {dropboxProjectsFolders.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => handleSelectProjectFolder(p)}
                      className={cn(
                        "p-2 hover:bg-white/5 cursor-pointer flex items-center gap-2 text-[11px]",
                        selectedProjetoArquivos?.id === p.id && "bg-white/5 border-l-2 border-bronze text-bronze font-bold"
                      )}
                    >
                      <Folder size={14} className={selectedProjetoArquivos?.id === p.id ? "text-bronze" : "text-white/40"} />
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 bg-[#242220] border border-white/10 p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-tight">
                      {selectedProjetoArquivos ? selectedProjetoArquivos.name : (currentPath || "Arquivos do Dropbox")}
                    </h3>
                    {dropboxLoading && <Loader2 size={14} className="animate-spin text-bronze" />}
                  </div>
                  <div className="flex gap-2">
                    {!selectedProjetoArquivos && currentPath && (
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
                    {selectedProjetoArquivos && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => {
                            setUploadStage('01 - Briefing');
                            setIsUploadModalOpen(true);
                          }}
                          size="sm" 
                          className="bg-bronze hover:bg-bronze/80 text-white rounded-none text-[9px] uppercase tracking-widest"
                        >
                          <Upload size={12} className="mr-2" /> UPLOAD
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-6">
                  {selectedProjetoArquivos ? (
                    selectedStage ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedStage(null)}
                              className="h-8 text-[10px] uppercase tracking-widest text-white/40 hover:text-white px-0"
                            >
                              <ChevronDown className="rotate-90 mr-1" size={14} /> VOLTAR
                            </Button>
                            <h4 className="text-[12px] uppercase font-bold text-bronze tracking-widest">
                              {selectedStage}
                            </h4>
                          </div>
                          <Button 
                            onClick={() => {
                              setUploadStage(selectedStage);
                              setIsUploadModalOpen(true);
                            }}
                            size="sm" 
                            className="bg-bronze hover:bg-bronze/80 text-white rounded-none text-[9px] uppercase tracking-widest h-8"
                          >
                            <Upload size={12} className="mr-2" /> UPLOAD
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {(projectSubfoldersFiles[selectedStage] || []).length > 0 ? (
                            projectSubfoldersFiles[selectedStage].map(file => (
                              <div key={file.id} className="flex items-center justify-between p-3 bg-black/20 border border-white/5 hover:border-bronze/30 transition-colors">
                                <div className="flex items-center gap-3 flex-1">
                                  <FileText size={16} className="text-white/40" />
                                  <div>
                                    <p className="text-[11px] font-medium">{file.name}</p>
                                    <p className="text-[9px] text-white/40 uppercase tracking-widest">
                                      {(file.size / 1024).toFixed(1)} KB · {format(parseISO(file.client_modified), 'dd/MM/yyyy', { locale: ptBR })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDownloadDropbox(file.path_display)}
                                    className="h-7 w-7 text-white/40 hover:text-white"
                                  >
                                    <Download size={14} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleShareFile(file.path_display)}
                                    className="h-7 w-7 text-white/40 hover:text-white"
                                  >
                                    <Share2 size={14} />
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-10 bg-black/10 border border-dashed border-white/5">
                              <p className="text-[10px] text-white/20 italic">Nenhum arquivo nesta etapa.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {Object.keys(projectSubfoldersFiles).length > 0 ? (
                          Object.keys(projectSubfoldersFiles).sort().map((stage) => (
                            <div 
                              key={stage} 
                              onClick={() => setSelectedStage(stage)}
                              className="group p-6 bg-black/20 border border-white/5 hover:border-bronze/40 cursor-pointer transition-all hover:bg-black/40 flex flex-col justify-between h-32"
                            >
                              <div className="flex justify-between items-start">
                                <Folder size={24} className="text-bronze/60 group-hover:text-bronze transition-colors" />
                                <Badge variant="outline" className="text-[8px] border-white/10 text-white/40">
                                  {projectSubfoldersFiles[stage]?.length || 0} ARQUIVOS
                                </Badge>
                              </div>
                              <div>
                                <h4 className="text-[11px] uppercase font-bold text-white tracking-widest mb-1 group-hover:text-bronze transition-colors">
                                  {stage}
                                </h4>
                                <p className="text-[9px] text-white/40 uppercase tracking-widest">Acessar documentos</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 text-center py-20">
                            <Loader2 className="animate-spin mx-auto text-bronze mb-2" size={24} />
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Carregando etapas do projeto...</p>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    dropboxFiles.map(file => (
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleShareFile(file.path_display)}
                            className="h-7 w-7 text-white/40 hover:text-white"
                          >
                            <Share2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  {dropboxFiles.length === 0 && !dropboxLoading && !selectedProjetoArquivos && (
                    <div className="text-center py-20 text-white/20 italic text-[11px]">
                      Nenhum arquivo encontrado nesta pasta do Dropbox.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className="bg-[#1A1816] border border-white/10 text-white rounded-none">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold uppercase tracking-widest">UPLOAD DE ARQUIVO</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">SELECIONAR ARQUIVO</label>
                <Input 
                  type="file" 
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="bg-black/20 border-white/10 rounded-none focus:ring-bronze text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">ETAPA DO PROJETO</label>
                <Select value={uploadStage} onValueChange={setUploadStage}>
                  <SelectTrigger className="bg-black/20 border-white/10 rounded-none focus:ring-bronze">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#242220] border-white/10 text-white">
                    <SelectItem value="01 - Briefing">01 - Briefing</SelectItem>
                    <SelectItem value="02 - Anteprojeto">02 - Anteprojeto</SelectItem>
                    <SelectItem value="03 - Projeto Executivo">03 - Projeto Executivo</SelectItem>
                    <SelectItem value="04 - Acompanhamento de Obra">04 - Acompanhamento de Obra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleFileUpload} 
                disabled={!uploadFile || uploading} 
                className="bg-bronze hover:bg-bronze/80 text-white rounded-none w-full uppercase text-[10px] tracking-widest h-10"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : "FAZER UPLOAD"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        <Dialog open={isContratoModalOpen} onOpenChange={setIsContratoModalOpen}>
          <DialogContent className="bg-[#1A1816] border border-white/10 text-white rounded-none max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <FileCheck size={18} className="text-bronze" /> GERAR NOVO CONTRATO - {contractFormData.numero}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4 space-y-8">
              {/* DADOS DO CLIENTE */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <User size={14} className="text-bronze" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/60">DADOS DO CLIENTE</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Selecionar Lead</Label>
                    <Select onValueChange={(val) => {
                      setSelectedLeadId(val);
                      handleSelectLeadForContract(val);
                    }}>
                      <SelectTrigger className="bg-black/20 border-white/10 rounded-none focus:ring-bronze h-10">
                        <SelectValue placeholder="Selecione um lead para preencher..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#242220] border-white/10 text-white">
                        {leads.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Nome Completo</Label>
                    <Input 
                      value={contractFormData.cliente.nome}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, cliente: { ...prev.cliente, nome: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none focus:ring-bronze h-10"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">CPF</Label>
                    <Input 
                      value={contractFormData.cliente.cpf}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, cliente: { ...prev.cliente, cpf: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none focus:ring-bronze h-10"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Endereço</Label>
                    <Input 
                      value={contractFormData.cliente.endereco}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, cliente: { ...prev.cliente, endereco: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none focus:ring-bronze h-10"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Nacionalidade</Label>
                    <Input 
                      value={contractFormData.cliente.nacionalidade}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, cliente: { ...prev.cliente, nacionalidade: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none focus:ring-bronze h-10"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Estado Civil</Label>
                    <Input 
                      value={contractFormData.cliente.estadoCivil}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, cliente: { ...prev.cliente, estadoCivil: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none focus:ring-bronze h-10"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Profissão</Label>
                    <Input 
                      value={contractFormData.cliente.profissao}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, cliente: { ...prev.cliente, profissao: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none focus:ring-bronze h-10"
                    />
                  </div>
                </div>
              </section>

              {/* DADOS DO PROJETO */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <ClipboardList size={14} className="text-bronze" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/60">DADOS DO PROJETO</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Tipo de Projeto</Label>
                    <RadioGroup 
                      value={contractFormData.projeto.tipo} 
                      onValueChange={(val) => setContractFormData(prev => ({ ...prev, projeto: { ...prev.projeto, tipo: val } }))}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Arquitetura + Interiores" id="arqint" className="border-bronze text-bronze" />
                        <Label htmlFor="arqint" className="text-[11px] cursor-pointer">Arquitetura + Interiores</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Interiores" id="int" className="border-bronze text-bronze" />
                        <Label htmlFor="int" className="text-[11px] cursor-pointer">Interiores</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Comercial" id="com" className="border-bronze text-bronze" />
                        <Label htmlFor="com" className="text-[11px] cursor-pointer">Comercial</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Plano</Label>
                    <RadioGroup 
                      value={contractFormData.projeto.plano} 
                      onValueChange={(val) => setContractFormData(prev => ({ ...prev, projeto: { ...prev.projeto, plano: val } }))}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Executivo" id="exec" className="border-bronze text-bronze" />
                        <Label htmlFor="exec" className="text-[11px] cursor-pointer">Executivo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Completo" id="comp" className="border-bronze text-bronze" />
                        <Label htmlFor="comp" className="text-[11px] cursor-pointer">Completo</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Endereço do Imóvel</Label>
                    <Input 
                      value={contractFormData.projeto.endereco}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, projeto: { ...prev.projeto, endereco: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none focus:ring-bronze h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Tipo do Imóvel</Label>
                    <Select value={contractFormData.projeto.tipoImovel} onValueChange={(val) => setContractFormData(prev => ({ ...prev, projeto: { ...prev.projeto, tipoImovel: val } }))}>
                      <SelectTrigger className="bg-black/20 border-white/10 rounded-none h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#242220] border-white/10 text-white">
                        <SelectItem value="Terreno">Terreno</SelectItem>
                        <SelectItem value="Residência">Residência</SelectItem>
                        <SelectItem value="Apartamento">Apartamento</SelectItem>
                        <SelectItem value="Sala Comercial">Sala Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Área do Terreno (m²)</Label>
                    <Input 
                      value={contractFormData.projeto.areaTerreno}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, projeto: { ...prev.projeto, areaTerreno: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none focus:ring-bronze h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Área Construída Estimada (m²)</Label>
                    <Input 
                      value={contractFormData.projeto.areaConstruida}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, projeto: { ...prev.projeto, areaConstruida: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none focus:ring-bronze h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Matrícula nº + Cartório</Label>
                    <Input 
                      value={contractFormData.projeto.matricula}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, projeto: { ...prev.projeto, matricula: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none focus:ring-bronze h-10"
                    />
                  </div>
                </div>
              </section>

              {/* PRAZOS POR ETAPA */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Calendar size={14} className="text-bronze" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/60">PRAZOS POR ETAPA (DIAS ÚTEIS)</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Briefing</Label>
                    <Input 
                      value={contractFormData.prazos.briefing}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, prazos: { ...prev.prazos, briefing: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Estudo 3D</Label>
                    <Input 
                      value={contractFormData.prazos.estudo}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, prazos: { ...prev.prazos, estudo: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Projeto Legal</Label>
                    <Input 
                      value={contractFormData.prazos.legal}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, prazos: { ...prev.prazos, legal: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Executivo</Label>
                    <Input 
                      value={contractFormData.prazos.executivo}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, prazos: { ...prev.prazos, executivo: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-4">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Prazo Total (Semanas)</Label>
                    <Input 
                      value={contractFormData.prazos.total}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, prazos: { ...prev.prazos, total: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10 border-bronze/30"
                    />
                  </div>
                </div>
              </section>

              {/* HONORÁRIOS */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <span className="text-bronze font-bold text-[14px]">R$</span>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/60">HONORÁRIOS</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Total Plano Executivo</Label>
                    <Input 
                      value={contractFormData.honorarios.totalExecutivo}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, honorarios: { ...prev.honorarios, totalExecutivo: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                      placeholder="Ex: 5.000,00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Total Plano Completo</Label>
                    <Input 
                      value={contractFormData.honorarios.totalCompleto}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, honorarios: { ...prev.honorarios, totalCompleto: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                      placeholder="Ex: 8.500,00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Marco 1 — Entrada (30%)</Label>
                    <Input 
                      value={contractFormData.honorarios.marco1}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, honorarios: { ...prev.honorarios, marco1: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Marco 2 — Anteprojeto (40%)</Label>
                    <Input 
                      value={contractFormData.honorarios.marco2}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, honorarios: { ...prev.honorarios, marco2: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Marco 3 — Executivo (30%)</Label>
                    <Input 
                      value={contractFormData.honorarios.marco3}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, honorarios: { ...prev.honorarios, marco3: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                    />
                  </div>
                </div>
              </section>

              {/* DADOS FIXOS NL */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <MapPin size={14} className="text-bronze" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/60">DADOS FIXOS NL</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">CAU Leandro</Label>
                    <Input 
                      value={contractFormData.nl.cauLeandro}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, nl: { ...prev.nl, cauLeandro: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">CAU Neandro</Label>
                    <Input 
                      value={contractFormData.nl.cauNeandro}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, nl: { ...prev.nl, cauNeandro: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">CPF Neandro</Label>
                    <Input 
                      value={contractFormData.nl.cpfNeandro}
                      onChange={(e) => setContractFormData(prev => ({ ...prev, nl: { ...prev.nl, cpfNeandro: e.target.value } }))}
                      className="bg-black/20 border-white/10 rounded-none h-10"
                    />
                  </div>
                </div>
              </section>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/5">
              <Button 
                variant="outline"
                onClick={() => toast.info("Integração com ClickSign em breve. Baixe o PDF e envie manualmente.")}
                className="flex-1 border-white/10 hover:bg-white/5 text-white rounded-none uppercase text-[10px] tracking-widest h-12"
              >
                <Send size={16} className="mr-2" /> ENVIAR P/ ASSINATURA
              </Button>
              <Button 
                variant="outline"
                onClick={handleSaveToDropbox}
                disabled={loading || !contractFormData.cliente.nome}
                className="flex-1 border-white/10 hover:bg-white/5 text-white rounded-none uppercase text-[10px] tracking-widest h-12"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} className="mr-2" />} SALVAR NO DROPBOX
              </Button>
              <Button 
                onClick={handleGenerateContract} 
                disabled={loading || !contractFormData.cliente.nome} 
                className="flex-1 bg-bronze hover:bg-bronze/80 text-white rounded-none uppercase text-[10px] tracking-widest h-12 font-bold"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="mr-2" />} GERAR E BAIXAR PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        <Dialog open={isNewProjectModalOpen} onOpenChange={setIsNewProjectModalOpen}>
          <DialogContent className="bg-[#1A1816] border border-white/10 text-white rounded-none">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold uppercase tracking-widest">NOVO PROJETO NO DROPBOX</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">NOME DO CLIENTE</label>
                <Input 
                  value={newProjectClient}
                  onChange={(e) => setNewProjectClient(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="bg-black/20 border-white/10 rounded-none focus:ring-bronze text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">TIPO DE PROJETO</label>
                <Input 
                  value={newProjectType}
                  onChange={(e) => setNewProjectType(e.target.value)}
                  placeholder="Ex: Residencial"
                  className="bg-black/20 border-white/10 rounded-none focus:ring-bronze text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">IDENTIFICADOR (NOME)</label>
                <Input 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ex: Residência Modernista"
                  className="bg-black/20 border-white/10 rounded-none focus:ring-bronze text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreateNewProject} 
                disabled={!newProjectName || isCreatingProject} 
                className="bg-bronze hover:bg-bronze/80 text-white rounded-none w-full uppercase text-[10px] tracking-widest h-10 font-bold"
              >
                {isCreatingProject ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                CRIAR E GERAR ESTRUTURA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="bg-[#1A1816] border border-white/10 text-white rounded-none max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Trash2 size={16} className="text-red-500" /> CONFIRMAR EXCLUSÃO
              </DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <p className="text-[11px] text-white/60 leading-relaxed uppercase tracking-wider">
                Tem certeza que deseja apagar permanentemente este item? 
              </p>
              <p className="text-[10px] font-mono mt-4 p-3 bg-black/40 border border-white/5 break-all text-bronze/80">
                {pathToDelete}
              </p>
              <p className="text-[9px] text-red-500/60 mt-4 uppercase tracking-[0.2em] font-bold">
                ESTA AÇÃO NÃO PODE SER DESFEITA.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="ghost"
                onClick={() => setIsDeleteConfirmOpen(false)} 
                className="flex-1 rounded-none text-[10px] tracking-widest uppercase h-10 text-white/40 hover:text-white"
              >
                CANCELAR
              </Button>
              <Button 
                onClick={handleDeletePath} 
                disabled={isDeleting} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-none uppercase text-[10px] tracking-widest h-10"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : "EXCLUIR PERMANENTEMENTE"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default DocumentosContratos;
