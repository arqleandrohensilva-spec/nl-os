import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Maximize2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Save,
  User,
  History,
  Eye,
  EyeOff,
  ExternalLink,
  Image as ImageIcon,
  Check,
  DollarSign,
  Trash2
} from 'lucide-react';
import { format, parseISO, isBefore, startOfDay, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Projeto {
  id: string;
  nome: string;
  nome_cliente: string;
  cliente_id?: string;
  valor_total?: number;
  tipo: string;
  cidade: string;
  area_m2: number;
  etapa_atual: string;
  status_geral: string;
  data_inicio: string;
  prazo_final: string;
  horas_estimadas?: number;
  horas_briefing?: number;
  horas_conceito?: number;
  horas_anteprojeto?: number;
  horas_executivo?: number;
  horas_detalhamento?: number;
  horas_acompanhamento?: number;
}

interface Etapa {
  id: string;
  etapa: string;
  status: string;
  data_inicio: string;
  data_entrega: string;
  data_aprovacao: string;
  aprovado_por: string;
  notas: string;
  moodboard_url?: string;
}

interface ChecklistItem {
  id: string;
  etapa: string;
  item: string;
  concluido: boolean;
  concluido_em: string;
  concluido_por: string;
}

const ETAPAS_CONFIG = [
  { 
    id: 'BRIEFING', 
    label: '01 · BRIEFING & VIABILIDADE', 
    items: ['Contrato assinado', 'Financeiro aprovado', 'Briefing preenchido', 'Levantamento técnico realizado'] 
  },
  { 
    id: 'CONCEITO', 
    label: '02 · CONCEITO & MOODBOARD', 
    items: ['Painel de referências', 'Definição de paleta de cores', 'Setores e fluxogramas', 'Aprovação do partido arquitetônico'] 
  },
  { 
    id: 'ESTUDO', 
    label: '03 · ESTUDO PRELIMINAR (3D)', 
    items: ['Modelagem 3D volumétrica', 'Imagens fotorrealistas', 'Definição de materiais', 'Aprovação visual do cliente'] 
  },
  { 
    id: 'EXECUTIVO', 
    label: '04 · PROJETO EXECUTIVO', 
    items: ['Plantas técnicas de construção', 'Pontos elétricos e hidráulicos', 'Paginação de pisos e revestimentos', 'Revisão técnica final'] 
  },
  { 
    id: 'DETALHAMENTO', 
    label: '05 · DETALHAMENTO PREMIUM', 
    items: ['Marcenaria detalhada', 'Marmoraria e pedras', 'Luminotécnico e gesso', 'Caderno de especificações (Mobiliário)'] 
  },
  { 
    id: 'ACOMPANHAMENTO', 
    label: '06 · ACOMPANHAMENTO DE OBRA', 
    items: ['Visita inicial de marcação', 'Relatório de evolução semanal', 'Gestão de fornecedores', 'Entrega final (As Built)'] 
  }
];

const issAliquotas: Record<string, number> = {
  "são josé dos campos": 2,
  "taubaté": 2,
  "jacareí": 2,
  "campos do jordão": 2,
  "são paulo": 5,
  "campinas": 2,
  "guarulhos": 2,
  "santos": 5,
  "ribeirão preto": 2,
  "sorocaba": 2,
  "default": 2
};


const gerarResumo = (tipo: string, etapa: string, status: string) => {
  const normalizedTipo = (tipo || '').toLowerCase();
  const normalizedEtapa = (etapa || '').toUpperCase();
  const normalizedStatus = (status || '').toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const mappingEtapa: Record<string, string> = {
    'BRIEFING': 'briefing',
    'CONCEITO': 'briefing',
    'ESTUDO': 'anteprojeto',
    'EXECUTIVO': 'executivo',
    'DETALHAMENTO': 'executivo',
    'ACOMPANHAMENTO': 'acompanhamento'
  };

  const etapaKey = mappingEtapa[normalizedEtapa] || 'briefing';

  const textos: any = {
    arqint: {
      briefing: {
        "em_andamento": "Estamos mapeando o projeto completo — da estrutura aos acabamentos. Cada decisão de interiores precisa conversar com a arquitetura desde o início, não depois.",
        "aguardando_aprovacao": "O briefing completo está documentado. Sua confirmação alinha arquitetura e interiores antes de qualquer linha ser traçada.",
        "aprovado": "Briefing aprovado. Arquitetura e interiores seguem um único partido — definido antes da obra começar."
      },
      anteprojeto: {
        "em_andamento": "Estamos desenvolvendo a concepção espacial e o conceito de interiores em conjunto. O que você vê na tela é o que será executado.",
        "aguardando_aprovacao": "O anteprojeto integrado está pronto. Antes de aprovar, verifique se o espaço e os interiores representam o que você esperava — é aqui que ajustes custam zero.",
        "aprovado": "Anteprojeto aprovado. Partido arquitetônico e conceito de interiores validados."
      },
      executivo: {
        "em_andamento": "Estamos detalhando cada ambiente — revestimentos, marcenaria, iluminação e instalações compatibilizados em um único projeto. Nada será decidido na obra.",
        "aguardando_aprovacao": "O executivo completo está pronto para revisão. Cada detalhe de acabamento e cada ponto de instalação estão documentados.",
        "aprovado": "Executivo aprovado. Arquitetura e interiores prontos para execução sem improvisos."
      },
      acompanhamento: {
        "em_andamento": "Estamos acompanhando a execução da arquitetura e dos interiores. O que foi decidido no projeto está sendo verificado no canteiro.",
        "aguardando_aprovacao": "Relatório de visita disponível. Registramos o avanço da obra e conferimos se os acabamentos seguem o especificado.",
        "aprovado": "Visita registrada. Execução dentro do esperado."
      }
    },
    int: {
      briefing: {
        "em_andamento": "Estamos levantando suas referências, rotina e necessidades. Interiores bem executados começam por decisões bem documentadas — não por feeling.",
        "aguardando_aprovacao": "O briefing de interiores está completo. Sua aprovação confirma que entendemos o que você precisa antes de propor qualquer solução.",
        "aprovado": "Briefing aprovado. As diretrizes do projeto de interiores estão estabelecidas."
      },
      anteprojeto: {
        "em_andamento": "Estamos desenvolvendo o layout, o conceito e as primeiras definições de materiais. Cada escolha está sendo testada visualmente antes de qualquer compra.",
        "aguardando_aprovacao": "O anteprojeto de interiores está pronto para sua análise. É nesta etapa que ajustes de layout e conceito ainda não geram custo.",
        "aprovado": "Anteprojeto aprovado. Layout e conceito validados — o projeto avança para o detalhamento."
      },
      executivo: {
        "em_andamento": "Estamos detalhando marcenaria, revestimentos, iluminação e mobiliário. Cada especificação documentada agora evita retrabalho na execução.",
        "aguardando_aprovacao": "O executivo de interiores está finalizado. Este documento é o que o marceneiro, o revestidor e o eletricista vão seguir.",
        "aprovado": "Executivo aprovado. O projeto de interiores está pronto para execução."
      },
      acompanhamento: {
        "em_andamento": "Estamos verificando se a execução segue o projeto especificado — materiais, acabamentos e detalhes de marcenaria.",
        "aguardando_aprovacao": "Relatório de acompanhamento disponível. Conferimos o andamento e identificamos pontos de atenção na execução.",
        "aprovado": "Acompanhamento registrado. Execução dentro do especificado."
      }
    },
    comercial: {
      briefing: {
        "em_andamento": "Estamos mapeando o fluxo operacional, as necessidades técnicas e a identidade do negócio. Um projeto comercial eficiente começa por entender como o espaço precisa funcionar.",
        "aguardando_aprovacao": "O briefing comercial está documentado. Sua aprovação confirma que o programa de necessidades está correto antes de qualquer proposta espacial.",
        "aprovado": "Briefing aprovado. O programa do projeto comercial está definido."
      },
      anteprojeto: {
        "em_andamento": "Estamos desenvolvendo o layout operacional e a concepção do espaço. Fluxo de clientes, equipe e operação sendo testados antes de qualquer execução.",
        "aguardando_aprovacao": "O anteprojeto comercial está pronto. Verifique se o fluxo e a distribution dos ambientes atendem à operação do negócio.",
        "aprovado": "Anteprojeto aprovado. Conceito espacial e fluxo operacional validados."
      },
      executivo: {
        "em_andamento": "Estamos detalhando instalações, acabamentos e especificações técnicas. Projeto comercial executivo exige compatibilização precisa — cada sistema documentado antes da obra.",
        "aguardando_aprovacao": "O executivo comercial está finalizado. Este documento garante que a obra siga o projeto — sem decisões improvisadas no canteiro.",
        "aprovado": "Executivo aprovado. Projeto comercial pronto para execução."
      },
      acompanhamento: {
        "em_andamento": "Estamos acompanhando a execução e verificando conformidade com o projeto. Em obras comerciais, desvios identificados cedo custam menos para corrigir.",
        "aguardando_aprovacao": "Relatório de visita disponível. Registramos o andamento e as conformidades verificadas nesta etapa.",
        "aprovado": "Acompanhamento registrado. Execução dentro do projetado."
      }
    }
  };

  const projectTextos = textos[normalizedTipo] || textos['arqint'];
  const etapaTextos = projectTextos[etapaKey] || projectTextos['briefing'];
  
  return etapaTextos[normalizedStatus] || "Projeto em andamento. Acompanhe as etapas abaixo.";
};

const ProjetoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [horasReais, setHorasReais] = useState(0);
  const [clientMode, setClientMode] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [issAliquota, setIssAliquota] = useState<number>(2);
  const [isDeleting, setIsDeleting] = useState(false);


  const generatePDFReport = async () => {
    if (!projeto) return;
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const bronze: [number, number, number] = [139, 115, 85];
      const graphite: [number, number, number] = [58, 58, 58];
      
      // Header
      doc.setFont("georgia", "bold");
      doc.setFontSize(22);
      doc.setTextColor(graphite[0], graphite[1], graphite[2]);
      doc.text("NL ARQUITETOS", 105, 30, { align: "center" });
      
      doc.setFontSize(14);
      doc.text("Relatório de Entrega", 105, 40, { align: "center" });
      
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.setTextColor(bronze[0], bronze[1], bronze[2]);
      doc.text("A ARQUITETURA COMO DECISÃO", 105, 50, { align: "center" });
      
      // Divider
      doc.setDrawColor(bronze[0], bronze[1], bronze[2]);
      doc.setLineWidth(0.5);
      doc.line(20, 55, 190, 55);
      
      // Dados do Projeto
      doc.setFont("georgia", "bold");
      doc.setFontSize(12);
      doc.setTextColor(graphite[0], graphite[1], graphite[2]);
      doc.text("DADOS DO PROJETO", 20, 70);
      
      doc.setFont("arial", "normal");
      doc.setFontSize(10);
      const dataX = 20;
      let dataY = 80;
      doc.text(`Cliente: ${projeto.nome_cliente}`, dataX, dataY);
      doc.text(`Tipo: ${projeto.tipo}`, dataX + 80, dataY);
      dataY += 7;
      doc.text(`Cidade: ${projeto.cidade || 'N/A'}`, dataX, dataY);
      doc.text(`Área: ${projeto.area_m2 ? `${projeto.area_m2}m²` : 'N/A'}`, dataX + 80, dataY);
      dataY += 7;
      doc.text(`Início: ${format(parseISO(projeto.data_inicio), 'dd/MM/yyyy')}`, dataX, dataY);
      doc.text(`Entrega: ${projeto.prazo_final ? format(parseISO(projeto.prazo_final), 'dd/MM/yyyy') : 'N/A'}`, dataX + 80, dataY);
      
      // Linha do Tempo
      dataY += 15;
      doc.setFont("georgia", "bold");
      doc.setFontSize(12);
      doc.text("LINHA DO TEMPO EXECUTADA", 20, dataY);
      
      const timelineData = ETAPAS_CONFIG.map(config => {
        const e = etapas.find(et => et.etapa === config.id);
        const duration = e?.data_inicio && e?.data_aprovacao 
          ? Math.ceil((new Date(e.data_aprovacao).getTime() - new Date(e.data_inicio).getTime()) / (1000 * 60 * 60 * 24))
          : 'N/A';
        return [
          config.label,
          e?.data_inicio ? format(parseISO(e.data_inicio), 'dd/MM/yyyy') : '-',
          e?.data_aprovacao ? format(parseISO(e.data_aprovacao), 'dd/MM/yyyy') : '-',
          `${duration} dias`,
          'APROVADO'
        ];
      });
      
      autoTable(doc, {
        startY: dataY + 5,
        head: [['Etapa', 'Início', 'Aprovação', 'Duração', 'Status']],
        body: timelineData,
        headStyles: { fillColor: bronze, textColor: [255, 255, 255], font: 'arial', fontStyle: 'bold' },
        styles: { font: 'arial', fontSize: 9 },
        margin: { left: 20, right: 20 }
      });
      
      // Resumo de Horas
      dataY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFont("georgia", "bold");
      doc.setFontSize(12);
      doc.text("RESUMO DE HORAS", 20, dataY);
      
      doc.setFont("arial", "normal");
      doc.setFontSize(10);
      dataY += 8;
      const estimadas = projeto.horas_estimadas || 0;
      const variacao = horasReais - estimadas;
      doc.text(`Horas estimadas: ${estimadas}h`, 20, dataY);
      doc.text(`Horas realizadas: ${horasReais}h`, 80, dataY);
      doc.text(`Variação: ${variacao > 0 ? '+' : ''}${variacao}h`, 140, dataY);
      
      // Checklist
      dataY += 15;
      doc.setFont("georgia", "bold");
      doc.setFontSize(12);
      doc.text("CHECKLISTS CONCLUÍDOS", 20, dataY);
      
      const checklistData = checklist.map(c => [
        c.etapa,
        c.item,
        '✓'
      ]);
      
      autoTable(doc, {
        startY: dataY + 5,
        head: [['Módulo', 'Item', 'Conclusão']],
        body: checklistData,
        headStyles: { fillColor: graphite, textColor: [255, 255, 255], font: 'arial', fontStyle: 'bold' },
        styles: { font: 'arial', fontSize: 8 },
        margin: { left: 20, right: 20 }
      });
      
      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerY = 285;
        doc.setDrawColor(bronze[0], bronze[1], bronze[2]);
        doc.line(20, footerY - 5, 190, footerY - 5);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("NL Arquitetos · São José dos Campos, SP", 20, footerY);
        doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} · Protocolo ${projeto.id.slice(0, 8).toUpperCase()}`, 190, footerY, { align: "right" });
      }
      
      doc.save(`Relatorio_${projeto.nome_cliente.replace(/\s+/g, '_')}.pdf`);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setGeneratingPDF(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: pData } = await supabase.from('projetos').select('*').eq('id', id).single();
      if (pData) {
        setProjeto(pData);
        const city = (pData.cidade || '').toLowerCase().trim();
        setIssAliquota(issAliquotas[city] || issAliquotas.default);
      }


      const { data: eData } = await supabase.from('projeto_etapas').select('*').eq('projeto_id', id).order('criado_em', { ascending: true });
      if (eData) setEtapas(eData);

      const { data: cData } = await supabase.from('projeto_checklist').select('*').eq('projeto_id', id);
      if (cData) setChecklist(cData);

      // Fetch real hours
      const { data: hData } = await supabase.from('sessoes_horas').select('duracao_minutos').eq('projeto_id', id);
      if (hData) {
        const total = hData.reduce((acc, curr) => {
          const val = typeof curr.duracao_minutos === 'string' ? parseFloat(curr.duracao_minutos) : curr.duracao_minutos;
          return acc + (Number.isNaN(val) ? 0 : (val || 0));
        }, 0);
        setHorasReais(Math.round(total / 60));
      }

      // If stages don't exist, create them
      if (eData && eData.length === 0) {
        await initializeEtapas();
      }

    } catch (error) {
      console.error('Error fetching project detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeEtapas = async () => {
    const defaultEtapas = ETAPAS_CONFIG.map(config => ({
      projeto_id: id,
      etapa: config.id,
      status: 'Em andamento',
      data_inicio: new Date().toISOString().split('T')[0]
    }));

    const { data, error } = await supabase.from('projeto_etapas').insert(defaultEtapas).select();
    if (data) setEtapas(data);

    const defaultChecklist: any[] = [];
    ETAPAS_CONFIG.forEach(config => {
      config.items.forEach(item => {
        defaultChecklist.push({
          projeto_id: id,
          etapa: config.id,
          item,
          concluido: false
        });
      });
    });
    
    const { data: cData } = await supabase.from('projeto_checklist').insert(defaultChecklist).select();
    if (cData) setChecklist(cData);
  };

  const handleDeleteProject = async () => {
    if (!projeto) return;
    
    try {
      setIsDeleting(true);
      
      // 1. Delete folder from Dropbox
      const folderName = `${projeto.nome_cliente} - ${projeto.tipo}`;
      const projectPath = `/NL Arquitetos/07 - Projetos NL OS/${folderName}`;
      
      console.log("Excluindo pasta do Dropbox:", projectPath);
      
      const { data: dropboxData, error: dropboxError } = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'delete', path: projectPath }
      });

      if (dropboxError) {
        console.warn("Aviso: Erro ao excluir do Dropbox (pode ser que a pasta não exista):", dropboxError);
      }

      // 2. Delete project from database (cascading deletes will handle related tables if configured, 
      // but let's check foreign keys. We saw ON DELETE CASCADE in the schema check)
      const { error: dbError } = await supabase
        .from('projetos')
        .delete()
        .eq('id', projeto.id);

      if (dbError) throw dbError;

      toast.success('Projeto e pasta do Dropbox excluídos com sucesso');
      navigate('/projetos/gestao');
    } catch (error: any) {
      console.error('Erro ao excluir projeto:', error);
      toast.error(`Erro ao excluir projeto: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const updateEtapaStatus = async (etapaId: string, newStatus: string, approverName?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'Aprovado') {
        updateData.data_aprovacao = new Date().toISOString();
        if (approverName) {
          updateData.aprovado_por = approverName;
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          updateData.aprovado_por = user?.email?.includes('leandro') ? 'Leandro' : 'Neandro';
        }
      }

      const { error } = await supabase
        .from('projeto_etapas')
        .update(updateData)
        .eq('id', etapaId);

      if (error) throw error;
      
      toast.success(`Status atualizado para: ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const toggleChecklistItem = async (itemId: string, currentStatus: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.email?.includes('leandro') ? 'Leandro' : 'Neandro';

      const { error } = await supabase
        .from('projeto_checklist')
        .update({ 
          concluido: !currentStatus,
          concluido_em: !currentStatus ? new Date().toISOString() : null,
          concluido_por: !currentStatus ? userName : null
        })
        .eq('id', itemId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar item');
    }
  };

  const saveNotas = async (etapaId: string, notas: string) => {
    try {
      const { error } = await supabase
        .from('projeto_etapas')
        .update({ notas })
        .eq('id', etapaId);

      if (error) throw error;
      toast.success('Notas salvas');
    } catch (error) {
      toast.error('Erro ao salvar notas');
    }
  };

  const updateMoodboard = async (etapaId: string, url: string) => {
    try {
      const { error } = await supabase
        .from('projeto_etapas')
        .update({ moodboard_url: url })
        .eq('id', etapaId);

      if (error) throw error;
      toast.success('Conceito visual atualizado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar conceito');
    }
  };

  if (!projeto || loading) return <div className="min-h-screen bg-[#1A1816] flex items-center justify-center text-white/40 font-mono">CARREGANDO DETALHES...</div>;

  const getEtapaColor = (status: string) => {
    switch(status) {
      case 'Aprovado': return 'text-emerald-500';
      case 'Aguardando aprovação': return 'text-amber-500';
      default: return 'text-white/40';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#1A1816] text-white font-mono">
      <Sidebar user="Equipe NL" />
      
      <main className="flex-1 ml-[230px] p-12">
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => navigate('/projetos/gestao')}
            className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest font-bold hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Voltar para lista
          </button>

          <div className="flex gap-4">
            {projeto.etapa_atual === 'ACOMPANHAMENTO' && etapas.every(e => e.status === 'Aprovado') && (
              <Button
                onClick={() => generatePDFReport()}
                disabled={generatingPDF}
                className="bg-transparent hover:bg-[#8B7355]/10 text-[#8B7355] border border-[#8B7355] rounded-none px-6 h-10 text-[9px] uppercase font-bold tracking-[0.2em] transition-all duration-500"
              >
                {generatingPDF ? "GERANDO..." : "GERAR RELATÓRIO DE ENTREGA"}
              </Button>
            )}

            <Button 
              onClick={() => setClientMode(!clientMode)}
              className={cn(
                "rounded-none text-[9px] uppercase font-bold tracking-[0.2em] px-6 h-10 border transition-all duration-500",
                clientMode 
                  ? "bg-[#8B7355] text-white border-[#8B7355]" 
                  : "bg-white/5 text-white/40 border-white/10 hover:border-[#8B7355]/40 hover:text-white"
              )}
            >
              {clientMode ? (
                <span className="flex items-center gap-2 italic"><EyeOff size={14} /> Modo Atelier (Interno)</span>
              ) : (
                <span className="flex items-center gap-2 italic"><Eye size={14} /> Modo Concierge (Cliente)</span>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  disabled={isDeleting}
                  className="bg-transparent hover:bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-none px-6 h-10 text-[9px] uppercase font-bold tracking-[0.2em] transition-all duration-500"
                >
                  <Trash2 size={14} className="mr-2" /> {isDeleting ? "EXCLUINDO..." : "EXCLUIR PROJETO"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1A1816] border border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-cormorant italic text-2xl">Confirmar exclusão?</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/60 font-inter text-sm">
                    Esta ação é irreversível. O projeto será removido do NL OS e a pasta correspondente no Dropbox será permanentemente excluída.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5 rounded-none">Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteProject}
                    className="bg-rose-500 hover:bg-rose-600 text-white rounded-none"
                  >
                    Confirmar Exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Header do Projeto */}
        <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-10 pb-16 border-b border-white/5 relative">
          <div className="absolute -top-10 -left-10 text-[120px] font-cormorant text-white/[0.02] select-none pointer-events-none italic">
            Atelier
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-6 mb-4">
              <h1 className="text-6xl font-cormorant font-light tracking-tight italic">{projeto.nome_cliente}</h1>
              <div className="h-px w-12 bg-[#8B7355]/40" />
              <span className="text-[#8B7355] uppercase tracking-[0.3em] text-[10px] font-bold">
                {projeto.tipo}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-8 text-[11px] text-[#777777] uppercase font-normal font-inter">
              <div className="flex items-center gap-2 hover:text-[#FFFFFF] transition-colors cursor-default">
                <MapPin size={14} className="text-[#8B7355]" /> {projeto.cidade || 'Localização não definida'}
              </div>
              <div className="flex items-center gap-2 hover:text-[#FFFFFF] transition-colors cursor-default">
                <Maximize2 size={14} className="text-[#8B7355]" /> {projeto.area_m2 ? `${projeto.area_m2} m²` : 'Área não definida'}
              </div>
              <div className="flex items-center gap-2 hover:text-[#FFFFFF] transition-colors cursor-default">
                <Calendar size={14} className="text-[#8B7355]" /> Início: {format(parseISO(projeto.data_inicio), 'dd/MM/yyyy')}
              </div>
              <div className="flex items-center gap-2 hover:text-[#FFFFFF] transition-colors cursor-default">
                <Clock size={14} className="text-[#8B7355]" /> Prazo: {projeto.prazo_final ? format(parseISO(projeto.prazo_final), 'dd/MM/yyyy') : 'Sob consulta'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] text-[#777777] uppercase font-normal font-inter mb-3">Status do Ativo</p>
            <span className="text-3xl font-cormorant italic text-[#FFFFFF] leading-none">
              {projeto.status_geral}
            </span>
          </div>
        </header>

        <VisualTimeline projeto={projeto} etapas={etapas} />

        {clientMode ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Status do Projeto Card */}
            <div className="mb-12 bg-[#242220] p-8 border border-white/10 flex flex-col items-center text-center animate-in fade-in duration-1000">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#8B7355] font-bold mb-4">Status do Projeto</span>
              <p className="text-[15px] text-white font-inter leading-relaxed max-w-2xl">
                {gerarResumo(
                  projeto.tipo, 
                  projeto.etapa_atual, 
                  etapas.find(e => e.etapa === projeto.etapa_atual.toUpperCase())?.status || 'Em andamento'
                )}
              </p>
            </div>

            {/* Visual Experience Header */}
            <div className="mb-20 text-center space-y-4">
              <span className="text-[10px] uppercase tracking-[0.5em] text-[#8B7355] font-bold italic">Experiência do Cliente</span>
              <h2 className="text-5xl font-cormorant italic font-light">Evolução do seu Patrimônio</h2>
              <div className="flex justify-center gap-2">
                {ETAPAS_CONFIG.map((config) => {
                  const etapaData = etapas.find(e => e.etapa === config.id);
                  const isCurrent = projeto.etapa_atual.toUpperCase() === config.id;
                  const isDone = etapaData?.status === 'Aprovado';
                  
                  return (
                    <div key={config.id} className="flex items-center">
                      <div className={cn(
                        "w-3 h-3 rounded-full border transition-all duration-700",
                        isDone ? "bg-[#8B7355] border-[#8B7355]" : 
                        isCurrent ? "bg-[#8B7355]/40 border-[#8B7355] animate-pulse" : "bg-white/5 border-white/10"
                      )} />
                      {config.id !== 'ACOMPANHAMENTO' && (
                        <div className={cn("w-16 h-[1px]", isDone ? "bg-[#8B7355]/40" : "bg-white/5")} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
              <div className="space-y-12">
                <h3 className="text-[11px] uppercase tracking-[0.4em] text-[#8B7355] font-bold border-b border-[#8B7355]/20 pb-4">Conceitos e Atmosfera</h3>
                <div className="grid grid-cols-1 gap-8">
                  {etapas.filter(e => e.moodboard_url).map((e) => (
                    <div key={e.id} className="group relative overflow-hidden bg-[#242220] border border-white/10 p-6 hover:border-[#8B7355]/30 transition-all duration-500">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Ref: {e.etapa}</span>
                          <h4 className="text-xl font-cormorant italic">{ETAPAS_CONFIG.find(c => c.id === e.etapa)?.label}</h4>
                        </div>
                        {e.moodboard_url && (
                          <a href={e.moodboard_url} target="_blank" rel="noreferrer" className="text-[#8B7355] hover:text-white transition-colors">
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                      <div className="aspect-video bg-white/[0.01] border border-white/5 overflow-hidden relative">
                        {e.moodboard_url ? (
                          <img src={e.moodboard_url} alt="Concept" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/5 italic text-[10px] tracking-widest">Aguardando curadoria visual</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {etapas.filter(e => e.moodboard_url).length === 0 && (
                    <div className="py-20 text-center border border-dashed border-white/5">
                      <p className="text-[10px] uppercase tracking-widest text-white/20 italic font-bold">Nenhum conceito visual publicado ainda.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-12">
                <h3 className="text-[11px] uppercase tracking-[0.4em] text-[#8B7355] font-bold border-b border-[#8B7355]/20 pb-4">Timeline de Evolução</h3>
                <div className="space-y-12 relative">
                  <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-white/5" />
                  
                  {ETAPAS_CONFIG.map((config) => {
                    const etapaData = etapas.find(e => e.etapa === config.id);
                    const isCurrent = projeto.etapa_atual.toUpperCase() === config.id;
                    const isDone = etapaData?.status === 'Aprovado';
                    const isWaiting = etapaData?.status === 'Aguardando aprovação';

                    return (
                      <div key={config.id} className={cn(
                        "relative pl-12 transition-all duration-700",
                        !isDone && !isCurrent && !isWaiting ? "opacity-30 grayscale" : "opacity-100"
                      )}>
                        <div className={cn(
                          "absolute left-0 top-0 w-8 h-8 flex items-center justify-center border transition-all duration-500",
                          isDone ? "bg-[#8B7355] border-[#8B7355] text-white" : 
                          isCurrent || isWaiting ? "bg-white/5 border-[#8B7355] text-[#8B7355]" : "bg-white/5 border-white/10 text-white/20"
                        )}>
                          {isDone ? <Check size={14} /> : <Clock size={14} />}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold tracking-[0.1em] uppercase">{config.label}</h4>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                              {etapaData?.data_entrega ? format(parseISO(etapaData.data_entrega), 'MMM yyyy', { locale: ptBR }) : 'A definir'}
                            </span>
                          </div>
                          
                          <p className={cn(
                            "text-[10px] font-bold uppercase tracking-widest italic",
                            isDone ? "text-emerald-500" : isWaiting ? "text-amber-500" : "text-white/30"
                          )}>
                            {etapaData?.status || 'Em fila'}
                          </p>

                          {isWaiting && (
                            <div className="pt-4 animate-pulse">
                              <Button 
                                onClick={() => updateEtapaStatus(etapaData?.id || '', 'Aprovado', 'Cliente')}
                                className="w-full bg-[#8B7355] hover:bg-[#8B7355]/90 text-white rounded-none text-[9px] uppercase font-bold tracking-[0.3em] h-12"
                              >
                                Aprovar esta etapa
                              </Button>
                            </div>
                          )}
                          
                          {isDone && etapaData?.data_aprovacao && (
                            <p className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-widest">
                              Aprovado em {format(parseISO(etapaData.data_aprovacao), 'dd/MM/yyyy')} 
                              {etapaData.aprovado_por && ` por ${etapaData.aprovado_por}`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Atendimento Prime & Moodboard Link */}
                <div className="space-y-6">
                  <div className="bg-[#242220] border border-white/10 p-10 space-y-4">
                    <h4 className="text-[10px] uppercase tracking-[0.4em] text-[#8B7355] font-bold">Atendimento Prime</h4>
                    <p className="text-xs text-white/60 leading-relaxed italic font-light">
                      Sua jornada é única. Se desejar ajustes finos em qualquer uma das etapas acima, contate seu concierge via canal direto.
                    </p>
                  </div>

                  <div className="bg-[#242220] border border-white/10 p-10 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-[#8B7355]/10 border border-[#8B7355]/20 text-[#8B7355]">
                        <ImageIcon size={18} />
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase tracking-[0.4em] text-[#8B7355] font-bold">Moodboard Geral</h4>
                        <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest mt-1">Conceito Criativo Unificado</p>
                      </div>
                    </div>
                    
                    <p className="text-[11px] text-white/50 leading-relaxed italic">
                      Acesse a curadoria visual completa do seu projeto através do nosso board exclusivo de referências e inspirações.
                    </p>
                    
                    <Button 
                      onClick={() => {
                        const allMoodboards = etapas.filter(e => e.moodboard_url);
                        if (allMoodboards.length > 0) {
                          window.open(allMoodboards[0].moodboard_url, '_blank');
                        } else {
                          toast.info("A curadoria visual está sendo preparada pelo atelier.");
                        }
                      }}
                      className="w-full bg-transparent hover:bg-[#8B7355] text-[#8B7355] hover:text-white border border-[#8B7355]/30 rounded-none text-[9px] uppercase font-bold tracking-[0.3em] h-12 transition-all duration-500"
                    >
                      Acessar Board de Referências
                    </Button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in duration-700">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-[11px] uppercase tracking-[0.4em] text-[#8B7355] font-bold mb-6">Etapas do Projeto</h2>
              
              <Accordion type="single" collapsible className="space-y-4">
                {ETAPAS_CONFIG.map((config) => {
                  const etapaData = etapas.find(e => e.etapa === config.id);
                  const stageChecklist = checklist.filter(c => c.etapa === config.id);
                  
                  return (
                    <AccordionItem 
                      key={config.id} 
                      value={config.id} 
                      className="border border-white/10 bg-[#242220] px-10 py-4 rounded-none data-[state=open]:bg-white/[0.03] data-[state=open]:border-[#8B7355]/30 transition-all duration-500 overflow-hidden relative group"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#8B7355] scale-y-0 group-data-[state=open]:scale-y-100 transition-transform duration-500 origin-top" />
                      <AccordionTrigger className="hover:no-underline py-6">
                        <div className="flex flex-1 items-center justify-between text-left pr-8">
                          <div>
                            <h3 className="text-xs font-bold tracking-[0.2em] uppercase">{config.label}</h3>
                            <p className={cn("text-[9px] mt-1 font-bold uppercase tracking-widest", getEtapaColor(etapaData?.status || ''))}>
                              {etapaData?.status || 'Pendente'}
                              {etapaData?.status === 'Aprovado' && etapaData?.data_aprovacao && (
                                <span className="block text-[8px] opacity-60">
                                  {format(parseISO(etapaData.data_aprovacao), 'dd/MM/yyyy')} 
                                  {etapaData.aprovado_por && ` • ${etapaData.aprovado_por}`}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] text-white/20 uppercase font-bold">Previsão</p>
                            <p className="text-[10px] font-bold">
                              {etapaData?.data_entrega ? format(parseISO(etapaData.data_entrega), 'dd/MM/yyyy') : '--/--/----'}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-8 pt-4 border-t border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-[9px] uppercase tracking-widest text-[#8B7355] font-bold flex items-center gap-2">
                                <CheckCircle2 size={12} /> Checklist
                              </h4>
                              {stageChecklist.some(i => !i.concluido) && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={async () => {
                                    if (!projeto?.cliente_id) {
                                      toast.error("Cliente não vinculado a este projeto");
                                      return;
                                    }
                                    const { data: lead } = await supabase.from('leads').select('whats').eq('id', projeto.cliente_id).single();
                                    const whatsapp = lead?.whats?.replace(/\D/g, '');
                                    
                                    if (whatsapp) {
                                      const pendencias = stageChecklist.filter(i => !i.concluido).map(i => `· ${i.item}`).join('\n');
                                      const message = `Olá! Aqui é da NL Arquitetos. Gostaríamos de lembrar das seguintes pendências para a etapa ${config.label}:\n\n${pendencias}\n\nPodemos ajudar com algo?`;
                                      window.open(`https://wa.me/55${whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
                                    } else {
                                      toast.error("WhatsApp do cliente não encontrado");
                                    }
                                  }}
                                  className="h-6 text-[8px] uppercase tracking-widest text-[#8B7355] hover:text-[#8B7355] hover:bg-[#8B7355]/5 border border-[#8B7355]/20 rounded-none font-bold"
                                >
                                  Cobrar Pendências
                                </Button>
                              )}
                            </div>
                            <div className="space-y-3">
                              {stageChecklist.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 group">
                                  <Checkbox 
                                    id={item.id} 
                                    checked={item.concluido}
                                    onCheckedChange={() => toggleChecklistItem(item.id, item.concluido)}
                                    className="mt-0.5 border-white/20 data-[state=checked]:bg-[#8B7355] data-[state=checked]:border-[#8B7355]"
                                  />
                                  <div className="space-y-1">
                                    <label htmlFor={item.id} className={cn(
                                      "text-[10px] font-medium leading-none cursor-pointer transition-colors",
                                      item.concluido ? "text-white/30 line-through" : "text-white/80 group-hover:text-white"
                                    )}>
                                      {item.item}
                                    </label>
                                    {item.concluido && (
                                      <p className="text-[8px] text-white/20 italic">
                                        Concluído por {item.concluido_por} em {format(parseISO(item.concluido_em), 'dd/MM HH:mm')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div>
                              <h4 className="text-[9px] uppercase tracking-widest text-[#8B7355] font-bold mb-4 flex items-center gap-2">
                                <ImageIcon size={12} /> Conceito Visual (URL)
                              </h4>
                              <input 
                                type="text"
                                defaultValue={etapaData?.moodboard_url || ''}
                                onBlur={(e) => updateMoodboard(etapaData?.id || '', e.target.value)}
                                placeholder="Link do Pinterest, Drive ou Imagem..."
                                className="w-full bg-white/5 border border-white/10 rounded-none text-xs p-3 focus:outline-none focus:border-[#8B7355] placeholder:text-white/10 mb-6"
                              />

                              <h4 className="text-[9px] uppercase tracking-widest text-[#8B7355] font-bold mb-4 flex items-center gap-2">
                                <History size={12} /> Notas Internas
                              </h4>
                              <div className="relative">
                                <Textarea 
                                  defaultValue={etapaData?.notas || ''}
                                  onBlur={(e) => saveNotas(etapaData?.id || '', e.target.value)}
                                  placeholder="Registros da equipe (Leandro/Neandro)..."
                                  className="bg-white/5 border-white/10 rounded-none text-xs min-h-[100px] focus-visible:ring-[#8B7355] placeholder:text-white/10"
                                />
                              </div>
                            </div>

                            <div className="pt-4 flex flex-wrap gap-3">
                              <Button 
                                onClick={() => updateEtapaStatus(etapaData?.id || '', 'Aguardando aprovação')}
                                disabled={etapaData?.status === 'Aguardando aprovação' || etapaData?.status === 'Aprovado'}
                                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-none text-[9px] uppercase font-bold tracking-widest h-10 px-4"
                              >
                                Marcar como entregue
                              </Button>
                              <Button 
                                onClick={() => updateEtapaStatus(etapaData?.id || '', 'Aprovado')}
                                disabled={etapaData?.status === 'Aprovado'}
                                className="bg-[#8B7355] hover:bg-[#8B7355]/90 text-white rounded-none text-[9px] uppercase font-bold tracking-widest h-10 px-4"
                              >
                                Registrar aprovação
                              </Button>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>

            <div className="space-y-8">
              <h2 className="text-[11px] uppercase tracking-[0.4em] text-[#8B7355] font-bold mb-6">Eficiência</h2>
              
              <div className="bg-white/[0.01] border border-white/5 p-10 space-y-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B7355]/5 blur-3xl rounded-full -mr-16 -mt-16" />
                <div>
                  <p className="text-[10px] text-[#8B7355] uppercase tracking-[0.4em] mb-6 font-bold">Investimento Temporal</p>
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-5xl font-cormorant italic">{horasReais}h</span>
                    <div className="text-right">
                      <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest">Estimativa</p>
                      <p className="text-sm font-mono text-white/60">{projeto.horas_estimadas || 0}h</p>
                    </div>
                  </div>
                  
                  {projeto.horas_estimadas ? (
                    <>
                      <div className="w-full bg-white/5 h-1.5 rounded-none overflow-hidden mt-4">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000",
                            (horasReais / projeto.horas_estimadas) > 1 ? "bg-rose-500" : "bg-[#8B7355]"
                          )}
                          style={{ width: `${Math.min((horasReais / projeto.horas_estimadas) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[9px] mt-2 text-right font-bold uppercase tracking-widest text-white/40">
                        {Math.round((horasReais / projeto.horas_estimadas) * 100)}% do planejado
                      </p>
                    </>
                  ) : (
                    <p className="text-[9px] text-rose-500/60 uppercase mt-4 italic">Horas estimadas não configuradas no Módulo 03.</p>
                  )}
                </div>

                <div className="pt-8 border-t border-white/5">
                  <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] mb-4 font-bold">Equipe Responsável</p>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-none border border-[#8B7355]/30 bg-[#8B7355]/10 flex items-center justify-center text-[10px] font-bold text-[#8B7355]">LE</div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Leandro Sócio</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-none border border-[#8B7355]/30 bg-[#8B7355]/10 flex items-center justify-center text-[10px] font-bold text-[#8B7355]">NE</div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Neandro Sócio</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financeiro do Projeto - Internal Only */}
              <div className="bg-[#1A1816] border border-white/5 p-10 relative overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B7355]/5 blur-3xl rounded-full -mr-16 -mt-16" />
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-[0.4em] text-[#8B7355] font-bold mb-2 flex items-center gap-2">
                      <DollarSign size={12} /> Financeiro
                    </h4>
                  </div>
                  <Badge className="bg-[#8B7355]/20 text-[#8B7355] border-none text-[8px] tracking-widest rounded-none">CADASTRO</Badge>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-widest text-white/40 font-bold">Valor Total (R$)</label>
                    <Input 
                      type="number" 
                      className="bg-white/5 border-white/10 rounded-none h-10 text-xs"
                      placeholder="0,00"
                      value={projeto.valor_total || ''}
                      onChange={(e) => setProjeto(prev => prev ? {...prev, valor_total: parseFloat(e.target.value)} : null)}
                      onBlur={async () => {
                        if (projeto?.id && (projeto?.valor_total ?? 0) > 0) {
                          await supabase.from('projetos').update({ valor_total: projeto.valor_total }).eq('id', projeto.id);
                          toast.success('Valor total atualizado');
                        }
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[8px] uppercase tracking-widest text-white/40 font-bold">Entrada (R$)</label>
                      <Input 
                        type="number" 
                        id="valor_entrada"
                        className="bg-white/5 border-white/10 rounded-none h-10 text-xs"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] uppercase tracking-widest text-white/40 font-bold">Parcelas</label>
                      <Input 
                        type="number" 
                        id="num_parcelas"
                        className="bg-white/5 border-white/10 rounded-none h-10 text-xs"
                        placeholder="Ex: 4"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[8px] uppercase tracking-widest text-white/40 font-bold">Alíquota ISS (%)</label>
                      <span className="text-[7px] text-bronze uppercase font-bold italic">Alíquota sugerida. Confirme com seu contador.</span>
                    </div>
                    <Input 
                      type="number" 
                      className="bg-white/5 border-white/10 rounded-none h-10 text-xs"
                      value={issAliquota}
                      onChange={(e) => setIssAliquota(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 space-y-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest">
                      <span className="text-white/40">Valor Bruto</span>
                      <span className="font-bold">R$ {(projeto.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-bronze">
                      <span>ISS ({issAliquota}%)</span>
                      <span>- R$ {((projeto.valor_total || 0) * (issAliquota / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[11px] uppercase tracking-[0.2em] pt-2 border-t border-white/10">
                      <span className="text-white/40 font-bold">Valor Líquido</span>
                      <span className="font-bold">R$ {((projeto.valor_total || 0) * (1 - issAliquota / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-[#8B7355] hover:bg-[#8B7355]/90 text-white rounded-none text-[9px] uppercase font-bold tracking-widest h-10"
                    onClick={async () => {
                      const valorTotal = projeto?.valor_total;
                      const entrada = parseFloat((document.getElementById('valor_entrada') as HTMLInputElement)?.value || '0');
                      const numParcelas = parseInt((document.getElementById('num_parcelas') as HTMLInputElement)?.value || '1');
                      
                      if (!valorTotal || !numParcelas || !projeto) {
                        toast.error('Preencha os valores corretamente');
                        return;
                      }

                      const valorRestante = valorTotal - entrada;
                      const valorParcela = valorRestante / numParcelas;
                      const novasParcelas = [];

                      const calcParcelaInfo = (valor: number) => {
                        const issValor = valor * (issAliquota / 100);
                        const valorLiquido = valor - issValor;
                        return { iss_aliquota: issAliquota, iss_valor: issValor, valor_liquido: valorLiquido };
                      };

                      if (entrada > 0) {
                        novasParcelas.push({
                          projeto_id: projeto.id,
                          cliente_nome: projeto.nome_cliente,
                          numero_parcela: 1,
                          total_parcelas: numParcelas + 1,
                          valor: entrada,
                          data_vencimento: new Date().toISOString().split('T')[0],
                          status: 'EM ABERTO',
                          ...calcParcelaInfo(entrada)
                        });
                      }

                      for (let i = 1; i <= numParcelas; i++) {
                        const dataVenc = addMonths(new Date(), i);
                        const valorP = valorParcela;
                        novasParcelas.push({
                          projeto_id: projeto.id,
                          cliente_nome: projeto.nome_cliente,
                          numero_parcela: i + (entrada > 0 ? 1 : 0),
                          total_parcelas: numParcelas + (entrada > 0 ? 1 : 0),
                          valor: valorP,
                          data_vencimento: dataVenc.toISOString().split('T')[0],
                          status: 'EM ABERTO',
                          ...calcParcelaInfo(valorP)
                        });
                      }

                      const { error } = await supabase.from('financeiro_parcelas').insert(novasParcelas);
                      if (error) {
                        console.error('Error inserting parcelas:', error);
                        toast.error('Erro ao gerar parcelas');
                      } else {
                        toast.success('Parcelas geradas no Financeiro');
                      }
                    }}
                  >
                    Gerar Fluxo de Caixa
                  </Button>

                </div>
              </div>

              {/* Profitability Index - Internal Only */}
              <div className="bg-[#1A1816] border border-[#8B7355]/30 p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B7355]/5 blur-3xl rounded-full -mr-16 -mt-16" />
                
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-[0.4em] text-[#8B7355] font-bold mb-2">Índice de Lucratividade</h4>
                    <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest">Saúde Financeira do Ativo</p>
                  </div>
                  <Badge className="bg-[#8B7355]/20 text-[#8B7355] border-none text-[8px] tracking-widest rounded-none">INTERNO</Badge>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-4xl font-cormorant italic">
                      {projeto.horas_estimadas && horasReais > 0 
                        ? `${Math.max(0, Math.round((1 - (horasReais / projeto.horas_estimadas)) * 100))}%` 
                        : '100%'}
                    </span>
                    <div className="text-right">
                      <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest">Margem Operacional</p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Saudável</p>
                    </div>
                  </div>

                  <div className="w-full bg-white/5 h-[2px]">
                    <div 
                      className="h-full bg-[#8B7355] transition-all duration-1000"
                      style={{ width: `${projeto.horas_estimadas ? Math.max(0, (1 - (horasReais / projeto.horas_estimadas)) * 100) : 100}%` }}
                    />
                  </div>

                  <p className="text-[9px] text-white/40 leading-relaxed italic">
                    Este índice reflete a eficiência produtiva em relação ao investimento temporal planejado. Valores acima de 20% indicam alta performance.
                  </p>
                </div>
              </div>

              <div className="bg-[#8B7355]/5 border border-[#8B7355]/20 p-8">
                <div className="flex items-center gap-3 mb-4 text-[#8B7355]">
                  <AlertCircle size={16} />
                  <p className="text-[10px] uppercase tracking-widest font-bold">Notas Rápidas</p>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed italic">
                  Lembre-se de anexar as fotos da visita técnica no Google Drive compartilhado antes de marcar o Briefing como concluído.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const VisualTimeline = ({ projeto, etapas }: { projeto: Projeto, etapas: Etapa[] }) => {
  const ETAPAS_CONFIG_LOC = [
    { id: 'BRIEFING', label: 'BRIEFING' },
    { id: 'CONCEITO', label: 'CONCEITO' },
    { id: 'ESTUDO', label: 'ESTUDO' },
    { id: 'EXECUTIVO', label: 'EXECUTIVO' },
    { id: 'DETALHAMENTO', label: 'DETALHAMENTO' },
    { id: 'ACOMPANHAMENTO', label: 'OBRA' }
  ];

  return (
    <div className="mb-16 space-y-6">
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2" />
        
        <div className="relative flex justify-between">
          {ETAPAS_CONFIG_LOC.map((config, index) => {
            const etapaData = etapas.find(e => e.etapa === config.id);
            const isCurrent = projeto.etapa_atual === config.id;
            const isDone = etapaData?.status === 'Aprovado';
            const isFuture = !isCurrent && !isDone;
            const isOverdue = etapaData?.data_entrega && 
                            isBefore(parseISO(etapaData.data_entrega), startOfDay(new Date())) && 
                            !isDone;

            return (
              <div key={config.id} className="relative flex flex-col items-center flex-1">
                {isCurrent && (
                  <div className="absolute -top-8 text-[9px] text-[#8B7355] font-bold uppercase tracking-widest animate-bounce">
                    Você está aqui
                  </div>
                )}
                
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 z-10 transition-all duration-700 flex items-center justify-center",
                  isDone ? "bg-[#3A3A3A] border-[#3A3A3A]" :
                  isCurrent ? (isOverdue ? "bg-[#8B2020] border-[#8B2020] animate-pulse" : "bg-[#8B7355] border-[#8B7355] animate-pulse") :
                  "bg-[#1A1816] border-white/10"
                )}>
                  {isDone && <Check size={8} className="text-white" />}
                  {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>

                <div className="mt-4 text-center">
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    isCurrent ? "text-[#8B7355]" : isDone ? "text-white/60" : "text-white/20"
                  )}>
                    {config.label}
                  </p>
                  <p className="text-[8px] text-white/20 mt-1 font-bold">
                    {etapaData?.data_entrega ? format(parseISO(etapaData.data_entrega), 'dd/MM/yy') : '--/--/--'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProjetoDetalhe;
