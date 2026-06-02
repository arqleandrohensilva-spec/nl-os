import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Maximize2, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  DollarSign,
  FileText,
  Phone,
  MessageCircle,
  MoreVertical,
  Check
} from 'lucide-react';
import { format, parseISO, isBefore, startOfDay, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  { id: 'BRIEFING', label: '01 · BRIEFING & VIABILIDADE', items: ['Contrato assinado', 'Financeiro aprovado', 'Briefing preenchido', 'Levantamento técnico realizado'] },
  { id: 'CONCEITO', label: '02 · CONCEITO & MOODBOARD', items: ['Painel de referências', 'Definição de paleta de cores', 'Setores e fluxogramas', 'Aprovação do partido arquitetônico'] },
  { id: 'ESTUDO', label: '03 · ESTUDO PRELIMINAR (3D)', items: ['Modelagem 3D volumétrica', 'Imagens fotorrealistas', 'Definição de materiais', 'Aprovação visual do cliente'] },
  { id: 'EXECUTIVO', label: '04 · PROJETO EXECUTIVO', items: ['Plantas técnicas de construção', 'Pontos elétricos e hidráulicos', 'Paginação de pisos e revestimentos', 'Revisão técnica final'] },
  { id: 'DETALHAMENTO', label: '05 · DETALHAMENTO PREMIUM', items: ['Marcenaria detalhada', 'Marmoraria e pedras', 'Luminotécnico e gesso', 'Caderno de especificações (Mobiliário)'] },
  { id: 'ACOMPANHAMENTO', label: '06 · ACOMPANHAMENTO DE OBRA', items: ['Visita inicial de marcação', 'Relatório de evolução semanal', 'Gestão de fornecedores', 'Entrega final (As Built)'] }
];

const ProjetoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [issAliquota, setIssAliquota] = useState<number>(2);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: pData } = await supabase.from('projetos').select('*').eq('id', id).single();
      if (pData) setProjeto(pData);
      const { data: eData } = await supabase.from('projeto_etapas').select('*').eq('projeto_id', id).order('criado_em', { ascending: true });
      if (eData) setEtapas(eData);
      const { data: cData } = await supabase.from('projeto_checklist').select('*').eq('projeto_id', id);
      if (cData) setChecklist(cData);
    } catch (e) {
        console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  if (loading || !projeto) return <div className="text-white">Carregando...</div>;

  return (
    <div className="flex min-h-screen bg-[#0d0d0d] text-[#e8e8e8] font-sans">
      <Sidebar user="Equipe NL" />
      <main className="flex-1 ml-[230px] p-8">
        <header className="mb-12">
            <Button variant="ghost" onClick={() => navigate('/projetos/gestao')} className="text-[#555] hover:text-white px-0 hover:bg-transparent text-xs uppercase tracking-widest mb-6">
                <ArrowLeft className="mr-2" size={14} /> Voltar
            </Button>
            <div className="flex items-end justify-between">
                <div className="space-y-2">
                    <h1 className="text-[32px] font-['Georgia'] text-white">{projeto.nome_cliente}</h1>
                    <div className="flex items-center gap-4 text-[#555] font-['Courier_New'] text-[10px] uppercase">
                        <span className="text-[#8B7355]">{projeto.tipo}</span>
                        <span>{projeto.cidade} · {projeto.area_m2}m² · desde {projeto.data_inicio ? format(parseISO(projeto.data_inicio), 'dd/MM/yyyy') : ''}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-xs uppercase font-bold">
                        <span className={cn("w-2 h-2 rounded-full", projeto.status_geral === 'Ativo' ? 'bg-emerald-500' : 'bg-[#555]')}></span>
                        {projeto.status_geral}
                    </span>
                </div>
            </div>
        </header>

        {/* PROGRESS BAR */}
        <div className="mb-12">
            <div className="flex justify-between items-center px-2">
                {ETAPAS_CONFIG.map((config, index) => {
                    const etapaData = etapas.find(e => e.etapa === config.id);
                    const isDone = etapaData?.status === 'Aprovado';
                    const isCurrent = projeto.etapa_atual === config.id;
                    return (
                        <div key={config.id} className="flex flex-col items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full", isDone ? "bg-emerald-500" : isCurrent ? "bg-[#8B7355]" : "bg-[#555]")}></div>
                            <span className="text-[8px] text-[#555] uppercase tracking-widest">{config.label.split('·')[1].trim()}</span>
                        </div>
                    )
                })}
            </div>
            <div className="h-[2px] bg-[#222] mt-4">
                <div className="h-full bg-[#8B7355]" style={{ width: `${(ETAPAS_CONFIG.findIndex(e => e.id === projeto.etapa_atual) + 1) / ETAPAS_CONFIG.length * 100}%` }}></div>
            </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8">
            <section className="space-y-4">
                <h2 className="text-[#8B7355] text-xs uppercase tracking-widest font-bold mb-4">Etapas do Projeto</h2>
                <Accordion type="single" collapsible className="space-y-4">
                    {ETAPAS_CONFIG.map((config) => {
                        const etapaData = etapas.find(e => e.etapa === config.id);
                        return (
                          <AccordionItem key={config.id} value={config.id} className="border border-white/10 bg-[#141414] px-6 py-2 rounded-none">
                            <AccordionTrigger className="hover:no-underline text-xs">{config.label}</AccordionTrigger>
                            <AccordionContent className="text-xs text-[#555]">
                                {etapaData?.status}
                            </AccordionContent>
                          </AccordionItem>
                        );
                    })}
                </Accordion>
            </section>
            <section className="space-y-6">
                <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] p-6">
                    <h3 className="text-[#8B7355] text-xs font-bold uppercase mb-4">Financeiro</h3>
                    <p className="text-sm">Total: R$ {projeto.valor_total?.toLocaleString('pt-BR')}</p>
                    <Button className="w-full bg-transparent border border-[#8B7355] text-[#8B7355] mt-4 rounded-none uppercase text-[10px]">CONFIGURAR FINANCEIRO</Button>
                </div>
            </section>
        </div>
      </main>
    </div>
  );
};

export default ProjetoDetalhe;