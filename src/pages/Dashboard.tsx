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
      if (user?.email) {
        setUserEmail(user.email);
        sessionStorage.setItem('nl_user', user.email.split('@')[0]);
      }
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

  const { data: sessoesHoras = [] } = useQuery({
    queryKey: ['sessoes-horas-dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('sessoes_horas').select('*');
      return data || [];
    }
  });

  const { data: projetoEtapas = [] } = useQuery({
    queryKey: ['projeto-etapas-dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('projeto_etapas').select('*');
      return data || [];
    }
  });

  const { data: configEscritorio } = useQuery({
    queryKey: ['config-escritorio'],
    queryFn: async () => {
      const { data } = await supabase.from('config_escritorio').select('*').maybeSingle();
      return data;
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

  const { data: metaConfig } = useQuery({
    queryKey: ['meta-mensal'],
    queryFn: async () => {
      const { data } = await supabase
        .from('configuracoes')
        .select('value')
        .eq('key', 'meta_mensal_receita')
        .maybeSingle();
      return data;
    }
  });

  const metaMensal = Number(metaConfig?.value || 15000);


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

    return [];
  }, []);


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

      const financeiroResumo = `Confirmado R$ ${parcelas.filter(p => p.status === 'pago').reduce((a, b) => a + Number(b.valor || 0), 0)}`;
      const satisfacaoResumo = `Média ${satisfacao.length > 0 ? (satisfacao.reduce((a, b) => a + (b.nota_geral || 0), 0) / satisfacao.length).toFixed(1) : '0'}`;


      try {
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

        const healthPrompt = `Você é o analista estratégico da NL Arquitetos. Analise os dados abaixo e gere um score de saúde do negócio de 0 a 100.
        DADOS:
        Leads: ${leadsResumo}
        Projetos: ${projetosResumo}
        Financeiro: ${financeiroResumo}
        Satisfação: ${satisfacaoResumo}
        
        Retorne APENAS JSON:
        {
          "score": 87,
          "diagnostico": "diagnóstico curto",
          "pipeline": "ok | atencao | critico",
          "projetos": "ok | atencao | critico",
          "financeiro": "ok | atencao | critico",
          "satisfacao": "ok | atencao | critico"
        }`;

        const [insightRes, healthRes] = await Promise.all([
          supabase.functions.invoke('ai-advisor', {
            body: { prompt: insightPrompt, systemPrompt: "Você é um assistente estratégico." }
          }),
          supabase.functions.invoke('ai-advisor', {
            body: { prompt: healthPrompt, systemPrompt: "Você é um analista estratégico." }
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
  }, [leads.length, projetos.length]);


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
    <div className="flex min-h-screen bg-[#0A0A0A] font-sans text-white">
      <Sidebar user={getDisplayName()} />
      
      <main className="flex-1 transition-[margin] duration-300 ml-[var(--sidebar-width)] p-20 max-w-[1600px] mx-auto w-full">
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
                    <DialogContent className="max-w-6xl bg-[#0F0F0F] border-[#2A2826] p-0 overflow-hidden rounded-none shadow-2xl">
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
            
            {/* Bloco: NÚMEROS DO DIA */}
            <section className="grid grid-cols-4 gap-4">
              {[
                { label: 'LEADS ATIVOS', value: leads.filter(l => l.stage !== 'FECHADO' && l.stage !== 'PERDIDO').length, link: '/pipeline' },
                { label: 'PROJETOS', value: projetos.filter(p => p.status_geral === 'em_andamento').length, link: '/projetos' },
                { 
                  label: 'RECEBIDO MÊS', 
                  value: `R$ ${parcelas.filter(p => {
                    if (!p.data_recebimento) return false;
                    const d = new Date(p.data_recebimento);
                    return (p.status === 'pago' || p.status === 'recebido') && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                  }).reduce((a, b) => a + Number(b.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, 
                  link: '/financeiro/base' 
                },
                { 
                  label: 'HORAS ESTA SEMANA', 
                  value: `${(() => {
                    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
                    const totalMin = sessoesHoras
                      .filter(s => s.inicio && new Date(s.inicio) >= start)
                      .reduce((acc, s) => acc + Number(s.duracao_minutos || 0), 0);
                    return Math.round(totalMin / 60);
                  })()}h`, 
                  link: '/projetos' 
                }

              ].map((stat, i) => (
                <button key={i} onClick={() => navigate(stat.link)} className="bg-white/[0.02] border border-white/5 px-6 py-4 flex flex-col gap-1 hover:bg-white/[0.04] transition-colors">
                  <span className="text-[9px] text-white/40 uppercase tracking-widest">{stat.label}</span>
                  <span className="text-xl font-bold text-white">{stat.value}</span>
                </button>
              ))}
            </section>

            {/* Bloco: Ações do Dia */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">AÇÕES DO DIA</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              <div className="space-y-4">
                {actions.length === 0 ? (
                  <p className="text-white/20 text-sm italic">Nenhuma ação pendente.</p>
                ) : (
                  actions.map(action => (
                    <div key={action.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn("px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", action.type === 'urgent' ? "bg-red-500/10 text-red-500" : "bg-bronze/10 text-bronze")}>
                          {action.type === 'urgent' ? '⚡ URGENTE' : '📋 HOJE'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{action.title} · <span className="text-white/40">{action.reason}</span></p>
                        </div>
                      </div>
                      <button onClick={() => navigate(action.link)} className="flex items-center gap-2 text-[10px] font-bold text-white/40 hover:text-white">AGIR <ArrowRight size={12} /></button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Bloco: FEE BURN */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">FEE BURN · PROJETOS ATIVOS</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
              <div className="space-y-4">
                {(() => {
                  const ativos = projetos.filter(p => p.status_geral === 'em_andamento');
                  if (ativos.length === 0) return <p className="text-white/20 text-sm italic">Nenhum projeto em andamento.</p>;
                  
                  return ativos.map(proj => {
                    const horasLancadas = sessoesHoras
                      .filter(s => s.projeto_id === proj.id)
                      .reduce((acc, s) => acc + Number(s.duracao_minutos || 0), 0) / 60;
                    
                    const valorTotal = parcelas
                      .filter(p => p.projeto_id === proj.id)
                      .reduce((acc, p) => acc + Number(p.valor || 0), 0);
                    
                    const custoHora = Number(configEscritorio?.custo_hora || 80);
                    const feeBurn = valorTotal > 0 ? ((horasLancadas * custoHora) / valorTotal) * 100 : 0;
                    
                    const etapasProjeto = projetoEtapas.filter(e => e.projeto_id === proj.id);
                    const aprovadas = etapasProjeto.filter(e => e.status === 'aprovado').length;
                    const totalEtapas = etapasProjeto.length;
                    
                    const isAtencao = feeBurn > 80 && aprovadas < totalEtapas;
                    const isCritico = feeBurn > 95;
                    
                    const diffDias = proj.prazo_final ? Math.floor((new Date(proj.prazo_final).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

                    return (
                      <button 
                        key={proj.id} 
                        onClick={() => navigate(`/projetos/detalhe/${proj.id}`)} 
                        className="w-full p-4 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all text-left"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <span className="text-sm font-bold uppercase tracking-tight">{proj.nome}</span>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
                              {proj.nome_cliente} · {proj.tipo} · etapa {aprovadas}/{totalEtapas} {diffDias !== null && `· prazo em ${diffDias} dias`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={cn("text-[10px] font-bold", isCritico ? "text-red-500" : isAtencao ? "text-amber-500" : "text-bronze")}>
                              {feeBurn.toFixed(0)}% do fee
                            </span>
                            {isCritico ? (
                              <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[8px] font-bold uppercase tracking-wider">CRÍTICO</span>
                            ) : isAtencao ? (
                              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase tracking-wider">ATENÇÃO</span>
                            ) : null}
                          </div>
                        </div>
                        
                        {horasLancadas === 0 ? (
                          <p className="text-[10px] text-white/20 italic mt-2">— sem horas registradas</p>
                        ) : (
                          <div className="h-1.5 w-full bg-white/5 mt-3 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${Math.min(feeBurn, 100)}%` }} 
                              className={cn(
                                "h-full transition-colors", 
                                feeBurn >= 90 ? "bg-red-500" : feeBurn >= 70 ? "bg-amber-500" : "bg-bronze"
                              )} 
                            />
                          </div>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </section>

            {/* Bloco: HONORÁRIO A FATURAR */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">HONORÁRIO A FATURAR</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
              <div className="p-6 bg-white/[0.02] border border-white/5">
                {(() => {
                  const ativosIds = projetos.filter(p => p.status_geral === 'em_andamento').map(p => p.id);
                  const hoje = new Date();
                  hoje.setHours(23, 59, 59, 999);
                  
                  const parcelasPendentes = parcelas.filter(p => 
                    ativosIds.includes(p.projeto_id) && 
                    p.status === 'pendente' && 
                    new Date(p.data_vencimento) <= new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
                  );
                  
                  const totalFaturar = parcelasPendentes.reduce((acc, p) => acc + Number(p.valor || 0), 0);
                  
                  if (totalFaturar === 0) {
                    return <p className="text-green-500/40 text-sm italic uppercase tracking-widest">Tudo em dia — nenhuma parcela pendente</p>;
                  }
                  
                  return (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <p className="text-2xl font-bold text-white mb-1">R$ {totalFaturar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">
                          {parcelasPendentes.length} parcelas em aberto · vencidas ou vencendo este mês
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/financeiro')}
                        className="bg-white/5 border-white/10 text-bronze text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 rounded-none h-9 px-6"
                      >
                        VER PARCELAS
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* Bloco: PRÓXIMAS ENTREGAS */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">PRÓXIMAS ENTREGAS · 14 DIAS</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
              <div className="space-y-4">
                {(() => {
                  const hoje = new Date();
                  hoje.setHours(0,0,0,0);
                  const limite = new Date();
                  limite.setDate(hoje.getDate() + 14);
                  limite.setHours(23,59,59,999);
                  
                  const proximas = projetoEtapas
                    .filter(e => {
                      if (e.status === 'aprovado' || !e.data_entrega) return false;
                      const d = new Date(e.data_entrega);
                      return d >= hoje && d <= limite;
                    })
                    .sort((a, b) => new Date(a.data_entrega!).getTime() - new Date(b.data_entrega!).getTime());
                  
                  if (proximas.length === 0) {
                    return <p className="text-white/20 text-sm italic">Nenhuma entrega programada nos próximos 14 dias. <span className="opacity-50 italic">Cadastre prazos nos projetos para ver aqui.</span></p>;
                  }
                  
                  return proximas.map(etapa => {
                    const proj = projetos.find(p => p.id === etapa.projeto_id);
                    const diff = Math.floor((new Date(etapa.data_entrega!).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                    const colorClass = diff < 3 ? "text-red-500" : diff <= 7 ? "text-amber-500" : "text-green-500";
                    
                    return (
                      <div key={etapa.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold uppercase tracking-tight">{proj?.nome || 'Projeto'} · <span className="text-white/40">{etapa.etapa}</span></span>
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", colorClass)}>
                          em {diff === 0 ? 'hoje' : diff === 1 ? '1 dia' : `${diff} dias`}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </section>


          </div>

          {/* Column Right */}
          <div className="space-y-12">
            
            {/* Bloco: Meta do Mês */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">META DO MÊS</span>
              </div>
              
              {(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                const monthlyParcelas = parcelas.filter(p => {
                  const d = new Date(p.data_vencimento);
                  return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                
                const confirmado = monthlyParcelas
                  .filter(p => p.status === 'pago' || p.status === 'recebido')
                  .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
                  
                const previsto = monthlyParcelas
                  .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
                  
                const percConfirmado = Math.round((confirmado / metaMensal) * 100);
                const percPrevisto = Math.round((previsto / metaMensal) * 100);
                
                let borderColor = "border-white/5";
                if (percConfirmado >= 80) borderColor = "border-bronze";
                else if (percConfirmado >= 50) borderColor = "border-amber-500/50";
                else borderColor = "border-red-500/30";

                return (
                  <div className={cn(
                    "p-6 bg-white/[0.02] border transition-colors",
                    borderColor
                  )}>
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">META MENSAL</p>
                        <p className="text-xl font-bold tracking-tight">R$ {metaMensal.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-mono text-bronze font-bold">{percConfirmado}%</p>
                        <p className="text-[9px] text-white/40 uppercase font-bold tracking-tighter">CONFIRMADO</p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="h-2 w-full bg-white/5 relative overflow-hidden">
                        {/* Barra Previsto (Tracejada/Opaca) */}
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percPrevisto, 100)}%` }}
                          className="absolute inset-y-0 left-0 bg-bronze/20 border-r border-bronze/30"
                          style={{ backgroundImage: 'linear-gradient(45deg, rgba(184, 134, 11, 0.1) 25%, transparent 25%, transparent 50%, rgba(184, 134, 11, 0.1) 50%, rgba(184, 134, 11, 0.1) 75%, transparent 75%, transparent)', backgroundSize: '10px 10px' }}
                        />
                        {/* Barra Confirmado (Sólida) */}
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percConfirmado, 100)}%` }}
                          className="absolute inset-y-0 left-0 bg-bronze shadow-[0_0_15px_rgba(184,134,11,0.3)]"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] font-medium tracking-wider">
                        <p className="text-white/60">
                          <span className="text-bronze font-bold">R$ {confirmado.toLocaleString('pt-BR')}</span> CONFIRMADO
                        </p>
                        <p className="text-white/30 italic">
                          R$ {previsto.toLocaleString('pt-BR')} PREVISTO
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => navigate('/financeiro/base')}
                      className="w-full py-3 border border-white/5 hover:bg-white/5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-bronze transition-all flex items-center justify-center gap-2 group"
                    >
                      VER DETALHES <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                );
              })()}
            </section>

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
                        onClick={() => {
                          const routeMap: Record<string, string> = {
                            'pipeline': '/pipeline',
                            'financeiro': '/financeiro/base',
                            'marketing': '/marketing/ia',
                            'sistemas': '/sistema/configuracoes',
                            'projetos': '/projetos/gestao'
                          };
                          navigate(routeMap[aiInsight.modulo] || `/${aiInsight.modulo}`);
                        }}
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

          </div>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
