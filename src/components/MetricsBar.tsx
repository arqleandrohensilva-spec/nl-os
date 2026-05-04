import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: React.ReactNode;
  pulse?: boolean;
  highlightBase?: boolean;
  isNegative?: boolean;
}

const MetricCard = ({ label, value, subLabel, pulse, highlightBase, isNegative }: MetricCardProps) => (
  <div className="flex-1 px-8 py-7 border-r border-beige last:border-r-0 relative group hover:bg-beige/10 transition-colors">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[9px] text-muted uppercase tracking-[0.2em] font-bold">{label}</span>
      {pulse && <div className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" />}
    </div>
    
    <div className={cn(
      "text-[36px] font-cormorant leading-none tracking-tight",
      isNegative ? "text-red" : "text-graphite"
    )}>
      {value}
    </div>
    
    {subLabel && <div className="mt-3 text-[11px] font-bold uppercase tracking-wider">{subLabel}</div>}
    
    <div className={cn(
      "absolute bottom-0 left-0 right-0 h-[1px] transition-opacity",
      highlightBase ? "bg-bronze opacity-100" : "bg-bronze opacity-20 group-hover:opacity-40"
    )} />
  </div>
);

const MetricsBar = ({ leads }: { leads: any[] }) => {
  const metaFechamentos = 3;
  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  const fechadosMes = leads.filter(l => {
    if (l.stage !== 'Fechado' || !l.fechado_em) return false;
    const dataFechamento = parseISO(l.fechado_em);
    return dataFechamento.getMonth() === mesAtual && dataFechamento.getFullYear() === anoAtual;
  }).length;

  const percentualMeta = Math.min((fechadosMes / metaFechamentos) * 100, 100);
  
  const corMeta = fechadosMes >= metaFechamentos 
    ? "bg-green-600" 
    : (percentualMeta < 50 ? "bg-red" : "bg-bronze");
  
  const corTextoMeta = fechadosMes >= metaFechamentos 
    ? "text-green-600" 
    : (percentualMeta < 50 ? "text-red" : "text-bronze");
  const activeLeads = leads.filter(l => l.stage !== 'Fechado' && l.stage !== 'Perdido').length;
  
  const inNegotiationValue = leads
    .filter(l => l.stage !== 'Fechado' && l.stage !== 'Perdido')
    .reduce((acc, l) => acc + (l.orcamento || 0), 0);

  const stageWeights: Record<string, number> = {
    'Novo Lead': 0.1,
    'Reunião Agendada': 0.3,
    'Proposta Enviada': 0.6,
    'Negociação': 0.85,
    'Fechado': 1.0,
    'Perdido': 0
  };

  const weightedValue = leads.reduce((acc, l) => {
    const weight = stageWeights[l.stage] || 0;
    return acc + ((l.orcamento || 0) * weight);
  }, 0);

  const averageTicket = activeLeads > 0 ? inNegotiationValue / activeLeads : 0;
  
  const followUpsToday = leads.filter(l => {
    const hasNoLogs = !l.logs || l.logs.length === 0;
    if (l.stage === 'Novo Lead' && hasNoLogs) return true;
    if (l.stage === 'Proposta Enviada') {
      const daysInStage = differenceInDays(new Date(), parseISO(l.etapa_desde));
      if (daysInStage > 2 && hasNoLogs) return true;
    }
    return false;
  }).length;

  const formatCleanValue = (val: number) => {
    if (val >= 1000000) {
      return `R$ ${(val / 1000000).toFixed(1).replace('.', ',')}M`;
    }
    if (val === 0) return "R$ 0";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val).replace('R$', 'R$ ');
  };

  return (
    <div className="flex flex-col bg-white border-b border-beige">
      <div className="flex border-b border-beige/50">
        <div className="flex-1 px-10 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em]">Meta do Mês:</span>
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", corTextoMeta)}>
              {fechadosMes} de {metaFechamentos} projetos fechados
            </span>
          </div>
          <div className="flex-1 max-w-md ml-8 h-1 bg-[#E8E4DF] rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-1000", corMeta)} 
              style={{ width: `${percentualMeta}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex">
        <MetricCard 
          label="LEADS ATIVOS" 
          value={activeLeads} 
        />
        <MetricCard 
          label="TICKET MÉDIO" 
          value={formatCleanValue(averageTicket)}
          subLabel={
            <span className="flex items-center gap-1.5 text-emerald-600">
              +12% vs mês anterior <TrendingUp size={12} />
            </span>
          }
        />
      <MetricCard 
        label="FORECAST PONDERADO" 
        value={formatCleanValue(weightedValue)}
        subLabel={<span className="text-bronze opacity-80 font-bold flex items-center gap-1">Probabilidade média <TrendingUp size={10} /></span>}
        highlightBase
      />
      <MetricCard 
        label="FOLLOW-UPS HOJE" 
        value={followUpsToday}
        pulse={followUpsToday > 0}
        highlightBase={followUpsToday > 0}
        isNegative={followUpsToday > 0}
      />
      </div>
    </div>
  );
};

export default MetricsBar;
