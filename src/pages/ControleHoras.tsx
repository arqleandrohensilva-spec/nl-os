import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';

const ControleHoras = () => {
  const navigate = useNavigate();
  const { isCollapsed } = useSidebar();
  const [logs, setLogs] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [etapas, setEtapas] = useState<any[]>([]);
  const [baseFinanceira, setBaseFinanceira] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, projetosRes, etapasRes, baseRes] = await Promise.all([
          supabase.from('projeto_horas_log').select('*').order('criado_em', { ascending: false }),
          supabase.from('projetos').select('*').eq('status_geral', 'ativo'),
          supabase.from('projeto_etapas').select('*'),
          supabase.from('base_financeira').select('valor_mensal, categoria')
        ]);

        setLogs(logsRes.data || []);
        setProjetos(projetosRes.data || []);
        setEtapas(etapasRes.data || []);
        setBaseFinanceira(baseRes.data || []);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Custo/hora
  const custoFixoTotal = (baseFinanceira || []).reduce((s, i) => s + Number(i.valor_mensal || 0), 0);
  const horasProdutivas = 160; // 8h * 20 dias
  const custoHora = custoFixoTotal / horasProdutivas;

  // Por projeto
  const dadosProjeto = projetos?.map(projeto => {
    const etapasProjeto = etapas?.filter(e => e.projeto_id === projeto.id) || [];
    const logsProjeto = logs?.filter(l => l.projeto_id === projeto.id) || [];
    
    const horasEstimadas = etapasProjeto.reduce((s, e) => s + Number(e.horas_estimadas || 0), 0);
    const horasLancadas = etapasProjeto.reduce((s, e) => s + Number(e.horas_lancadas || 0), 0);
    const pct = horasEstimadas > 0 ? Math.round(horasLancadas / horasEstimadas * 100) : 0;
    const custoReal = horasLancadas * custoHora;
    
    const porLeandro = logsProjeto.filter(l => l.usuario === 'Leandro').reduce((s, l) => s + Number(l.horas), 0);
    const porNeandro = logsProjeto.filter(l => l.usuario === 'Neandro').reduce((s, l) => s + Number(l.horas), 0);
    
    const diasSemLancamento = logsProjeto.length > 0 
      ? Math.floor((Date.now() - new Date(logsProjeto[0].criado_em).getTime()) / 86400000)
      : null;

    return { ...projeto, horasEstimadas, horasLancadas, pct, custoReal, porLeandro, porNeandro, diasSemLancamento };
  });

  // Totais
  const totalLancado = (logs || []).reduce((s, l) => s + Number(l.horas), 0);
  const totalLeandro = (logs || []).filter(l => l.usuario === 'Leandro').reduce((s, l) => s + Number(l.horas), 0);
  const totalNeandro = (logs || []).filter(l => l.usuario === 'Neandro').reduce((s, l) => s + Number(l.horas), 0);

  // Este mês
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const logsDoMes = (logs || []).filter(l => new Date(l.criado_em) >= inicioMes);
  const horasDoMes = logsDoMes.reduce((s, l) => s + Number(l.horas), 0);

  if (loading) return null;

  return (
    <div className="flex min-h-screen bg-[#0d0d0d] text-white overflow-x-hidden">
      <Sidebar />
      
      <main 
        className="flex-1 transition-all duration-300 ease-in-out p-8"
        style={{ marginLeft: isCollapsed ? '64px' : '230px' }}
      >
        <div className="max-w-6xl mx-auto space-y-8">
          <header>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#e8e8e8', fontWeight: 400 }}>
              Controle de Horas
            </h1>
          </header>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Lançado', value: `${totalLancado}h` },
              { label: 'Horas Este Mês', value: `${horasDoMes}h` },
              { label: 'Leandro vs Neandro', value: `${totalLeandro}h · ${totalNeandro}h` },
              { label: 'Custo/Hora Escritório', value: `R$ ${custoHora.toFixed(2)}` }
            ].map((card, i) => (
              <div key={i} style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontFamily: 'Arial', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  {card.label}
                </div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#e8e8e8' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          <div className="space-y-2">
            {dadosProjeto?.filter(p => p.diasSemLancamento !== null && p.diasSemLancamento > 7).map(p => (
              <div key={p.id} style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '6px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#fbbf24', fontSize: '14px' }}>⚠</span>
                <span style={{ fontFamily: 'Arial', fontSize: '13px', color: '#fbbf24' }}>
                  {p.nome_cliente} — sem lançamento há {p.diasSemLancamento} dias
                </span>
                <button 
                  onClick={() => navigate(`/projetos/detalhe/${p.id}`)} 
                  style={{ marginLeft: 'auto', fontFamily: 'Courier New', fontSize: '8px', color: '#fbbf24', background: 'none', border: '1px solid rgba(251,191,36,0.3)', padding: '3px 8px', cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  LANÇAR →
                </button>
              </div>
            ))}
          </div>

          {/* Projects Table */}
          <section>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 20px', display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.6fr 0.7fr 0.7fr 1fr 0.8fr', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['PROJETO', 'ESTIMADAS', 'LANÇADAS', '%', 'LEANDRO', 'NEANDRO', 'CUSTO REAL', 'EFICIÊNCIA'].map(h => (
                <div key={h} style={{ fontFamily: 'Arial', fontSize: '9px', color: '#444', fontWeight: 600, letterSpacing: '0.5px' }}>{h}</div>
              ))}
            </div>

            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0 0 8px 8px' }}>
              {dadosProjeto?.map(p => {
                const eficiencia = p.horasEstimadas > 0 ? p.pct : null;
                const corEficiencia = eficiencia === null ? '#555' : eficiencia > 100 ? '#f87171' : eficiencia > 80 ? '#fbbf24' : '#4ade80';
                
                return (
                  <div key={p.id} onClick={() => navigate(`/projetos/detalhe/${p.id}`)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.6fr 0.7fr 0.7fr 1fr 0.8fr', gap: 0, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', alignItems: 'center', transition: 'background 0.2s' }}
                    className="hover:bg-white/[0.02]"
                  >
                    <div>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#e8e8e8' }}>{p.nome_cliente}</div>
                      <div style={{ fontFamily: 'Arial', fontSize: '10px', color: '#555', marginTop: '2px' }}>{p.tipo}</div>
                    </div>
                    <div style={{ fontFamily: 'Arial', fontSize: '13px', color: '#777' }}>{p.horasEstimadas}h</div>
                    <div style={{ fontFamily: 'Arial', fontSize: '13px', color: '#e8e8e8', fontWeight: 500 }}>{p.horasLancadas}h</div>
                    <div>
                      <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: corEficiencia }}>{p.pct}%</div>
                      <div style={{ height: '3px', background: '#1c1c1c', borderRadius: '2px', marginTop: '3px' }}>
                        <div style={{ height: '3px', background: corEficiencia, borderRadius: '2px', width: `${Math.min(p.pct, 100)}%` }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Arial', fontSize: '12px', color: '#777' }}>{p.porLeandro}h</div>
                    <div style={{ fontFamily: 'Arial', fontSize: '12px', color: '#777' }}>{p.porNeandro}h</div>
                    <div style={{ fontFamily: 'Arial', fontSize: '12px', color: '#ccc' }}>
                      R$ {p.custoReal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: corEficiencia, textTransform: 'uppercase' }}>
                      {eficiencia === null ? '—' : eficiencia > 100 ? 'ESTOURO' : eficiencia > 80 ? 'ATENÇÃO' : 'OK'}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent Logs */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ fontFamily: 'Arial', fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '2px' }}>Últimos Lançamentos</div>
              <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
            </div>

            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 20px', display: 'grid', gridTemplateColumns: '0.8fr 1.5fr 1.5fr 0.5fr 0.6fr', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['DATA', 'PROJETO', 'ETAPA', 'HORAS', 'QUEM'].map(h => (
                  <div key={h} style={{ fontFamily: 'Arial', fontSize: '9px', color: '#444', fontWeight: 600, letterSpacing: '0.5px' }}>{h}</div>
                ))}
              </div>
              {(logs || []).slice(0, 20).map(log => (
                <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.5fr 1.5fr 0.5fr 0.6fr', gap: 0, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'Arial', fontSize: '11px', color: '#555' }}>
                    {new Date(log.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </div>
                  <div style={{ fontFamily: 'Arial', fontSize: '12px', color: '#ccc' }}>
                    {dadosProjeto?.find(p => p.id === log.projeto_id)?.nome_cliente || '—'}
                  </div>
                  <div style={{ fontFamily: 'Arial', fontSize: '12px', color: '#777' }}>{log.etapa_nome}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#8B7355' }}>+{log.horas}h</div>
                  <div style={{ fontFamily: 'Arial', fontSize: '11px', color: '#555' }}>{log.usuario}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ControleHoras;
