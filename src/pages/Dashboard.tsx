import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import Sidebar from '@/components/Sidebar';
import NotificationsPanel from '@/components/NotificationsPanel';
import ForecastModalContent from '@/components/ForecastModalContent';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Sparkles, 
  ChevronRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar as CalendarIcon,
  LayoutGrid,
  Users,
  Briefcase,
  DollarSign,
  Star,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isPast, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';


// Types
interface ActionItem {
  id: string;
  title: string;
  reason: string;
  days?: number;
  deadline?: string;
  type: 'urgent' | 'today';
  module: string;
  link: string;
}

interface PulseItem {
  label: string;
  value: number;
  max: number;
  subtext: string;
}

interface TimelineEvent {
  id: string;
  date: Date;
  title: string;
  type: 'lead' | 'projeto' | 'financeiro';
  link: string;
}

interface AIInsight {
  insight: string;
  acao: string;
  modulo: string;
}

interface BusinessHealth {
  score: number;
  diagnostico: string;
  pipeline: 'ok' | 'atencao' | 'critico';
  projetos: 'ok' | 'atencao' | 'critico';
  financeiro: 'ok' | 'atencao' | 'critico';
  satisfacao: 'ok' | 'atencao' | 'critico';
}

interface VelocityItem {
  label: string;
  days: number;
  status: 'normal' | 'atencao' | 'critico';
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [businessHealth, setBusinessHealth] = useState<BusinessHealth | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isForecastOpen, setIsForecastOpen] = useState(false);


  // Fetch Auth User
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const getDisplayName = () => {
    if (!userEmail) return 'Sócio';
    if (userEmail.toLowerCase() === 'leandro@nlarquitetos.com.br') return 'Leandro';
    if (userEmail.toLowerCase() === 'neandro@nlarquitetos.com.br') return 'Neandro';
    return userEmail.split('@')[0];
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "BOM DIA";
    if (hour >= 12 && hour < 18) return "BOA TARDE";
    return "BOA NOITE";
  };

  // Queries
  const { data: leads = [] } = useQuery({
    queryKey: ['leads-dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('*');
      return data || [];
    }
  });

  const { data: leadLogs = [] } = useQuery({
    queryKey: ['lead-logs-dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('lead_logs').select('*').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos-dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('projetos').select('*');
      return data || [];
    }
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ['checklist-dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('documentos_checklist').select('*');
      return data || [];
    }
  });

  const { data: parcelas = [] } = useQuery({
    queryKey: ['parcelas-dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('financeiro_parcelas').select('*');
      return data || [];
    }
  });

  const { data: satisfacao = [] } = useQuery({
    queryKey: ['satisfacao-dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('pesquisas_satisfacao').select('nota_geral');
      return data || [];
    }
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const unreadCount = notifications.filter(n => !n.lida).length;

  // Process Ações do Dia

  const actions: ActionItem[] = React.useMemo(() => {
    const items: ActionItem[] = [];
    const today = new Date();

    // Leads urgent/today
    leads.forEach(lead => {
      if (lead.stage === 'FECHADO' || lead.stage === 'PERDIDO') return;

      if (lead.proxima_acao_data) {
        const actionDate = new Date(lead.proxima_acao_data);
        if (isPast(actionDate) && !isToday(actionDate)) {
          items.push({
            id: lead.id,
            title: lead.nome || 'Lead sem nome',
            reason: 'Ação atrasada',
            days: Math.floor((today.getTime() - actionDate.getTime()) / (1000 * 60 * 60 * 24)),
            type: 'urgent',
            module: 'pipeline',
            link: '/pipeline'
          });
        } else if (isToday(actionDate)) {
          items.push({
            id: lead.id,
            title: lead.nome || 'Lead sem nome',
            reason: lead.proxima_acao_tipo || 'Follow-up',
            deadline: 'Hoje',
            type: 'today',
            module: 'pipeline',
            link: '/pipeline'
          });
        }
      }

      // Proposta enviada há mais de 5 dias sem log
      if (lead.stage === 'PROPOSTA ENVIADA' || lead.stage === 'Proposta Enviada') {
        const lastLog = leadLogs.find(log => log.lead_id === lead.id);
        const lastDate = lastLog ? new Date(lastLog.created_at) : (lead.etapa_desde ? new Date(lead.etapa_desde) : new Date(lead.created_at));
        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 5) {
          items.push({
            id: lead.id,
            title: lead.nome || 'Lead sem nome',
            reason: 'Proposta sem retorno',
            days: diffDays,
            type: 'urgent',
            module: 'pipeline',
            link: '/pipeline'
          });
        }
      }
    });

    // Projetos checklist
    checklist.forEach(item => {
      if (item.status === 'pendente') {
        const proj = projetos.find(p => p.id === item.projeto_id);
        if (proj && proj.status_geral === 'em_andamento') {
          items.push({
            id: item.id,
            title: proj.nome,
            reason: `Pendente: ${item.item}`,
            type: 'today',
            module: 'projetos',
            link: `/projetos/detalhe/${proj.id}`
          });
        }
      }
    });

    // Parcelas vencendo em 3 dias
    parcelas.forEach(p => {
      if (p.status !== 'pago' && p.status !== 'recebido') {
        const venc = new Date(p.data_vencimento);
        const diff = Math.floor((venc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 3) {
          items.push({
            id: p.id,
            title: p.cliente_nome || 'Parcela',
            reason: `Vencimento em ${diff === 0 ? 'hoje' : diff + ' dias'}`,
            type: diff === 0 ? 'urgent' : 'today',
            module: 'financeiro',
            link: '/financeiro/base'
          });
        }
      }
    });

    return items;
  }, [leads, leadLogs, projetos, checklist, parcelas]);

  // Pulse data
  const pulse: PulseItem[] = React.useMemo(() => {
    const activeLeads = leads.filter(l => l.stage !== 'FECHADO' && l.stage !== 'PERDIDO').length;
    const activeProjects = projetos.filter(p => p.status_geral === 'em_andamento').length;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyParcelas = parcelas.filter(p => {
      const d = new Date(p.data_vencimento);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const confirmed = monthlyParcelas.filter(p => p.status === 'pago' || p.status === 'recebido').reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
    const totalPrevisto = monthlyParcelas.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

    const avgSatisfacao = satisfacao.length > 0 
      ? satisfacao.reduce((acc, curr) => acc + (curr.nota_geral || 0), 0) / satisfacao.length 
      : 0;

    return [
      {
        label: 'CAPTAÇÃO',
        value: activeLeads,
        max: 5,
        subtext: `${activeLeads}/5 leads ativos`
      },
      {
        label: 'EXECUÇÃO',
        value: activeProjects,
        max: Math.max(activeProjects, 5),
        subtext: `${activeProjects} projetos em andamento`
      },
      {
        label: 'FINANCEIRO',
        value: confirmed,
        max: Math.max(totalPrevisto, 1),
        subtext: `R$ ${confirmed.toLocaleString('pt-BR')} de R$ ${totalPrevisto.toLocaleString('pt-BR')}`
      },
      {
        label: 'SATISFAÇÃO',
        value: avgSatisfacao,
        max: 10,
        subtext: `${avgSatisfacao.toFixed(1)} média · ${satisfacao.length} avaliações`
      }
    ];
  }, [leads, projetos, parcelas, satisfacao]);

  // Timeline
  const timelineDays = React.useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const events: TimelineEvent[] = [];
      
      leads.forEach(l => {
        if (l.proxima_acao_data && isSameDay(new Date(l.proxima_acao_data), day)) {
          events.push({ id: l.id, date: day, title: l.nome, type: 'lead', link: '/pipeline' });
        }
      });

      projetos.forEach(p => {
        if (p.prazo_final && isSameDay(new Date(p.prazo_final), day)) {
          events.push({ id: p.id, date: day, title: p.nome, type: 'projeto', link: `/projetos/detalhe/${p.id}` });
        }
      });

      parcelas.forEach(p => {
        if (p.data_vencimento && isSameDay(new Date(p.data_vencimento), day)) {
          events.push({ id: p.id, date: day, title: p.cliente_nome, type: 'financeiro', link: '/financeiro/base' });
        }
      });

      return { day, events };
    });
  }, [leads, projetos, parcelas]);

  const aiGreeting = React.useMemo(() => {
    const urgentItems = actions.filter(a => a.type === 'urgent').length;
    const todayItems = actions.filter(a => a.type === 'today').length;
    const totalItems = actions.length;

    if (urgentItems > 0) {
      return `Você tem ${urgentItems} ação${urgentItems > 1 ? 'ões' : 'ão'} urgente${urgentItems > 1 ? 's' : ''} pendente${urgentItems > 1 ? 's' : ''} hoje.`;
    }
    if (totalItems > 0) {
      return `Você tem ${totalItems} compromisso${totalItems > 1 ? 's' : ''} para hoje.`;
    }
    return "Agenda limpa hoje. Bom momento para prospectar.";
  }, [actions]);

  useEffect(() => {
    const generateAIContent = async () => {
      if (leads.length === 0 && projetos.length === 0) return;
      setLoadingAI(true);
      setLoadingHealth(true);

      const leadsResumo = leads
        .filter(l => l.stage !== 'FECHADO' && l.stage !== 'PERDIDO')
        .map(l => `${l.nome} (${l.stage}, Score: ${l.score})`)
        .join(', ');
      
      const projetosResumo = projetos
        .filter(p => p.status_geral === 'em_andamento')
        .map(p => `${p.nome} (Etapa: ${p.etapa_atual})`)
        .join(', ');

      const financeiroResumo = pulse[2].subtext;
      const satisfacaoResumo = pulse[3].subtext;

      try {
        // Insight
        const insightPrompt = `Você é o assistente estratégico da NL Arquitetos. Analise os dados abaixo e gere 1 insight acionável.
        Seja específico: cite nomes, valores e prazos reais. Máximo 3 linhas. Tom direto, sem enrolação.
        
        DADOS:
        Leads ativos: ${leadsResumo}
        Projetos: ${projetosResumo}
        Financeiro: ${financeiroResumo}
        Satisfação: ${satisfacaoResumo}
        
        Retorne APENAS um JSON:
        {
          "insight": "texto do insight",
          "acao": "o que fazer agora em 1 frase",
          "modulo": "pipeline | projetos | financeiro | marketing"
        }`;

        // Health Score
        const healthPrompt = `Você é o analista estratégico da NL Arquitetos. Analise os dados abaixo e gere um score de saúde do negócio de 0 a 100.

CRITÉRIOS DE AVALIAÇÃO:
- Pipeline (25pts): leads ativos, taxa de conversão, tempo nas etapas
- Projetos (25pts): projetos em andamento, entregas no prazo, checklists pendentes
- Financeiro (25pts): parcelas em dia, receita prevista vs meta, inadimplência
- Satisfação (25pts): nota média, número de avaliações, tendência

DADOS:
Leads: ${leadsResumo}
Projetos: ${projetosResumo}
Financeiro: ${financeiroResumo}
Satisfação: ${satisfacaoResumo}

Retorne APENAS JSON:
{
  "score": 87,
  "diagnostico": "frase de diagnóstico em 2 linhas máximo",
  "pipeline": "ok | atencao | critico",
  "projetos": "ok | atencao | critico",
  "financeiro": "ok | atencao | critico",
  "satisfacao": "ok | atencao | critico"
}`;

        const [insightRes, healthRes] = await Promise.all([
          supabase.functions.invoke('ai-advisor', {
            body: { prompt: insightPrompt, systemPrompt: "Você é um consultor estratégico de negócios. Responda apenas com JSON." }
          }),
          supabase.functions.invoke('ai-advisor', {
            body: { 
              prompt: healthPrompt, 
              systemPrompt: "Você é um analista estratégico. Responda apenas com JSON.",
              model: "claude-sonnet-4-20250514"
            }
          })
        ]);
        
        const iContent = insightRes.data?.choices?.[0]?.message?.content;
        if (iContent) {
          const jsonStr = iContent.match(/\{[\s\S]*\}/)?.[0];
          if (jsonStr) setAiInsight(JSON.parse(jsonStr));
        }

        const hContent = healthRes.data?.choices?.[0]?.message?.content;
        if (hContent) {
          const jsonStr = hContent.match(/\{[\s\S]*\}/)?.[0];
          if (jsonStr) setBusinessHealth(JSON.parse(jsonStr));
        }
      } catch (e) {
        console.error("AI Error:", e);
      } finally {
        setLoadingAI(false);
        setLoadingHealth(false);
      }
    };

    generateAIContent();
  }, [leads.length, projetos.length, pulse]);

  const forecast = React.useMemo(() => {
    const activeLeads = leads.filter(l => l.stage !== 'FECHADO' && l.stage !== 'PERDIDO' && l.stage !== 'Fechado' && l.stage !== 'Perdido');
    const today = new Date();
    
    const leadForecasts = activeLeads.map(lead => {
      let prob = 0;
      const stageLower = (lead.stage || '').toLowerCase();
      
      if (stageLower === 'novo lead') prob = 10;
      else if (stageLower === 'reunião agendada') prob = 25;
      else if (stageLower === 'briefing preenchido') prob = 40;
      else if (stageLower === 'proposta enviada') prob = 60;
      else if (stageLower === 'negociação') prob = 80;

      // Score adjustment
      const score = Number(lead.score || 0);
      if (score >= 8) prob += 15;
      else if (score < 5) prob -= 15;

      // Time adjustment
      const etapaDesde = lead.etapa_desde ? new Date(lead.etapa_desde) : new Date(lead.created_at);
      const diffDays = Math.floor((today.getTime() - etapaDesde.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 20) prob -= 20;
      else if (diffDays > 10) prob -= 10;

      // Clamp probability
      prob = Math.max(0, Math.min(100, prob));

      return {
        ...lead,
        probabilidade: prob,
        valor: Number(lead.orcamento || 0),
        diffDays
      };
    });

    const totalInGame = leadForecasts.reduce((acc, curr) => acc + curr.valor, 0);
    const probableTotal = leadForecasts.filter(l => l.probabilidade >= 60).reduce((acc, curr) => acc + curr.valor, 0);
    const weightedAverage = leadForecasts.length > 0 
      ? leadForecasts.reduce((acc, curr) => acc + (curr.probabilidade * curr.valor), 0) / (totalInGame || 1)
      : 0;

    return {
      items: leadForecasts,
      totalInGame,
      probableTotal,
      weightedAverage,
      meta: 2000000 // Meta: R$ 2M
    };
  }, [leads]);

  const velocity = React.useMemo(() => {
    // Benchmarks
    const benchmarks = {
      'Novo Lead → Reunião': 3,
      'Reunião → Proposta': 5,
      'Proposta → Fechamento': 15,
      'Negociação → Fechado': 7
    };

    if (leadLogs.length === 0) {
      return Object.entries(benchmarks).map(([label, days]) => ({
        label,
        days,
        status: 'normal' as const,
        isBenchmark: true
      }));
    }

    const transitions: Record<string, number[]> = {};

    // Group logs by lead
    const logsByLead: Record<string, any[]> = {};
    leadLogs.forEach(log => {
      if (!logsByLead[log.lead_id]) logsByLead[log.lead_id] = [];
      logsByLead[log.lead_id].push(log);
    });

    Object.values(logsByLead).forEach(leadLogsList => {
      const sortedLogs = leadLogsList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      for (let i = 0; i < sortedLogs.length - 1; i++) {
        const current = sortedLogs[i];
        const next = sortedLogs[i+1];
        
        const currentStage = current.nota?.includes('Movido para') ? current.nota.replace('Movido para ', '') : null;
        const nextStage = next.nota?.includes('Movido para') ? next.nota.replace('Movido para ', '') : null;

        if (currentStage && nextStage) {
          const label = `${currentStage} → ${nextStage}`;
          const diff = (new Date(next.created_at).getTime() - new Date(current.created_at).getTime()) / (1000 * 60 * 60 * 24);
          
          // Map to standard labels if possible
          let standardLabel = null;
          if (currentStage.toLowerCase().includes('novo') && nextStage.toLowerCase().includes('reunião')) standardLabel = 'Novo Lead → Reunião';
          else if (currentStage.toLowerCase().includes('reunião') && nextStage.toLowerCase().includes('proposta')) standardLabel = 'Reunião → Proposta';
          else if (currentStage.toLowerCase().includes('proposta') && nextStage.toLowerCase().includes('fechamento')) standardLabel = 'Proposta → Fechamento';
          else if (currentStage.toLowerCase().includes('negociação') && nextStage.toLowerCase().includes('fechado')) standardLabel = 'Negociação → Fechado';

          if (standardLabel) {
            if (!transitions[standardLabel]) transitions[standardLabel] = [];
            transitions[standardLabel].push(diff);
          }
        }
      }
    });

    return Object.entries(benchmarks).map(([label, benchmark]) => {
      const times = transitions[label];
      const avg = times && times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : benchmark;
      
      let status: 'normal' | 'atencao' | 'critico' = 'normal';
      if (avg > benchmark * 1.5) status = 'critico';
      else if (avg > benchmark * 1.2) status = 'atencao';

      return {
        label,
        days: Math.round(avg),
        status,
        hasData: !!times
      };
    });
  }, [leadLogs]);

  return (
    <div className="flex min-h-screen bg-[#0F0E0C] font-sans text-white">
      <Sidebar user={getDisplayName()} />
      
      <main className="flex-1 ml-[230px] p-20 max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <header className="mb-16 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {getGreeting()}, <span className="text-bronze uppercase">{getDisplayName()}</span>.
              </h1>
              <div className="flex items-center gap-4">
                <p className="text-white/40 text-sm uppercase tracking-widest font-medium">
                  {format(new Date(), "EEEE, d 'DE' MMMM", { locale: ptBR })}
                </p>
                
                {/* Dashboard Action Buttons */}
                <div className="flex items-center gap-3 ml-4">
                  <Dialog open={isForecastOpen} onOpenChange={setIsForecastOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-bronze text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">
                        <BarChart3 size={14} />
                        PREVISÃO DE FECHAMENTO
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl bg-[#0F0E0C] border-[#2A2826] p-0 overflow-hidden rounded-none shadow-2xl">
                      <DialogHeader className="p-8 border-b border-white/5">
                        <DialogTitle className="text-bronze text-sm font-bold uppercase tracking-[0.3em]">
                          PREVISÃO DE FECHAMENTO · {format(new Date(), 'MMMM', { locale: ptBR }).toUpperCase()}
                        </DialogTitle>
                      </DialogHeader>
                      <ForecastModalContent forecast={forecast} navigate={navigate} />
                    </DialogContent>
                  </Dialog>

                  <div className="relative">
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-bronze text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors relative"
                    >
                      <Bell size={14} />
                      {unreadCount} {unreadCount === 1 ? 'notificação' : 'notificações'}
                    </button>

                    <NotificationsPanel 
                      isOpen={showNotifications} 
                      onClose={() => setShowNotifications(false)} 
                      className="right-0 top-full mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <AnimatePresence>
              {aiGreeting && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex items-center gap-2 text-bronze/80 italic text-sm"
                >
                  <Sparkles size={14} />
                  <span>{aiGreeting}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>


        <div className="grid grid-cols-1 lg:grid-cols-[0.65fr,0.35fr] gap-16">
          {/* Column Left */}
          <div className="space-y-12">
            
            
            {/* Bloco 1: Ações do Dia */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">AÇÕES DO DIA</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="space-y-4">
                {actions.length === 0 ? (
                  <p className="text-white/20 text-sm italic">Nenhuma ação pendente. Bom trabalho.</p>
                ) : (
                  <>
                    {/* Urgent */}
                    {actions.filter(a => a.type === 'urgent').map(action => (
                      <div key={action.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 border-l-4 border-l-red-500/70 group hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-bold uppercase tracking-wider">⚡ URGENTE</div>
                          <div>
                            <p className="text-sm font-medium">{action.title} · <span className="text-white/40">{action.reason}</span></p>
                            <p className="text-[10px] text-red-400/60 uppercase font-bold tracking-tighter">Atrasado há {action.days} dias</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate(action.link)}
                          className="flex items-center gap-2 text-[10px] font-bold text-white/40 hover:text-white transition-colors group-hover:translate-x-1"
                        >
                          AGIR <ArrowRight size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Today */}
                    {actions.filter(a => a.type === 'today').map(action => (
                      <div key={action.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 border-l-4 border-l-bronze group hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="px-2 py-0.5 bg-bronze/10 text-bronze text-[9px] font-bold uppercase tracking-wider">📋 HOJE</div>
                          <div>
                            <p className="text-sm font-medium">{action.title} · <span className="text-white/40">{action.reason}</span></p>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate(action.link)}
                          className="flex items-center gap-2 text-[10px] font-bold text-white/40 hover:text-white transition-colors group-hover:translate-x-1"
                        >
                          VER <ArrowRight size={12} />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>


            {/* Bloco 3: Pulso da Empresa */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">PULSO DA EMPRESA</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {pulse.map(item => {
                  const percentage = Math.round((item.value / item.max) * 100);
                  const isCaptação = item.label === 'CAPTAÇÃO';
                  const isMetaSuperada = isCaptação && item.value > item.max;
                  const isEmpty = (item.label === 'FINANCEIRO' || item.label === 'EXECUÇÃO') && item.value === 0;

                  return (
                    <div key={item.label} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[11px] font-bold tracking-widest text-white/60">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-bronze">
                            {Math.min(percentage, 100)}%
                          </span>
                          {isMetaSuperada && (
                            <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 text-[8px] font-bold uppercase tracking-wider">
                              META SUPERADA
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {isEmpty ? (
                        <div className="h-2 flex items-center">
                          <p className="text-[10px] text-white/20 italic">— Sem dados este mês</p>
                        </div>
                      ) : (
                        <>
                          <div className="h-2 w-full bg-white/5 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="h-full bg-bronze"
                            />
                          </div>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">{item.subtext}</p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Bloco 3: Linha do Tempo */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">ESTA SEMANA</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="grid grid-cols-7 gap-4">
                {timelineDays.map(({ day, events }) => {
                  const isCurrent = isToday(day);
                  return (
                    <div key={day.toString()} className="space-y-4">
                      <div className={cn(
                        "text-center py-2 border-b transition-colors",
                        isCurrent ? "border-bronze text-bronze" : "border-white/5 text-white/20"
                      )}>
                        <p className="text-[10px] font-bold uppercase mb-1">{format(day, 'EEE', { locale: ptBR })}</p>
                        <p className="text-xs font-mono">{format(day, 'dd')}</p>
                      </div>
                      
                      <div className="space-y-2 min-h-[80px] flex flex-col items-center justify-center">
                        {events.length === 0 ? (
                          <span className="text-white/10 text-lg flex items-center justify-center h-full">—</span>
                        ) : (
                          events.map(event => (
                            <button 
                              key={event.id}
                              onClick={() => navigate(event.link)}
                              className="w-full text-left group"
                            >
                              <div className="flex items-start gap-1.5">
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full mt-1 shrink-0",
                                  event.type === 'lead' ? "bg-blue-400" : 
                                  event.type === 'projeto' ? "bg-bronze" : "bg-green-400"
                                )} />
                                <p className="text-[9px] text-white/40 leading-tight group-hover:text-white transition-colors truncate">
                                  {event.title}
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Column Right */}
          <div className="space-y-12">
            
            {/* Bloco 4: Insight IA */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase flex items-center gap-2">
                  <Sparkles size={12} /> INSIGHT · IA
                </span>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/5 border-l-4 border-l-bronze relative overflow-hidden group">
                {loadingAI ? (
                  <div className="flex flex-col gap-3">
                    <div className="h-4 bg-white/5 animate-pulse w-full" />
                    <div className="h-4 bg-white/5 animate-pulse w-[80%]" />
                    <div className="h-10 mt-4 bg-white/5 animate-pulse w-full" />
                  </div>
                ) : aiInsight ? (
                  <div className="space-y-0">
                    <p className="text-sm leading-relaxed text-white/90 font-medium mb-6">
                      {aiInsight.insight}
                    </p>
                    <div className="border-t border-bronze/20 pt-4 mt-4">
                      <p className="text-xs text-bronze font-bold uppercase tracking-widest mb-4">
                        → AÇÃO: <span className="text-white/80 normal-case font-normal">{aiInsight.acao}</span>
                      </p>
                      <Button 
                        onClick={() => navigate(aiInsight.modulo === 'pipeline' ? '/pipeline' : aiInsight.modulo === 'financeiro' ? '/financeiro/base' : `/${aiInsight.modulo}`)}
                        variant="outline" 
                        className="w-full h-9 bg-transparent border-bronze/30 hover:bg-bronze hover:text-white text-bronze text-[10px] font-bold uppercase tracking-[0.2em] rounded-none transition-all"
                      >
                        IR PARA {aiInsight.modulo}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/20 italic">Aguardando dados para gerar insight...</p>
                )}
              </div>
            </section>

            {/* Separator */}
            <div className="border-t border-white/5" />

            {/* Bloco: Saúde do Negócio */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">SAÚDE DO NEGÓCIO</span>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/5 space-y-6">
                {loadingHealth ? (
                  <div className="space-y-4">
                    <div className="h-8 bg-white/5 animate-pulse w-24" />
                    <div className="h-2 bg-white/5 animate-pulse w-full" />
                    <div className="h-12 bg-white/5 animate-pulse w-full" />
                  </div>
                ) : businessHealth ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-mono font-bold",
                          businessHealth.score >= 80 ? "text-bronze" : 
                          businessHealth.score >= 60 ? "text-amber-500" : "text-[#7A4A3A]"
                        )}>
                          {businessHealth.score}
                        </span>
                        <span className="text-white/20 text-sm font-mono">/ 100</span>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(10)].map((_, i) => (
                          <span 
                            key={i} 
                            className={cn(
                              "text-sm leading-none transition-colors duration-500",
                              i < Math.round(businessHealth.score / 10) 
                                ? (businessHealth.score >= 80 ? "text-bronze" : businessHealth.score >= 60 ? "text-amber-500" : "text-[#7A4A3A]")
                                : "text-white/10"
                            )}
                          >
                            ●
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-white/80 leading-relaxed italic">
                      "{businessHealth.diagnostico}"
                    </p>

                    <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/5">
                      {[
                        { label: 'PIPELINE', status: businessHealth.pipeline },
                        { label: 'PROJETOS', status: businessHealth.projetos },
                        { label: 'FINANCEIRO', status: businessHealth.financeiro },
                        { label: 'SATISFAÇÃO', status: businessHealth.satisfacao }
                      ].map(item => (
                        <div key={item.label} className="text-center space-y-2">
                          <div className="flex justify-center mb-1">
                            {item.status === 'ok' ? (
                              <span className="text-green-500 text-sm font-bold">✓</span>
                            ) : item.status === 'atencao' ? (
                              <span className="text-amber-500 text-sm font-bold">⚠</span>
                            ) : (
                              <span className="text-red-500/70 text-sm font-bold">●</span>
                            )}
                          </div>
                          <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-white/20 italic">Analisando indicadores...</p>
                )}
              </div>
            </section>

            {/* Bloco: Velocidade do Pipeline */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">VELOCIDADE DO PIPELINE</span>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/5">
                {!velocity.some(v => v.hasData) && leadLogs.length > 0 ? (
                  <p className="text-xs text-white/20 italic">Dados insuficientes — disponível após 30 dias de uso.</p>
                ) : (
                  <div className="space-y-5">
                    {velocity.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] text-white/60 uppercase tracking-wider">{item.label}</p>
                          <p className="text-sm font-bold text-white font-mono">{item.days} {item.days === 1 ? 'dia' : 'dias'}</p>
                        </div>
                        <div className={cn(
                          "px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest",
                          item.status === 'normal' ? "bg-green-500/10 text-green-500" :
                          item.status === 'atencao' ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {item.status === 'normal' ? '✅ normal' : item.status === 'atencao' ? '⚠️ atenção' : '🔴 crítico'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Bloco 5: Resumo Rápido */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">RESUMO</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'LEADS ATIVOS', val: leads.filter(l => l.stage !== 'FECHADO' && l.stage !== 'PERDIDO').length, link: '/pipeline' },
                  { label: 'PROJETOS', val: projetos.filter(p => p.status_geral === 'em_andamento').length, link: '/projetos/gestao' },
                  { 
                    label: 'RECEITA MÊS', 
                    val: `R$ ${parcelas.filter(p => {
                      const d = new Date(p.data_vencimento);
                      return d.getMonth() === new Date().getMonth() && p.status === 'pago';
                    }).reduce((acc, curr) => acc + Number(curr.valor || 0), 0).toLocaleString('pt-BR')}`, 
                    link: '/financeiro/base' 
                  },
                  { label: 'FOLLOW-UPS', val: `${actions.filter(a => a.module === 'pipeline').length} pendentes`, link: '/pipeline' },
                  { label: 'PARCELAS', val: `${parcelas.filter(p => p.status !== 'pago' && isPast(new Date(p.data_vencimento))).length} vencendo`, link: '/financeiro/base' },
                  { 
                    label: 'SATISFAÇÃO', 
                    val: `${satisfacao.length > 0 ? (satisfacao.reduce((acc, curr) => acc + (curr.nota_geral || 0), 0) / satisfacao.length).toFixed(1) : '0.0'} ★`, 
                    link: '/marketing/satisfacao' 
                  }
                ].map(card => (
                  <button 
                    key={card.label}
                    onClick={() => navigate(card.link)}
                    className="p-5 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-bronze/30 transition-all text-left"
                  >
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-2">{card.label}</p>
                    <p className="text-base font-bold text-white">{card.val}</p>
                  </button>
                ))}
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
