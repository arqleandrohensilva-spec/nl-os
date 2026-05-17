import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import Sidebar from '@/components/Sidebar';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
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
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isPast, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [aiGreeting, setAiGreeting] = useState<string>("");
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

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

  // AI Logic
  useEffect(() => {
    const generateAIContent = async () => {
      if (leads.length === 0 && projetos.length === 0) return;
      setLoadingAI(true);

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
        // Greeting context
        const greetingPrompt = `Gere uma frase curta de contexto (máximo 10 palavras) para o dashboard de um sócio de escritório de arquitetura.
        Dados atuais: ${actions.filter(a => a.type === 'urgent').length} ações urgentes, ${actions.filter(a => a.type === 'today').length} para hoje.
        Exemplo: "Você tem 2 ações urgentes e 4 compromissos para hoje."`;

        const { data: gData } = await supabase.functions.invoke('ai-advisor', {
          body: { prompt: greetingPrompt, systemPrompt: "Você é um assistente executivo conciso." }
        });
        setAiGreeting((gData?.choices?.[0]?.message?.content || "").replace(/^["']|["']$/g, ''));

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

        const { data: iData } = await supabase.functions.invoke('ai-advisor', {
          body: { prompt: insightPrompt, systemPrompt: "Você é um consultor estratégico de negócios. Responda apenas com JSON." }
        });
        
        const content = iData?.choices?.[0]?.message?.content;
        if (content) {
          const jsonStr = content.match(/\{[\s\S]*\}/)?.[0];
          if (jsonStr) setAiInsight(JSON.parse(jsonStr));
        }
      } catch (e) {
        console.error("AI Error:", e);
      } finally {
        setLoadingAI(false);
      }
    };

    generateAIContent();
  }, [leads.length, projetos.length]);

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] font-sans text-white">
      <Sidebar user={getDisplayName()} />
      
      <main className="flex-1 ml-[230px] p-20 max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <header className="mb-16">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {getGreeting()}, <span className="text-bronze uppercase">{getDisplayName()}</span>.
            </h1>
            <p className="text-white/40 text-sm uppercase tracking-widest font-medium">
              {format(new Date(), "EEEE, d 'DE' MMMM", { locale: ptBR })}
            </p>
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
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[0.65fr,0.35fr] gap-16">
          {/* Column Left */}
          <div className="space-y-12">
            
            {/* Bloco Notificações Recentes */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold tracking-[0.3em] text-bronze uppercase">NOTIFICAÇÕES RECENTES</span>
                  <div className="h-[1px] w-24 bg-white/5" />
                </div>
                <button 
                  onClick={() => navigate('/pipeline')}
                  className="text-[9px] text-white/40 hover:text-white uppercase font-bold tracking-widest"
                >
                  VER TODAS
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const { data: recentNotifications = [] } = useQuery({
                    queryKey: ['recent-notificacoes'],
                    queryFn: async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return [];
                      const { data } = await supabase
                        .from('notificacoes')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('lida', false)
                        .order('created_at', { ascending: false })
                        .limit(3);
                      return data || [];
                    }
                  });

                  if (recentNotifications.length === 0) return (
                    <div className="col-span-3 p-8 bg-white/[0.01] border border-dashed border-white/5 text-center">
                      <p className="text-white/20 text-xs italic">Nenhuma notificação nova.</p>
                    </div>
                  );

                  return recentNotifications.map(notification => (
                    <div 
                      key={notification.id}
                      onClick={() => navigate(notification.modulo)}
                      className="p-4 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-bold text-bronze uppercase">{notification.tipo}</span>
                        <span className="text-[8px] text-white/20 uppercase">
                          {formatDistanceToNow(new Date(notification.created_at), { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs text-white group-hover:text-bronze transition-colors line-clamp-2">{notification.titulo}</p>
                    </div>
                  ));
                })()}
              </div>
            </section>
            
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

            {/* Bloco 2: Pulso da Empresa */}
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
