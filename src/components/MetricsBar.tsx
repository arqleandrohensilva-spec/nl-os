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
  const activeLeads = leads.filter(l => l.stage !== 'Fechado' && l.stage !== 'Perdido').length;
  
  const inNegotiationValue = leads
    .filter(l => l.stage !== 'Fechado' && l.stage !== 'Perdido')
    .reduce((acc, l) => acc + (l.orcamento || 0), 0);

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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val).replace('R$', 'R$ ');
  };

  return (
    <div className="flex border-b border-beige bg-white">
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
        label="EM NEGOCIAÇÃO" 
        value={formatCleanValue(inNegotiationValue)}
        subLabel={<span className="text-muted opacity-60 font-medium">estimado</span>}
      />
      <MetricCard 
        label="FOLLOW-UPS HOJE" 
        value={followUpsToday}
        pulse={followUpsToday > 0}
        highlightBase={followUpsToday > 0}
        isNegative={followUpsToday > 0}
      />
    </div>
  );
};

export default MetricsBar;
