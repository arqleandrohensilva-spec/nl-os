import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  Calendar, 
  AlertCircle, 
  Clock 
} from 'lucide-react';
import { format, isSameWeek, parseISO, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Projeto {
  id: string;
  nome: string;
  nome_cliente: string;
  tipo: string;
  cidade: string;
  area_m2: number;
  etapa_atual: string;
  status_geral: string;
  data_inicio: string;
  prazo_final: string;
  horas_estimadas: number;
  criado_em?: string;
}

interface EtapaInfo {
  etapa: string;
  status: string;
  data_entrega: string;
  data_inicio?: string;
}

interface ParcelaInfo {
  status: string;
  data_vencimento: string;
}

interface ChecklistInfo {
  etapa: string;
  concluido: boolean;
  criado_em: string;
}

const GestaoProjetos = () => {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [etapas, setEtapas] = useState<Record<string, EtapaInfo[]>>({});
  const [parcelas, setParcelas] = useState<Record<string, ParcelaInfo[]>>({});
  const [checklists, setChecklists] = useState<Record<string, ChecklistInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [totalHorasMes, setTotalHorasMes] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: pData } = await supabase
        .from('projetos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (pData) {
        setProjetos(pData);
        
        // Parallel data fetching for all projects
        const [eRes, fRes, cRes] = await Promise.all([
          supabase.from('projeto_etapas').select('projeto_id, etapa, status, data_entrega, data_inicio'),
          supabase.from('financeiro_parcelas').select('projeto_id, status, data_vencimento'),
          supabase.from('projeto_checklist').select('projeto_id, etapa, concluido, criado_em')
        ]);
        
        if (eRes.data) {
          const grouped = eRes.data.reduce((acc: any, curr) => {
            if (!acc[curr.projeto_id]) acc[curr.projeto_id] = [];
            acc[curr.projeto_id].push(curr);
            return acc;
          }, {});
          setEtapas(grouped);
        }

        if (fRes.data) {
          const grouped = fRes.data.reduce((acc: any, curr) => {
            if (!acc[curr.projeto_id]) acc[curr.projeto_id] = [];
            acc[curr.projeto_id].push(curr);
            return acc;
          }, {});
          setParcelas(grouped);
        }

        if (cRes.data) {
          const grouped = cRes.data.reduce((acc: any, curr) => {
            if (!acc[curr.projeto_id]) acc[curr.projeto_id] = [];
            acc[curr.projeto_id].push(curr);
            return acc;
          }, {});
          setChecklists(grouped);
        }
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: hData } = await supabase
        .from('sessoes_horas')
        .select('duracao_minutos')
        .gte('inicio', startOfMonth.toISOString());

      if (hData) {
        const total = hData.reduce((acc, curr) => {
          const val = typeof curr.duracao_minutos === 'string' ? parseFloat(curr.duracao_minutos) : curr.duracao_minutos;
          return acc + (Number.isNaN(val) ? 0 : (val || 0));
        }, 0);
        setTotalHorasMes(Math.round(total / 60) || 0);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthScore = (projetoId: string) => {
    const pEtapas = etapas[projetoId] || [];
    const pParcelas = parcelas[projetoId] || [];
    const pChecklists = checklists[projetoId] || [];

    const today = startOfDay(new Date());

    // 1. Parcela com status === 'ATRASADO' vinculada ao projeto
    const hasAtrasada = pParcelas.some(p => p.status?.toUpperCase() === 'ATRASADO');

    // 2. Etapa com data_entrega preenchida e essa data já passou
    const hasEtapaVencida = pEtapas.some(e => {
      if (!e.data_entrega || e.status?.toLowerCase() === 'concluido' || e.status?.toLowerCase() === 'aprovado') return false;
      return isBefore(parseISO(e.data_entrega), today);
    });

    // 3. Checklist com concluido === false e data de criação há mais de 7 dias
    // (Utilizando criado_em como referência de tempo já que updated_at não está disponível)
    const hasChecklistPendenteLonga = pChecklists.some(c => {
      if (c.concluido) return false;
      if (!c.criado_em) return false;
      return differenceInDays(today, parseISO(c.criado_em)) > 7;
    });

    if (hasAtrasada || hasEtapaVencida || hasChecklistPendenteLonga) {
      return { label: 'ATENÇÃO', color: '#fbbf24', bg: 'bg-amber-500/10' };
    }

    // Sem data = sem risco calculável = OK por padrão
    return { label: 'OK', color: '#4ade80', bg: 'bg-green-500/10' };
  };

  const activeProjectsCount = projetos.filter(p => p.status_geral === 'ativo' || p.status_geral === 'Em andamento' || p.status_geral === 'Ativo').length;
  
  const deliveriesThisWeek = Object.values(etapas).flat().filter(e => {
    if (!e.data_entrega) return false;
    return isSameWeek(new Date(), parseISO(e.data_entrega), { weekStartsOn: 1 });
  }).length;

  const pendingApprovals = Object.values(etapas).flat().filter(e => e.status === 'Aguardando aprovação').length;

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white font-mono">
      <Sidebar user="Equipe NL" />
      
      <main className="flex-1 transition-[margin] duration-300 ml-[var(--sidebar-width)] p-12">
        <header className="mb-12">
          <h1 className="text-5xl font-cormorant font-light tracking-tight mb-2 italic">Gestão de Projetos</h1>
          <p className="text-[10px] tracking-[0.5em] text-[#8B7355] font-bold uppercase">PROJETOS ATIVOS · ETAPAS E ENTREGAS</p>
        </header>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <MetricCard label="Projetos Ativos" value={activeProjectsCount} />
          <MetricCard label="Entregas esta semana" value={deliveriesThisWeek} accent={deliveriesThisWeek > 0} />
          <MetricCard label="Aprovações pendentes" value={pendingApprovals} warning={pendingApprovals > 0} />
          <MetricCard label="Horas no mês" value={`${totalHorasMes}h`} />
        </div>

        {/* Projects List - Redesign Monograph Style */}
        <div style={{ background: '#0d0d0d', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1c1c1c' }}>
          {/* Cabeçalho de colunas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 0.5fr 1.2fr 1.2fr 0.6fr', gap: 0, padding: '6px 16px', borderBottom: '1px solid #1a1a1a', alignItems: 'center' }}>
            {['Cliente', 'Tipo', 'Fase atual', 'Próxima entrega', 'Status'].map(col => (
              <span key={col} style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{col}</span>
            ))}
          </div>

          {projetos.map(projeto => {
            const projetoEtapas = etapas[projeto.id] || [];
            
            // Get next delivery: first etapa not approved/concluded
            const nextDelivery = projetoEtapas.find(e => e.status !== 'CONCLUIDO' && e.status !== 'aprovado' && e.status !== 'Aprovado');
            const allApproved = projetoEtapas.length > 0 && projetoEtapas.every(e => e.status === 'CONCLUIDO' || e.status === 'aprovado' || e.status === 'Aprovado');
            
            const emAndamento = projetoEtapas.find(e => e.status === 'em_andamento' || e.status === 'Em andamento');
            const etapaTexto = emAndamento?.etapa || projeto.etapa_atual;
            
            const health = getHealthScore(projeto.id);

            return (
              <div
                key={projeto.id}
                onClick={() => navigate(`/projetos/detalhe/${projeto.id}`)}
                style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.8fr 0.5fr 1.2fr 1.2fr 0.6fr', gap: 0, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', alignItems: 'center', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Health Indicator Badge */}
                <div style={{ 
                  position: 'absolute', 
                  top: '12px', 
                  right: '12px', 
                  fontSize: '8px', 
                  fontWeight: 'bold', 
                  color: health.color, 
                  padding: '2px 6px', 
                  borderRadius: '2px', 
                  border: `1px solid ${health.color}30`,
                  background: `${health.color}10`
                }}>
                  {health.label}
                </div>

                {/* Cliente */}
                <div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#ffffff', fontWeight: 500 }}>{projeto.nome_cliente}</div>
                  
                  {/* Próxima Entrega Em Destaque */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#8B7355', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      PRÓXIMA ENTREGA · 
                    </span>
                    <span style={{ 
                      fontSize: '9px', 
                      color: allApproved ? '#CD7F32' : (nextDelivery && nextDelivery.data_entrega && differenceInDays(parseISO(nextDelivery.data_entrega), new Date()) < 0 ? '#f87171' : '#ccc'),
                      textTransform: 'uppercase'
                    }}>
                      {allApproved ? 'CONCLUÍDO' : (nextDelivery ? `${nextDelivery.etapa} · ${(() => {
                        if (!nextDelivery.data_entrega) return 'Sem prazo';
                        const diff = differenceInDays(parseISO(nextDelivery.data_entrega), new Date());
                        return diff < 0 ? `Vencido ${Math.abs(diff)}d` : `${diff}d`;
                      })()}` : '—')}
                    </span>
                  </div>

                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#555', marginTop: '4px' }}>
                    {projeto.cidade} · {projeto.area_m2 ? `${projeto.area_m2}m²` : 'N/A'} · desde {projeto.data_inicio ? new Date(projeto.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                  </div>
                </div>

                {/* Tipo */}
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#8B7355', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                  {projeto.tipo}
                </div>

                {/* Fase atual com barra de progresso */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#cccccc' }}>
                    {etapaTexto}
                  </div>
                  <div style={{ height: '3px', background: '#222', borderRadius: '1.5px', width: '100%' }}>
                    <div style={{
                      height: '3px', background: '#8B7355', borderRadius: '1.5px',
                      width: `${(() => {
                        const ordem = ['Briefing', 'Conceito', 'Estudo Preliminar', 'Executivo', 'Entrega'];
                        const matchIdx = ordem.findIndex(o => 
                          o.toLowerCase().includes(etapaTexto.toLowerCase()) || 
                          etapaTexto.toLowerCase().includes(o.toLowerCase()) ||
                          (o === 'Estudo Preliminar' && (etapaTexto.toLowerCase().includes('est.prel') || etapaTexto.toLowerCase().includes('preliminar')))
                        );
                        return matchIdx >= 0 ? ((matchIdx + 1) / ordem.length * 100) : 10;
                      })()}%`
                    }} />
                  </div>
                </div>

                {/* Próxima entrega */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#555' }}>
                    {etapaTexto ? `Aprovação ${etapaTexto}` : '—'}
                  </div>
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', color: (() => {
                    const dataEntrega = emAndamento?.data_entrega;
                    if (!dataEntrega) return '#555';
                    const dias = Math.ceil((new Date(dataEntrega).getTime() - Date.now()) / 86400000);
                    return dias < 0 ? '#f87171' : dias <= 7 ? '#fbbf24' : '#888';
                  })() }}>
                    {(() => {
                      const dataEntrega = emAndamento?.data_entrega;
                      if (!dataEntrega) return 'N/A';
                      const dias = Math.ceil((new Date(dataEntrega).getTime() - Date.now()) / 86400000);
                      const dataFormatada = new Date(dataEntrega).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                      return dias < 0 ? `Atrasado ${Math.abs(dias)}d` : dias === 0 ? 'Hoje' : `${dataFormatada} · em ${dias}d`;
                    })()}
                  </div>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ 
                    width: '5px', 
                    height: '5px', 
                    borderRadius: '50%', 
                    background: (projeto.status_geral?.toLowerCase() === 'ativo' || projeto.status_geral?.toLowerCase() === 'em andamento') ? '#4ade80' : '#555' 
                  }} />
                  <span style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '12px', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.08em', 
                    color: (projeto.status_geral?.toLowerCase() === 'ativo' || projeto.status_geral?.toLowerCase() === 'em andamento') ? '#4ade80' : '#555' 
                  }}>
                    {projeto.status_geral}
                  </span>
                </div>
              </div>
            );
          })}

          {projetos.length === 0 && !loading && (
            <div className="text-center py-24 border border-dashed border-white/10">
              <p className="text-white/40 uppercase tracking-widest text-[11px]">Nenhum projeto ativo encontrado.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const MetricCard = ({ label, value, accent, warning }: { label: string, value: string | number, accent?: boolean, warning?: boolean }) => (
  <div className="bg-[#1a1a1a] border border-white/5 p-[12px_16px] transition-all duration-300 rounded-lg">
    <p className="text-[8px] tracking-[0.4em] text-[#8B7355] font-bold uppercase mb-1" style={{ fontFamily: "'Courier New', Courier, monospace" }}>{label}</p>
    <p className={cn(
      "text-[24px] font-light font-cormorant",
      accent ? "text-[#8B7355]" : warning ? "text-rose-500" : "text-white"
    )} style={{ fontFamily: "Georgia, serif" }}>{value}</p>
  </div>
);

export default GestaoProjetos;