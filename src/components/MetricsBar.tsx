import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: React.ReactNode;
  pulse?: boolean;
  highlightBase?: boolean;
}

const MetricCard = ({ label, value, subLabel, pulse, highlightBase }: MetricCardProps) => (
  <div className="flex-1 px-8 py-6 relative border-r border-beige last:border-r-0">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[9px] text-muted uppercase tracking-[0.18em]">{label}</span>
      {pulse && <div className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" />}
    </div>
    <div className={cn(
      "text-[40px] font-cormorant leading-none",
      pulse && value !== 0 && value !== '0' ? "text-red" : "text-graphite"
    )}>
      {value}
    </div>
    {subLabel && <div className="mt-2 text-[9px] text-muted uppercase tracking-wider">{subLabel}</div>}
    
    <div className={cn(
      "absolute bottom-0 left-0 right-0 h-[1px]",
      highlightBase ? "bg-bronze opacity-100" : "bg-bronze opacity-20"
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
    if (!l.proxima_acao_data) return false;
    const today = new Date().toISOString().split('T')[0];
    return l.proxima_acao_data.startsWith(today);
  }).length;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex border-b border-beige bg-white">
      <MetricCard 
        label="Leads Ativos" 
        value={activeLeads} 
      />
      <MetricCard 
        label="Ticket Médio" 
        value={formatCurrency(averageTicket)}
        subLabel={
          <span className="flex items-center gap-1">
            vs mês anterior <TrendingUp className="w-3 h-3 text-green-600" /> <span className="text-green-600">12%</span>
          </span>
        }
      />
      <MetricCard 
        label="Em Negociação" 
        value={formatCurrency(inNegotiationValue)}
        subLabel={`Soma total de ${activeLeads} leads`}
      />
      <MetricCard 
        label="Follow-ups Hoje" 
        value={followUpsToday}
        pulse={followUpsToday > 0}
        highlightBase={followUpsToday > 0}
      />
    </div>
  );
};

export default MetricsBar;
