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
  MoreVertical
} from 'lucide-react';
import { format, isSameWeek, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
          .select('projeto_id, etapa, status, data_entrega');
        
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
        setTotalHorasMes(Math.round(total / 60));
      }

    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (etapa: string) => {
    const order = ['BRIEFING', 'ANTEPROJETO', 'EXECUTIVO', 'ACOMPANHAMENTO'];
    const index = order.indexOf(etapa.toUpperCase());
    if (index === -1) return 0;
    return ((index + 1) / 4) * 100;
  };

  const activeProjectsCount = projetos.filter(p => p.status_geral === 'Em andamento').length;
  
  const deliveriesThisWeek = Object.values(etapas).flat().filter(e => {
    if (!e.data_entrega) return false;
    return isSameWeek(new Date(), parseISO(e.data_entrega), { weekStartsOn: 1 });
  }).length;

  const pendingApprovals = Object.values(etapas).flat().filter(e => e.status === 'Aguardando aprovação').length;

  return (
    <div className="flex min-h-screen bg-[#1A1816] text-white font-mono">
      <Sidebar user="Equipe NL" />
      
      <main className="flex-1 ml-[230px] p-12">
        <header className="mb-12">
          <h1 className="text-4xl font-cormorant font-light tracking-tight mb-2">06 · Gestão de Projetos</h1>
          <p className="text-[10px] tracking-[0.4em] text-[#8B7355] font-bold uppercase">Projetos Ativos · Etapas e Entregas</p>
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
                className="bg-white/[0.03] border border-white/10 p-8 flex flex-col md:flex-row items-center gap-8 group hover:bg-white/[0.05] transition-all duration-300"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold truncate">{projeto.nome_cliente}</h3>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-white/5 border-white/10">
                      {projeto.tipo}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6 text-[10px] text-white/40 uppercase tracking-widest font-bold">
                    <span>{projeto.cidade || 'N/A'}</span>
                    <span>{projeto.area_m2 ? `${projeto.area_m2}m²` : 'N/A'}</span>
                  </div>
                </div>

                <div className="w-full md:w-64">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] text-[#8B7355] font-bold uppercase tracking-widest">
                      {projeto.etapa_atual}
                    </span>
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                      {Math.round(getProgress(projeto.etapa_atual))}%
                    </span>
                  </div>
                  <Progress value={getProgress(projeto.etapa_atual)} className="h-1 bg-white/10" />
                  <div className="flex gap-1 mt-2">
                    {['BRIEFING', 'ANTEPROJETO', 'EXECUTIVO', 'ACOMPANHAMENTO'].map(e => (
                      <div 
                        key={e} 
                        className={cn(
                          "flex-1 h-1", 
                          projeto.etapa_atual.toUpperCase() === e ? "bg-[#8B7355]" : 
                          getProgress(e) < getProgress(projeto.etapa_atual) ? "bg-[#8B7355]/40" : "bg-white/5"
                        )} 
                      />
                    ))}
                  </div>
                </div>

                <div className="w-full md:w-48 text-center md:text-left">
                  <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] mb-1 font-bold">Próxima entrega</p>
                  <p className={cn(
                    "text-xs font-bold",
                    daysRemaining !== null && daysRemaining <= 5 ? "text-rose-500" : "text-white"
                  )}>
                    {currentEtapaInfo?.data_entrega ? format(parseISO(currentEtapaInfo.data_entrega), "dd 'DE' MMM", { locale: ptBR }) : 'N/A'}
                    {daysRemaining !== null && (
                      <span className="ml-2 text-[9px] opacity-60">({daysRemaining} dias)</span>
                    )}
                  </p>
                </div>

                <div className="w-full md:w-32 flex flex-col items-center md:items-start">
                  <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] mb-1 font-bold">Status</p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    currentEtapaInfo?.status === 'Aprovado' ? "text-emerald-500" : 
                    currentEtapaInfo?.status === 'Aguardando aprovação' ? "text-amber-500" : "text-white/60"
                  )}>
                    {currentEtapaInfo?.status || 'Em andamento'}
                  </span>
                </div>

                <Button 
                  onClick={() => navigate(`/projetos/detalhe/${projeto.id}`)}
                  className="bg-white/5 hover:bg-[#8B7355] text-white border border-white/10 rounded-none px-6 text-[10px] uppercase font-bold tracking-widest transition-all duration-300"
                >
                  Abrir projeto
                </Button>
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
  <div className="bg-white/[0.03] border border-white/10 p-6 flex items-center gap-6">
    <div className={cn(
      "w-12 h-12 flex items-center justify-center border",
      accent ? "border-[#8B7355]/40 text-[#8B7355] bg-[#8B7355]/5" : 
      warning ? "border-rose-500/40 text-rose-500 bg-rose-500/5" : "border-white/10 text-white/20 bg-white/5"
    )}>
      {icon}
    </div>
    <div>
      <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-1 font-bold">{label}</p>
      <p className={cn(
        "text-2xl font-bold font-cormorant leading-none",
        accent ? "text-[#8B7355]" : warning ? "text-rose-500" : "text-white"
      )}>
        {value}
      </p>
    </div>
  </div>
);

export default GestaoProjetos;