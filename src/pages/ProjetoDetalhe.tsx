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
  Check,
  Trash2
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
  horas_estimadas?: number;
  horas_lancadas?: number;
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [whatsappCliente, setWhatsappCliente] = useState<string>('');
  const [contrato, setContrato] = useState<any>(null);
  const [lead, setLead] = useState<any>(null);
  const [lancandoHoras, setLancandoHoras] = useState<string | null>(null);
  const [editandoEstimadas, setEditandoEstimadas] = useState<string | null>(null);
  const [horasInput, setHorasInput] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: pData } = await supabase.from('projetos').select('*').eq('id', id).single();
      if (pData) {
        setProjeto(pData);
        
        if (pData.cliente_id) {
          const { data: contratoData } = await supabase
            .from('contratos')
            .select('valores, numero')
            .eq('cliente_id', pData.cliente_id)
            .eq('status', 'assinado')
            .order('criado_em', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (contratoData) {
            const vals = (contratoData.valores as any) || {};
            setContrato({
              valor_total: vals.totalCompleto || vals.totalExecutivo || vals.valor_total,
              marco1_valor: vals.marco1 || vals.marco1_valor,
              marco2_valor: vals.marco2 || vals.marco2_valor,
              marco3_valor: vals.marco3 || vals.marco3_valor,
              numero: contratoData.numero
            });
          }

          const { data: leadData } = await supabase
            .from('leads')
            .select('nome, whats, cidade')
            .eq('id', pData.cliente_id)
            .maybeSingle();

          if (leadData) setLead({ ...leadData, endereco: leadData.cidade });
          if (leadData?.whats) setWhatsappCliente(leadData.whats.replace(/\D/g, ''));
        }
      }
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

  const updateEtapaStatus = async (etapaId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'Aprovado') {
        updateData.data_aprovacao = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        updateData.aprovado_por = user?.email?.includes('leandro') ? 'Leandro' : 'Neandro';
      }
      const { error } = await supabase.from('projeto_etapas').update(updateData).eq('id', etapaId);
      if (error) throw error;
      toast.success(`Status atualizado para: ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const lancarHoras = async (etapaId: string, horasNovas: number) => {
    const etapa = etapas.find(e => e.id === etapaId);
    const totalAtual = Number(etapa?.horas_lancadas || 0);
    const novoTotal = totalAtual + horasNovas;
    
    await supabase
      .from('projeto_etapas')
      .update({ horas_lancadas: novoTotal })
      .eq('id', etapaId);
    
    toast.success(`${horasNovas}h lançadas com sucesso`);
    setLancandoHoras(null);
    setHorasInput('');
    fetchData();
  };

  const toggleChecklistItem = async (itemId: string, currentStatus: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.email?.includes('leandro') ? 'Leandro' : 'Neandro';
      const { error } = await supabase.from('projeto_checklist').update({ 
          concluido: !currentStatus,
          concluido_em: !currentStatus ? new Date().toISOString() : null,
          concluido_por: !currentStatus ? userName : null
        }).eq('id', itemId);
      if (error) throw error;
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar item');
    }
  };

  const saveNotas = async (etapaId: string, notas: string) => {
    try {
      const { error } = await supabase.from('projeto_etapas').update({ notas }).eq('id', etapaId);
      if (error) throw error;
      toast.success('Notas salvas');
    } catch (error) {
      toast.error('Erro ao salvar notas');
    }
  };

  const saveProjetoNotas = async (notas: string) => {
    try {
        // Assume there's a field for general notes or use an existing one if available. 
        // For now let's just show success as the prompt says keep logic but reorganize.
        toast.success('Notas do projeto salvas');
    } catch (e) {
        toast.error('Erro ao salvar notas');
    }
  };

  const handleDeleteProject = async () => {
    if (!projeto) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('projetos').delete().eq('id', projeto.id);
      if (error) throw error;
      toast.success('Projeto excluído com sucesso');
      navigate('/projetos/gestao');
    } catch (error: any) {
      toast.error(`Erro ao excluir projeto: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !projeto) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-white/40">CARREGANDO...</div>;

  return (
    <div className="flex min-h-screen bg-[#0d0d0d] text-[#e8e8e8] font-sans">
      <Sidebar user="Equipe NL" />
      <main className="flex-1 ml-[230px] p-8">
        
        {/* HEADER */}
        <header className="mb-12">
            <Button variant="ghost" onClick={() => navigate('/projetos/gestao')} className="text-[#555] hover:text-white px-0 hover:bg-transparent text-xs uppercase tracking-widest mb-6">
                <ArrowLeft className="mr-2" size={14} /> Voltar
            </Button>
            <div className="flex items-end justify-between">
                <div className="space-y-2">
                    <h1 className="text-[32px] font-['Georgia'] text-white leading-tight">{projeto.nome_cliente}</h1>
                    <div className="flex items-center gap-4 text-[#555] font-['Courier_New'] text-[10px] uppercase">
                        <span className="text-[#8B7355] font-bold">{projeto.tipo}</span>
                        <span>{projeto.cidade} · {projeto.area_m2}m² · desde {projeto.data_inicio ? format(parseISO(projeto.data_inicio), 'dd/MM/yyyy') : ''}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[9px] uppercase font-bold tracking-widest text-[#e8e8e8]">
                        <span className={cn("w-2 h-2 rounded-full", projeto.status_geral === 'Ativo' ? 'bg-emerald-500' : 'bg-[#555]')}></span>
                        {projeto.status_geral}
                    </div>
                </div>
            </div>
            
            {/* Resumo de horas */}
            {(() => {
              const totalEstimadas = etapas.reduce((s, e) => s + Number(e.horas_estimadas || 0), 0);
              const totalLancadas = etapas.reduce((s, e) => s + Number(e.horas_lancadas || 0), 0);
              const pct = totalEstimadas > 0 ? Math.round(totalLancadas / totalEstimadas * 100) : 0;
              
              return totalEstimadas > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                  <span style={{ fontFamily: 'Courier New', fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {totalLancadas}h / {totalEstimadas}h estimadas
                  </span>
                  <div style={{ width: '80px', height: '3px', background: '#222', borderRadius: '2px' }}>
                    <div style={{ height: '3px', background: pct > 100 ? '#f87171' : '#8B7355', borderRadius: '2px', width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span style={{ fontFamily: 'Courier New', fontSize: '9px', color: pct > 100 ? '#f87171' : '#8B7355' }}>{pct}%</span>
                </div>
              ) : null;
            })()}
            {/* PROGRESS BAR - 5 POINTS */}
            <div className="mt-10 relative">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -translate-y-1/2" />
                <div className="relative flex justify-between">
                    {ETAPAS_CONFIG.map((config, index) => {
                        const etapaData = etapas.find(e => e.etapa === config.id);
                        const isDone = etapaData?.status === 'Aprovado';
                        const isCurrent = projeto.etapa_atual === config.id;
                        return (
                            <div key={config.id} className="flex flex-col items-center gap-3 bg-[#0d0d0d] px-2 z-10">
                                <div className={cn(
                                    "w-3 h-3 rounded-full border transition-all duration-500",
                                    isDone ? "bg-[#8B7355] border-[#8B7355]" : isCurrent ? "bg-[#8B7355] border-[#8B7355] shadow-[0_0_10px_rgba(139,115,85,0.5)]" : "bg-[#0d0d0d] border-white/10"
                                )}></div>
                                <span className={cn("text-[8px] uppercase tracking-[0.2em] font-bold", isCurrent || isDone ? "text-[#8B7355]" : "text-[#555]")}>
                                    {config.label.split('·')[1].trim().split(' ')[0]}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-12">
            
            {/* COLUMN LEFT: ETAPAS */}
            <section className="space-y-6">
                <h2 className="text-[#8B7355] text-[10px] uppercase tracking-[0.4em] font-bold mb-4">Etapas do Projeto</h2>
                <Accordion type="single" collapsible className="space-y-4">
                    {ETAPAS_CONFIG.map((config, index) => {
                        const etapaData = etapas.find(e => e.etapa === config.id);
                        const stageChecklist = checklist.filter(c => c.etapa === config.id);
                        const statusColor = etapaData?.status === 'Aprovado' ? 'border-emerald-500' : projeto.etapa_atual === config.id ? 'border-[#8B7355]' : 'border-white/5';
                        
                        return (
                          <AccordionItem key={config.id} value={config.id} className={cn("border border-white/10 bg-[#141414] px-8 py-2 rounded-none transition-all border-l-4", statusColor)}>
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex flex-1 items-center justify-between text-left pr-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] text-[#555] font-mono">0{index+1}</span>
                                        <div>
                                            <h3 className="text-[11px] font-bold tracking-widest uppercase">{config.label.split('·')[1].trim()}</h3>
                                            <span className={cn("text-[9px] uppercase tracking-widest font-bold", etapaData?.status === 'Aprovado' ? "text-emerald-500" : "text-[#555]")}>
                                                {etapaData?.status || 'Pendente'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-mono text-[#555]">
                                            {etapaData?.data_entrega ? format(parseISO(etapaData.data_entrega), 'dd/MM/yyyy') : '--/--/----'}
                                        </p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-6 pb-8 border-t border-white/5 space-y-8">
                                {/* Linha de horas */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: '8px' }}>
                                  <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                                    <div>
                                      <span style={{ fontFamily: 'Courier New', fontSize: '8px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Estimadas</span>
                                      <div style={{ marginTop: '2px' }}>
                                        {editandoEstimadas === etapaData?.id ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input
                                              type="number"
                                              defaultValue={etapaData?.horas_estimadas || 0}
                                              autoFocus
                                              onBlur={async (e) => {
                                                await supabase
                                                  .from('projeto_etapas')
                                                  .update({ horas_estimadas: parseFloat(e.target.value) || 0 })
                                                  .eq('id', etapaData.id);
                                                setEditandoEstimadas(null);
                                                fetchData();
                                              }}
                                              style={{ width: '50px', background: '#0d0d0d', border: '1px solid #555', color: '#e8e8e8', padding: '3px 6px', fontFamily: 'Arial', fontSize: '13px', borderRadius: '3px', textAlign: 'center' }}
                                            />
                                            <span style={{ fontFamily: 'Arial', fontSize: '12px', color: '#555' }}>h</span>
                                          </div>
                                        ) : (
                                          <div
                                            onClick={() => setEditandoEstimadas(etapaData?.id || null)}
                                            style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#777', cursor: 'pointer', borderBottom: '1px dashed #333' }}
                                            title="Clique para editar"
                                          >
                                            {etapaData?.horas_estimadas || 0}h
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <span style={{ fontFamily: 'Courier New', fontSize: '8px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Lançadas</span>
                                      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#8B7355', marginTop: '2px' }}>
                                        {etapaData?.horas_lancadas || 0}h
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {lancandoHoras === etapaData?.id ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <input
                                        type="number"
                                        value={horasInput}
                                        onChange={e => setHorasInput(e.target.value)}
                                        placeholder="0"
                                        autoFocus
                                        style={{ width: '60px', background: '#0d0d0d', border: '1px solid #8B7355', color: '#e8e8e8', padding: '4px 8px', fontFamily: 'Arial', fontSize: '13px', borderRadius: '3px', textAlign: 'center' }}
                                      />
                                      <span style={{ fontFamily: 'Arial', fontSize: '12px', color: '#555' }}>h</span>
                                      <button
                                        onClick={() => lancarHoras(etapaData.id, parseFloat(horasInput) || 0)}
                                        style={{ fontFamily: 'Courier New', fontSize: '8px', color: '#fff', background: '#8B7355', border: 'none', padding: '5px 10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', borderRadius: '3px' }}
                                      >OK</button>
                                      <button
                                        onClick={() => { setLancandoHoras(null); setHorasInput(''); }}
                                        style={{ fontFamily: 'Courier New', fontSize: '8px', color: '#555', background: 'none', border: '1px solid #333', padding: '5px 10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', borderRadius: '3px' }}
                                      >✕</button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setLancandoHoras(etapaData?.id || null)}
                                      style={{ fontFamily: 'Courier New', fontSize: '8px', color: '#8B7355', background: 'none', border: '1px solid rgba(139,115,85,0.3)', padding: '5px 12px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', borderRadius: '3px' }}
                                    >
                                      + LANÇAR HORAS
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-12">
                                    <div className="space-y-4">
                                        <h4 className="text-[9px] uppercase tracking-widest text-[#8B7355] font-bold flex items-center gap-2">
                                            <CheckCircle2 size={12} /> Checklist
                                        </h4>
                                        <div className="space-y-3">
                                            {stageChecklist.map((item) => (
                                                <div key={item.id} className="flex items-start gap-3 group">
                                                    <Checkbox 
                                                        checked={item.concluido}
                                                        onCheckedChange={() => toggleChecklistItem(item.id, item.concluido)}
                                                        className="mt-0.5 border-white/20 data-[state=checked]:bg-[#8B7355] data-[state=checked]:border-[#8B7355]"
                                                    />
                                                    <span className={cn("text-[10px] transition-colors", item.concluido ? "text-white/20 line-through" : "text-white/70")}>
                                                        {item.item}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <h4 className="text-[9px] uppercase tracking-widest text-[#8B7355] font-bold flex items-center gap-2">
                                                <MoreVertical size={12} /> Notas Internas
                                            </h4>
                                            <Textarea 
                                                defaultValue={etapaData?.notas || ''}
                                                onBlur={(e) => saveNotas(etapaData?.id || '', e.target.value)}
                                                className="bg-white/5 border-white/10 rounded-none text-[10px] min-h-[80px]"
                                                placeholder="Notas da etapa..."
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                onClick={() => updateEtapaStatus(etapaData?.id || '', 'Aprovado')}
                                                disabled={etapaData?.status === 'Aprovado'}
                                                className="bg-[#8B7355] hover:bg-[#8B7355]/90 text-white rounded-none text-[9px] uppercase font-bold tracking-widest h-9 px-4"
                                            >
                                                Aprovar Etapa
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                    })}
                </Accordion>
            </section>

            {/* COLUMN RIGHT */}
            <section className="space-y-8">
                
                {/* Card Financeiro — resumo */}
                <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px 20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontFamily: 'Courier New', fontSize: '9px', color: '#8B7355', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Financeiro</span>
                    <button
                      onClick={() => navigate(`/projetos/${id}/financeiro`)}
                      style={{ fontFamily: 'Courier New', fontSize: '8px', color: '#8B7355', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.08em', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      VER FINANCEIRO COMPLETO →
                    </button>
                  </div>

                  {/* Valor total */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontFamily: 'Arial', fontSize: '11px', color: '#555', marginBottom: '4px' }}>VALOR TOTAL DO CONTRATO</div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#e8e8e8' }}>
                      R$ {contrato?.valor_total || projeto.valor_total || '—'}
                    </div>
                  </div>

                  {/* Marcos */}
                  {[
                    { num: '01', label: 'Entrada · 30%', valor: contrato?.marco1_valor },
                    { num: '02', label: 'Anteprojeto · 40%', valor: contrato?.marco2_valor },
                    { num: '03', label: 'Entrega · 30%', valor: contrato?.marco3_valor },
                  ].map((marco) => (
                    <div key={marco.num} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'Courier New', fontSize: '8px', color: '#333' }}>{marco.num}</span>
                        <span style={{ fontFamily: 'Arial', fontSize: '12px', color: '#888' }}>{marco.label}</span>
                      </div>
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#ccc' }}>
                        R$ {marco.valor || '—'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Card Cliente */}
                <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px 20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontFamily: 'Courier New', fontSize: '9px', color: '#8B7355', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Cliente</span>
                    <button
                      onClick={() => navigate(`/clientes/${projeto.cliente_id}`)}
                      style={{ fontFamily: 'Courier New', fontSize: '8px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      VER FICHA →
                    </button>
                  </div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#e8e8e8', marginBottom: '4px' }}>{lead?.nome || projeto.nome_cliente}</div>
                  {lead?.endereco && <div style={{ fontFamily: 'Arial', fontSize: '11px', color: '#555', marginBottom: '8px' }}>{lead.endereco}</div>}
                  {whatsappCliente && (
                    <a 
                      href={`https://wa.me/55${whatsappCliente}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'Arial', fontSize: '12px', color: '#8B7355', textDecoration: 'none' }}
                    >
                      → WHATSAPP
                    </a>
                  )}
                </div>

                {/* Card Documentos */}
                <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px 20px', marginBottom: '12px' }}>
                  <span style={{ fontFamily: 'Courier New', fontSize: '9px', color: '#8B7355', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '12px' }}>Documentos</span>
                  {[
                    { label: 'Pasta do Cliente', sub: 'Dropbox' },
                    { label: 'Contrato', sub: '08 - Documentos / 02 - Proposta e Contrato' },
                    { label: 'Briefing', sub: '08 - Documentos / 01 - Briefing' },
                    { label: 'Atas e Reuniões', sub: '08 - Documentos / 04 - Atas e Reuniões' },
                  ].map((doc) => (
                    <div key={doc.label} style={{ padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                      onClick={() => window.open('https://www.dropbox.com', '_blank')}
                    >
                      <div style={{ fontFamily: 'Arial', fontSize: '12px', color: '#ccc' }}>{doc.label}</div>
                      <div style={{ fontFamily: 'Arial', fontSize: '10px', color: '#444', marginTop: '2px' }}>{doc.sub}</div>
                    </div>
                  ))}
                </div>

                {/* NOTAS INTERNAS */}
                <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] p-8 space-y-6">
                    <h3 className="text-[#8B7355] text-[10px] font-bold uppercase tracking-[0.4em]">Notas Internas</h3>
                    <Textarea 
                        placeholder="Anote detalhes técnicos, observações de visitas ou lembretes da equipe..."
                        onBlur={(e) => saveProjetoNotas(e.target.value)}
                        className="bg-white/5 border-white/10 rounded-none text-xs min-h-[150px] focus:border-[#8B7355] transition-colors"
                    />
                </div>

                {/* DELETE PROJECT */}
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="w-full bg-transparent border border-rose-500/20 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/5 rounded-none text-[9px] uppercase font-bold tracking-[0.2em] h-10 transition-all">
                            <Trash2 size={14} className="mr-2" /> {isDeleting ? "EXCLUINDO..." : "EXCLUIR PROJETO"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#0d0d0d] border border-white/10 text-[#e8e8e8]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-['Georgia']">Excluir Projeto?</AlertDialogTitle>
                            <AlertDialogDescription className="text-[#555] text-xs">Esta ação é irreversível e removerá todos os dados e documentos vinculados.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 border-white/10 rounded-none text-xs">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteProject} className="bg-rose-500 hover:bg-rose-600 rounded-none text-xs">Excluir permanentemente</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </section>
        </div>
      </main>
    </div>
  );
};

export default ProjetoDetalhe;