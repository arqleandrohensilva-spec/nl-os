import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    positive: boolean;
  };
}

const MetricCard = ({ label, value, subValue, icon: Icon, trend }: MetricCardProps) => (
  <div className="flex-1 px-8 py-7 border-r border-beige last:border-r-0 group hover:bg-beige/10 transition-colors">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 border border-beige rounded-[2px] group-hover:border-bronze/30 transition-colors">
        <Icon className="w-4 h-4 text-bronze/60" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-medium tracking-tight",
          trend.positive ? "text-green-600" : "text-red-500"
        )}>
          {trend.positive ? <TrendingUp size={10} /> : <TrendingUp size={10} className="rotate-180" />}
          {trend.value}
        </div>
      )}
    </div>
    
    <div className="space-y-1">
      <p className="text-[9px] text-muted uppercase tracking-[0.2em] font-bold">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-[34px] font-cormorant text-graphite leading-none tracking-tight">{value}</h3>
        {subValue && <span className="text-[10px] text-muted font-medium uppercase tracking-tighter">{subValue}</span>}
      </div>
    </div>
  </div>
);

const MetricsBar = ({ leads }: { leads: any[] }) => {
  const activeLeads = leads.filter(l => l.stage !== 'Fechado' && l.stage !== 'Perdido');
  const totalValue = activeLeads.reduce((acc, l) => acc + (l.orcamento || 0), 0);
  const avgTicket = activeLeads.length > 0 ? totalValue / activeLeads.length : 0;
  
  const followUpsToday = leads.filter(l => {
    if (!l.proxima_acao_data) return false;
    const today = new Date().toISOString().split('T')[0];
    return l.proxima_acao_data.startsWith(today);
  }).length;

  const formatK = (val: number) => `R$ ${(val / 1000).toFixed(0)}k`;

  return (
    <div className="flex border-b border-beige bg-white">
      <MetricCard 
        label="Pipeline Ativo" 
        value={activeLeads.length} 
        subValue="Leads"
        icon={Users}
        trend={{ value: "+12%", positive: true }}
      />
      <MetricCard 
        label="Ticket Médio" 
        value={formatK(avgTicket)}
        icon={Target}
        trend={{ value: "Standard", positive: true }}
      />
      <MetricCard 
        label="Volume Total" 
        value={formatK(totalValue)}
        subValue="Estimated"
        icon={DollarSign}
      />
      <MetricCard 
        label="Urgências" 
        value={followUpsToday}
        subValue="Follow-ups"
        icon={TrendingUp}
        trend={{ value: "Immediate", positive: false }}
      />
    </div>
  );
};

export default MetricsBar;
