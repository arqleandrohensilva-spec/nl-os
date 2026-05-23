import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Briefcase,
  FileText,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FinanceiroVisaoGeral = () => {
  const today = new Date();
  const startMonth = startOfMonth(today).toISOString();
  const endMonth = endOfMonth(today).toISOString();
  const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Queries
  const { data: proposals = [] } = useQuery({
    queryKey: ['financeiro-comercial-proposals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('proposals')
        .select('id, status, created_at, proposal_views');
      return data || [];
    }
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['financeiro-comercial-leads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, stage, valor_estimado');
      return data || [];
    }
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['financeiro-projetos-ativos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projetos')
        .select('id, status')
        .eq('status', 'ativo');
      return data || [];
    }
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['financeiro-parcelas-visao-geral'],
    queryFn: async () => {
      const { data } = await supabase
        .from('financeiro_parcelas')
        .select('*')
        .order('data_vencimento', { ascending: true });
      return data || [];
    }
  });

  const { data: officeConfig } = useQuery({
    queryKey: ['config-escritorio'],
    queryFn: async () => {
      const { data } = await supabase
        .from('config_escritorio')
        .select('*')
        .maybeSingle();
      return data;
    }
  });

  const { data: costs = [] } = useQuery({
    queryKey: ['custos-escritorio'],
    queryFn: async () => {
      const { data } = await supabase
        .from('custos_escritorio')
        .select('*');
      return data || [];
    }
  });

  // Calculations
  const proposalsThisMonth = proposals.filter(p => p.created_at >= startMonth && p.created_at <= endMonth);
  const totalProposals = proposals.length;
  const viewedProposals = proposals.filter(p => (p.proposal_views || 0) > 0).length;
  const openRate = totalProposals > 0 ? (viewedProposals / totalProposals) * 100 : 0;
  
  const approvedProposals = proposals.filter(p => p.status === 'aprovada').length;
  const approvalRate = totalProposals > 0 ? (approvedProposals / totalProposals) * 100 : 0;

  const totalInNegotiation = leads
    .filter(l => !['FECHADO', 'PERDIDO', 'Fechado', 'Perdido'].includes(l.stage || ''))
    .reduce((acc, curr) => acc + (Number(curr.valor_estimado) || 0), 0);

  const activeProjectsCount = projects.length;
  
  const incomingThisMonth = installments
    .filter(p => p.data_vencimento >= startMonth && p.data_vencimento <= endMonth && p.status === 'pendente')
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  const confirmedThisMonth = installments
    .filter(p => p.data_vencimento >= startMonth && p.data_vencimento <= endMonth && p.status === 'pago')
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  const overdueInstallments = installments.filter(p => 
    p.status === 'pendente' && isAfter(today, new Date(p.data_vencimento))
  );

  const upcomingInstallments = installments.filter(p => 
    p.status === 'pendente' && 
    p.data_vencimento >= today.toISOString().split('T')[0] && 
    p.data_vencimento <= next7Days.split('T')[0]
  );

  const monthlyFixedCosts = costs.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const margin = confirmedThisMonth - monthlyFixedCosts;

  const Card = ({ title, value, subtitle, icon: Icon, trend, trendValue }: any) => (
    <div className="bg-[#161616] border border-white/5 p-6 rounded-sm">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] text-[#8B7355] font-mono tracking-widest uppercase">{title}</span>
        <div className="p-2 bg-white/5 rounded-sm">
          <Icon size={16} className="text-[#8B7355]" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={cn(
              "text-[10px] flex items-center",
              trend === 'up' ? "text-emerald-500" : "text-rose-500"
            )}>
              {trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {trendValue}
            </span>
          )}
          <p className="text-[10px] text-white/40 uppercase tracking-tighter font-mono">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D0D0D] p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex justify-between items-end border-b border-white/5 pb-6">
          <div>
            <span className="text-[10px] text-[#8B7355] font-mono tracking-[0.3em] uppercase mb-2 block">Módulo Administrativo</span>
            <h1 className="text-4xl font-bold text-white tracking-tighter uppercase italic">Visão Geral <span className="text-[#8B7355] font-normal not-italic">Financeira</span></h1>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white/40 font-mono uppercase block">{format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
            <span className="text-[10px] text-white/20 font-mono uppercase block">Última atualização: {format(today, 'HH:mm')}</span>
          </div>
        </header>

        {/* COMERCIAL */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase size={14} className="text-[#8B7355]" />
            <h2 className="text-[10px] text-white/80 font-bold tracking-[0.2em] uppercase">Bloco Comercial</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              title="Propostas Enviadas" 
              value={proposalsThisMonth.length}
              subtitle="Este mês"
              icon={FileText}
            />
            <Card 
              title="Taxa de Abertura" 
              value={`${openRate.toFixed(1)}%`}
              subtitle={`${viewedProposals} de ${totalProposals} visualizadas`}
              icon={TrendingUp}
            />
            <Card 
              title="Taxa de Aprovação" 
              value={`${approvalRate.toFixed(1)}%`}
              subtitle={`${approvedProposals} propostas fechadas`}
              icon={Users}
            />
            <Card 
              title="Em Negociação" 
              value={totalInNegotiation.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              subtitle="Leads ativos no pipeline"
              icon={DollarSign}
            />
          </div>
        </section>

        {/* PROJETOS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <PenTool size={14} className="text-[#8B7355]" />
            <h2 className="text-[10px] text-white/80 font-bold tracking-[0.2em] uppercase">Bloco Projetos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              title="Projetos Ativos" 
              value={activeProjectsCount}
              subtitle="Em execução no momento"
              icon={Clock}
            />
            <Card 
              title="A Receber" 
              value={incomingThisMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              subtitle="Previsto para este mês"
              icon={Calendar}
            />
            <Card 
              title="Parcelas em Atraso" 
              value={overdueInstallments.length}
              subtitle="Ações de cobrança pendentes"
              icon={AlertCircle}
            />
          </div>
        </section>

        {/* ESCRITÓRIO */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={14} className="text-[#8B7355]" />
            <h2 className="text-[10px] text-white/80 font-bold tracking-[0.2em] uppercase">Bloco Escritório</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              title="Receita Confirmada" 
              value={confirmedThisMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              subtitle="Total recebido no mês"
              icon={DollarSign}
            />
            <Card 
              title="Custo Mensal" 
              value={monthlyFixedCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              subtitle="Fixos + Variáveis cadastrados"
              icon={ArrowDownRight}
            />
            <Card 
              title="Margem Estimada" 
              value={margin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              subtitle="Resultado operacional do mês"
              icon={TrendingUp}
            />
          </div>
        </section>

        {/* PARCELAS VENCENDO */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[#8B7355]" />
              <h2 className="text-[10px] text-white/80 font-bold tracking-[0.2em] uppercase">Próximos 7 Dias</h2>
            </div>
          </div>
          <div className="bg-[#161616] border border-white/5 rounded-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-4 text-[10px] text-[#8B7355] font-mono uppercase tracking-widest">Cliente</th>
                  <th className="p-4 text-[10px] text-[#8B7355] font-mono uppercase tracking-widest text-right">Valor</th>
                  <th className="p-4 text-[10px] text-[#8B7355] font-mono uppercase tracking-widest text-right">Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {upcomingInstallments.length > 0 ? (
                  upcomingInstallments.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-[11px] text-white uppercase tracking-tight">{p.cliente_nome}</td>
                      <td className="p-4 text-[11px] text-white font-mono text-right">
                        {Number(p.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-4 text-[11px] text-[#8B7355] font-mono text-right">
                        {format(new Date(p.data_vencimento), 'dd/MM/yyyy')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-[10px] text-white/20 uppercase font-mono tracking-widest">
                      Nenhuma parcela prevista para o período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const PenTool = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19 7-7 3 3-7 7-3-3z"/>
    <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    <path d="m2 2 5 5"/>
    <path d="m8.5 8.5 7 7"/>
  </svg>
);

export default FinanceiroVisaoGeral;
