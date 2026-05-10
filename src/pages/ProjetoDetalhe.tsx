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
  Check
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
import { toast } from "sonner";

interface Projeto {
  id: string;
  nome: string;
  nome_cliente: string;
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
    label: 'BRIEFING', 
    items: ['Contrato assinado', 'Entrada recebida', 'Briefing preenchido', 'Visita técnica realizada'] 
  },
  { 
    id: 'ANTEPROJETO', 
    label: 'ANTEPROJETO', 
    items: ['Plantas esquemáticas', 'Mood board', 'Apresentação ao cliente', 'Aprovação formal recebida'] 
  },
  { 
    id: 'EXECUTIVO', 
    label: 'PROJETO EXECUTIVO', 
    items: ['Todos os arquivos exportados', 'Revisão técnica concluída', 'Compatibilização realizada', 'Aprovação formal recebida'] 
  },
  { 
    id: 'ACOMPANHAMENTO', 
    label: 'ACOMPANHAMENTO DE OBRA', 
    items: ['Relatório de visita registrado', 'Fotos anexadas', 'Pendências documentadas', 'Comunicação com cliente realizada'] 
  }
];

const ProjetoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [horasReais, setHorasReais] = useState(0);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: pData } = await supabase.from('projetos').select('*').eq('id', id).single();
      if (pData) setProjeto(pData);

      const { data: eData } = await supabase.from('projeto_etapas').select('*').eq('projeto_id', id);
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

    // Also initialize checklist items if empty
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

  const updateEtapaStatus = async (etapaId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'Aprovado') {
        updateData.data_aprovacao = new Date().toISOString();
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
        <button 
          onClick={() => navigate('/projetos/gestao')}
          className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest font-bold mb-8 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Voltar para lista
        </button>

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
            
            <div className="flex flex-wrap gap-8 text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">
              <div className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
                <MapPin size={14} className="text-[#8B7355]" /> {projeto.cidade || 'Localização não definida'}
              </div>
              <div className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
                <Maximize2 size={14} className="text-[#8B7355]" /> {projeto.area_m2 ? `${projeto.area_m2} m²` : 'Área não definida'}
              </div>
              <div className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
                <Calendar size={14} className="text-[#8B7355]" /> Início: {format(parseISO(projeto.data_inicio), 'dd/MM/yyyy')}
              </div>
              <div className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
                <Clock size={14} className="text-[#8B7355]" /> Prazo: {projeto.prazo_final ? format(parseISO(projeto.prazo_final), 'dd/MM/yyyy') : 'Sob consulta'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-[#8B7355] uppercase tracking-[0.4em] mb-3 font-bold">Status do Ativo</p>
            <span className="text-3xl font-cormorant italic text-white leading-none">
              {projeto.status_geral}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Coluna Principal - Etapas */}
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
                    className="border border-white/5 bg-white/[0.01] px-10 py-4 rounded-none data-[state=open]:bg-white/[0.03] data-[state=open]:border-[#8B7355]/30 transition-all duration-500 overflow-hidden relative group"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#8B7355] scale-y-0 group-data-[state=open]:scale-y-100 transition-transform duration-500 origin-top" />
                    <AccordionTrigger className="hover:no-underline py-6">
                      <div className="flex flex-1 items-center justify-between text-left pr-8">
                        <div>
                          <h3 className="text-xs font-bold tracking-[0.2em] uppercase">{config.label}</h3>
                          <p className={cn("text-[9px] mt-1 font-bold uppercase tracking-widest", getEtapaColor(etapaData?.status || ''))}>
                            {etapaData?.status || 'Pendente'}
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
                        {/* Checklist */}
                        <div>
                          <h4 className="text-[9px] uppercase tracking-widest text-[#8B7355] font-bold mb-4 flex items-center gap-2">
                            <CheckCircle2 size={12} /> Checklist
                          </h4>
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

                        {/* Notas e Ações */}
                        <div className="space-y-6">
                          <div>
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

          {/* Coluna Lateral - Horas e Stats */}
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
      </main>
    </div>
  );
};

export default ProjetoDetalhe;