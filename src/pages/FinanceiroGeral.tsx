import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, isAfter, isWithinInterval, parseISO, addMonths, addDays, isBefore, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  DollarSign, 
  ArrowUpRight, 
  AlertCircle, 
  ChevronRight,
  TrendingUp,
  MessageCircle,
  Clock,
  ExternalLink,
  Receipt
} from 'lucide-react';
import { toast } from "sonner";

const FinanceiroGeral = () => {
  const navigate = useNavigate();
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [baseFinanceira, setBaseFinanceira] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroParcelas, setFiltroParcelas] = useState('Todas');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, projRes, baseRes] = await Promise.all([
        supabase.from('financeiro_parcelas').select('*, projetos(nome, tipo)').order('data_vencimento', { ascending: true }),
        supabase.from('projetos').select('*').eq('status_geral', 'ativo').order('criado_em', { ascending: false }),
        supabase.from('custos_escritorio').select('*')
      ]);

      const updatedParcelas = (pRes.data || []).map(p => {
        if (p.status === 'PAGO' || p.status === 'PAGO PARCIAL') return p;
        const dateVenc = parseISO(p.data_vencimento);
        const today = new Date();
        today.setHours(0,0,0,0);
        let status = p.status;
        if (isBefore(dateVenc, today)) status = 'ATRASADO';
        return { ...p, status };
      });

      setParcelas(updatedParcelas);
      setProjetos(projRes.data || []);
      setBaseFinanceira(baseRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  const custoFixoMensal = (baseFinanceira || [])
    .filter(item => item.ativo !== false)
    .reduce((sum, item) => {
        const valor = item.frequencia === 'anual' ? item.valor / 12 : item.valor;
        return sum + (Number(valor) || 0);
    }, 0);

  const recebidoMes = parcelas?.filter(p => 
    (p.status === 'PAGO' || p.status === 'PAGO PARCIAL') && p.data_recebimento &&
    isWithinInterval(parseISO(p.data_recebimento), { start: inicioMes, end: fimMes })
  ).reduce((s, p) => s + Number(p.valor_recebido || p.valor), 0) || 0;

  const previstoMes = parcelas?.filter(p =>
    p.status !== 'PAGO' && p.status !== 'PAGO PARCIAL' &&
    isWithinInterval(parseISO(p.data_vencimento), { start: inicioMes, end: fimMes })
  ).reduce((s, p) => s + Number(p.valor), 0) || 0;

  const totalAtrasado = parcelas?.filter(p =>
    p.status === 'ATRASADO'
  ).reduce((s, p) => s + Number(p.valor), 0) || 0;

  const margemMes = recebidoMes - custoFixoMensal;

  const próximosVencimentos = parcelas?.filter(p => 
    p.status !== 'PAGO' && 
    isWithinInterval(parseISO(p.data_vencimento), { start: hoje, end: addDays(hoje, 7) })
  ).slice(0, 5);

  const parcelasFiltradas = useMemo(() => {
    let list = [...parcelas];
    if (filtroParcelas === 'Pendentes') list = list.filter(p => p.status !== 'PAGO' && p.status !== 'PAGO PARCIAL');
    else if (filtroParcelas === 'Pagas') list = list.filter(p => p.status === 'PAGO' || p.status === 'PAGO PARCIAL');
    else if (filtroParcelas === 'Atrasadas') list = list.filter(p => p.status === 'ATRASADO');
    
    return list.sort((a, b) => {
        if (a.status === 'ATRASADO' && b.status !== 'ATRASADO') return -1;
        if (a.status !== 'ATRASADO' && b.status === 'ATRASADO') return 1;
        return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
    });
  }, [parcelas, filtroParcelas]);

  return (
    <div className="flex min-h-screen bg-[#0d0d0d] text-[#e8e8e8]">
      <Sidebar user="Sócio" />
      <div className="flex-1 ml-[230px] p-8">
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#e8e8e8', fontWeight: 400 }}>Financeiro</h1>
          <p style={{ fontFamily: 'Courier New', fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '4px' }}>
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] p-6">
                <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: '#555', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Recebido no Mês</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#4ade80' }}>R$ {recebidoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] p-6">
                <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: '#555', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Previsto no Mês</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#e8e8e8' }}>R$ {previstoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] p-6">
                <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: '#555', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Em Atraso</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#f87171' }}>R$ {totalAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] p-6">
                <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: '#555', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Margem</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: margemMes >= 0 ? '#4ade80' : '#f87171' }}>
                    R$ {margemMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
            </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="visao-geral" className="w-full">
          <TabsList className="bg-[#141414] border border-[rgba(255,255,255,0.06)] h-12 p-1 mb-8">
            <TabsTrigger value="visao-geral" className="px-6 text-[10px] tracking-widest uppercase">VISÃO GERAL</TabsTrigger>
            <TabsTrigger value="projetos" className="px-6 text-[10px] tracking-widest uppercase">PROJETOS</TabsTrigger>
            <TabsTrigger value="fluxo" className="px-6 text-[10px] tracking-widest uppercase">FLUXO DE CAIXA</TabsTrigger>
            <TabsTrigger value="parcelas" className="px-6 text-[10px] tracking-widest uppercase">PARCELAS</TabsTrigger>
            <TabsTrigger value="lucratividade" className="px-6 text-[10px] tracking-widest uppercase">LUCRATIVIDADE</TabsTrigger>
          </TabsList>
          
          {/* ABA 1: VISÃO GERAL */}
          <TabsContent value="visao-geral">
              <div className="grid grid-cols-2 gap-8">
                  {/* Saúde do Mês */}
                  <div className="bg-[#141414] p-8 border border-[rgba(255,255,255,0.06)]">
                      <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', marginBottom: '24px' }}>Saúde do Mês</h3>
                      
                      <div className="space-y-6">
                          <div>
                            <div className="flex justify-between text-[11px] text-[#555] uppercase font-mono mb-2">
                                <span>Progresso de Receita</span>
                                <span>{((recebidoMes / (recebidoMes + previstoMes || 1)) * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                                <div className="h-full bg-[#4ade80]" style={{ width: `${Math.min((recebidoMes / (recebidoMes + previstoMes || 1)) * 100, 100)}%` }}></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                              <div>
                                  <div className="text-[10px] text-[#555] uppercase mb-1">Confirmado</div>
                                  <div className="text-lg text-[#4ade80]">R$ {recebidoMes.toLocaleString('pt-BR')}</div>
                              </div>
                              <div>
                                  <div className="text-[10px] text-[#555] uppercase mb-1">Custo Fixo</div>
                                  <div className="text-lg text-[#ccc]">R$ {custoFixoMensal.toLocaleString('pt-BR')}</div>
                              </div>
                              <div className="pt-4 col-span-2 border-t border-white/5">
                                  <div className="text-[10px] text-[#555] uppercase mb-1">Margem Real</div>
                                  <div className="text-xl" style={{ color: margemMes >= 0 ? '#4ade80' : '#f87171' }}>R$ {margemMes.toLocaleString('pt-BR')}</div>
                              </div>
                          </div>

                          {totalAtrasado > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] uppercase tracking-wider">
                                <AlertCircle size={14} />
                                Atenção: Existem parcelas em atraso
                            </div>
                          )}
                      </div>
                  </div>

                  {/* Próximos Vencimentos */}
                  <div className="bg-[#141414] p-8 border border-[rgba(255,255,255,0.06)]">
                      <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', marginBottom: '24px' }}>Próximos Vencimentos (7 dias)</h3>
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] text-[#555] uppercase font-mono tracking-widest">Cliente / Valor</span>
                        <span className="text-[10px] text-[#555] uppercase font-mono tracking-widest">Ações</span>
                      </div>

                      <div className="space-y-4">
                          {próximosVencimentos?.length ? próximosVencimentos.map(p => (
                            <div key={p.id} className="flex justify-between items-center py-3 border-b border-white/5">
                                <div>
                                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px' }}>{p.cliente_nome}</div>
                                    <div style={{ fontFamily: 'Arial', fontSize: '10px', color: '#555' }}>R$ {p.valor.toLocaleString('pt-BR')} · {format(parseISO(p.data_vencimento), 'dd/MM')}</div>
                                </div>
                                <button 
                                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Olá ${p.cliente_nome}, lembrete da parcela de R$ ${p.valor.toLocaleString('pt-BR')} que vence em ${format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}.`)}`, '_blank')}
                                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8B7355] border border-[#8B7355]/30 hover:bg-[#8B7355]/5 transition-colors"
                                >
                                    COBRAR
                                </button>
                            </div>
                          )) : (
                            <div className="text-center py-8 text-[#555] text-xs uppercase tracking-widest">Nenhum vencimento próximo</div>
                          )}
                      </div>
                  </div>
              </div>
          </TabsContent>
          
          {/* ABA 2: PROJETOS */}
          <TabsContent value="projetos">
              <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                  {/* Cabeçalho */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 0.8fr 0.8fr 0.8fr 0.6fr 0.5fr', gap: 0, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                      {['PROJETO', 'CONTRATO', 'PAGO', 'EM ABERTO', 'SAÚDE', '—'].map(h => (
                        <div key={h} style={{ fontFamily: 'Courier New', fontSize: '10px', color: '#555', fontWeight: 'bold' }}>{h}</div>
                      ))}
                  </div>

                  {projetos?.map((projeto: any) => {
                    const parcelasProjeto = parcelas?.filter(p => p.projeto_id === projeto.id) || [];
                    const contratoTotal = parcelasProjeto.reduce((s, p) => s + Number(p.valor), 0);
                    const pagoTotal = parcelasProjeto.filter(p => p.status === 'PAGO' || p.status === 'PAGO PARCIAL').reduce((s, p) => s + Number(p.valor_recebido || p.valor), 0);
                    const emAberto = contratoTotal - pagoTotal;
                    
                    const temAtraso = parcelasProjeto.some(p => p.status === 'ATRASADO');
                    const vencePerto = parcelasProjeto.some(p => p.status !== 'PAGO' && differenceInDays(parseISO(p.data_vencimento), hoje) <= 7);
                    const health = temAtraso ? { color: '#f87171', label: 'ATR' } : vencePerto ? { color: '#fbbf24', label: 'ATN' } : { color: '#4ade80', label: 'OK' };

                    return (
                        <div 
                            key={projeto.id} 
                            onClick={() => navigate(`/projetos/${projeto.id}/financeiro`)}
                            style={{ display: 'grid', gridTemplateColumns: '1.8fr 0.8fr 0.8fr 0.8fr 0.6fr 0.5fr', gap: 0, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', alignItems: 'center' }}
                            className="hover:bg-white/5 transition-colors"
                        >
                            <div>
                                <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px' }}>{projeto.nome_cliente}</div>
                                <div style={{ fontFamily: 'Arial', fontSize: '10px', color: '#555', marginTop: '2px' }}>{projeto.tipo}</div>
                            </div>
                            <div style={{ fontSize: '13px', color: '#ccc' }}>R$ {contratoTotal.toLocaleString('pt-BR')}</div>
                            <div style={{ fontSize: '13px', color: '#4ade80' }}>R$ {pagoTotal.toLocaleString('pt-BR')}</div>
                            <div style={{ fontSize: '13px', color: emAberto > 0 ? '#fbbf24' : '#555' }}>R$ {emAberto.toLocaleString('pt-BR')}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: health.color }}></div>
                                <span style={{ fontSize: '10px', color: health.color, fontWeight: 'bold' }}>{health.label}</span>
                            </div>
                            <div className="text-[#8B7355] text-right"><ChevronRight size={16} /></div>
                        </div>
                    );
                  })}
              </div>
          </TabsContent>

          {/* ABA 3: FLUXO DE CAIXA */}
          <TabsContent value="fluxo">
              <div className="grid grid-cols-3 gap-6">
                  {[0, 1, 2].map(offset => {
                      const mesRef = addMonths(startOfMonth(hoje), offset);
                      const parcelasMes = parcelas?.filter(p => p.status !== 'PAGO' && isWithinInterval(parseISO(p.data_vencimento), { start: mesRef, end: endOfMonth(mesRef) }));
                      const totalMes = parcelasMes.reduce((s, p) => s + Number(p.valor), 0);

                      return (
                        <div key={offset} className="bg-[#141414] border border-white/5 p-6">
                            <h4 style={{ fontFamily: 'Courier New', fontSize: '12px', color: '#8B7355', letterSpacing: '0.2em', marginBottom: '20px' }}>
                                {format(mesRef, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
                            </h4>
                            <div className="space-y-4 min-h-[120px]">
                                {parcelasMes.map(p => (
                                    <div key={p.id} className="p-3 border-l border-[#8B7355] bg-white/[0.02] cursor-pointer" onClick={() => navigate(`/projetos/${p.projeto_id}/financeiro`)}>
                                        <div style={{ fontSize: '12px' }}>{p.cliente_nome} · {p.descricao.split('—')[0]}</div>
                                        <div style={{ fontSize: '11px', color: '#555' }}>R$ {p.valor.toLocaleString('pt-BR')} · {format(parseISO(p.data_vencimento), 'dd/MM')}</div>
                                    </div>
                                ))}
                                {!parcelasMes.length && <div className="text-[#333] italic text-xs py-4">—</div>}
                            </div>
                            <div className="mt-8 pt-4 border-t border-white/5">
                                <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', marginBottom: '4px' }}>Total Previsto</div>
                                <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px' }}>R$ {totalMes.toLocaleString('pt-BR')}</div>
                            </div>
                        </div>
                      );
                  })}
              </div>
          </TabsContent>

          {/* Total acumulado dos 3 meses em destaque */}
          <div className="mt-8 p-6 bg-[#141414] border border-white/5 inline-block">
              <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: '#555', textTransform: 'uppercase', marginBottom: '4px' }}>Acumulado Próximos 90 Dias</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#8B7355' }}>
                  R$ {parcelas?.filter(p => p.status !== 'PAGO' && isWithinInterval(parseISO(p.data_vencimento), { start: startOfMonth(hoje), end: endOfMonth(addMonths(hoje, 2)) })).reduce((s, p) => s + Number(p.valor), 0).toLocaleString('pt-BR')}
              </div>
          </div>


          {/* ABA 4: PARCELAS */}
          <TabsContent value="parcelas">
              <div className="flex gap-2 mb-6">
                  {['Todas', 'Pendentes', 'Pagas', 'Atrasadas'].map(f => (
                      <button 
                        key={f}
                        onClick={() => setFiltroParcelas(f)}
                        className={cn(
                            "px-4 py-1.5 text-[10px] uppercase tracking-widest transition-colors border",
                            filtroParcelas === f ? "bg-bronze border-bronze text-white" : "border-white/10 text-white/40 hover:text-white"
                        )}
                      >
                          {f}
                      </button>
                  ))}
              </div>
              <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 0.8fr 0.8fr 0.8fr 0.8fr', gap: 0, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                      {['CLIENTE', 'DESCRIÇÃO', 'VALOR', 'VENCIMENTO', 'STATUS', 'AÇÕES'].map(h => (
                        <div key={h} style={{ fontFamily: 'Courier New', fontSize: '10px', color: '#555', fontWeight: 'bold' }}>{h}</div>
                      ))}
                  </div>
                  {parcelasFiltradas.map(p => (
                      <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 0.8fr 0.8fr 0.8fr 0.8fr', gap: 0, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                          <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px' }}>{p.cliente_nome}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{p.descricao}</div>
                          <div style={{ fontSize: '13px' }}>R$ {p.valor.toLocaleString('pt-BR')}</div>
                          <div style={{ fontSize: '12px', color: '#555' }}>{format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}</div>
                          <div>
                              <span className={cn(
                                  "px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border",
                                  p.status === 'PAGO' ? "text-[#4ade80] border-[#4ade80]/30 bg-[#4ade80]/5" :
                                  p.status === 'ATRASADO' ? "text-[#f87171] border-[#f87171]/30 bg-[#f87171]/5" : "text-[#fbbf24] border-[#fbbf24]/30 bg-[#fbbf24]/5"
                              )}>
                                  {p.status}
                              </span>
                          </div>
                          <div className="flex gap-2">
                              {(p.status === 'PENDENTE' || p.status === 'ATRASADO') && (
                                <button 
                                  onClick={() => navigate(`/projetos/${p.projeto_id}/financeiro`)} 
                                  className="px-2 py-1 text-[9px] font-bold uppercase tracking-tighter text-[#4ade80] border border-[#4ade80]/20 hover:bg-[#4ade80]/5"
                                >
                                  PAGO
                                </button>
                              )}
                              <button 
                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Lembrete de pagamento: R$ ${p.valor.toLocaleString('pt-BR')} (vence ${format(parseISO(p.data_vencimento), 'dd/MM/yyyy')})`)}`, '_blank')} 
                                className="px-2 py-1 text-[9px] font-bold uppercase tracking-tighter text-[#8B7355] border border-[#8B7355]/20 hover:bg-[#8B7355]/5"
                              >
                                COBRAR
                              </button>
                              {p.status === 'PAGO' && (
                                <button className="px-2 py-1 text-[9px] font-bold uppercase tracking-tighter text-[#ccc] border border-white/10 hover:bg-white/5">
                                  RECIBO
                                </button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </TabsContent>

          {/* ABA 3: FLUXO DE CAIXA */}
          <TabsContent value="fluxo">
              <div className="grid grid-cols-3 gap-6">
                  {[0, 1, 2].map(offset => {
                      const mesRef = addMonths(startOfMonth(hoje), offset);
                      const parcelasMes = parcelas?.filter(p => p.status !== 'PAGO' && isWithinInterval(parseISO(p.data_vencimento), { start: mesRef, end: endOfMonth(mesRef) }));
                      const totalMes = parcelasMes.reduce((s, p) => s + Number(p.valor), 0);

                      return (
                        <div key={offset} className="bg-[#141414] border border-white/5 p-6">
                            <h4 style={{ fontFamily: 'Courier New', fontSize: '12px', color: '#8B7355', letterSpacing: '0.2em', marginBottom: '20px' }}>
                                {format(mesRef, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
                            </h4>
                            <div className="space-y-4 min-h-[120px]">
                                {parcelasMes.map(p => (
                                    <div key={p.id} className="p-3 border-l border-[#8B7355] bg-white/[0.02] cursor-pointer" onClick={() => navigate(`/projetos/${p.projeto_id}/financeiro`)}>
                                        <div style={{ fontSize: '12px' }}>{p.cliente_nome} · {p.descricao.split('—')[0]}</div>
                                        <div style={{ fontSize: '11px', color: '#555' }}>R$ {p.valor.toLocaleString('pt-BR')} · {format(parseISO(p.data_vencimento), 'dd/MM')}</div>
                                    </div>
                                ))}
                                {!parcelasMes.length && <div className="text-[#333] italic text-xs py-4">—</div>}
                            </div>
                            <div className="mt-8 pt-4 border-t border-white/5">
                                <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', marginBottom: '4px' }}>Total Previsto</div>
                                <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px' }}>R$ {totalMes.toLocaleString('pt-BR')}</div>
                            </div>
                        </div>
                      );
                  })}
              </div>
          </TabsContent>

          {/* ABA 4: PARCELAS */}
          <TabsContent value="parcelas">
              <div className="flex gap-2 mb-6">
                  {['Todas', 'Pendentes', 'Pagas', 'Atrasadas'].map(f => (
                      <button 
                        key={f}
                        onClick={() => setFiltroParcelas(f)}
                        className={cn(
                            "px-4 py-1.5 text-[10px] uppercase tracking-widest transition-colors border",
                            filtroParcelas === f ? "bg-bronze border-bronze text-white" : "border-white/10 text-white/40 hover:text-white"
                        )}
                      >
                          {f}
                      </button>
                  ))}
              </div>
              <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 0.8fr 0.8fr 0.8fr 0.8fr', gap: 0, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                      {['CLIENTE', 'DESCRIÇÃO', 'VALOR', 'VENCIMENTO', 'STATUS', 'AÇÕES'].map(h => (
                        <div key={h} style={{ fontFamily: 'Courier New', fontSize: '10px', color: '#555', fontWeight: 'bold' }}>{h}</div>
                      ))}
                  </div>
                  {parcelasFiltradas.map(p => (
                      <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 0.8fr 0.8fr 0.8fr 0.8fr', gap: 0, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                          <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px' }}>{p.cliente_nome}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{p.descricao}</div>
                          <div style={{ fontSize: '13px' }}>R$ {p.valor.toLocaleString('pt-BR')}</div>
                          <div style={{ fontSize: '12px', color: '#555' }}>{format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}</div>
                          <div>
                              <span className={cn(
                                  "px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border",
                                  p.status === 'PAGO' ? "text-[#4ade80] border-[#4ade80]/30 bg-[#4ade80]/5" :
                                  p.status === 'ATRASADO' ? "text-[#f87171] border-[#f87171]/30 bg-[#f87171]/5" : "text-[#fbbf24] border-[#fbbf24]/30 bg-[#fbbf24]/5"
                              )}>
                                  {p.status}
                              </span>
                          </div>
                          <div className="flex gap-2">
                              {p.status !== 'PAGO' && (
                                <button onClick={() => navigate(`/projetos/${p.projeto_id}/financeiro`)} className="p-1 text-[#4ade80] hover:bg-white/5"><DollarSign size={14}/></button>
                              )}
                              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Lembrete de pagamento: R$ ${p.valor.toLocaleString('pt-BR')} (vence ${format(parseISO(p.data_vencimento), 'dd/MM/yyyy')})`)}`, '_blank')} className="p-1 text-[#8B7355] hover:bg-white/5"><MessageCircle size={14}/></button>
                              {p.status === 'PAGO' && (
                                <button className="p-1 text-[#ccc] hover:bg-white/5"><Receipt size={14}/></button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </TabsContent>

          {/* ABA 5: LUCRATIVIDADE */}
          <TabsContent value="lucratividade">
            <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                {/* Header Table */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr', gap: 0, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                    {['PROJETO', 'RECEITA TOTAL', 'RECEBIDO', 'EM ABERTO', '% RECEBIDO'].map(h => (
                        <div key={h} style={{ fontFamily: 'Courier New', fontSize: '10px', color: '#555', fontWeight: 'bold' }}>{h}</div>
                    ))}
                </div>
                {projetos?.map(projeto => {
                  const parcelasProjeto = parcelas?.filter(p => p.projeto_id === projeto.id) || [];
                  const receitaTotal = parcelasProjeto.reduce((s, p) => s + Number(p.valor), 0);
                  const recebido = parcelasProjeto.filter(p => p.status === 'PAGO' || p.status === 'PAGO PARCIAL').reduce((s, p) => s + Number(p.valor_recebido || p.valor), 0);
                  const emAberto = receitaTotal - recebido;
                  const pctRecebido = receitaTotal > 0 ? (recebido / receitaTotal * 100) : 0;

                  return (
                    <div key={projeto.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr', gap: 0, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#e8e8e8' }}>{projeto.nome_cliente}</div>
                        <div style={{ fontFamily: 'Arial', fontSize: '10px', color: '#555', marginTop: '2px' }}>{projeto.tipo}</div>
                      </div>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#ccc' }}>R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#4ade80' }}>R$ {recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: emAberto > 0 ? '#fbbf24' : '#555' }}>R$ {emAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div>
                        <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: pctRecebido >= 100 ? '#4ade80' : '#8B7355', marginBottom: '3px' }}>{pctRecebido.toFixed(0)}%</div>
                        <div style={{ height: '3px', background: '#222', borderRadius: '2px' }}>
                          <div style={{ height: '3px', background: pctRecebido >= 100 ? '#4ade80' : '#8B7355', borderRadius: '2px', width: `${Math.min(pctRecebido, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinanceiroGeral;