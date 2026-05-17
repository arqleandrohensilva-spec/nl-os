import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Monitor, 
  X, 
  Check, 
  Clock, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
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
}

interface Etapa {
  id: string;
  etapa: string;
  status: string;
  data_inicio: string;
  data_entrega: string;
  data_aprovacao?: string;
  aprovado_por?: string;
  notas?: string;
}

interface ChecklistItem {
  id: string;
  etapa: string;
  item: string;
  concluido: boolean;
}

const ETAPAS_ORDER = ['BRIEFING', 'CONCEITO', 'ESTUDO', 'EXECUTIVO', 'DETALHAMENTO', 'ACOMPANHAMENTO'];

const ModoApresentacao = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Error fetching data for presentation mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEtapaStatus = async (etapaId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'Aprovado') {
        updateData.data_aprovacao = new Date().toISOString();
        updateData.aprovado_por = 'Cliente (Modo Apresentação)';
      }

      const { error } = await supabase
        .from('projeto_etapas')
        .update(updateData)
        .eq('id', etapaId);

      if (error) throw error;
      
      toast.success(newStatus === 'Aprovado' ? "Etapa aprovada com sucesso!" : "Solicitação de ajuste registrada.");
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao processar ação');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white/40 font-mono">PREPARANDO APRESENTAÇÃO...</div>;
  }

  if (!projeto) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white/40 font-mono">PROJETO NÃO ENCONTRADO</div>;
  }

  const etapaAtualData = etapas.find(e => e.etapa === projeto.etapa_atual.toUpperCase());
  const proxEtapaIndex = ETAPAS_ORDER.indexOf(projeto.etapa_atual.toUpperCase()) + 1;
  const proxEtapaNome = ETAPAS_ORDER[proxEtapaIndex];
  const proxEtapaData = etapas.find(e => e.etapa === proxEtapaNome);

  const daysRemaining = etapaAtualData?.data_entrega 
    ? differenceInDays(parseISO(etapaAtualData.data_entrega), new Date()) 
    : null;

  const entregues = etapas.filter(e => e.status === 'Aprovado');
  const proximas = etapas.filter(e => e.status !== 'Aprovado');

  const getStatusColor = (days: number | null) => {
    if (days === null) return "text-white/60";
    if (days > 7) return "text-emerald-500";
    if (days >= 3) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-inter p-12 md:p-20 flex flex-col gap-20 select-none overflow-x-hidden">
      {/* HEADER */}
      <header className="flex justify-between items-center w-full">
        <div className="text-2xl font-cormorant font-light tracking-widest italic text-white/80">
          NL ARQUITETOS
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="bg-white/5 border border-white/10 px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all rounded-none"
        >
          SAIR
        </button>
      </header>

      {/* BLOCO 1 - CABEÇALHO */}
      <section className="space-y-4">
        <p className="text-bronze text-sm uppercase tracking-[0.4em] font-bold">PROJETO</p>
        <h1 className="text-6xl md:text-8xl font-cormorant font-light italic leading-tight">{projeto.nome_cliente}</h1>
        <div className="flex gap-4 text-white/40 text-xl font-light">
          <span>{projeto.tipo}</span>
          <span>·</span>
          <span>{projeto.cidade}</span>
          <span>·</span>
          <span>{projeto.area_m2}m²</span>
        </div>
      </section>

      {/* BLOCO 2 - LINHA DO TEMPO */}
      <section className="space-y-12">
        <p className="text-bronze text-sm uppercase tracking-[0.4em] font-bold">JORNADA DO PROJETO</p>
        <div className="relative pt-8">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -translate-y-1/2" />
          <div className="relative flex justify-between">
            {ETAPAS_ORDER.map((etapaNome) => {
              const etapaData = etapas.find(e => e.etapa === etapaNome);
              const isCurrent = projeto.etapa_atual.toUpperCase() === etapaNome;
              const isDone = etapaData?.status === 'Aprovado';
              
              return (
                <div key={etapaNome} className="flex flex-col items-center gap-6 flex-1 text-center">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 z-10 transition-all duration-1000",
                    isDone ? "bg-bronze border-bronze" : 
                    isCurrent ? "bg-bronze/20 border-bronze animate-pulse shadow-[0_0_15px_rgba(139,115,85,0.4)]" : 
                    "bg-[#0A0A0A] border-white/20"
                  )}>
                    {isCurrent && <div className="w-full h-full rounded-full bg-bronze scale-50" />}
                  </div>
                  <div className="space-y-2">
                    <p className={cn(
                      "text-sm font-bold tracking-widest uppercase",
                      isCurrent ? "text-bronze" : isDone ? "text-white/80" : "text-white/20"
                    )}>
                      {etapaNome}
                    </p>
                    <p className="text-[10px] text-white/40 font-medium">
                      {isDone && etapaData?.data_aprovacao 
                        ? format(parseISO(etapaData.data_aprovacao), 'dd/MM/yyyy')
                        : etapaData?.data_entrega 
                          ? format(parseISO(etapaData.data_entrega), 'dd/MM/yyyy')
                          : <span className="text-white/30 italic">A definir</span>
                      }
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        <div className="space-y-20">
          {/* BLOCO 3 - ETAPA ATUAL */}
          <section className="bg-white/[0.02] border border-bronze/30 p-12 space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Clock size={80} />
            </div>
            <div className="space-y-2">
              <p className="text-bronze text-[10px] uppercase tracking-[0.4em] font-bold">ETAPA ATUAL</p>
              <h2 className="text-4xl font-cormorant italic font-light uppercase tracking-tight">{projeto.etapa_atual}</h2>
            </div>
            
            <div className="h-[1px] w-full bg-bronze/20" />
            
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-2">
                <p className="text-white/20 text-[10px] uppercase tracking-widest font-bold">Início</p>
                <p className="text-xl font-light">
                  {etapaAtualData?.data_inicio ? format(parseISO(etapaAtualData.data_inicio), 'dd/MM/yyyy') : <span className="text-white/30 italic">A definir</span>}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-white/20 text-[10px] uppercase tracking-widest font-bold">Próxima Entrega</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-xl font-light">
                    {etapaAtualData?.data_entrega ? format(parseISO(etapaAtualData.data_entrega), 'dd/MM/yyyy') : <span className="text-white/30 italic">A definir</span>}
                  </p>
                  {daysRemaining !== null && (
                    <span className={cn("text-xs font-bold uppercase tracking-widest", getStatusColor(daysRemaining))}>
                      {daysRemaining === 0 ? "Hoje" : daysRemaining < 0 ? "Em atraso" : `${daysRemaining} dias restantes`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* BLOCO 4 - ENTREGAS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <p className="text-bronze text-sm uppercase tracking-[0.4em] font-bold">JÁ ENTREGUE</p>
              <ul className="space-y-6">
                {entregues.map(e => (
                  <li key={e.id} className="flex items-center gap-4 text-white/80 text-lg">
                    <Check size={20} className="text-bronze" />
                    <span>{e.etapa} completo</span>
                  </li>
                ))}
                {entregues.length === 0 && (
                  <li className="text-white/20 italic">Iniciando jornada...</li>
                )}
              </ul>
            </div>
            <div className="space-y-8">
              <p className="text-bronze text-sm uppercase tracking-[0.4em] font-bold">PRÓXIMAS ENTREGAS</p>
              <ul className="space-y-6">
                {proximas.slice(0, 3).map(e => (
                  <li key={e.id} className="flex items-center gap-4 text-white/40 text-lg">
                    <div className="w-5 h-5 rounded-full border border-white/10" />
                    <div className="flex flex-col">
                      <span>{e.etapa}</span>
                      <span className="text-xs">{e.data_entrega ? format(parseISO(e.data_entrega), 'dd/MM') : <span className="text-white/30 italic">A definir</span>}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* BLOCO 5 - APROVAÇÕES PENDENTES */}
        <section className="space-y-12">
          <p className="text-bronze text-sm uppercase tracking-[0.4em] font-bold">APROVAÇÕES PENDENTES</p>
          
          {etapas.filter(e => e.status === 'Aguardando aprovação').length > 0 ? (
            <div className="space-y-8">
              {etapas.filter(e => e.status === 'Aguardando aprovação').map(e => (
                <div key={e.id} className="bg-white/[0.03] border border-bronze p-12 space-y-10 animate-pulse-subtle">
                  <div className="flex items-center gap-4 text-bronze uppercase tracking-[0.3em] font-bold text-sm">
                    <Clock size={18} /> AGUARDANDO SUA APROVAÇÃO
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-4xl font-cormorant italic font-light uppercase tracking-tight">{e.etapa}</h3>
                    <p className="text-white/40 text-sm">Enviado em {e.data_entrega ? format(parseISO(e.data_entrega), 'dd/MM/yyyy') : <span className="text-white/30 italic">A definir</span>}</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6">
                    <Button 
                      onClick={() => updateEtapaStatus(e.id, 'Aprovado')}
                      className="flex-1 bg-bronze hover:bg-bronze/80 text-white rounded-none h-16 text-xs uppercase font-bold tracking-[0.3em] transition-all"
                    >
                      APROVAR
                    </Button>
                    <Button 
                      onClick={() => updateEtapaStatus(e.id, 'Em andamento')}
                      variant="ghost"
                      className="flex-1 border border-white/10 hover:bg-white/5 text-white/60 hover:text-white rounded-none h-16 text-xs uppercase font-bold tracking-[0.3em] transition-all"
                    >
                      SOLICITAR AJUSTE
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border border-dashed border-white/5 p-20 text-center">
              <p className="text-white/20 italic text-xl">Não há aprovações pendentes no momento.</p>
            </div>
          )}
        </section>
      </div>

      {/* FOOTER DISCRETO */}
      <footer className="mt-auto pt-20 border-t border-white/5 flex justify-center items-center gap-4 text-xs text-white/20 uppercase tracking-widest font-bold">
        <span>PATRIMÔNIO EM EVOLUÇÃO</span>
        <span>·</span>
        <span>MODO APRESENTAÇÃO ATIVO</span>
      </footer>
    </div>
  );
};

export default ModoApresentacao;
