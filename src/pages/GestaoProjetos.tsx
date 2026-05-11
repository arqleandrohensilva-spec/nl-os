import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  LayoutGrid,
  List,
  MoreVertical,
  Share2,
  ExternalLink
} from 'lucide-react';
import { format, isSameWeek, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  data_inicio: string;
  prazo_final: string;
}

interface EtapaInfo {
  etapa: string;
  status: string;
  data_entrega: string;
  data_inicio?: string;
}

const GestaoProjetos = () => {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [etapas, setEtapas] = useState<Record<string, EtapaInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [totalHorasMes, setTotalHorasMes] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: pData } = await supabase
        .from('projetos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (pData) {
        setProjetos(pData);
        
        // Fetch stages for these projects
        const { data: eData } = await supabase
          .from('projeto_etapas')
          .select('projeto_id, etapa, status, data_entrega, data_inicio');
        
        if (eData) {
          const grouped = eData.reduce((acc: any, curr) => {
            if (!acc[curr.projeto_id]) acc[curr.projeto_id] = [];
            acc[curr.projeto_id].push(curr);
            return acc;
          }, {});
          setEtapas(grouped);
        }
      }

      // Fetch hours for the month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: hData } = await supabase
        .from('sessoes_horas')
        .select('duracao_minutos')
        .gte('inicio', startOfMonth.toISOString());

      if (hData) {
        const total = hData.reduce((acc, curr) => {
          const val = typeof curr.duracao_minutos === 'string' ? parseFloat(curr.duracao_minutos) : curr.duracao_minutos;
          return acc + (Number.isNaN(val) ? 0 : (val || 0));
        }, 0);
        setTotalHorasMes(Math.round(total / 60) || 0);
      }

    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeProjectsCount = projetos.filter(p => p.status_geral === 'Em andamento').length;
  
  const deliveriesThisWeek = Object.values(etapas).flat().filter(e => {
    if (!e.data_entrega) return false;
    return isSameWeek(new Date(), parseISO(e.data_entrega), { weekStartsOn: 1 });
  }).length;

  const pendingApprovals = Object.values(etapas).flat().filter(e => e.status === 'Aguardando aprovação').length;

  return (
    <div className="flex min-h-screen bg-[#0F0F0F] text-white">
      <Sidebar user="Equipe NL" />
      
      <main className="flex-1 ml-[230px] p-12">
        <header className="mb-12">
          <h1 className="text-5xl font-cormorant font-light tracking-tight mb-2 italic">06 · Gestão de Projetos</h1>
          <p className="text-h3">PROJETOS ATIVOS · ETAPAS E ENTREGAS</p>
        </header>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <MetricCard 
            label="Projetos Ativos" 
            value={activeProjectsCount} 
            icon={<LayoutGrid size={18} />} 
          />
          <MetricCard 
            label="Entregas esta semana" 
            value={deliveriesThisWeek} 
            icon={<Calendar size={18} />} 
            accent={deliveriesThisWeek > 0}
          />
          <MetricCard 
            label="Aprovações pendentes" 
            value={pendingApprovals} 
            icon={<AlertCircle size={18} />} 
            warning={pendingApprovals > 0}
          />
          <MetricCard 
            label="Horas no mês" 
            value={`${totalHorasMes}h`} 
            icon={<Clock size={18} />} 
          />
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {projetos.map(projeto => {
            const projetoEtapas = etapas[projeto.id] || [];
            const currentEtapaInfo = projetoEtapas.find(e => e.etapa.toUpperCase() === projeto.etapa_atual.toUpperCase());
            const daysRemaining = currentEtapaInfo?.data_entrega 
              ? differenceInDays(parseISO(currentEtapaInfo.data_entrega), new Date()) 
              : null;

            return (
              <div 
                key={projeto.id} 
                className="bg-white/[0.02] border border-white/5 p-10 flex flex-col md:flex-row items-center gap-12 group hover:bg-white/[0.04] hover:border-[#8B7355]/30 transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#8B7355] scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-h2 group-hover:text-bronze transition-colors">{projeto.nome_cliente}</h3>
                    <div className="h-px w-8 bg-[#8B7355]/30 group-hover:w-12 transition-all duration-500" />
                    <span className="text-h3">
                      {projeto.tipo}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-metadata uppercase tracking-widest font-bold">
                    <span>{projeto.cidade || 'N/A'}</span>
                    <span>{projeto.area_m2 ? `${projeto.area_m2}m²` : 'N/A'}</span>
                  </div>
                </div>

                <div className="w-full md:w-80">
                  <CompactTimeline projeto={projeto} projetoEtapas={projetoEtapas} />
                </div>

                <div className="w-full md:w-48 text-center md:text-left">
                  <p className="text-h3 mb-1">Próxima entrega</p>
                  <p className={cn(
                    "text-metadata font-bold",
                    daysRemaining !== null && daysRemaining <= 5 ? "text-rose-500" : "text-white"
                  )}>
                    {currentEtapaInfo?.data_entrega ? format(parseISO(currentEtapaInfo.data_entrega), "dd 'DE' MMM", { locale: ptBR }) : 'N/A'}
                    {daysRemaining !== null && (
                      <span className="ml-2 text-[9px] opacity-60">({daysRemaining} dias)</span>
                    )}
                  </p>
                </div>

                <div className="w-full md:w-32 flex flex-col items-center md:items-start">
                  <p className="text-h3 mb-1">Status</p>
                  <span className={cn(
                    "text-badge-status font-bold uppercase tracking-widest",
                    currentEtapaInfo?.status === 'Aprovado' ? "text-emerald-500" : 
                    currentEtapaInfo?.status === 'Aguardando aprovação' ? "text-amber-500" : "text-white/60"
                  )}>
                    {currentEtapaInfo?.status || 'Em andamento'}
                  </span>
                </div>

                <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
                  <Button 
                    onClick={() => {
                      toast.success("Link da Experiência Concierge copiado!", {
                        description: "O cliente receberá o acesso ao Atelier Visual."
                      });
                    }}
                    className="bg-white/5 hover:bg-white/10 text-bronze border border-bronze/20 rounded-none px-4 text-btn-primary transition-all duration-300"
                  >
                    <Share2 size={12} className="mr-2" /> Compartilhar
                  </Button>
                  <Button 
                    onClick={() => navigate(`/projetos/detalhe/${projeto.id}`)}
                    className="bg-white/5 hover:bg-bronze text-white border border-white/10 rounded-none px-6 text-btn-primary transition-all duration-300"
                  >
                    Abrir projeto
                  </Button>
                </div>
              </div>
            );
          })}

          {projetos.length === 0 && !loading && (
            <div className="text-center py-24 border border-dashed border-white/10">
              <p className="text-white/40 uppercase tracking-widest text-[11px]">Nenhum projeto ativo encontrado.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const MetricCard = ({ label, value, icon, accent, warning }: { label: string, value: string | number, icon: React.ReactNode, accent?: boolean, warning?: boolean }) => (
  <div className="bg-white/[0.02] border border-white/5 p-8 flex flex-col gap-4 relative overflow-hidden group hover:border-[#8B7355]/20 transition-all duration-500">
    <div className="absolute -right-4 -top-4 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
      {React.cloneElement(icon as React.ReactElement, { size: 64 })}
    </div>
    <div className={cn(
      "w-10 h-10 flex items-center justify-center border",
      accent ? "border-[#8B7355]/40 text-[#8B7355] bg-[#8B7355]/5" : 
      warning ? "border-rose-500/40 text-rose-500 bg-rose-500/5" : "border-white/10 text-white/30 bg-white/5"
    )}>
      {icon}
    </div>
    <div>
      <p className="text-h3 mb-2">{label}</p>
      <p className={cn(
        "text-highlight leading-none",
        accent ? "text-bronze" : warning ? "text-rose-500" : "text-white"
      )}>
        {value}
      </p>
    </div>
  </div>
);

const CompactTimeline = ({ projeto, projetoEtapas }: { projeto: Projeto, projetoEtapas: EtapaInfo[] }) => {
  const ETAPAS_ORDER = ['BRIEFING', 'ANTEPROJETO', 'EXECUTIVO', 'ACOMPANHAMENTO'];
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-h3">
          {projeto.etapa_atual}
        </span>
        <span className="text-metadata font-bold uppercase tracking-widest">
          Evolução do Ativo
        </span>
      </div>
      
      <div className="flex gap-1 h-[3px]">
        {ETAPAS_ORDER.map((etapaNome) => {
          const etapaData = projetoEtapas.find(e => e.etapa.toUpperCase() === etapaNome);
          const isCurrent = projeto.etapa_atual.toUpperCase() === etapaNome;
          const isDone = etapaData?.status === 'Aprovado';
          const isFuture = !isCurrent && !isDone;
          const isOverdue = etapaData?.data_entrega && 
                          new Date(etapaData.data_entrega) < new Date() && 
                          !isDone;

          return (
            <div 
              key={etapaNome}
              className={cn(
                "flex-1 transition-all duration-500",
                isDone ? "bg-[#3A3A3A]" : 
                isCurrent ? (isOverdue ? "bg-[#8B2020]" : "bg-[#8B7355]") :
                isFuture ? "bg-white/5" : "bg-white/5"
              )}
            />
          );
        })}
      </div>
      
      <div className="flex justify-between text-[7px] text-white/20 font-bold uppercase tracking-tighter">
        {ETAPAS_ORDER.map(e => (
          <span key={e} className={cn(projeto.etapa_atual.toUpperCase() === e && "text-[#8B7355]")}>
            {e.slice(0, 4)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default GestaoProjetos;