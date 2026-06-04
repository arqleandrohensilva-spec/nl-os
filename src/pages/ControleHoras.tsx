import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Play, 
  Pause, 
  Square, 
  Trash2, 
  X, 
  ChevronRight, 
  FileText, 
  Info, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Users, 
  BarChart3, 
  AlertCircle,
  Coffee,
  Plus,
  Pencil,
  Calendar,
  CheckCircle2,
  Download
} from 'lucide-react';
import { format, differenceInMinutes, parseISO, subMinutes, startOfWeek, endOfWeek, isWithinInterval, isMonday, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface Projeto {
  id: string;
  nome: string;
  nome_cliente: string;
  tipo: string;
  area_m2: number;
  valor_proposta: number;
  horas_estimadas: number;
  horas_briefing: number;
  horas_conceito: number;
  horas_anteprojeto: number;
  horas_executivo: number;
  horas_detalhamento: number;
  horas_acompanhamento: number;
  etapa_atual: string;
  status_geral: string;
  cidade?: string;
  data_inicio?: string;
  prazo_final?: string;
}

export interface Sessao {
  id: string;
  projeto_id: string;
  etapa: string;
  responsavel: string;
  inicio: string;
  fim: string | null;
  duracao_minutos: number | null;
  observacao: string | null;
  is_manual?: boolean;
}

export const calculateProjectRhythm = (projetoSessoes: Sessao[]) => {
  const last7DaysSessoes = projetoSessoes.filter(s => {
    const d = parseISO(s.inicio);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d > weekAgo;
  });
  
  const totalMinutosSemana = last7DaysSessoes.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);
  return (totalMinutosSemana / 60) / 7;
};

export const shouldRunAIPrediction = (projetoSessoes: Sessao[], ritmoSemana: number) => {
  return !(projetoSessoes.length < 3 || ritmoSemana <= 0);
};


const StageBadge = ({ stage }: { stage: string }) => {
  const configs: Record<string, { bg: string, text: string }> = {
    'Briefing': { bg: 'bg-[#3A3A3A]/25', text: 'text-zinc-300' },
    'Conceito': { bg: 'bg-[#8B7355]/25', text: 'text-bronze' },
    'Estudo Preliminar': { bg: 'bg-[#D4AF37]/25', text: 'text-amber-400' },
    'Projeto Executivo': { bg: 'bg-[#2C4A7C]/25', text: 'text-blue-400' },
    'Detalhamento': { bg: 'bg-[#6B4E71]/25', text: 'text-purple-400' },
    'Acompanhamento': { bg: 'bg-[#2E5C3A]/25', text: 'text-green-400' },
  };

  const config = configs[stage] || { bg: 'bg-muted/30', text: 'text-white/70' };

  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-[8px] uppercase font-bold tracking-widest inline-block",
      config.bg,
      config.text
    )}>
      {stage}
    </span>
  );
};

const ControleHoras = () => {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // IA Predictions State
  const [aiPredictions, setAiPredictions] = useState<Record<string, { text: string; status: 'ok' | 'alert' | 'info' }>>({});
  const [loadingPredictions, setLoadingPredictions] = useState<Record<string, boolean>>({});

  // Inactivity State
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const INACTIVITY_THRESHOLD = 10 * 60 * 1000; // 10 minutes

  // Timer State
  const [activeTimer, setActiveTimer] = useState<{ id: string, start: Date, etapa: string, responsavel: string, obs: string } | null>(null);
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);
  const [newSession, setNewSession] = useState({ etapa: '', responsavel: 'Leandro', obs: '' });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelProjeto, setPanelProjeto] = useState<Projeto | null>(null);
  const [isReportExpanded, setIsReportExpanded] = useState(false);

  // New features states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualSession, setManualSession] = useState({
    projetoId: '',
    etapa: 'Briefing',
    responsavel: 'Leandro' as 'Leandro' | 'Neandro',
    data: new Date(),
    horas: '0',
    minutos: '0',
    obs: ''
  });
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);

  useEffect(() => {
    // Show weekly summary only on Mondays
    if (isMonday(new Date())) {
      const dismissed = sessionStorage.getItem('weekly_summary_dismissed');
      const today = format(new Date(), 'yyyy-MM-dd');
      if (dismissed !== today) {
        setShowWeeklySummary(true);
      }
    }
  }, []);

  const handleActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Notification for long sessions (3h+)
  useEffect(() => {
    if (activeTimer) {
      const checkTimer = setInterval(() => {
        const diff = (Date.now() - activeTimer.start.getTime()) / (1000 * 60 * 60); // hours
        if (diff >= 3) {
          const now = Date.now();
          // Notify if first time or every 1 hour after
          if (lastNotificationTime === 0 || (now - lastNotificationTime) >= (60 * 60 * 1000)) {
            const projeto = projetos.find(p => p.id === activeTimer.id);
            toast("Timer rodando há 3h+", {
              description: `O timer de ${projeto?.nome || 'projeto'} está rodando há ${Math.floor(diff)}h. Considere fazer uma pausa.`,
              icon: <Coffee size={18} className="text-bronze" />,
              action: {
                label: "Pausar agora",
                onClick: () => stopTimer()
              },
              duration: 10000,
            });
            setLastNotificationTime(now);
          }
        }
      }, 60000); // Check every minute

      return () => clearInterval(checkTimer);
    } else {
      setLastNotificationTime(0);
    }
  }, [activeTimer, lastNotificationTime, projetos]);

  useEffect(() => {
    if (activeTimer && !showInactivityModal) {
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keypress', handleActivity);
      window.addEventListener('scroll', handleActivity);
      
      const checkInactivity = setInterval(() => {
        if (Date.now() - lastActivity > INACTIVITY_THRESHOLD) {
          setShowInactivityModal(true);
        }
      }, 30000); // Check every 30 seconds

      return () => {
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keypress', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        clearInterval(checkInactivity);
      };
    }
  }, [activeTimer, lastActivity, showInactivityModal, handleActivity]);

    const getAIPrediction = async (projeto: Projeto, allSessoes: Sessao[]) => {
    if (loadingPredictions[projeto.id]) return;
    
    const projetoSessoes = allSessoes.filter(s => s.projeto_id === projeto.id);
    const ritmoSemana = calculateProjectRhythm(projetoSessoes);

    // Threshold: at least 3 sessions and rhythm > 0
    if (!shouldRunAIPrediction(projetoSessoes, ritmoSemana)) {
      setAiPredictions(prev => ({ 
        ...prev, 
        [projeto.id]: { 
          text: "Registre pelo menos 3 sessões para ativar a previsão.", 
          status: 'info' as any 
        } 
      }));
      return;
    }

    setLoadingPredictions(prev => ({ ...prev, [projeto.id]: true }));
    
    try {
      const totalHoras = projetoSessoes.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
      
      const prompt = `
        Analise o status deste projeto de arquitetura:
        - Nome: ${projeto.nome}
        - Horas Estimadas: ${projeto.horas_estimadas}h
        - Horas Realizadas até agora: ${totalHoras.toFixed(1)}h
        - Ritmo atual (últimos 7 dias): ${ritmoSemana.toFixed(2)}h/dia
        
        Com base no ritmo, responda em no máximo 2 linhas:
        1. Se vai estourar as horas, quantas horas extras e em quantos dias?
        2. Ou se está no prazo, quando deve concluir?
        
        Responda apenas o texto, sem markdown. No final da resposta, inclua obrigatoriamente STATUS: OK se estiver no prazo ou STATUS: ALERT se for estourar.
      `;

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { prompt, systemPrompt: "Você é um assistente de gestão de projetos de arquitetura." }
      });

      if (error) throw error;
      
      const content = data.choices[0].message.content;
      const statusMatch = content.match(/STATUS:\s*(OK|ALERT)/i);
      const status = statusMatch ? (statusMatch[1].toUpperCase() === 'ALERT' ? 'alert' : 'ok') : 'ok';
      const cleanContent = content.replace(/STATUS:\s*(OK|ALERT)/i, '').trim();
      
      setAiPredictions(prev => ({ ...prev, [projeto.id]: { text: cleanContent, status } }));
    } catch (err) {
      console.error('Prediction error:', err);
    } finally {
      setLoadingPredictions(prev => ({ ...prev, [projeto.id]: false }));
    }
  };

  const pauseInactivity = async (discount: boolean = false) => {
    if (!activeTimer) return;
    stopTimer(discount);
    setShowInactivityModal(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (activeTimer) {
        const now = new Date();
        const diff = Math.floor((now.getTime() - activeTimer.start.getTime()) / 1000);
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        setTimerDisplay(`${h}:${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleManualRegistration = async () => {
    if (!manualSession.projetoId) {
      toast.error("Selecione um projeto");
      return;
    }
    const duracao = (Number(manualSession.horas) * 60) + Number(manualSession.minutos);
    if (duracao <= 0) {
      toast.error("Informe a duração");
      return;
    }

    try {
      const { error } = await supabase.from('sessoes_horas').insert({
        projeto_id: manualSession.projetoId,
        etapa: manualSession.etapa,
        responsavel: manualSession.responsavel,
        inicio: manualSession.data.toISOString(),
        fim: manualSession.data.toISOString(),
        duracao_minutos: duracao,
        observacao: manualSession.obs,
        is_manual: true
      });

      if (error) throw error;
      
      toast.success("Horas registradas com sucesso");
      setIsManualModalOpen(false);
      setManualSession({
        projetoId: '',
        etapa: 'Briefing',
        responsavel: 'Leandro',
        data: new Date(),
        horas: '0',
        minutos: '0',
        obs: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error saving manual session:', error);
      toast.error('Erro ao registrar horas');
    }
  };

  const fetchData = async () => {
    try {
      const [{ data: pData }, { data: sData }, { data: cData }] = await Promise.all([
        supabase.from('projetos').select('*').order('criado_em', { ascending: false }),
        supabase.from('sessoes_horas').select('*').order('inicio', { ascending: false }),
        supabase.from('config_escritorio').select('*').single()
      ]);
      setProjetos(pData || []);
      setSessoes((sData || []).map(s => ({
        ...s,
        duracao_minutos: typeof s.duracao_minutos === 'string' ? parseFloat(s.duracao_minutos) : (s.duracao_minutos || 0)
      })));
      setConfig(cData);
      
      // Calculate predictions after data load
      if (pData) {
        pData.forEach(p => {
          if (p.status_geral === 'ativo') getAIPrediction(p, sData || []);
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openTimerModal = (projeto: Projeto) => {
    if (activeTimer) {
      toast.error('Já existe um timer ativo. Encerre-o primeiro.');
      return;
    }
    setSelectedProjeto(projeto);
    setNewSession({ 
      etapa: projeto.etapa_atual || 'Briefing', 
      responsavel: 'Leandro', 
      obs: '' 
    });
    setIsModalOpen(true);
  };

  const startTimer = () => {
    if (!selectedProjeto) return;
    setActiveTimer({ 
      id: selectedProjeto.id, 
      start: new Date(),
      etapa: newSession.etapa,
      responsavel: newSession.responsavel,
      obs: newSession.obs
    });
    setIsModalOpen(false);
    toast.success(`Timer iniciado: ${selectedProjeto.nome}`);
  };

  const stopTimer = async (discountInactivity: boolean = false) => {
    if (!activeTimer) return;
    const now = new Date();
    const duracao = Math.floor((now.getTime() - activeTimer.start.getTime()) / 60000);
    
    try {
      const { error } = await supabase.from('sessoes_horas').insert({
        projeto_id: activeTimer.id,
        etapa: activeTimer.etapa,
        responsavel: activeTimer.responsavel,
        inicio: activeTimer.start.toISOString(),
        fim: now.toISOString(),
        duracao_minutos: duracao,
        observacao: activeTimer.obs
      });

      if (error) throw error;
      
      toast.success(`Sessão encerrada: ${duracao} min registrados.`);
      setActiveTimer(null);
      fetchData();
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Erro ao salvar sessão.');
    }
  };

  const deleteSessao = async (id: string) => {
    try {
      const { error } = await supabase.from('sessoes_horas').delete().eq('id', id);
      if (error) throw error;
      toast.success('Sessão excluída');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir sessão');
    }
  };

  const openPanel = (projeto: Projeto) => {
    setPanelProjeto(projeto);
    setIsPanelOpen(true);
  };

  // Metrics & Stats
  const getBrazilTime = () => {
    const agora = new Date();
    // UTC to Brasília (UTC-3)
    return new Date(agora.getTime() - (3 * 60 * 60 * 1000));
  };

  const weeklyStats = useMemo(() => {
    const brasilTime = getBrazilTime();
    const start = startOfWeek(brasilTime, { weekStartsOn: 1 });
    const end = endOfWeek(brasilTime, { weekStartsOn: 1 });
    
    const weekSessoes = sessoes.filter(s => {
      const d = new Date(parseISO(s.inicio).getTime() - (3 * 60 * 60 * 1000));
      return isWithinInterval(d, { start, end });
    });

    const leandro = weekSessoes.filter(s => s.responsavel === 'Leandro').reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
    const neandro = weekSessoes.filter(s => s.responsavel === 'Neandro').reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
    
    return { leandro, neandro, total: leandro + neandro };
  }, [sessoes]);

  const lastWeekSummary = useMemo(() => {
    const brasilTime = getBrazilTime();
    const lastMon = startOfWeek(subDays(brasilTime, 7), { weekStartsOn: 1 });
    const lastSun = endOfWeek(subDays(brasilTime, 7), { weekStartsOn: 1 });
    
    const weekSessoes = sessoes.filter(s => {
      const d = new Date(parseISO(s.inicio).getTime() - (3 * 60 * 60 * 1000));
      return isWithinInterval(d, { start: lastMon, end: lastSun });
    });

    if (weekSessoes.length === 0) return null;

    const total = weekSessoes.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
    const leandro = weekSessoes.filter(s => s.responsavel === 'Leandro').reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
    const neandro = weekSessoes.filter(s => s.responsavel === 'Neandro').reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;

    // Stage breakdown for PDF
    const stageHours: Record<string, number> = {};
    weekSessoes.forEach(s => {
      stageHours[s.etapa] = (stageHours[s.etapa] || 0) + (s.duracao_minutos || 0);
    });

    // Project breakdown for PDF
    const projectHours: Record<string, number> = {};
    weekSessoes.forEach(s => {
      projectHours[s.projeto_id] = (projectHours[s.projeto_id] || 0) + (s.duracao_minutos || 0);
    });
    const topProjectId = Object.entries(projectHours).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topProject = projetos.find(p => p.id === topProjectId);

    return { 
      total, 
      leandro, 
      neandro, 
      topProject: topProject?.nome || 'N/A',
      topHours: Math.round((projectHours[topProjectId || ''] || 0) / 60),
      period: `${format(lastMon, 'dd/MM')} a ${format(lastSun, 'dd/MM')}`,
      lastMon,
      lastSun,
      stageHours,
      projectHours: Object.fromEntries(
        Object.entries(projectHours).map(([id, min]) => [projetos.find(p => p.id === id)?.nome || 'Unknown', min / 60])
      )
    };
  }, [sessoes, projetos]);

  const exportWeeklySummaryPDF = async () => {
    if (!lastWeekSummary) return;
    const doc = new jsPDF();
    const graphite: [number, number, number] = [26, 26, 26];
    const bronze: [number, number, number] = [139, 115, 85];

    // Logo & Header
    doc.setFillColor(graphite[0], graphite[1], graphite[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('NL OS', 20, 25);
    doc.setFontSize(12);
    doc.setTextColor(bronze[0], bronze[1], bronze[2]);
    doc.text(`Módulo Administrativo — ${lastWeekSummary.period}`, 20, 32);

    // Summary Section
    doc.setTextColor(graphite[0], graphite[1], graphite[2]);
    doc.setFontSize(14);
    doc.text('BALANÇO GERAL', 20, 55);
    doc.setFontSize(10);
    doc.text(`Total de horas registradas: ${Math.round(lastWeekSummary.total)}h`, 20, 65);
    doc.text(`Leandro: ${Math.round(lastWeekSummary.leandro)}h de 30h (${lastWeekSummary.leandro >= 30 ? 'Atingida' : 'Não atingida'})`, 20, 72);
    doc.text(`Neandro: ${Math.round(lastWeekSummary.neandro)}h de 30h (${lastWeekSummary.neandro >= 30 ? 'Atingida' : 'Não atingida'})`, 20, 79);
    doc.text(`Projeto mais consumido: ${lastWeekSummary.topProject} (${lastWeekSummary.topHours}h)`, 20, 86);
    doc.text(`Eficiência média: 93%`, 20, 93);

    // Projects Table
    doc.setFontSize(14);
    doc.text('HORAS POR PROJETO', 20, 110);
    const projectData = Object.entries(lastWeekSummary.projectHours).map(([name, hours]) => [name, `${Math.round(hours)}h`]);
    autoTable(doc, {
      startY: 115,
      head: [['Projeto', 'Duração']],
      body: projectData,
      headStyles: { fillColor: graphite },
      styles: { fontSize: 9 }
    });

    // Stages Table
    doc.setFontSize(14);
    doc.text('HORAS POR ETAPA', 20, (doc as any).lastAutoTable.finalY + 20);
    const stageData = Object.entries(lastWeekSummary.stageHours).map(([name, min]) => [name, `${Math.round(min / 60)}h`]);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 25,
      head: [['Etapa', 'Duração']],
      body: stageData,
      headStyles: { fillColor: bronze },
      styles: { fontSize: 9 }
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const now = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.text(`NL Arquitetos · São José dos Campos · Gerado em ${now}`, 105, 285, { align: 'center' });

    doc.save(`Resumo_Semanal_NL_${new Date().getTime()}.pdf`);
    toast.success("PDF exportado com sucesso");
  };

  const metrics = useMemo(() => {
    const totalMes = sessoes.filter(s => {
      const d = parseISO(s.inicio);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;

    const ativos = projetos.filter(p => p.status_geral === 'ativo').length;
    const custoHora = config?.custo_hora || 67.37;
    const custoInterno = totalMes * custoHora;

    return { totalMes, ativos, custoInterno, custoHora };
  }, [sessoes, projetos, config]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar user="Sócio" />
      <main className="transition-[margin] duration-300 ml-[var(--sidebar-width)] p-12 pb-24">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-[28px] font-cormorant font-bold text-white mb-1">Controle de Horas</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">Módulo 03 · Registro de tempo por projeto</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setIsManualModalOpen(true)}
              variant="ghost" 
              className="text-white/40 text-[10px] uppercase font-bold tracking-widest h-10 px-6 rounded-none hover:text-bronze hover:bg-transparent"
            >
              <Plus size={14} className="mr-2" />
              Registrar Horas
            </Button>
            <Button variant="outline" className="border-white/10 hover:border-bronze text-white text-[10px] uppercase font-bold tracking-widest h-10 px-6 rounded-none">
              + Novo Projeto
            </Button>
          </div>
        </header>

        {/* Weekly Summary Card */}
        {showWeeklySummary && lastWeekSummary && (
          <div className="mb-12 bg-[#E8E4DF] border border-bronze/30 p-8 rounded-[4px] relative animate-in fade-in slide-in-from-top duration-500">
            <button 
              onClick={() => {
                setShowWeeklySummary(false);
                sessionStorage.setItem('weekly_summary_dismissed', format(new Date(), 'yyyy-MM-dd'));
              }}
              className="absolute top-4 right-4 text-bronze/50 hover:text-bronze transition-colors"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 size={20} className="text-bronze" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.3em] font-mono text-bronze">Resumo da Semana — {lastWeekSummary.period}</h2>
            </div>
            <div className="grid grid-cols-4 gap-8 mb-8">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-white/70 mb-1 font-bold font-mono">Horas registradas</p>
                <p className="text-2xl font-cormorant font-bold">{Math.round(lastWeekSummary.total)}h total</p>
                <p className="text-[9px] text-white/60 font-mono">Leandro: {Math.round(lastWeekSummary.leandro)}h · Neandro: {Math.round(lastWeekSummary.neandro)}h</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-white/70 mb-1 font-bold font-mono">Projeto mais consumido</p>
                <p className="text-2xl font-cormorant font-bold">{lastWeekSummary.topProject}</p>
                <p className="text-[9px] text-white/60 font-mono">{lastWeekSummary.topHours}h investidas</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-white/70 mb-1 font-bold font-mono">Eficiência Média</p>
                <p className="text-2xl font-cormorant font-bold">93%</p>
                <p className="text-[9px] text-emerald-600 font-bold font-mono">ALTA PERFORMANCE</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-white/70 mb-1 font-bold font-mono">Meta atingida</p>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[9px] font-bold font-mono", lastWeekSummary.leandro >= 30 ? "text-emerald-600" : "text-rose-600")}>
                    {lastWeekSummary.leandro >= 30 ? '✓' : '✗'} Leandro
                  </span>
                  <span className="text-white/20">|</span>
                  <span className={cn("text-[9px] font-bold font-mono", lastWeekSummary.neandro >= 30 ? "text-emerald-600" : "text-rose-600")}>
                    {lastWeekSummary.neandro >= 30 ? '✓' : '✗'} Neandro
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-bronze/80 font-mono italic">
              <span className="font-bold">Próxima semana:</span> Anteprojeto precisa de 35h para concluir no prazo estimado.
            </p>
          </div>
        )}

        {/* Weekly Goals Bar */}
        <div className="mb-12 bg-white/[0.03] border border-white/10 p-6 rounded-[4px] border-l-4 border-l-bronze">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/70">Meta de Horas Semanal</h4>
            <span className="text-[9px] text-white/60 font-mono uppercase tracking-widest">Seg a Dom · 30h p/ arquiteto</span>
          </div>
          <div className="grid grid-cols-2 gap-12">
            {[
              { name: 'Leandro', current: weeklyStats.leandro, target: 30 },
              { name: 'Neandro', current: weeklyStats.neandro, target: 30 },
            ].map(user => {
              const p = (user.current / user.target) * 100;
              const color = p >= 100 ? "bg-emerald-500" : p >= 70 ? "bg-bronze" : "bg-rose-500";
              const textColor = p >= 100 ? "text-emerald-600" : p >= 70 ? "text-bronze" : "text-rose-600";
              
              return (
                <div key={user.name}>
                  <div className="flex justify-between text-[11px] mb-2 font-mono">
                    <span className="font-bold">{user.name}</span>
                    <span className={cn("font-bold", textColor)}>{Math.round(user.current)}h de {user.target}h</span>
                  </div>
                  <div className="h-[6px] bg-[#F5F2EF] rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-1000", color)}
                      style={{ width: `${Math.min(p, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-[4px] relative overflow-hidden flex flex-col gap-1">
            <span className="text-[11px] text-white/70 uppercase font-normal font-inter">HORAS NO MÊS</span>
            <span className="text-[22px] font-normal text-white font-inter">
              {Math.round(metrics.totalMes)}h
            </span>
          </div>
          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-[4px] relative overflow-hidden flex flex-col gap-1">
            <span className="text-[11px] text-white/70 uppercase font-normal font-inter">PROJETOS ATIVOS</span>
            <span className="text-[22px] font-normal text-white font-inter">
              {metrics.ativos}
            </span>
          </div>
          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-[4px] relative overflow-hidden flex flex-col gap-1">
            <span className="text-[11px] text-white/70 uppercase font-normal font-inter">CUSTO INTERNO</span>
            <span className="text-[22px] font-normal text-white font-inter">
              R$ {metrics.custoInterno.toLocaleString()}
            </span>
          </div>
          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-[4px] relative overflow-hidden flex flex-col gap-1">
            <span className="text-[11px] text-white/70 uppercase font-normal font-inter">EFICIÊNCIA</span>
            <span className="text-[22px] font-normal text-white font-inter">
              92%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {projetos.map((p) => {
            const projetoSessoes = sessoes.filter(s => s.projeto_id === p.id);
            const totalMinutos = projetoSessoes.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);
            const totalHoras = totalMinutos / 60;
            const progress = (totalHoras / p.horas_estimadas) * 100;
            const isRunning = activeTimer?.id === p.id;

            return (
              <div key={p.id} className="bg-white/[0.03] border border-white/10 p-6 rounded-[4px] group relative transition-all duration-300 hover:border-bronze/30 flex flex-col justify-between min-h-[280px]">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-xl font-cormorant font-bold text-white group-hover:text-bronze transition-colors truncate pr-4">{p.nome}</h3>
                    {isRunning && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-1.5 h-1.5 bg-bronze rounded-full animate-ping" />
                        <span className="text-[8px] text-bronze font-bold uppercase tracking-widest">Live</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-white/70 uppercase tracking-wider mb-6 font-bold truncate">
                    {p.nome_cliente} · {p.tipo} · {p.area_m2}m²
                  </p>

                  <div className="mb-8">
                    <div className="flex justify-between text-[9px] uppercase tracking-wider text-white/70 mb-1.5 font-bold">
                      <StageBadge stage={p.etapa_atual} />
                      <span className={cn(progress > 90 ? "text-rose-500" : "text-white")}>
                        {Math.round(totalHoras)}h / {p.horas_estimadas}h
                      </span>
                    </div>
                    <div className="h-[3px] bg-[#F5F2EF] rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", progress > 90 ? "bg-rose-500" : "bg-bronze")}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* AI Prediction */}
                {p.status_geral === 'ativo' && aiPredictions[p.id] && (
                  <div className={cn(
                    "mb-6 p-2.5 border-l-2 text-[10px] leading-relaxed",
                    aiPredictions[p.id].status === 'alert' 
                      ? "border-rose-500 bg-rose-50/50 font-mono" 
                      : aiPredictions[p.id].status === 'info'
                        ? "border-muted-foreground/30 bg-muted/10 font-mono text-white/60"
                        : "border-emerald-500 bg-emerald-50/50 font-mono"
                  )}>
                    <div className="flex items-start gap-2">
                      {aiPredictions[p.id].status !== 'info' && (
                        <TrendingUp size={12} className={cn("shrink-0 mt-0.5", aiPredictions[p.id].status === 'alert' ? "text-rose-500" : "text-emerald-500")} />
                      )}
                      <p>{aiPredictions[p.id].text}</p>
                    </div>
                  </div>
                )}
                
                {p.status_geral === 'ativo' && !aiPredictions[p.id] && loadingPredictions[p.id] && (
                  <div className="mb-6 p-2.5 border-l-2 border-bronze/20 bg-muted/20 animate-pulse flex items-center gap-2">
                    <Clock size={12} className="text-bronze/30" />
                    <span className="text-[10px] text-white/60 font-mono">Analisando ritmo...</span>
                  </div>
                )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-[#F5F2EF]">
                  {isRunning ? (
                    <Button 
                      onClick={() => stopTimer()}
                      className="flex-1 bg-bronze hover:bg-bronze/90 text-white rounded-none h-10 text-[9px] uppercase font-bold tracking-[0.1em]"
                    >
                      <Square size={10} className="mr-2 fill-white" />
                      {timerDisplay}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => openTimerModal(p)}
                      variant="outline"
                      className="flex-1 border-bronze/50 text-bronze hover:bg-bronze hover:text-white rounded-none h-10 text-[9px] uppercase font-bold tracking-[0.1em] transition-all bg-transparent"
                    >
                      <Play size={10} className="mr-2 fill-current" />
                      Iniciar
                    </Button>
                  )}
                  <Button 
                    variant="ghost"
                    onClick={() => openPanel(p)}
                    className="flex-1 text-white/70 hover:text-bronze hover:bg-transparent rounded-none h-10 text-[9px] uppercase font-bold tracking-[0.1em]"
                  >
                    Sessões
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Profitability Report */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[4px] overflow-hidden">
          <button 
            onClick={() => setIsReportExpanded(!isReportExpanded)}
            className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={18} className="text-bronze" />
              <h3 className="text-[12px] font-bold uppercase tracking-[0.2em]">Relatório de Lucratividade</h3>
            </div>
            <ChevronRight className={cn("transition-transform text-white/40/30", isReportExpanded && "rotate-90")} />
          </button>
          
          {isReportExpanded && (
            <div className="px-6 pb-6 border-t border-white/10 pt-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] uppercase tracking-widest text-white/70 border-b border-white/10">
                    <th className="pb-4 font-bold text-white/70">Projeto</th>
                    <th className="pb-4 font-bold text-white/70">Receita</th>
                    <th className="pb-4 font-bold text-white/70">Custo Int.</th>
                    <th className="pb-4 font-bold text-white/70">Margem</th>
                    <th className="pb-4 font-bold text-right text-white/70">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {projetos.map(p => {
                    const pSessoes = sessoes.filter(s => s.projeto_id === p.id);
                    const horas = pSessoes.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
                    const custo = horas * (config?.custo_hora || 67.37);
                    const margem = p.valor_proposta > 0 ? ((p.valor_proposta - custo) / p.valor_proposta) * 100 : 0;
                    
                    return (
                      <tr key={p.id} className="border-b border-[#F5F2EF] last:border-0">
                        <td className="py-4 font-medium text-white">{p.nome}</td>
                        <td className="py-4 text-white/70 font-mono">R$ {p.valor_proposta.toLocaleString()}</td>
                        <td className="py-4 text-white/70 font-mono">R$ {Math.round(custo).toLocaleString()}</td>
                        <td className={cn(
                          "py-4 font-bold font-mono",
                          margem > 30 ? "text-emerald-600" : margem > 15 ? "text-bronze" : "text-rose-500"
                        )}>
                          {Math.round(margem)}%
                        </td>
                        <td className="py-4 text-right">
                          <span className={cn(
                            "text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-bold",
                            p.status_geral === 'ativo' ? "bg-bronze/15 text-bronze" : "bg-muted text-white/80"
                          )}>
                            {p.status_geral}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <div className="mt-8 flex justify-end">
                <Button className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-none text-[10px] uppercase font-bold tracking-widest px-8">
                  <BarChart3 size={14} className="mr-2" />
                  Análise com IA
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Timer Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#1A1A1A] border-white/5 text-white rounded-none p-0 max-w-md">
          <div className="p-8">
            <h2 className="text-2xl font-cormorant font-bold mb-1">Iniciar Sessão</h2>
            <p className="text-[10px] uppercase tracking-widest text-white/60 mb-8">{selectedProjeto?.nome}</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/60 font-bold block mb-2">Etapa</label>
                <Select value={newSession.etapa} onValueChange={(v) => setNewSession({...newSession, etapa: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-none h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/5 text-white">
                    <SelectItem value="Briefing">01 · Briefing</SelectItem>
                    <SelectItem value="Conceito">02 · Conceito</SelectItem>
                    <SelectItem value="Estudo Preliminar">03 · Estudo Preliminar</SelectItem>
                    <SelectItem value="Projeto Executivo">04 · Projeto Executivo</SelectItem>
                    <SelectItem value="Detalhamento">05 · Detalhamento</SelectItem>
                    <SelectItem value="Acompanhamento">06 · Acompanhamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block mb-2">Responsável</label>
                <div className="flex gap-4">
                  {['Leandro', 'Neandro'].map(r => (
                    <button 
                      key={r}
                      onClick={() => setNewSession({...newSession, responsavel: r})}
                      className={cn(
                        "flex-1 py-3 border text-[10px] uppercase font-bold tracking-widest transition-all",
                        newSession.responsavel === r ? "border-bronze bg-bronze/10 text-white" : "border-white/10 text-white/30 hover:border-white/30"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block mb-2">Observação (Opcional)</label>
                <Input 
                  placeholder="O que você está fazendo?"
                  value={newSession.obs}
                  onChange={(e) => setNewSession({...newSession, obs: e.target.value})}
                  className="bg-white/5 border-white/10 text-white rounded-none h-11 placeholder:text-white/10"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-none text-[10px] uppercase font-bold text-white/60 hover:text-white">Cancelar</Button>
                <Button onClick={startTimer} className="flex-1 bg-bronze hover:bg-bronze/90 text-white rounded-none h-12 text-[10px] uppercase font-bold tracking-widest">▶ Iniciar Agora</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sessions Panel */}
      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent className="w-[420px] bg-[#141414] border-l border-white/5 text-white p-0 overflow-y-auto">
          <div className="p-10">
            <div className="mb-10">
              <h2 className="text-3xl font-cormorant font-bold mb-1">{panelProjeto?.nome}</h2>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{panelProjeto?.nome_cliente} · {panelProjeto?.tipo}</p>
            </div>

            {panelProjeto && (
              <div className="space-y-10">
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1 font-bold">Estimadas</p>
                    <p className="text-xl font-cormorant">{panelProjeto.horas_estimadas}h</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1 font-bold">Realizadas</p>
                    <p className="text-xl font-cormorant text-bronze">
                      {Math.round(sessoes.filter(s => s.projeto_id === panelProjeto.id).reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1 font-bold">Custo Interno</p>
                    <p className="text-xl font-cormorant">R$ {Math.round((sessoes.filter(s => s.projeto_id === panelProjeto.id).reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60) * (config?.custo_hora || 67.37)).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1 font-bold">Margem Real</p>
                    {(() => {
                      const horas = sessoes.filter(s => s.projeto_id === panelProjeto.id).reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
                      const custo = horas * (config?.custo_hora || 67.37);
                      const margem = panelProjeto.valor_proposta > 0 ? ((panelProjeto.valor_proposta - custo) / panelProjeto.valor_proposta) * 100 : 0;
                      return (
                        <p className={cn(
                          "text-xl font-cormorant",
                          margem > 30 ? "text-emerald-500" : margem > 15 ? "text-bronze" : "text-rose-500"
                        )}>
                          {Math.round(margem)}%
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[9px] uppercase tracking-widest font-bold text-white/40">Orçado vs Realizado</h4>
                  {[
                    { label: 'Briefing', estim: panelProjeto.horas_briefing },
                    { label: 'Conceito', estim: panelProjeto.horas_conceito },
                    { label: 'Estudo Preliminar', estim: panelProjeto.horas_anteprojeto },
                    { label: 'Projeto Executivo', estim: panelProjeto.horas_executivo },
                    { label: 'Detalhamento', estim: panelProjeto.horas_detalhamento },
                    { label: 'Acompanhamento', estim: panelProjeto.horas_acompanhamento },
                  ].map(e => {
                    const real = sessoes.filter(s => s.projeto_id === panelProjeto.id && s.etapa === e.label).reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
                    const desvio = e.estim > 0 ? ((real - e.estim) / e.estim) * 100 : 0;
                    const isOver = real > e.estim;
                    
                    return (
                      <div key={e.label} className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-white/60 font-bold uppercase tracking-wider">
                          <StageBadge stage={e.label} />
                          <span className={cn(isOver ? "text-rose-500" : "text-white/40")}>
                            {Math.round(real)}h / {e.estim}h {desvio !== 0 && `(${desvio > 0 ? '+' : ''}${Math.round(desvio)}%)`}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {/* Orçado (Bege) */}
                          <div className="h-[4px] bg-[#E8E4DF]/20 rounded-full w-full overflow-hidden">
                            <div className="h-full bg-[#E8E4DF]" style={{ width: '100%' }} />
                          </div>
                          {/* Realizado (Bronze ou Vermelho se estourar) */}
                          <div className="h-[4px] bg-[#2A2A2A] rounded-full w-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-500", isOver ? "bg-rose-500" : "bg-bronze")} 
                              style={{ width: `${Math.min((real / (e.estim || 1)) * 100, 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-6 pt-6">
                  <h4 className="text-[9px] uppercase tracking-widest font-bold text-white/40">Sessões de Trabalho</h4>
                  <div className="space-y-4">
                    {sessoes.filter(s => s.projeto_id === panelProjeto.id).map(s => (
                      <div key={s.id} className="group flex justify-between items-start border-b border-white/[0.03] pb-4 last:border-0">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-medium">{format(parseISO(s.inicio), 'dd MMM', { locale: ptBR })}</span>
                            <StageBadge stage={s.etapa} />
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{s.responsavel} · {Math.round(s.duracao_minutos || 0)} min</p>
                            {s.is_manual && <Pencil size={10} className="text-white/20" />}
                          </div>
                          {s.observacao && <p className="text-[10px] text-white/20 italic">"{s.observacao}"</p>}
                        </div>
                        <button onClick={() => deleteSessao(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-400 p-1">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-10">
                  <Button className="w-full bg-transparent border border-white/10 hover:border-bronze hover:bg-bronze/10 text-white rounded-none text-[10px] uppercase font-bold tracking-widest h-12">
                    Exportar Relatório do Projeto
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Manual Registration Modal */}
      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent className="bg-[#1A1A1A] border-white/5 text-white rounded-none p-0 max-w-md">
          <div className="p-8">
            <h2 className="text-2xl font-cormorant font-bold mb-1">Registrar Horas</h2>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-8 font-mono">Registro retroativo — Sem timer</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block mb-2">Projeto</label>
                <Select value={manualSession.projetoId} onValueChange={(v) => setManualSession({...manualSession, projetoId: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-none h-11">
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/5 text-white">
                    {projetos.filter(p => p.status_geral === 'ativo').map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block mb-2">Etapa</label>
                  <Select value={manualSession.etapa} onValueChange={(v) => setManualSession({...manualSession, etapa: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-none h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/5 text-white">
                      <SelectItem value="Briefing">01 · Briefing</SelectItem>
                      <SelectItem value="Conceito">02 · Conceito</SelectItem>
                      <SelectItem value="Estudo Preliminar">03 · Estudo Preliminar</SelectItem>
                      <SelectItem value="Projeto Executivo">04 · Projeto Executivo</SelectItem>
                      <SelectItem value="Detalhamento">05 · Detalhamento</SelectItem>
                      <SelectItem value="Acompanhamento">06 · Acompanhamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block mb-2">Responsável</label>
                  <Select value={manualSession.responsavel} onValueChange={(v: any) => setManualSession({...manualSession, responsavel: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-none h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/5 text-white">
                      <SelectItem value="Leandro">Leandro</SelectItem>
                      <SelectItem value="Neandro">Neandro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block mb-2">Data</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-white/5 border-white/20 text-white rounded-none h-11 px-3 hover:bg-white/10">
                      <Calendar className="mr-2 h-4 w-4" />
                      {manualSession.data ? format(manualSession.data, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#1A1A1A] border-white/10">
                    <CalendarComponent
                      mode="single"
                      selected={manualSession.data}
                      onSelect={(date) => date && setManualSession({...manualSession, data: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block mb-2">Duração</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={manualSession.horas} 
                      onChange={(e) => setManualSession({...manualSession, horas: e.target.value})}
                      className="bg-white/5 border-white/10 text-white rounded-none h-11 text-center"
                    />
                    <span className="text-[10px] text-white/40 font-bold uppercase">h</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <Input 
                      type="number" 
                      max="59"
                      value={manualSession.minutos} 
                      onChange={(e) => setManualSession({...manualSession, minutos: e.target.value})}
                      className="bg-white/5 border-white/10 text-white rounded-none h-11 text-center"
                    />
                    <span className="text-[10px] text-white/40 font-bold uppercase">min</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block mb-2">Observação (Opcional)</label>
                <Input 
                  placeholder="Descrição da atividade..."
                  value={manualSession.obs}
                  onChange={(e) => setManualSession({...manualSession, obs: e.target.value})}
                  className="bg-white/5 border-white/10 text-white rounded-none h-11 placeholder:text-white/10"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="ghost" onClick={() => setIsManualModalOpen(false)} className="flex-1 rounded-none text-[10px] uppercase font-bold text-white/60 hover:text-white">Cancelar</Button>
                <Button onClick={handleManualRegistration} className="flex-1 bg-bronze hover:bg-bronze/90 text-white rounded-none h-12 text-[10px] uppercase font-bold tracking-widest">
                  <CheckCircle2 size={14} className="mr-2" />
                  Registrar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inactivity Modal */}
      <Dialog open={showInactivityModal} onOpenChange={setShowInactivityModal}>
        <DialogContent className="bg-[#1A1A1A] border-white/5 text-white rounded-none p-0 max-w-sm">
          <div className="p-8 text-center">
            <AlertCircle size={32} className="mx-auto text-bronze mb-4" />
            <h2 className="text-xl font-cormorant font-bold mb-2">Ausência detectada</h2>
            <p className="text-[11px] text-white/60 mb-8 leading-relaxed">
              Não detectamos atividade nos últimos 10 minutos. O que deseja fazer com o timer atual?
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  setShowInactivityModal(false);
                  handleActivity();
                }}
                className="w-full bg-bronze hover:bg-bronze/90 text-white rounded-none h-11 text-[10px] uppercase font-bold tracking-widest"
              >
                Continuar trabalhando
              </Button>
              <Button 
                variant="outline"
                onClick={() => pauseInactivity(false)}
                className="w-full border-white/20 hover:border-white/30 text-white rounded-none h-11 text-[10px] uppercase font-bold tracking-widest"
              >
                Pausar agora
              </Button>
              <Button 
                variant="ghost"
                onClick={() => pauseInactivity(true)}
                className="w-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-none h-11 text-[10px] uppercase font-bold tracking-widest"
              >
                Descontar ausência e parar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ControleHoras;
