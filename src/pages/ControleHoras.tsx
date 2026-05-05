import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Pause, Square, Trash2, X, ChevronRight, FileText, Info, TrendingUp, DollarSign, Clock, Users, BarChart3 } from 'lucide-react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Projeto {
  id: string;
  nome: string;
  cliente_nome: string;
  tipo: string;
  area_m2: number;
  valor_proposta: number;
  horas_estimadas: number;
  horas_briefing: number;
  horas_anteprojeto: number;
  horas_executivo: number;
  horas_acompanhamento: number;
  etapa_atual: string;
  status: string;
}

interface Sessao {
  id: string;
  projeto_id: string;
  etapa: string;
  responsavel: string;
  inicio: string;
  fim: string | null;
  duracao_minutos: number | null;
  observacao: string | null;
}

const ControleHoras = () => {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Timer State
  const [activeTimer, setActiveTimer] = useState<{ id: string, start: Date, etapa: string, responsavel: string, obs: string } | null>(null);
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);
  const [newSession, setNewSession] = useState({ etapa: '', responsavel: 'Leandro', obs: '' });

  // Sidebar Panel State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelProjeto, setPanelProjeto] = useState<Projeto | null>(null);

  // Profitability Report State
  const [isReportExpanded, setIsReportExpanded] = useState(false);

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

  const fetchData = async () => {
    try {
      const [{ data: pData }, { data: sData }, { data: cData }] = await Promise.all([
        supabase.from('projetos').select('*').order('criado_em', { ascending: false }),
        supabase.from('sessoes_horas').select('*').order('inicio', { ascending: false }),
        supabase.from('config_escritorio').select('*').single()
      ]);
      setProjetos(pData || []);
      setSessoes(sData || []);
      setConfig(cData);
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

  const stopTimer = async () => {
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

  // Metrics
  const metrics = useMemo(() => {
    const totalMes = sessoes.filter(s => {
      const d = parseISO(s.inicio);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;

    const ativos = projetos.filter(p => p.status === 'ativo').length;
    const custoHora = config?.custo_hora || 150;
    const custoInterno = totalMes * custoHora;

    return { totalMes, ativos, custoInterno, custoHora };
  }, [sessoes, projetos, config]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A]">
      <Sidebar user="Sócio" />
      <main className="ml-[230px] p-12 pb-24">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-[28px] font-cormorant font-bold text-[#1A1A1A] mb-1">Controle de Horas</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Módulo 03 · Registro de tempo por projeto</p>
          </div>
          <Button variant="outline" className="border-[#1A1A1A]/10 hover:border-bronze text-[#1A1A1A] text-[10px] uppercase font-bold tracking-widest h-10 px-6 rounded-none">
            + Novo Projeto
          </Button>
        </header>

        <div className="grid grid-cols-4 gap-6 mb-12">
          {[
            { label: 'HORAS NO MÊS', value: `${Math.round(metrics.totalMes)}h`, sub: 'Total registrado' },
            { label: 'PROJETOS ATIVOS', value: metrics.ativos, sub: 'Em andamento' },
            { label: 'CUSTO INTERNO', value: `R$ ${metrics.custoInterno.toLocaleString()}`, sub: `horas × R$ ${metrics.custoHora}/h`, bronze: true },
            { label: 'EFICIÊNCIA', value: '92%', sub: 'estimado vs realizado', green: true },
          ].map((m, i) => (
            <div key={i} className="bg-white border border-[#E8E4DF] p-6 rounded-[4px] border-b-2 border-b-bronze relative overflow-hidden">
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2 font-bold">{m.label}</p>
              <h2 className={cn("text-4xl font-cormorant font-bold mb-1", m.bronze ? "text-bronze" : "text-[#1A1A1A]", m.green && "text-emerald-600")}>{m.value}</h2>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 font-bold">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Projects List - Single Column */}
        <div className="space-y-6 mb-16">
          {projetos.map((p) => {
            const projetoSessoes = sessoes.filter(s => s.projeto_id === p.id);
            const totalMinutos = projetoSessoes.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);
            const totalHoras = totalMinutos / 60;
            const progress = (totalHoras / p.horas_estimadas) * 100;
            const isRunning = activeTimer?.id === p.id;

            return (
              <div key={p.id} className="bg-white border border-[#E8E4DF] p-8 rounded-[4px] group relative transition-all duration-300 hover:border-bronze/30 flex items-center gap-8">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-2xl font-cormorant font-bold text-[#1A1A1A] group-hover:text-bronze transition-colors">{p.nome}</h3>
                    {isRunning && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-bronze rounded-full animate-ping" />
                        <span className="text-[9px] text-bronze font-bold uppercase tracking-widest">Em andamento</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-6 font-bold">{p.cliente_nome} · {p.tipo} · {p.area_m2}m²</p>

                  <div className="grid grid-cols-2 gap-8 items-end">
                    <div>
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-bold">
                        <span>Etapa Atual: <span className="text-[#1A1A1A]">{p.etapa_atual}</span></span>
                        <span className={cn(progress > 90 ? "text-rose-500" : "text-[#1A1A1A]")}>
                          {Math.round(totalHoras)}h realizadas de {p.horas_estimadas}h estimadas
                        </span>
                      </div>
                      <div className="h-[4px] bg-[#F5F2EF] rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-500", progress > 90 ? "bg-rose-500" : "bg-bronze")}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                      {isRunning ? (
                        <Button 
                          onClick={stopTimer}
                          className="bg-bronze hover:bg-bronze/90 text-white rounded-none h-11 px-8 text-[10px] uppercase font-bold tracking-[0.1em]"
                        >
                          <Square size={12} className="mr-2 fill-white" />
                          Encerrar ({timerDisplay})
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => openTimerModal(p)}
                          variant="outline"
                          className="border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white rounded-none h-11 px-8 text-[10px] uppercase font-bold tracking-[0.1em] transition-all"
                        >
                          <Play size={12} className="mr-2" />
                          Iniciar
                        </Button>
                      )}
                      <Button 
                        variant="ghost"
                        onClick={() => openPanel(p)}
                        className="text-muted-foreground hover:text-bronze hover:bg-transparent rounded-none h-11 px-6 text-[10px] uppercase font-bold tracking-[0.1em]"
                      >
                        Ver Sessões
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Profitability Report */}
        <div className="bg-[#141414] border border-white/5 rounded-[4px] overflow-hidden">
          <button 
            onClick={() => setIsReportExpanded(!isReportExpanded)}
            className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={18} className="text-bronze" />
              <h3 className="text-[12px] font-bold uppercase tracking-[0.2em]">Relatório de Lucratividade</h3>
            </div>
            <ChevronRight className={cn("transition-transform text-white/20", isReportExpanded && "rotate-90")} />
          </button>
          
          {isReportExpanded && (
            <div className="px-6 pb-6 border-t border-white/5 pt-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] uppercase tracking-widest text-white/30 border-b border-white/5">
                    <th className="pb-4 font-bold">Projeto</th>
                    <th className="pb-4 font-bold">Receita</th>
                    <th className="pb-4 font-bold">Custo Int.</th>
                    <th className="pb-4 font-bold">Margem</th>
                    <th className="pb-4 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {projetos.map(p => {
                    const pSessoes = sessoes.filter(s => s.projeto_id === p.id);
                    const horas = pSessoes.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
                    const custo = horas * (config?.custo_hora || 150);
                    const margem = p.valor_proposta > 0 ? ((p.valor_proposta - custo) / p.valor_proposta) * 100 : 0;
                    
                    return (
                      <tr key={p.id} className="border-b border-white/[0.02] last:border-0">
                        <td className="py-4 font-medium">{p.nome}</td>
                        <td className="py-4 text-white/60 font-mono">R$ {p.valor_proposta.toLocaleString()}</td>
                        <td className="py-4 text-white/60 font-mono">R$ {Math.round(custo).toLocaleString()}</td>
                        <td className={cn(
                          "py-4 font-bold font-mono",
                          margem > 30 ? "text-emerald-500" : margem > 15 ? "text-bronze" : "text-rose-500"
                        )}>
                          {Math.round(margem)}%
                        </td>
                        <td className="py-4 text-right">
                          <span className={cn(
                            "text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-sm",
                            p.status === 'ativo' ? "bg-bronze/10 text-bronze" : "bg-white/5 text-white/40"
                          )}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <div className="mt-8 flex justify-end">
                <Button className="bg-bronze hover:bg-bronze/90 text-white rounded-none text-[10px] uppercase font-bold tracking-widest px-8">
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
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-8">{selectedProjeto?.nome}</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold block mb-2">Etapa</label>
                <Select value={newSession.etapa} onValueChange={(v) => setNewSession({...newSession, etapa: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-none h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/5 text-white">
                    <SelectItem value="Briefing">Briefing</SelectItem>
                    <SelectItem value="Anteprojeto">Anteprojeto</SelectItem>
                    <SelectItem value="Projeto Executivo">Projeto Executivo</SelectItem>
                    <SelectItem value="Acompanhamento de Obra">Acompanhamento de Obra</SelectItem>
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
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-none text-[10px] uppercase font-bold text-white/40 hover:text-white">Cancelar</Button>
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
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{panelProjeto?.cliente_nome} · {panelProjeto?.tipo}</p>
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
                    <p className="text-xl font-cormorant">R$ {Math.round((sessoes.filter(s => s.projeto_id === panelProjeto.id).reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60) * (config?.custo_hora || 150)).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest text-white/30 mb-1 font-bold">Margem Real</p>
                    {(() => {
                      const horas = sessoes.filter(s => s.projeto_id === panelProjeto.id).reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
                      const custo = horas * (config?.custo_hora || 150);
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

                <div className="space-y-4">
                  <h4 className="text-[9px] uppercase tracking-widest font-bold text-white/40">Horas por Etapa</h4>
                  {[
                    { label: 'Briefing', estim: panelProjeto.horas_briefing },
                    { label: 'Anteprojeto', estim: panelProjeto.horas_anteprojeto },
                    { label: 'Projeto Executivo', estim: panelProjeto.horas_executivo },
                    { label: 'Acompanhamento de Obra', estim: panelProjeto.horas_acompanhamento },
                  ].map(e => {
                    const real = sessoes.filter(s => s.projeto_id === panelProjeto.id && s.etapa === e.label).reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
                    const p = Math.min((real / e.estim) * 100, 100);
                    return (
                      <div key={e.label}>
                        <div className="flex justify-between text-[10px] text-white/60 mb-1.5 font-bold uppercase tracking-wider">
                          <span>{e.label}</span>
                          <span>{Math.round(real)}h / {e.estim}h</span>
                        </div>
                        <div className="h-[6px] bg-[#2A2A2A] rounded-full overflow-hidden">
                          <div className="h-full bg-bronze" style={{ width: `${p}%` }} />
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
                        <div className="space-y-1">
                          <p className="text-[11px] font-medium">{format(parseISO(s.inicio), 'dd MMM', { locale: ptBR })} · {s.etapa}</p>
                          <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{s.responsavel} · {Math.round(s.duracao_minutos || 0)} min</p>
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
    </div>
  );
};

export default ControleHoras;
