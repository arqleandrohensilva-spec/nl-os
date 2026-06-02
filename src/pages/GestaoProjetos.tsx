import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  Calendar, 
  AlertCircle, 
  Clock 
} from 'lucide-react';
import { format, isSameWeek, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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
  horas_estimadas: number;
}

interface EtapaInfo {
  etapa: string;
  status: string;
  data_entrega: string;
  data_inicio?: string;
}

const PREMIUM_STAGES = ['Briefing', 'Conceito', 'Est.Prel.', 'Executivo', 'Entrega'];

const GestaoProjetos = () => {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [etapas, setEtapas] = useState<Record<string, EtapaInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [totalHorasMes, setTotalHorasMes] = useState(0);
  const [projetoHoras, setProjetoHoras] = useState<Record<string, number>>({});

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

        const { data: phData } = await supabase
          .from('sessoes_horas')
          .select('projeto_id, duracao_minutos');
        
        if (phData) {
          const groupedHours = phData.reduce((acc: Record<string, number>, curr) => {
            const val = typeof curr.duracao_minutos === 'string' ? parseFloat(curr.duracao_minutos) : curr.duracao_minutos;
            const minutes = (Number.isNaN(val) ? 0 : (val || 0));
            acc[curr.projeto_id] = (acc[curr.projeto_id] || 0) + minutes;
            return acc;
          }, {});
          setProjetoHoras(groupedHours);
        }
      }

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

  const activeProjectsCount = projetos.filter(p => p.status_geral === 'ativo' || p.status_geral === 'Em andamento' || p.status_geral === 'Ativo').length;
  
  const deliveriesThisWeek = Object.values(etapas).flat().filter(e => {
    if (!e.data_entrega) return false;
    return isSameWeek(new Date(), parseISO(e.data_entrega), { weekStartsOn: 1 });
  }).length;

  const pendingApprovals = Object.values(etapas).flat().filter(e => e.status === 'Aguardando aprovação').length;

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white font-mono">
      <Sidebar user="Equipe NL" />
      
      <main className="flex-1 ml-[230px] p-12">
        <header className="mb-12">
          <h1 className="text-5xl font-cormorant font-light tracking-tight mb-2 italic">Gestão de Projetos</h1>
          <p className="text-[10px] tracking-[0.5em] text-[#8B7355] font-bold uppercase">PROJETOS ATIVOS · ETAPAS E ENTREGAS</p>
        </header>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <MetricCard label="Projetos Ativos" value={activeProjectsCount} />
          <MetricCard label="Entregas esta semana" value={deliveriesThisWeek} accent={deliveriesThisWeek > 0} />
          <MetricCard label="Aprovações pendentes" value={pendingApprovals} warning={pendingApprovals > 0} />
          <MetricCard label="Horas no mês" value={`${totalHorasMes}h`} />
        </div>

        {/* Projects List */}
        <div className="grid grid-cols-1 gap-2">
          {projetos.map(projeto => {
            const projetoEtapas = etapas[projeto.id] || [];
            const currentEtapaInfo = projetoEtapas.find(e => e.etapa.toLowerCase() === projeto.etapa_atual.toLowerCase());
            const daysRemaining = currentEtapaInfo?.data_entrega 
              ? differenceInDays(parseISO(currentEtapaInfo.data_entrega), new Date()) 
              : null;
            
            const horasTrabalhadas = Math.round((projetoHoras[projeto.id] || 0) / 60);
            const horasEstimadas = projeto.horas_estimadas || 80; // Fallback to 80 as seen in example

            return (
              <ProjectCard 
                key={projeto.id}
                projeto={projeto}
                currentEtapaInfo={currentEtapaInfo}
                daysRemaining={daysRemaining}
                horasTrabalhadas={horasTrabalhadas}
                horasEstimadas={horasEstimadas}
                onClick={() => navigate(`/projetos/detalhe/${projeto.id}`)}
              />
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

const MetricCard = ({ label, value, accent, warning }: { label: string, value: string | number, accent?: boolean, warning?: boolean }) => (
  <div className="bg-[#1a1a1a] border border-white/5 p-6 transition-all duration-300">
    <p className="text-[8px] tracking-[0.4em] text-[#8B7355] font-bold uppercase mb-2" style={{ fontFamily: "'Courier New', Courier, monospace" }}>{label}</p>
    <p className={cn(
      "text-4xl font-light font-cormorant",
      accent ? "text-[#8B7355]" : warning ? "text-rose-500" : "text-white"
    )}>{value}</p>
  </div>
);

const ProjectCard = ({ 
  projeto, 
  currentEtapaInfo, 
  daysRemaining, 
  horasTrabalhadas, 
  horasEstimadas,
  onClick 
}: { 
  projeto: Projeto, 
  currentEtapaInfo?: EtapaInfo, 
  daysRemaining: number | null, 
  horasTrabalhadas: number,
  horasEstimadas: number,
  onClick: () => void 
}) => {
  const healthColor = daysRemaining === null ? '#4ade80' : 
                     daysRemaining < 0 ? '#f87171' : 
                     daysRemaining < 7 ? '#fbbf24' : '#4ade80';

  const courierFont = { fontFamily: "'Courier New', Courier, monospace" };

  return (
    <div 
      onClick={onClick}
      className="bg-[#1a1a1a] border border-white/10 px-6 py-4 cursor-pointer hover:border-[#8B7355] transition-all duration-500 group relative"
    >
      {/* Top Header */}
      <div className="flex justify-between items-start mb-0.5">
        <h3 className="text-[18px] font-cormorant text-white uppercase tracking-tight leading-tight">
          {projeto.nome_cliente}
        </h3>
        <div className="flex items-center gap-6">
          <span className="text-[10px] text-[#8B7355] font-mono tracking-widest uppercase" style={courierFont}>
            {projeto.tipo || 'ARQ+INT'}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: healthColor }} />
            <span className="text-[10px] text-white font-mono tracking-widest uppercase" style={courierFont}>
              {projeto.status_geral || 'EM ANDAMENTO'}
            </span>
          </div>
        </div>
      </div>

      {/* Sub Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] text-[#777] font-mono tracking-widest uppercase" style={courierFont}>
          {projeto.cidade || 'N/A'} · {projeto.area_m2 ? `${projeto.area_m2}m²` : 'N/A'}
        </span>
        <span className="text-[10px] text-[#777] font-mono tracking-widest" style={courierFont}>
          desde {projeto.data_inicio ? format(parseISO(projeto.data_inicio), 'dd/MM/yyyy') : 'N/A'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-3 px-4">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/10" />
        <div className="flex justify-between items-center relative z-10">
          {PREMIUM_STAGES.map((stage) => {
            const isDone = PREMIUM_STAGES.indexOf(stage) < PREMIUM_STAGES.indexOf(projeto.etapa_atual);
            const isCurrent = stage.toLowerCase() === projeto.etapa_atual.toLowerCase();
            
            return (
              <div key={stage} className="flex flex-col items-center">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-500",
                  isDone ? "bg-[#8B7355]" : 
                  isCurrent ? "bg-[#8B7355] shadow-[0_0_12px_#8B7355]" : 
                  "bg-[#1a1a1a] border border-white/20"
                )}>
                  {isCurrent && (
                    <motion.div 
                      className="absolute w-2.5 h-2.5 rounded-full bg-[#8B7355]"
                      animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
                <span className="absolute top-6 text-[8px] uppercase tracking-[0.2em] text-[#8B7355] font-mono whitespace-nowrap" style={courierFont}>
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[7px] uppercase tracking-[0.3em] text-[#8B7355] font-bold mb-1" style={courierFont}>PRÓXIMA ENTREGA</p>
          <p className="text-[13px] font-mono text-white tracking-widest" style={courierFont}>
            {daysRemaining !== null ? (daysRemaining < 0 ? `Atrasado ${Math.abs(daysRemaining)}d` : `Em ${daysRemaining} dias`) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-[7px] uppercase tracking-[0.3em] text-[#8B7355] font-bold mb-1" style={courierFont}>ETAPA ATUAL</p>
          <p className="text-[13px] font-mono text-white tracking-widest" style={courierFont}>
            {projeto.etapa_atual}
          </p>
        </div>
        <div>
          <p className="text-[7px] uppercase tracking-[0.3em] text-[#8B7355] font-bold mb-1" style={courierFont}>HORAS</p>
          <p className="text-[13px] font-mono text-white tracking-widest" style={courierFont}>
            {horasTrabalhadas}h / {horasEstimadas}h
          </p>
        </div>
      </div>
    </div>
  );
};

export default GestaoProjetos;