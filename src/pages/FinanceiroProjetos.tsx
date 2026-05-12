import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  MoreVertical,
  MessageCircle,
  FileText,
  PieChart,
  Target
} from 'lucide-react';
import { format, parseISO, addMonths, startOfMonth, endOfMonth, isWithinInterval, isBefore, isAfter, isToday, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Parcela {
  id: string;
  projeto_id: string;
  cliente_nome: string;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  data_vencimento: string;
  status: string;
  data_recebimento?: string;
  valor_recebido?: number;
  projetos?: {
    tipo: string;
  };
  agendamento_cobranca?: {
    d7: boolean;
    d3: boolean;
    d1: boolean;
  };
  data_notificacao_cobranca?: string;
}

interface ProjetoLucratividade {
  id: string;
  nome: string;
  nome_cliente: string;
  tipo: string;
  receitaTotal: number;
  horasReais: number;
  horasEstimadas: number;
  custoReal: number;
  margemRS: number;
  margemPercent: number;
  dataInicio?: string;
}

const FinanceiroProjetos = () => {
  const navigate = useNavigate();
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('parcelas');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [selectedParcela, setSelectedParcela] = useState<Parcela | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({ data: format(new Date(), 'yyyy-MM-dd'), valor: '' });
  const [configEscritorio, setConfigEscritorio] = useState<any>(null);
  const [projetosLucratividade, setProjetosLucratividade] = useState<ProjetoLucratividade[]>([]);
  const [lucroFilter, setLucroFilter] = useState<'MES_ATUAL' | 'ULTIMOS_3_MESES' | 'PERSONALIZADO'>('MES_ATUAL');
  const [lucroCustomDates, setLucroCustomDates] = useState({ 
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchData();
  }, [lucroFilter, lucroCustomDates]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch parcelas with project info
      const { data: pData, error: pError } = await supabase
        .from('financeiro_parcelas')
        .select(`
          *,
          projetos (
            tipo
          )
        `)
        .order('data_vencimento', { ascending: true });
      
      if (pError) throw pError;
      
      const updatedParcelas = (pData || []).map(p => {
        if (p.status === 'PAGO') return p;
        
        const dateVenc = parseISO(p.data_vencimento);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let status = p.status;
        
        if (isToday(dateVenc)) {
          status = 'VENCE HOJE';
        } else if (isBefore(dateVenc, today)) {
          if (isBefore(dateVenc, subDays(today, 1))) {
            status = 'ATRASADO';
          }
        }

        return { ...p, status };
      });

      setParcelas(updatedParcelas);

      // Fetch config for cost/hour
      const { data: cData } = await supabase.from('config_escritorio').select('*').single();
      setConfigEscritorio(cData);
      const custoHora = cData?.custo_hora || 0;

      // Filter dates for profitability
      let startDate: Date;
      let endDate: Date = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (lucroFilter === 'MES_ATUAL') {
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
      } else if (lucroFilter === 'ULTIMOS_3_MESES') {
        startDate = startOfMonth(subDays(new Date(), 90));
      } else {
        startDate = parseISO(lucroCustomDates.start);
        endDate = parseISO(lucroCustomDates.end);
        endDate.setHours(23, 59, 59, 999);
      }

      // Fetch projects for profitability
      const { data: projData } = await supabase
        .from('projetos')
        .select('id, nome, nome_cliente, tipo, horas_estimadas, criado_em');
      
      // Fetch hours for all projects within period
      const { data: hData } = await supabase
        .from('sessoes_horas')
        .select('projeto_id, duracao_minutos, inicio')
        .gte('inicio', startDate.toISOString())
        .lte('inicio', endDate.toISOString());
      
      // Calculate profitability for each project
      if (projData) {
        const profitData = projData.map(proj => {
          // Total Revenue: sum of paid parcelas for this project RECEIVED within period
          const receitaTotal = (pData || [])
            .filter(p => 
              p.projeto_id === proj.id && 
              p.status === 'PAGO' && 
              p.data_recebimento &&
              isWithinInterval(parseISO(p.data_recebimento), { start: startDate, end: endDate })
            )
            .reduce((acc, p) => acc + (p.valor_recebido || 0), 0);
          
          // Total Hours: sum of minutes / 60 within period
          const totalMinutos = (hData || [])
            .filter(h => h.projeto_id === proj.id)
            .reduce((acc, h) => {
              const mins = typeof h.duracao_minutos === 'string' ? parseFloat(h.duracao_minutos) : h.duracao_minutos;
              return acc + (mins || 0);
            }, 0);
          
          const horasReais = totalMinutos / 60;
          const custoReal = horasReais * custoHora;
          const margemRS = receitaTotal - custoReal;
          const margemPercent = receitaTotal > 0 ? (margemRS / receitaTotal) * 100 : 0;
          
          return {
            id: proj.id,
            nome: proj.nome,
            nome_cliente: proj.nome_cliente,
            tipo: proj.tipo,
            receitaTotal,
            horasReais,
            horasEstimadas: (proj as any).horas_estimadas || 0,
            custoReal,
            margemRS,
            margemPercent,
            dataInicio: (proj as any).criado_em
          };
        }).filter(p => p.horasReais > 0 || p.receitaTotal > 0); 

        setProjetosLucratividade(profitData);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const today = new Date();
    const startMonth = startOfMonth(today);
    const endMonth = endOfMonth(today);
    const in7Days = addDays(today, 7);

    const pagasMes = parcelas
      .filter(p => p.status === 'PAGO' && p.data_recebimento && isWithinInterval(parseISO(p.data_recebimento), { start: startMonth, end: endMonth }))
      .reduce((acc, p) => acc + (p.valor_recebido || 0), 0);

    const previstasMes = parcelas
      .filter(p => p.status !== 'PAGO' && isWithinInterval(parseISO(p.data_vencimento), { start: startMonth, end: endMonth }))
      .reduce((acc, p) => acc + p.valor, 0);

    const totalAtrasado = parcelas
      .filter(p => p.status === 'ATRASADO')
      .reduce((acc, p) => acc + p.valor, 0);

    const vencendo7Dias = parcelas
      .filter(p => p.status !== 'PAGO' && isWithinInterval(parseISO(p.data_vencimento), { start: today, end: in7Days }))
      .length;

    return { pagasMes, previstasMes, totalAtrasado, vencendo7Dias };
  }, [parcelas]);

  const handleConfirmRecebimento = async () => {
    if (!selectedParcela) return;
    
    try {
      const msg = `Recebemos o pagamento da parcela ${selectedParcela.numero_parcela}/${selectedParcela.total_parcelas} no valor de R$ ${parseFloat(confirmData.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Obrigado!`;
      
      const { error } = await supabase
        .from('financeiro_parcelas')
        .update({
          status: 'PAGO',
          data_recebimento: new Date(confirmData.data).toISOString(),
          valor_recebido: parseFloat(confirmData.valor)
        })
        .eq('id', selectedParcela.id);

      if (error) throw error;
      
      toast.success('Recebimento confirmado!');
      
      // Prompt to send confirmation message
      toast.info("Enviar confirmação de pagamento?", {
        action: {
          label: "Enviar WhatsApp",
          onClick: () => sendWhatsApp(selectedParcela, msg)
        }
      });

      setIsConfirmModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Erro ao confirmar recebimento');
    }
  };

  const sendWhatsApp = async (p: Parcela, customMsg?: string) => {
    try {
      const msg = customMsg || `Olá ${p.cliente_nome}, a parcela ${p.numero_parcela}/${p.total_parcelas} do projeto vence hoje, no valor de R$ ${p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Qualquer dúvida estou à disposição.`;
      
      const newNotification = {
        data: new Date().toISOString(),
        tipo: customMsg ? 'RÉGUA' : 'MANUAL',
        mensagem: msg
      };

      const { data: currentData } = await supabase
        .from('financeiro_parcelas')
        .select('notificacoes_enviadas')
        .eq('id', p.id)
        .single();

      const currentNotificacoes = Array.isArray(currentData?.notificacoes_enviadas) 
        ? currentData.notificacoes_enviadas 
        : [];
      const notificacoes = [...currentNotificacoes, newNotification];

      await supabase
        .from('financeiro_parcelas')
        .update({ 
          data_notificacao_cobranca: new Date().toISOString(),
          notificacoes_enviadas: notificacoes
        })
        .eq('id', p.id);
      
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      fetchData(); 
    } catch (error) {
      console.error('Error updating notification date:', error);
    }
  };

  const getReguaStatus = (p: Parcela) => {
    const dateVenc = parseISO(p.data_vencimento);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffDays = Math.ceil((dateVenc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const agendamento = (p as any).agendamento_cobranca || { d7: false, d3: false, d1: false };
    
    const steps = [
      { day: 7, key: 'd7' as const, label: 'D-7' },
      { day: 3, key: 'd3' as const, label: 'D-3' },
      { day: 1, key: 'd1' as const, label: 'D-1' }
    ];

    return (
      <div className="flex gap-1 mt-1">
        {steps.map(step => {
          const isPast = diffDays < step.day;
          const isSent = agendamento[step.key];
          return (
            <div 
              key={step.key}
              title={isSent ? `Enviado ${step.label}` : isPast ? `Pulado ${step.label}` : `Agendado ${step.label}`}
              className={cn(
                "w-2 h-2 rounded-full",
                isSent ? "bg-green-500" : isPast ? "bg-white/10" : "bg-bronze/40 animate-pulse"
              )}
            />
          );
        })}
      </div>
    );
  };

  const processReguaCobranca = async (parcelasToProcess: Parcela[]) => {
    const today = new Date();
    today.setHours(0,0,0,0);

    for (const p of parcelasToProcess) {
      if (p.status === 'PAGO') continue;

      const dateVenc = parseISO(p.data_vencimento);
      const diffDays = Math.ceil((dateVenc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const agendamento = (p as any).agendamento_cobranca || { d7: false, d3: false, d1: false };
      
      let msg = "";
      let key: 'd7' | 'd3' | 'd1' | null = null;

      if (diffDays === 7 && !agendamento.d7) {
        msg = `Olá ${p.cliente_nome}, lembrete da parcela ${p.numero_parcela}/${p.total_parcelas} que vence em 7 dias (R$ ${p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`;
        key = 'd7';
      } else if (diffDays === 3 && !agendamento.d3) {
        msg = `Olá ${p.cliente_nome}, passando para lembrar que sua parcela vence em 3 dias. Valor: R$ ${p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
        key = 'd3';
      } else if (diffDays === 1 && !agendamento.d1) {
        msg = `Amanhã vence a sua parcela ${p.numero_parcela}/${p.total_parcelas}. Segue o lembrete para evitar atrasos!`;
        key = 'd1';
      }

      if (key && msg) {
        const newAgendamento = { ...agendamento, [key]: true };
        await supabase
          .from('financeiro_parcelas')
          .update({ agendamento_cobranca: newAgendamento })
          .eq('id', p.id);
        
        // In a real app, this would be a backend trigger. 
        // Here we notify the user to send it.
        toast.info(`Régua: Notificação ${key.toUpperCase()} disponível para ${p.cliente_nome}`, {
          action: {
            label: "Enviar",
            onClick: () => sendWhatsApp(p, msg)
          }
        });
      }
    }
  };

  useEffect(() => {
    if (parcelas.length > 0) {
      processReguaCobranca(parcelas);
    }
  }, [parcelas.length]);

  const getStatusBadge = (p: Parcela) => {
    const dateVenc = parseISO(p.data_vencimento);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (p.status === 'PAGO') return <Badge className="bg-green-500/20 text-green-500 border-none">PAGO</Badge>;
    if (p.status === 'ATRASADO') return <Badge className="bg-red-500/20 text-red-500 border-none">ATRASADO</Badge>;
    if (isToday(dateVenc)) return <Badge className="bg-bronze/20 text-bronze border-none">VENCE HOJE</Badge>;
    
    // Check if within 3 days
    const diffDays = Math.ceil((dateVenc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 3) {
      return <Badge className="bg-bronze/10 text-bronze border-bronze/30">VENCE EM {diffDays} DIAS</Badge>;
    }
    
    return <Badge className="bg-white/10 text-white/60 border-none">EM ABERTO</Badge>;
  };

  const filteredParcelas = parcelas.filter(p => {
    if (filterStatus === 'TODOS') return true;
    return p.status === filterStatus;
  });

  const fluxoCaixa = useMemo(() => {
    const months = [0, 1, 2].map(offset => {
      const date = addMonths(new Date(), offset);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const monthParcelas = parcelas.filter(p => isWithinInterval(parseISO(p.data_vencimento), { start, end }));
      const confirmado = monthParcelas.filter(p => p.status === 'PAGO').reduce((acc, p) => acc + (p.valor_recebido || 0), 0);
      const previsto = monthParcelas.filter(p => p.status !== 'PAGO').reduce((acc, p) => acc + p.valor, 0);
      
      return {
        label: format(date, 'MMMM yyyy', { locale: ptBR }),
        confirmado,
        previsto,
        parcelas: monthParcelas
      };
    });
    return months;
  }, [parcelas]);

  const lucroResumo = useMemo(() => {
    if (projetosLucratividade.length === 0) return null;
    
    const totalRecebido = projetosLucratividade.reduce((acc, p) => acc + p.receitaTotal, 0);
    const totalCusto = projetosLucratividade.reduce((acc, p) => acc + p.custoReal, 0);
    const margemMedia = projetosLucratividade.reduce((acc, p) => acc + p.margemPercent, 0) / projetosLucratividade.length;
    
    return { totalRecebido, totalCusto, margemMedia };
  }, [projetosLucratividade]);

  return (
    <div className="flex min-h-screen bg-[#1A1816] text-white font-inter">
      <Sidebar user="Sócio" />
      
      <main className="flex-1 ml-[230px] p-8">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2 uppercase font-inter">07 · Financeiro de Projetos</h1>
          <p className="text-white/40 text-xs tracking-[0.3em] font-bold uppercase">
            PARCELAS · FLUXO DE CAIXA · LUCRATIVIDADE
          </p>
        </header>

        {/* Metrics Cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white/5 p-6 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Receita Confirmada</span>
            <span className="text-xl font-bold">R$ {metrics.pagasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-white/5 p-6 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Prevista (Mês)</span>
            <span className="text-xl font-bold">R$ {metrics.previstasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-white/5 p-6 border border-white/10 flex flex-col gap-1">
            <span className="text-[10px] text-red-500/60 uppercase tracking-widest font-bold">Atrasado</span>
            <span className="text-xl font-bold text-red-500">R$ {metrics.totalAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-white/5 p-6 border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Próximos 7 dias</span>
            <span className={cn("text-xl font-bold", metrics.vencendo7Dias > 0 && "text-bronze")}>
              {metrics.vencendo7Dias} {metrics.vencendo7Dias === 1 ? 'parcela' : 'parcelas'}
            </span>
          </div>
          <div className="bg-white/5 p-6 border border-bronze/20 flex flex-col gap-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
              <TrendingUp size={12} className="text-bronze" />
            </div>
            <span className="text-[10px] text-bronze uppercase tracking-widest font-bold">LTV Médio (Hist.)</span>
            <span className="text-xl font-bold">
              R$ {(projetosLucratividade.length > 0 
                ? projetosLucratividade.reduce((acc, p) => acc + p.receitaTotal, 0) / projetosLucratividade.length 
                : 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <Tabs defaultValue="parcelas" onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 mb-6 rounded-none">
            <TabsTrigger value="parcelas" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-8">Parcelas</TabsTrigger>
            <TabsTrigger value="fluxo" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-8">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="lucratividade" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-8">Lucratividade</TabsTrigger>
          </TabsList>

          <TabsContent value="parcelas">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                {['TODOS', 'EM ABERTO', 'ATRASADO', 'PAGO'].map(status => (
                  <Button 
                    key={status}
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      "text-[10px] uppercase tracking-widest rounded-none border border-white/5",
                      filterStatus === status ? "bg-white/10 text-white" : "text-white/40"
                    )}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40">Cliente / Projeto</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40">Parcela</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40">Valor</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40">Vencimento</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40">Status / Régua</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredParcelas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-white/20 text-xs italic">Nenhuma parcela encontrada</td>
                    </tr>
                  ) : filteredParcelas.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{p.cliente_nome}</span>
                          <span className="text-[10px] text-white/40 uppercase tracking-tighter">{p.projetos?.tipo || 'Projeto'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-white/60">{p.numero_parcela}/{p.total_parcelas}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-white/60">{format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(p)}
                          {getReguaStatus(p)}
                          {(p as any).data_notificacao_cobranca && (
                            <span className="text-[8px] text-white/20 uppercase">Último aviso: {format(parseISO((p as any).data_notificacao_cobranca), 'dd/MM')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {(p.status === 'EM ABERTO' || p.status === 'ATRASADO' || p.status === 'VENCE HOJE') && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[9px] uppercase tracking-widest border-white/10 hover:bg-bronze hover:text-white rounded-none"
                                onClick={() => {
                                  setSelectedParcela(p);
                                  setConfirmData({ ...confirmData, valor: p.valor.toString() });
                                  setIsConfirmModalOpen(true);
                                }}
                              >
                                Confirmar
                              </Button>
                              {(p.status === 'ATRASADO' || isToday(parseISO(p.data_vencimento))) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-white/40 hover:text-green-500"
                                  onClick={() => sendWhatsApp(p)}
                                >
                                  <MessageCircle size={14} />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="fluxo">
            <div className="grid grid-cols-3 gap-6">
              {fluxoCaixa.map((mes, idx) => (
                <div key={idx} className="bg-white/5 border border-white/5 flex flex-col h-full">
                  <div className="p-6 border-b border-white/10 bg-white/5">
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4">{mes.label}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Confirmado</p>
                        <p className="text-sm font-bold text-green-500">R$ {mes.confirmado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Previsto</p>
                        <p className="text-sm font-bold text-bronze">R$ {mes.previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="mt-4 h-1 bg-white/5 w-full relative">
                      <div 
                        className="absolute h-full bg-green-500 transition-all" 
                        style={{ width: `${mes.previsto + mes.confirmado > 0 ? (mes.confirmado / (mes.previsto + mes.confirmado)) * 100 : 0}%` }} 
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[400px] p-2">
                    <div className="space-y-1">
                      {mes.parcelas.map(p => (
                        <div key={p.id} className="p-3 bg-white/[0.02] border border-white/5 flex justify-between items-center group">
                          <div>
                            <p className="text-xs font-medium">{p.cliente_nome}</p>
                            <p className="text-[9px] text-white/40">{format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <Badge className={cn(
                              "text-[7px] h-3 px-1 border-none",
                              p.status === 'PAGO' ? "bg-green-500/20 text-green-500" : "bg-white/10 text-white/40"
                            )}>
                              {p.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-6 bg-bronze/10 border border-bronze/20 flex justify-between items-center">
              <div>
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-bronze">Total Geral (Próximos 3 meses)</h4>
                <p className="text-xs text-white/60">Consolidado de todas as parcelas previstas e confirmadas</p>
              </div>
              <div className="flex gap-12 text-right">
                <div>
                  <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Previsto Total</p>
                  <p className="text-xl font-bold">R$ {fluxoCaixa.reduce((acc, m) => acc + m.previsto, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Confirmado Total</p>
                  <p className="text-xl font-bold text-green-500">R$ {fluxoCaixa.reduce((acc, m) => acc + m.confirmado, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lucratividade">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                {[
                  { id: 'MES_ATUAL', label: 'Mês Atual' },
                  { id: 'ULTIMOS_3_MESES', label: 'Últimos 3 Meses' },
                  { id: 'PERSONALIZADO', label: 'Personalizado' }
                ].map(filter => (
                  <Button 
                    key={filter.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setLucroFilter(filter.id as any)}
                    className={cn(
                      "text-[10px] uppercase tracking-widest rounded-none border border-white/5",
                      lucroFilter === filter.id ? "bg-white/10 text-white" : "text-white/40"
                    )}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>

              {lucroFilter === 'PERSONALIZADO' && (
                <div className="flex gap-2 items-center">
                  <Input 
                    type="date" 
                    className="bg-white/5 border-white/10 rounded-none h-8 text-[10px] w-32"
                    value={lucroCustomDates.start}
                    onChange={e => setLucroCustomDates({ ...lucroCustomDates, start: e.target.value })}
                  />
                  <span className="text-white/20 text-[10px] uppercase">até</span>
                  <Input 
                    type="date" 
                    className="bg-white/5 border-white/10 rounded-none h-8 text-[10px] w-32"
                    value={lucroCustomDates.end}
                    onChange={e => setLucroCustomDates({ ...lucroCustomDates, end: e.target.value })}
                  />
                </div>
              )}
            </div>

            {projetosLucratividade.length === 0 ? (
              <div className="bg-white/5 border border-white/5 p-12 text-center flex flex-col items-center gap-6">
                <AlertCircle className="text-white/20 w-8 h-8" />
                <div className="max-w-md">
                  <p className="text-white/60 text-sm mb-2">
                    Nenhum projeto com movimentação {
                      lucroFilter === 'MES_ATUAL' ? 'neste mês' : 
                      lucroFilter === 'ULTIMOS_3_MESES' ? 'nos últimos 3 meses' : 
                      'no período selecionado'
                    }.
                  </p>
                  <p className="text-white/20 text-xs italic mb-6">
                    Para visualizar a lucratividade, é necessário registrar horas trabalhadas no Módulo 03 ou lançar o recebimento de parcelas (status PAGO) dentro deste intervalo.
                  </p>
                  
                  <div className="flex gap-4 justify-center">
                    <Button 
                      onClick={() => navigate('/projetos/horas')}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-none text-[10px] uppercase tracking-widest px-6 h-10 flex items-center gap-2"
                    >
                      <Clock size={14} className="text-bronze" />
                      Registrar Horas (Mod 03)
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('parcelas')}
                      className="bg-bronze hover:bg-bronze/80 text-white rounded-none text-[10px] uppercase tracking-widest px-6 h-10 flex items-center gap-2"
                    >
                      <DollarSign size={14} />
                      Lançar Pagamentos
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-8 border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold block mb-2">Margem Média Geral</span>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "text-3xl font-bold",
                        (lucroResumo?.margemMedia || 0) > 20 ? "text-green-500" : (lucroResumo?.margemMedia || 0) > 10 ? "text-bronze" : "text-red-500"
                      )}>
                        {(lucroResumo?.margemMedia || 0).toFixed(1)}%
                      </span>
                      <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all",
                            (lucroResumo?.margemMedia || 0) > 20 ? "bg-green-500" : (lucroResumo?.margemMedia || 0) > 10 ? "bg-bronze" : "bg-red-500"
                          )}
                          style={{ width: `${Math.min(Math.max(lucroResumo?.margemMedia || 0, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 p-8 border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold block mb-2">Total Recebido vs Custo Real</span>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Recebido</p>
                        <p className="text-xl font-bold text-green-500">R$ {(lucroResumo?.totalRecebido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Custo Total</p>
                        <p className="text-xl font-bold text-white/60">R$ {(lucroResumo?.totalCusto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {projetosLucratividade.map(proj => (
                    <div key={proj.id} className="bg-white/5 border border-white/5 p-6 hover:border-white/10 transition-colors flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-tight">{proj.nome_cliente}</h3>
                          <span className="text-[10px] text-white/40 uppercase tracking-widest">{proj.tipo}</span>
                        </div>
                        <Badge className={cn(
                          "border-none rounded-none text-[10px] px-2",
                          proj.margemPercent > 20 ? "bg-green-500/20 text-green-500" : 
                          proj.margemPercent > 10 ? "bg-bronze/20 text-bronze" : 
                          "bg-red-500/20 text-red-500"
                        )}>
                          {proj.margemPercent.toFixed(1)}%
                        </Badge>
                      </div>

                      <div className="space-y-4 flex-1">
                        <div className="flex justify-between text-[10px] uppercase tracking-widest">
                          <span className="text-white/40">Receita Total</span>
                          <span className="font-bold">R$ {proj.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        {/* Horas Orçadas vs Reais */}
                        <div className="space-y-2 py-3 border-y border-white/5">
                          <div className="flex justify-between text-[10px] uppercase tracking-widest">
                            <span className="text-white/40">Horas Reais</span>
                            <span className={cn(
                              "font-bold",
                              proj.horasEstimadas > 0 && proj.horasReais > proj.horasEstimadas ? "text-red-500" : "text-white"
                            )}>
                              {proj.horasReais.toFixed(1)}h
                              {proj.horasEstimadas > 0 && ` / ${proj.horasEstimadas}h`}
                            </span>
                          </div>
                          {proj.horasEstimadas > 0 && (
                            <div className="h-1 bg-white/10 w-full rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all",
                                  (proj.horasReais / proj.horasEstimadas) > 1 ? "bg-red-500" : 
                                  (proj.horasReais / proj.horasEstimadas) > 0.8 ? "bg-bronze" : "bg-green-500"
                                )}
                                style={{ width: `${Math.min((proj.horasReais / proj.horasEstimadas) * 100, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between text-[10px] uppercase tracking-widest">
                          <span className="text-white/40">Custo Real</span>
                          <span className="font-bold">R$ {proj.custoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        {/* Break-even Indicator (Simplified Logic) */}
                        {proj.dataInicio && (
                          <div className="flex items-center gap-2 text-[9px] text-white/20 uppercase tracking-tighter">
                            <Target size={10} />
                            Início: {format(parseISO(proj.dataInicio), 'MMM/yy', { locale: ptBR })}
                            {proj.margemRS > 0 && " • Ponto de Equilíbrio Atingido"}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 mt-4 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-widest font-bold">Margem Líquida</span>
                        <span className={cn(
                          "text-sm font-bold",
                          proj.margemRS >= 0 ? "text-white" : "text-red-500"
                        )}>
                          R$ {proj.margemRS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal Confirmação */}
        <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
          <DialogContent className="bg-[#1A1816] border-white/10 text-white rounded-none">
            <DialogHeader>
              <DialogTitle className="text-sm uppercase tracking-widest font-bold">Confirmar Recebimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40">Data do Recebimento</label>
                <Input 
                  type="date" 
                  className="bg-white/5 border-white/10 rounded-none h-12 text-sm"
                  value={confirmData.data}
                  onChange={e => setConfirmData({ ...confirmData, data: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40">Valor Recebido (R$)</label>
                <Input 
                  type="number" 
                  className="bg-white/5 border-white/10 rounded-none h-12 text-sm"
                  value={confirmData.valor}
                  onChange={e => setConfirmData({ ...confirmData, valor: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-[10px] uppercase tracking-widest"
              >
                Cancelar
              </Button>
              <Button 
                className="bg-bronze text-white rounded-none text-[10px] uppercase tracking-widest px-8"
                onClick={handleConfirmRecebimento}
              >
                Confirmar Pagamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
};

export default FinanceiroProjetos;