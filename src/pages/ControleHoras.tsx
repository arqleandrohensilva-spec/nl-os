import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Pause, Square, Trash2, X, ChevronRight } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

interface Projeto {
  id: string;
  nome: string;
  cliente_nome: string;
  tipo: string;
  area_m2: number;
  valor_proposta: number;
  horas_estimadas: number;
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
  const [activeTimer, setActiveTimer] = useState<{ id: string, start: Date } | null>(null);
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (activeTimer) {
        const diff = differenceInMinutes(new Date(), activeTimer.start);
        const h = Math.floor(diff / 60).toString().padStart(2, '0');
        const m = (diff % 60).toString().padStart(2, '0');
        setTimerDisplay(`${h}:${m}:00`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const fetchData = async () => {
    const [{ data: pData }, { data: sData }] = await Promise.all([
      supabase.from('projetos').select('*'),
      supabase.from('sessoes_horas').select('*')
    ]);
    setProjetos(pData || []);
    setSessoes(sData || []);
    setLoading(false);
  };

  const startTimer = (projetoId: string) => {
    setActiveTimer({ id: projetoId, start: new Date() });
    toast.success('Timer iniciado');
  };

  const stopTimer = async (projetoId: string) => {
    if (!activeTimer) return;
    const duracao = differenceInMinutes(new Date(), activeTimer.start);
    const { error } = await supabase.from('sessoes_horas').insert({
      projeto_id: projetoId,
      etapa: projetos.find(p => p.id === projetoId)?.etapa_atual || 'Briefing',
      responsavel: 'Leandro',
      inicio: activeTimer.start.toISOString(),
      fim: new Date().toISOString(),
      duracao_minutos: duracao
    });
    if (!error) {
      toast.success(`Sessão encerrada: ${duracao} min`);
      setActiveTimer(null);
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <Sidebar user="Sócio" />
      <main className="ml-[230px] p-12">
        <header className="mb-12">
          <h1 className="text-[28px] font-cormorant font-bold text-white mb-1">Controle de Horas</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Módulo 03 · Registro de tempo por projeto</p>
        </header>

        {loading ? (
          <div className="text-bronze">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projetos.map((p) => {
              const totalRealizado = sessoes.filter(s => s.projeto_id === p.id).reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) / 60;
              const isRunning = activeTimer?.id === p.id;
              const progress = Math.min((totalRealizado / p.horas_estimadas) * 100, 100);
              
              return (
                <div key={p.id} className="border border-white/5 bg-[#141414] p-6 rounded-[4px] relative">
                  {isRunning && <div className="absolute top-4 right-4 bg-bronze text-[8px] animate-pulse px-2 py-1 uppercase font-bold text-white">Em andamento</div>}
                  <h3 className="font-cormorant text-xl mb-4">{p.nome}</h3>
                  <div className="mb-6">
                    <div className="flex justify-between text-[10px] mb-1 text-white/60 uppercase">
                      <span>{Math.round(totalRealizado)}h realizadas de {p.horas_estimadas}h</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-bronze rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isRunning ? (
                      <button onClick={() => stopTimer(p.id)} className="flex-1 bg-bronze text-white py-2 text-[10px] uppercase font-bold">⏹ Encerrar ({timerDisplay})</button>
                    ) : (
                      <button onClick={() => startTimer(p.id)} className="flex-1 border border-white/10 hover:border-bronze py-2 text-[10px] uppercase transition-all">▶ Iniciar</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ControleHoras;
