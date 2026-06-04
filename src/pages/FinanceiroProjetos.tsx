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
  PieChart as PieChartIcon,
  Target,
  Download,
  BarChart3,
  Activity,
  UserCheck,
  Calculator,
  Thermometer,
  TrendingDown,
  Layers,
  Bell,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  Legend
} from 'recharts';
import { format, parseISO, addMonths, startOfMonth, endOfMonth, isWithinInterval, isBefore, isAfter, isToday, subDays, addDays, startOfYear, eachMonthOfInterval } from 'date-fns';
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
  iss_aliquota?: number;
  iss_valor?: number;
  valor_liquido?: number;
  nf_emitida?: boolean;
  nf_numero?: string;
  nf_data_emissao?: string;
  projetos?: {
    tipo: string;
    cidade: string;
  };
  agendamento_cobranca?: any;
  data_notificacao_cobranca?: string;
  notificacoes_enviadas?: any;
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
  const [confirmData, setConfirmData] = useState({ 
    data: format(new Date(), 'yyyy-MM-dd'), 
    valor: '',
    nf_emitida: false,
    nf_numero: '',
    nf_data_emissao: format(new Date(), 'yyyy-MM-dd')
  });

  const [configEscritorio, setConfigEscritorio] = useState<any>(null);
  const [projetosLucratividade, setProjetosLucratividade] = useState<ProjetoLucratividade[]>([]);
  const [lucroFilter, setLucroFilter] = useState<'MES_ATUAL' | 'ULTIMOS_3_MESES' | 'PERSONALIZADO'>('MES_ATUAL');
  const [lucroCustomDates, setLucroCustomDates] = useState({ 
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // Simulator State (ABA 6)
  const [simulator, setSimulator] = useState({
    numProjetos: 1,
    tipo: 'ArqInt',
    areaM2: 100
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
            tipo,
            cidade
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
        .select('id, nome, nome_cliente, tipo, horas_estimadas, criado_em, area_m2');
      
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
            dataInicio: (proj as any).criado_em,
            area_m2: proj.area_m2 || 0
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

    const in7Days = addDays(today, 7);

    const pagasMes = parcelas
      .filter(p => p.status === 'PAGO' && p.data_recebimento && isWithinInterval(parseISO(p.data_recebimento), { start: startDate, end: endDate }))
      .reduce((acc, p) => acc + (p.valor_recebido || 0), 0);

    const previstasMes = parcelas
      .filter(p => p.status !== 'PAGO' && isWithinInterval(parseISO(p.data_vencimento), { start: startDate, end: endDate }))
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
      const valorRecebido = parseFloat(confirmData.valor);
      const msg = `Recebemos o pagamento da parcela ${selectedParcela.numero_parcela}/${selectedParcela.total_parcelas} no valor de R$ ${valorRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Obrigado!`;
      
      const { error } = await supabase
        .from('financeiro_parcelas')
        .update({
          status: 'PAGO',
          data_recebimento: new Date(confirmData.data).toISOString(),
          valor_recebido: valorRecebido,
          nf_emitida: confirmData.nf_emitida,
          nf_numero: confirmData.nf_numero,
          nf_data_emissao: confirmData.nf_emitida ? confirmData.nf_data_emissao : null
        })
        .eq('id', selectedParcela.id);

      if (error) throw error;
      
      toast.success('Recebimento confirmado!');
      
      // Prompt to generate receipt
      toast.info("Deseja gerar o recibo agora?", {
        action: {
          label: "Gerar Recibo",
          onClick: () => generateReceipt(selectedParcela, { ...selectedParcela, valor_recebido: valorRecebido, data_recebimento: new Date(confirmData.data).toISOString() })
        }
      });

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

  const generateReceipt = (p: Parcela, updatedP?: any) => {
    const data = updatedP || p;
    const doc = new (window as any).jspdf.jsPDF();
    const bronze: [number, number, number] = [139, 115, 85];
    const graphite: [number, number, number] = [58, 58, 58];
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(graphite[0], graphite[1], graphite[2]);
    doc.text("NL ARQUITETOS", 105, 30, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(bronze[0], bronze[1], bronze[2]);
    doc.text("A ARQUITETURA COMO DECISÃO", 105, 38, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(graphite[0], graphite[1], graphite[2]);
    doc.text("RECIBO DE PAGAMENTO", 105, 55, { align: "center" });
    
    doc.setDrawColor(bronze[0], bronze[1], bronze[2]);
    doc.setLineWidth(0.5);
    doc.line(40, 60, 170, 60);
    
    // Content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    let y = 80;
    const leftX = 40;
    
    doc.text(`Cliente: ${data.cliente_nome}`, leftX, y); y += 10;
    doc.text(`Projeto: ${data.projetos?.tipo || 'Projeto'} · ${data.projetos?.cidade || 'N/A'}`, leftX, y); y += 10;
    doc.text(`Parcela: ${data.numero_parcela}/${data.total_parcelas}`, leftX, y); y += 10;
    
    doc.setFont("helvetica", "bold");
    doc.text(`Valor bruto: R$ ${data.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, leftX, y); y += 10;
    
    doc.setFont("helvetica", "normal");
    const issVal = data.iss_valor || (data.valor * ((data.iss_aliquota || 2) / 100));
    const issAliq = data.iss_aliquota || 2;
    doc.text(`ISS retido: R$ ${issVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${issAliq}%)`, leftX, y); y += 10;
    
    doc.setFont("helvetica", "bold");
    const liqVal = data.valor_liquido || (data.valor - issVal);
    doc.text(`Valor líquido: R$ ${liqVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, leftX, y); y += 10;
    
    const dataRec = data.data_recebimento ? format(parseISO(data.data_recebimento), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');
    doc.text(`Data de recebimento: ${dataRec}`, leftX, y); y += 30;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("NL Arquitetos · São José dos Campos, SP", 105, y, { align: "center" });
    
    doc.save(`Recibo_${data.cliente_nome.replace(/\s+/g, '_')}_P${data.numero_parcela}.pdf`);
    toast.success("Recibo gerado com sucesso!");
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
    // Period filter
    const dateVenc = parseISO(p.data_vencimento);
    const dateRec = p.data_recebimento ? parseISO(p.data_recebimento) : null;
    
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

    // For period filter, we usually look at vencimento for unpaid and recebimento for paid
    // But to be consistent with the user's view, let's filter by the date that matters:
    // If it's paid, it counts for the period if it was received then.
    // If it's unpaid, it counts if it's due then.
    const dateToCompare = p.status === 'PAGO' && dateRec ? dateRec : dateVenc;
    const isInPeriod = isWithinInterval(dateToCompare, { start: startDate, end: endDate });
    
    if (!isInPeriod) return false;

    // Status filter
    if (filterStatus === 'TODOS') return true;
    if (filterStatus === 'EM ABERTO') return p.status === 'EM ABERTO' || p.status === 'VENCE HOJE';
    
    const agendamento = p.agendamento_cobranca || { d7: false, d3: false, d1: false };
    const hasSent = agendamento.d7 || agendamento.d3 || agendamento.d1;

    if (filterStatus === 'REGUA_PENDENTE') {
      return p.status !== 'PAGO' && !hasSent;
    }
    if (filterStatus === 'ENVIADAS') {
      return p.status !== 'PAGO' && hasSent;
    }
    if (filterStatus === 'NF_PENDENTE') {
      return p.status === 'PAGO' && !p.nf_emitida;
    }

    
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

  const chartData = useMemo(() => {
    // 1. Monthly Revenue vs Cost (Last 6 Months)
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const date = subDays(new Date(), (5 - i) * 30);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const receita = parcelas
        .filter(p => p.status === 'PAGO' && p.data_recebimento && isWithinInterval(parseISO(p.data_recebimento), { start, end }))
        .reduce((acc, p) => acc + (p.valor_recebido || 0), 0);
      
      // Cost is more complex as it depends on hours worked in that month
      // For simplicity, we use a proportion of projectsLucratividade or if we want precision, we'd need hData here
      // Let's use a simplified calculation or just revenue for now to not overload the component
      return {
        name: format(date, 'MMM', { locale: ptBR }),
        receita,
      };
    });

    // 2. Revenue by Project Type
    const typeDataMap: Record<string, number> = {};
    parcelas
      .filter(p => p.status === 'PAGO')
      .forEach(p => {
        const type = p.projetos?.tipo || 'Outros';
        typeDataMap[type] = (typeDataMap[type] || 0) + (p.valor_recebido || 0);
      });
    
    const typeData = Object.entries(typeDataMap).map(([name, value]) => ({ name, value }));

    return { last6Months, typeData };
  }, [parcelas]);

  const clientScores = useMemo(() => {
    const clients: Record<string, any> = {};
    
    parcelas.forEach(p => {
      if (!clients[p.cliente_nome]) {
        clients[p.cliente_nome] = {
          nome: p.cliente_nome,
          tipoProjeto: p.projetos?.tipo || 'N/A',
          parcelasPagas: 0,
          parcelasAtrasadas: 0,
          diasAtrasoTotal: 0,
          pagamentosAdiantados: 0,
          pedidosDesconto: 0,
          retrabalhoGerado: 0,
          indicacoesFeitas: 0,
          historico: []
        };
      }
      
      const client = clients[p.cliente_nome];
      client.historico.push(p);
      
      if (p.status === 'PAGO') {
        client.parcelasPagas++;
        if (p.data_recebimento && p.data_vencimento) {
          const rec = parseISO(p.data_recebimento);
          const venc = parseISO(p.data_vencimento);
          if (isBefore(rec, venc)) {
            client.pagamentosAdiantados++;
          } else if (isAfter(rec, venc)) {
            const diff = Math.ceil((rec.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
            client.diasAtrasoTotal += diff;
          }
        }
      } else if (p.status === 'ATRASADO') {
        client.parcelasAtrasadas++;
        const venc = parseISO(p.data_vencimento);
        const diff = Math.ceil((new Date().getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
        client.diasAtrasoTotal += diff;
      }
    });

    return Object.values(clients).map(client => {
      const totalParcelas = client.parcelasPagas + client.parcelasAtrasadas;
      const diasMediaAtraso = totalParcelas > 0 ? client.diasAtrasoTotal / totalParcelas : 0;
      
      let score = 100;
      score -= client.parcelasAtrasadas * 10;
      score -= diasMediaAtraso * 0.5;
      score -= client.pedidosDesconto * 5;
      score -= client.retrabalhoGerado * 8;
      score += client.indicacoesFeitas * 15;
      score += client.pagamentosAdiantados * 5;
      
      const finalScore = Math.max(0, Math.min(100, score));
      
      let label = 'EXCELENTE';
      let color = 'text-green-500';
      if (finalScore < 50) { label = 'RISCO'; color = 'text-red-500'; }
      else if (finalScore < 80) { label = 'ATENÇÃO'; color = 'text-amber-500'; }
      
      return { ...client, score: finalScore, label, color, diasMediaAtraso };
    });
  }, [parcelas]);

  const breakEven = useMemo(() => {
    const custosFixos = configEscritorio?.custos_fixos || 15000;
    const impostosEstimados = metrics.pagasMes * 0.1;
    const totalACobrir = custosFixos + impostosEstimados;
    const faturado = metrics.pagasMes;
    const percentual = totalACobrir > 0 ? (faturado / totalACobrir) * 100 : 0;
    
    return { custosFixos, impostosEstimados, totalACobrir, faturado, percentual };
  }, [configEscritorio, metrics.pagasMes]);

  const sazonalidade = useMemo(() => {
    const months = eachMonthOfInterval({
      start: startOfYear(subDays(new Date(), 365)),
      end: new Date()
    }).slice(-12);

    const data = months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const receita = parcelas
        .filter(p => p.status === 'PAGO' && p.data_recebimento && isWithinInterval(parseISO(p.data_recebimento), { start, end }))
        .reduce((acc, p) => acc + (p.valor_recebido || 0), 0);
      
      return {
        name: format(m, 'MMM', { locale: ptBR }),
        receita,
      };
    });

    const mediaAnual = data.reduce((acc, d) => acc + d.receita, 0) / (data.length || 1);
    const sorted = [...data].sort((a, b) => b.receita - a.receita);
    const top3 = sorted.slice(0, 3).filter(d => d.receita > 0).map(d => d.name);
    const bottom3 = sorted.slice(-3).filter(d => d.receita > 0).map(d => d.name);

    return { data, mediaAnual, top3, bottom3 };
  }, [parcelas]);

  const rentabilidadePorM2 = useMemo(() => {
    const types: Record<string, any> = {};
    
    projetosLucratividade.forEach(p => {
      if (!types[p.tipo]) {
        types[p.tipo] = { tipo: p.tipo, projetos: 0, m2Total: 0, receitaTotal: 0, lucroTotal: 0 };
      }
      const t = types[p.tipo];
      t.projetos++;
      t.m2Total += (p as any).area_m2 || 0;
      t.receitaTotal += p.receitaTotal;
      t.lucroTotal += p.margemRS;
    });

    return Object.values(types).map(t => ({
      ...t,
      rsPorM2: t.m2Total > 0 ? t.receitaTotal / t.m2Total : 0,
      margem: t.receitaTotal > 0 ? (t.lucroTotal / t.receitaTotal) * 100 : 0
    }));
  }, [projetosLucratividade]);

  const activeAlerts = useMemo(() => {
    const custosMensais = configEscritorio?.custos_fixos || 15000;
    const fluxo30dias = metrics.previstasMes;
    const diasRestantes = 30 - new Date().getDate();
    const percentualMeta = (metrics.pagasMes / 50000) * 100;
    const capacidadeTotal = 320;
    const horasProjetadas = projetosLucratividade.reduce((acc, p) => acc + p.horasEstimadas, 0);

    const list = [];
    
    if (fluxo30dias < custosMensais) {
      list.push({
        tipo: "CAIXA_NEGATIVO",
        mensagem: `Seu fluxo de caixa pode ficar negativo em 30 dias se nenhum projeto novo fechar.`,
        cor: "red",
        acao: "Ver fluxo de caixa",
        tab: "fluxo"
      });
    }

    if (diasRestantes < 10 && percentualMeta < 60) {
      list.push({
        tipo: "META_EM_RISCO",
        mensagem: `Faltam ${diasRestantes} dias no mês e você atingiu ${percentualMeta.toFixed(0)}% da meta. Necessário fechar R$ ${(50000 - metrics.pagasMes).toLocaleString('pt-BR')} ainda.`,
        cor: "amber",
        acao: "Ver simulador",
        tab: "simulador"
      });
    }

    projetosLucratividade.forEach(p => {
      if (p.margemRS < 0) {
        list.push({
          tipo: "PROJETO_PREJUIZO",
          mensagem: `O projeto ${p.nome} está com margem negativa de R$ ${Math.abs(p.margemRS).toLocaleString('pt-BR')}. Verifique as horas registradas.`,
          cor: "red",
          acao: "Ver lucratividade",
          tab: "lucratividade"
        });
      }
    });

    if (horasProjetadas > capacidadeTotal) {
      list.push({
        tipo: "CAPACIDADE_EXCEDIDA",
        mensagem: `Os projetos ativos exigem ${horasProjetadas.toFixed(0)}h mas a capacidade disponível é ${capacidadeTotal}h. Risco de atraso.`,
        cor: "amber",
        acao: null
      });
    }

    const inadimplentes = parcelas.filter(p => p.status === 'ATRASADO');
    if (inadimplentes.length > 0) {
      list.push({
        tipo: "CLIENTE_INADIMPLENTE",
        mensagem: `${inadimplentes[0].cliente_nome} tem ${inadimplentes.length} parcelas em atraso totalizando R$ ${inadimplentes.reduce((acc, p) => acc + p.valor, 0).toLocaleString('pt-BR')}.`,
        cor: "red",
        acao: "Ver parcelas",
        tab: "parcelas"
      });
    }

    if (metrics.pagasMes > 30000) {
       list.push({
        tipo: "MES_FORTE",
        mensagem: `Este mês está acima da média. Boa oportunidade para reforçar reservas.`,
        cor: "green",
        acao: null
      });
    }

    return list;
  }, [parcelas, metrics, configEscritorio, projetosLucratividade]);

  const agingData = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);

    return {
      '0-15': parcelas.filter(p => p.status === 'ATRASADO' && isAfter(parseISO(p.data_vencimento), subDays(today, 15))).reduce((acc, p) => acc + p.valor, 0),
      '15-30': parcelas.filter(p => p.status === 'ATRASADO' && isWithinInterval(parseISO(p.data_vencimento), { start: subDays(today, 30), end: subDays(today, 15) })).reduce((acc, p) => acc + p.valor, 0),
      '30+': parcelas.filter(p => p.status === 'ATRASADO' && isBefore(parseISO(p.data_vencimento), subDays(today, 30))).reduce((acc, p) => acc + p.valor, 0),
    };
  }, [parcelas]);

  const exportAccountantReport = () => {
    let startDate: Date;
    let endDate: Date;

    if (lucroFilter === 'MES_ATUAL') {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    } else if (lucroFilter === 'ULTIMOS_3_MESES') {
      startDate = startOfMonth(subDays(new Date(), 90));
      endDate = new Date();
    } else {
      startDate = parseISO(lucroCustomDates.start);
      endDate = parseISO(lucroCustomDates.end);
    }

    const paidParcelas = parcelas.filter(p => 
      p.status === 'PAGO' && 
      p.data_recebimento && 
      isWithinInterval(parseISO(p.data_recebimento), { start: startDate, end: endDate })
    );

    if (paidParcelas.length === 0) {
      toast.error('Nenhuma parcela paga no período selecionado.');
      return;
    }

    // CSV Generation
    const csvHeader = "Cliente,Projeto,Cidade,Parcela,Valor Bruto,Aliquota ISS,ISS Retido,Valor Liquido,Data Recebimento,Numero NF\n";
    const csvRows = paidParcelas.map(p => {
      const issAliq = p.iss_aliquota || 2;
      const issVal = p.iss_valor || (p.valor * (issAliq / 100));
      const liqVal = p.valor_liquido || (p.valor - issVal);
      return `${p.cliente_nome},${p.projetos?.tipo || 'Projeto'},${p.projetos?.cidade || 'N/A'},${p.numero_parcela}/${p.total_parcelas},${p.valor},${issAliq}%,${issVal},${liqVal},${format(parseISO(p.data_recebimento!), 'dd/MM/yyyy')},${p.nf_numero || '-'}`;
    }).join("\n");
    
    const csvBlob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `relatorio-contador-${format(startDate, 'MMM-yyyy')}.csv`;
    csvLink.click();

    // PDF Generation
    const doc = new (window as any).jspdf.jsPDF();
    const bronze: [number, number, number] = [139, 115, 85];
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("NL ARQUITETOS", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("RELATÓRIO FINANCEIRO - CONTABILIDADE", 105, 28, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Período: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`, 105, 34, { align: "center" });

    const tableData = paidParcelas.map(p => {
      const issAliq = p.iss_aliquota || 2;
      const issVal = p.iss_valor || (p.valor * (issAliq / 100));
      const liqVal = p.valor_liquido || (p.valor - issVal);
      return [
        p.cliente_nome,
        `${p.projetos?.tipo || 'Projeto'} · ${p.projetos?.cidade || 'N/A'}`,
        `${p.numero_parcela}/${p.total_parcelas}`,
        `R$ ${p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `${issAliq}%`,
        `R$ ${issVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${liqVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        format(parseISO(p.data_recebimento!), 'dd/MM/yyyy'),
        p.nf_numero || '-'
      ];
    });

    (window as any).jspdf.autoTable(doc, {
      startY: 45,
      head: [['Cliente', 'Projeto/Cidade', 'Parc.', 'Bruto', '% ISS', 'ISS', 'Líquido', 'Recebimento', 'NF']],
      body: tableData,
      headStyles: { fillColor: bronze },
      styles: { fontSize: 7 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const totalBruto = paidParcelas.reduce((acc, p) => acc + p.valor, 0);
    const totalIss = paidParcelas.reduce((acc, p) => acc + (p.iss_valor || (p.valor * ((p.iss_aliquota || 2) / 100))), 0);
    const totalLiquido = totalBruto - totalIss;

    doc.setFontSize(10);
    doc.text(`TOTAL BRUTO: R$ ${totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 190, finalY, { align: "right" });
    doc.text(`TOTAL ISS RETIDO: R$ ${totalIss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 190, finalY + 6, { align: "right" });
    doc.text(`TOTAL LÍQUIDO: R$ ${totalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 190, finalY + 12, { align: "right" });

    doc.save(`relatorio-contador-${format(startDate, 'MMM-yyyy')}.pdf`);
    
    toast.success('Relatórios exportados com sucesso!');
  };

  const exportReport = () => {
    // Keep existing general export logic if needed, or redirect to accountant export
    exportAccountantReport();
  };


  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white font-inter">
      <Sidebar user="Sócio" />
      
      <main className="flex-1 transition-[margin] duration-300 ml-[var(--sidebar-width)] p-8">
        <header className="mb-10 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 uppercase font-inter">07 · Financeiro de Projetos</h1>
            <p className="text-white/40 text-xs tracking-[0.3em] font-bold uppercase">
              PARCELAS · FLUXO DE CAIXA · LUCRATIVIDADE
            </p>
          </div>
          <Button 
            onClick={exportReport}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-none text-[10px] uppercase tracking-widest px-6 flex items-center gap-2"
          >
            <Download size={14} className="text-bronze" />
            Exportar Relatório
          </Button>
        </header>

        {/* Metrics Cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white/5 p-6 border border-white/5 flex flex-col gap-1">
            <span className="text-[11px] text-[#777777] uppercase font-normal font-inter">RECEITA CONFIRMADA ({lucroFilter === 'MES_ATUAL' ? 'MÊS' : 'PERÍODO'})</span>
            <span className="text-[22px] font-normal text-[#FFFFFF] font-inter">R$ {metrics.pagasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-white/5 p-6 border border-white/5 flex flex-col gap-1">
            <span className="text-[11px] text-[#777777] uppercase font-normal font-inter">PREVISTA ({lucroFilter === 'MES_ATUAL' ? 'MÊS' : 'PERÍODO'})</span>
            <span className="text-[22px] font-normal text-[#FFFFFF] font-inter">R$ {metrics.previstasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-white/5 p-6 border border-white/10 flex flex-col gap-1">
            <span className="text-[11px] text-[#777777] uppercase font-normal font-inter">ATRASADO</span>
            <span className="text-[22px] font-normal text-[#FFFFFF] font-inter">R$ {metrics.totalAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-white/5 p-6 border border-white/5 flex flex-col gap-1">
            <span className="text-[11px] text-[#777777] uppercase font-normal font-inter">PRÓXIMOS 7 DIAS</span>
            <span className="text-[22px] font-normal text-[#FFFFFF] font-inter">
              {metrics.vencendo7Dias} {metrics.vencendo7Dias === 1 ? 'parcela' : 'parcelas'}
            </span>
          </div>
          <div className="bg-white/5 p-6 border border-bronze/20 flex flex-col gap-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
              <TrendingUp size={12} className="text-bronze" />
            </div>
            <span className="text-[11px] text-[#777777] uppercase font-normal font-inter">LTV MÉDIO (HIST.)</span>
            <span className="text-[22px] font-normal text-[#FFFFFF] font-inter">
              R$ {(projetosLucratividade.length > 0 
                ? projetosLucratividade.reduce((acc, p) => acc + p.receitaTotal, 0) / projetosLucratividade.length 
                : 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <Tabs defaultValue="dashboard" onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 mb-6 rounded-none">
            <TabsTrigger value="dashboard" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-4">Dashboard</TabsTrigger>
            <TabsTrigger value="parcelas" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-4">Parcelas</TabsTrigger>
            <TabsTrigger value="fluxo" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-4">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="lucratividade" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-4">Lucratividade</TabsTrigger>
            <TabsTrigger value="score" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-4">Score Cliente</TabsTrigger>
            <TabsTrigger value="simulador" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-4">Simulador</TabsTrigger>
            <TabsTrigger value="ponto_equilibrio" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-4">Ponto Equilíbrio</TabsTrigger>
            <TabsTrigger value="sazonalidade" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-4">Sazonalidade</TabsTrigger>
            <TabsTrigger value="rentabilidade_m2" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-4">Rentabilidade m²</TabsTrigger>
            <TabsTrigger value="alertas" className="rounded-none data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest px-4 relative">
              Alertas
              {activeAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1A1816]"></span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-3 gap-6 mb-8">
              {/* Main Revenue Chart */}
              <div className="col-span-2 bg-white/5 border border-white/5 p-6 h-[350px]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 size={14} className="text-bronze" />
                      Receita Mensal (6 Meses)
                    </h3>
                  </div>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.last6Months}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#777777', fontSize: 10 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#777777', fontSize: 10 }}
                        tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000) + 'k' : value}`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1A1816', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                      />
                      <Bar dataKey="receita" fill="#8B7355" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Aging Analysis */}
              <div className="bg-white/5 border border-white/5 p-6 h-[350px]">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Clock size={14} className="text-red-500" />
                  Aging (Inadimplência)
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[10px] uppercase tracking-widest mb-2">
                      <span className="text-white/40">0 - 15 dias</span>
                      <span className="font-bold">R$ {agingData['0-15'].toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-bronze/40" style={{ width: `${Math.min((agingData['0-15'] / (metrics.totalAtrasado || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] uppercase tracking-widest mb-2">
                      <span className="text-white/40">15 - 30 dias</span>
                      <span className="font-bold">R$ {agingData['15-30'].toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-bronze/70" style={{ width: `${Math.min((agingData['15-30'] / (metrics.totalAtrasado || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] uppercase tracking-widest mb-2">
                      <span className="text-white/40">Acima de 30 dias</span>
                      <span className="font-bold text-red-500">R$ {agingData['30+'].toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${Math.min((agingData['30+'] / (metrics.totalAtrasado || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/5 mt-4">
                    <p className="text-[10px] text-white/20 uppercase text-center">Total Atrasado: R$ {metrics.totalAtrasado.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Distribution by Type */}
              <div className="bg-white/5 border border-white/5 p-6 h-[300px]">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity size={14} className="text-bronze" />
                  Receita por Tipo de Projeto
                </h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#8B7355', '#3A3A3A', '#FFFFFF', '#777777'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1A1816', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Health Score / Next Actions */}
              <div className="bg-white/5 border border-white/5 p-6 h-[300px]">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Target size={14} className="text-bronze" />
                  Ações Prioritárias
                </h3>
                <div className="space-y-4">
                  {metrics.totalAtrasado > 0 && (
                    <div className="p-4 bg-red-500/5 border border-red-500/10 flex justify-between items-center group cursor-pointer hover:bg-red-500/10 transition-colors" onClick={() => { setActiveTab('parcelas'); setFilterStatus('ATRASADO'); }}>
                      <div className="flex items-center gap-3">
                        <AlertCircle size={16} className="text-red-500" />
                        <div>
                          <p className="text-xs font-bold">Cobrar Inadimplência</p>
                          <p className="text-[10px] text-white/40 uppercase">R$ {metrics.totalAtrasado.toLocaleString('pt-BR')} em atraso</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                    </div>
                  )}
                  {metrics.vencendo7Dias > 0 && (
                    <div className="p-4 bg-bronze/5 border border-bronze/10 flex justify-between items-center group cursor-pointer hover:bg-bronze/10 transition-colors" onClick={() => { setActiveTab('parcelas'); setFilterStatus('REGUA_PENDENTE'); }}>
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-bronze" />
                        <div>
                          <p className="text-xs font-bold">Régua de Cobrança</p>
                          <p className="text-[10px] text-white/40 uppercase">{metrics.vencendo7Dias} lembretes pendentes</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                    </div>
                  )}
                  <div className="p-4 bg-white/5 border border-white/10 flex justify-between items-center group cursor-pointer hover:bg-white/10 transition-colors" onClick={() => { setActiveTab('parcelas'); setFilterStatus('NF_PENDENTE'); }}>
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-white/60" />
                      <div>
                        <p className="text-xs font-bold">Emitir Notas Fiscais</p>
                        <p className="text-[10px] text-white/40 uppercase">Verificar parcelas pagas sem NF</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="parcelas">
            <div className="flex flex-col gap-6 mb-6">
              <div className="flex justify-between items-center">
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

              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {[
                    { id: 'TODOS', label: 'Todos' },
                    { id: 'EM ABERTO', label: 'Em Aberto' },
                    { id: 'ATRASADO', label: 'Atrasado' },
                    { id: 'PAGO', label: 'Pago' },
                    { id: 'NF_PENDENTE', label: 'NF Pendente' },
                    { id: 'REGUA_PENDENTE', label: 'Régua Pendente' },
                    { id: 'ENVIADAS', label: 'Enviadas' }

                  ].map(status => (
                    <Button 
                      key={status.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterStatus(status.id)}
                      className={cn(
                        "text-[10px] uppercase tracking-widest rounded-none border border-white/5",
                        filterStatus === status.id ? "bg-white/10 text-white" : "text-white/40"
                      )}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40">Cliente / Projeto</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40">Parcela</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40">Valor (Bruto)</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40">Líquido</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40">Vencimento</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40">Status / NF / Régua</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/40 text-right">Ações</th>

                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredParcelas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-white/20 text-xs italic">Nenhuma parcela encontrada</td>
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
                        <span className="text-sm font-medium text-white/60">
                          R$ {(p.valor_liquido || (p.valor * (1 - (p.iss_aliquota || 2) / 100))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-white/60">{format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-2 items-center">
                            {getStatusBadge(p)}
                            {p.status === 'PAGO' && (
                              p.nf_emitida ? (
                                <Badge className="bg-green-500/20 text-green-500 border-none text-[8px] h-4">NF EMITIDA</Badge>
                              ) : (
                                <Badge className="bg-amber-500/20 text-amber-500 border-none text-[8px] h-4">NF PENDENTE</Badge>
                              )
                            )}
                          </div>
                          {getReguaStatus(p)}
                          {(p as any).data_notificacao_cobranca && (
                            <span className="text-[8px] text-white/20 uppercase">Último aviso: {format(parseISO((p as any).data_notificacao_cobranca), 'dd/MM')}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {p.status === 'PAGO' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-[9px] uppercase tracking-widest text-white/40 hover:text-white rounded-none"
                              onClick={() => generateReceipt(p)}
                            >
                              <FileText size={14} className="mr-1" />
                              Recibo
                            </Button>
                          )}
                          {(p.status === 'EM ABERTO' || p.status === 'ATRASADO' || p.status === 'VENCE HOJE') && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[9px] uppercase tracking-widest border-white/10 hover:bg-bronze hover:text-white rounded-none"
                                onClick={() => {
                                  setSelectedParcela(p);
                                  setConfirmData({ 
                                    ...confirmData, 
                                    valor: p.valor.toString(),
                                    nf_emitida: false,
                                    nf_numero: '',
                                    nf_data_emissao: format(new Date(), 'yyyy-MM-dd')
                                  });
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
                        <p className="text-[11px] text-[#777777] uppercase font-normal font-inter mb-1">Confirmado</p>
                        <p className="text-[22px] font-normal text-[#FFFFFF] font-inter">R$ {mes.confirmado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#777777] uppercase font-normal font-inter mb-1">Previsto</p>
                        <p className="text-[22px] font-normal text-[#777777] font-inter">R$ {mes.previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
            
            <div className="mt-8 p-6 bg-white/5 border border-white/5 flex justify-between items-center">
              <div>
                <h4 className="text-[11px] uppercase tracking-widest font-normal text-[#777777] font-inter">Total Geral (Próximos 3 meses)</h4>
                <p className="text-[10px] text-white/20 uppercase font-inter mt-1">Consolidado de todas as parcelas previstas e confirmadas</p>
              </div>
              <div className="flex gap-12 text-right">
                <div>
                  <p className="text-[11px] text-[#777777] uppercase font-normal font-inter mb-1">Previsto Geral</p>
                  <p className="text-[22px] font-normal text-[#777777] font-inter">R$ {fluxoCaixa.reduce((acc, m) => acc + m.previsto, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#777777] uppercase font-normal font-inter mb-1">Confirmado Geral</p>
                  <p className="text-[22px] font-normal text-[#FFFFFF] font-inter">R$ {fluxoCaixa.reduce((acc, m) => acc + m.confirmado, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="score">
            <div className="grid grid-cols-2 gap-4">
              {clientScores.map(client => (
                <div key={client.nome} className="bg-white/5 border border-white/5 p-6 hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-tight">{client.nome}</h3>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">{client.tipoProjeto}</span>
                    </div>
                    <div className="text-right">
                      <div className={cn("text-3xl font-bold font-inter", client.color)}>
                        {client.score.toFixed(0)}
                      </div>
                      <Badge className={cn("border-none rounded-none text-[9px] px-2 mt-1 bg-white/5", client.color)}>
                        {client.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 py-4 border-y border-white/5 mb-6">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Parcelas em Dia</p>
                      <p className="text-xs font-bold text-green-500">{client.parcelasPagas}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Atrasos</p>
                      <p className="text-xs font-bold text-red-500">{client.parcelasAtrasadas}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Média Atraso</p>
                      <p className="text-xs font-bold">{client.diasMediaAtraso.toFixed(1)} dias</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Indicações</p>
                      <p className="text-xs font-bold text-bronze">{client.indicacoesFeitas}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Resumo do Relacionamento</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-none border-white/10 text-[9px] uppercase font-normal py-1">
                        {client.pagamentosAdiantados} Adiantamentos
                      </Badge>
                      <Badge variant="outline" className="rounded-none border-white/10 text-[9px] uppercase font-normal py-1">
                        {client.pedidosDesconto} Pedidos Desconto
                      </Badge>
                      <Badge variant="outline" className="rounded-none border-white/10 text-[9px] uppercase font-normal py-1">
                        {client.retrabalhoGerado} Retrabalhos
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="simulador">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/5 p-6 space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Calculator size={14} className="text-bronze" />
                  Parâmetros de Simulação
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">Número de Projetos (Mês)</label>
                    <Input 
                      type="number" 
                      min="1" max="10"
                      className="bg-white/5 border-white/10 rounded-none h-10 text-xs"
                      value={simulator.numProjetos}
                      onChange={e => setSimulator({ ...simulator, numProjetos: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">Tipo de Projeto</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-none h-10 text-xs px-3 focus:outline-none focus:border-bronze"
                      value={simulator.tipo}
                      onChange={e => setSimulator({ ...simulator, tipo: e.target.value })}
                    >
                      <option value="ArqInt">ArqInt</option>
                      <option value="Interiores">Interiores</option>
                      <option value="Comercial">Comercial</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">Área Média (m²)</label>
                    <Input 
                      type="number" 
                      className="bg-white/5 border-white/10 rounded-none h-10 text-xs"
                      value={simulator.areaM2}
                      onChange={e => setSimulator({ ...simulator, areaM2: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-2 bg-white/5 border border-white/5 p-8">
                {(() => {
                  const tickets = { ArqInt: 150, Interiores: 120, Comercial: 180 };
                  const ticketMedio = (tickets as any)[simulator.tipo] || 150;
                  const receitaBruta = simulator.numProjetos * simulator.areaM2 * ticketMedio;
                  const iss = receitaBruta * 0.02; // 2%
                  const simples = receitaBruta * 0.06; // 6%
                  
                  // Melhoria: Usando custos fixos reais da Base Financeira (Módulo 02)
                  const custosFixos = configEscritorio?.custos_fixos || 15000;
                  const lucro = receitaBruta - iss - simples - custosFixos;
                  
                  const horasNecessarias = simulator.numProjetos * (simulator.areaM2 * 0.5); // Simplified
                  
                  // Melhoria: Capacidade baseada no número de arquitetos (Módulo 02)
                  // Cada arquiteto = 160h/mês (produtividade média considerada em faturáveis)
                  const numArquitetos = configEscritorio?.num_arquitetos || 2;
                  const capacidadeDisponivel = numArquitetos * 160; 
                  
                  const viabilidade = horasNecessarias <= capacidadeDisponivel ? 'VIÁVEL' : 
                                     horasNecessarias <= capacidadeDisponivel * 1.2 ? 'ATENÇÃO' : 'INVIÁVEL';
                  const viabilidadeColor = viabilidade === 'VIÁVEL' ? 'text-green-500' : 
                                         viabilidade === 'ATENÇÃO' ? 'text-amber-500' : 'text-red-500';

                  return (
                    <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Resultado Estimado</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-[10px] uppercase tracking-widest text-white/40">Receita Bruta</span>
                            <span className="text-sm font-bold">R$ {receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-[10px] uppercase tracking-widest text-white/40">(-) ISS (2%)</span>
                            <span className="text-sm text-red-400">R$ {iss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-[10px] uppercase tracking-widest text-white/40">(-) Simples Nacional (6%)</span>
                            <span className="text-sm text-red-400">R$ {simples.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-[10px] uppercase tracking-widest text-white/40">(-) Custos Fixos</span>
                            <span className="text-sm text-red-400">R$ {custosFixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center pt-4">
                            <span className="text-[10px] uppercase tracking-widest font-bold">Lucro Estimado</span>
                            <span className={cn("text-xl font-bold font-inter", lucro >= 0 ? "text-bronze" : "text-red-500")}>
                              R$ {lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Capacidade Operacional</h3>
                        <div className="bg-white/5 p-6 border border-white/5 space-y-6 text-center">
                          <div>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Horas Necessárias</p>
                            <p className="text-2xl font-bold font-inter">{horasNecessarias.toFixed(0)}h</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Capacidade Disponível</p>
                            <p className="text-2xl font-bold font-inter text-white/20">{capacidadeDisponivel}h</p>
                          </div>
                          <div className="pt-4 border-t border-white/5">
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Viabilidade</p>
                            <p className={cn("text-xl font-bold tracking-widest", viabilidadeColor)}>{viabilidade}</p>
                          </div>
                        </div>

                        <div className="h-[100px] w-full mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: 'Receita', val: receitaBruta, fill: '#8B7355' },
                              { name: 'Custos', val: iss + simples + custosFixos, fill: '#777777' },
                              { name: 'Lucro', val: lucro > 0 ? lucro : 0, fill: '#FFFFFF' }
                            ]}>
                              <XAxis dataKey="name" hide />
                              <YAxis hide />
                              <Tooltip contentStyle={{ backgroundColor: '#1A1816', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }} />
                              <Bar dataKey="val">
                                {[
                                  { fill: '#8B7355' },
                                  { fill: '#777777' },
                                  { fill: '#FFFFFF' }
                                ].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ponto_equilibrio">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/5 border border-bronze/20 p-12 text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Target size={120} className="text-bronze" />
                </div>
                
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white/40 mb-2">Ponto de Equilíbrio do Mês</h2>
                  <p className="text-[10px] text-white/20 uppercase">Acompanhamento em tempo real dos custos vs faturamento</p>
                </div>

                <div className="grid grid-cols-3 gap-8 text-left border-y border-white/5 py-8">
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Custos Fixos Totais</p>
                    <p className="text-xl font-bold font-inter">R$ {breakEven.custosFixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Impostos Estimados</p>
                    <p className="text-xl font-bold font-inter text-white/40">R$ {breakEven.impostosEstimados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Total a Cobrir</p>
                    <p className="text-xl font-bold font-inter text-bronze">R$ {breakEven.totalACobrir.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="text-left">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Faturado até agora</p>
                      <p className="text-2xl font-bold font-inter">R$ {breakEven.faturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Meta de Cobertura</p>
                      <p className="text-sm font-bold font-inter text-white/20">R$ {breakEven.totalACobrir.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  
                  <div className="h-4 bg-white/5 w-full rounded-none overflow-hidden p-1 border border-white/10">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        breakEven.percentual >= 100 ? "bg-bronze" : 
                        breakEven.percentual >= 80 ? "bg-green-500" : 
                        breakEven.percentual >= 50 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.min(breakEven.percentual, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] font-bold">
                    <span className={cn(
                      breakEven.percentual >= 100 ? "text-bronze" : 
                      breakEven.percentual >= 80 ? "text-green-500" : 
                      breakEven.percentual >= 50 ? "text-amber-500" : "text-red-500"
                    )}>
                      {breakEven.percentual.toFixed(1)}% Coberto
                    </span>
                    {breakEven.percentual < 100 ? (
                      <span className="text-white/20">Faltam R$ {(breakEven.totalACobrir - breakEven.faturado).toLocaleString('pt-BR')}</span>
                    ) : (
                      <span className="text-bronze">Margem de Segurança: R$ {(breakEven.faturado - breakEven.totalACobrir).toLocaleString('pt-BR')}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-white/5 p-6 border border-white/5">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Equivalência em Projetos</p>
                    <p className="text-lg font-bold font-inter">
                      {Math.ceil((breakEven.totalACobrir - breakEven.faturado) / 15000)} PROJETOS 
                      <span className="text-[10px] text-white/20 ml-2">DE TICKET MÉDIO R$ 15k</span>
                    </p>
                  </div>
                  <div className="bg-white/5 p-6 border border-white/5">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Horas Faturáveis Necessárias</p>
                    <p className="text-lg font-bold font-inter">
                      {Math.ceil((breakEven.totalACobrir - breakEven.faturado) / (configEscritorio?.custo_hora || 150))} HORAS
                      <span className="text-[10px] text-white/20 ml-2">A R$ {(configEscritorio?.custo_hora || 150)}/h</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sazonalidade">
            <div className="space-y-8">
              <div className="bg-white/5 border border-white/5 p-8 h-[450px]">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp size={14} className="text-bronze" />
                      Sazonalidade (Últimos 12 Meses)
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-bronze"></div>
                      <span className="text-[10px] uppercase text-white/40">Receita</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-[1px] bg-bronze/40 border-t border-dashed"></div>
                      <span className="text-[10px] uppercase text-white/40">Média Anual</span>
                    </div>
                  </div>
                </div>

                {sazonalidade.data.filter(d => d.receita > 0).length < 3 ? (
                  <div className="h-[300px] flex flex-col items-center justify-center text-center gap-4">
                    <Activity size={32} className="text-white/10" />
                    <p className="text-white/40 text-sm italic">Dados insuficientes — continue registrando recebimentos para ver a sazonalidade.</p>
                  </div>
                ) : (
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sazonalidade.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#777777', fontSize: 10 }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#777777', fontSize: 10 }}
                          tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000) + 'k' : value}`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1A1816', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="receita" radius={[2, 2, 0, 0]}>
                          {sazonalidade.data.map((entry, index) => {
                            let color = "#8B735540";
                            if (sazonalidade.top3.includes(entry.name)) color = "#22c55e";
                            else if (sazonalidade.bottom3.includes(entry.name)) color = "#f59e0b";
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/5 p-6">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4">Melhor Período</p>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 text-green-500">
                      <ArrowUpRight size={20} />
                    </div>
                    <div>
                      <p className="text-lg font-bold font-inter uppercase">{sazonalidade.top3[0] || '-'}</p>
                      <p className="text-[10px] text-white/20 uppercase">Maior volume histórico</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 p-6">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4">Média de Faturamento</p>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-bronze/10 text-bronze">
                      <Target size={20} />
                    </div>
                    <div>
                      <p className="text-lg font-bold font-inter">R$ {sazonalidade.mediaAnual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-white/20 uppercase">Mensal consolidada</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 p-6">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4">Tendência Próximo Mês</p>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500">
                      <Activity size={20} />
                    </div>
                    <div>
                      <p className="text-lg font-bold font-inter">ESTÁVEL</p>
                      <p className="text-[10px] text-white/20 uppercase">Baseado no histórico</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rentabilidade_m2">
            <div className="space-y-8">
              <div className="bg-white/5 border border-white/5 p-8">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-8 flex items-center gap-2">
                  <Layers size={14} className="text-bronze" />
                  Performance por m² e Tipo de Projeto
                </h3>
                
                <div className="overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">Tipo de Projeto</th>
                        <th className="py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-center">Projetos</th>
                        <th className="py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-center">m² Total</th>
                        <th className="py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-right">Receita Total</th>
                        <th className="py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-right">Lucro Total</th>
                        <th className="py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-right">R$ / m²</th>
                        <th className="py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-right">Margem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rentabilidadePorM2.map((item) => (
                        <tr key={item.tipo} className="hover:bg-white/5 transition-colors group">
                          <td className="py-4 text-xs font-bold uppercase tracking-widest text-bronze">{item.tipo}</td>
                          <td className="py-4 text-xs font-bold text-center font-inter">{item.projetos}</td>
                          <td className="py-4 text-xs text-center font-inter text-white/60">{item.m2Total.toFixed(0)} m²</td>
                          <td className="py-4 text-xs text-right font-inter">R$ {item.receitaTotal.toLocaleString('pt-BR')}</td>
                          <td className="py-4 text-xs text-right font-inter text-green-500">R$ {item.lucroTotal.toLocaleString('pt-BR')}</td>
                          <td className="py-4 text-sm text-right font-bold font-inter text-white">R$ {item.rsPorM2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                          <td className="py-4 text-xs text-right font-inter font-bold">{item.margem.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/5 p-8">
                  <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-6">Comparativo R$ / m²</h3>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rentabilidadePorM2}>
                        <XAxis dataKey="tipo" axisLine={false} tickLine={false} tick={{ fill: '#777777', fontSize: 10 }} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ backgroundColor: '#1A1816', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }} />
                        <Bar dataKey="rsPorM2" fill="#8B7355" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white/5 border border-bronze/20 p-8 flex flex-col justify-center text-center">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4">Tipo mais rentável por m²</p>
                  {(() => {
                    const top = [...rentabilidadePorM2].sort((a, b) => b.rsPorM2 - a.rsPorM2)[0];
                    return top ? (
                      <>
                        <p className="text-3xl font-bold uppercase tracking-tighter text-bronze mb-2">{top.tipo}</p>
                        <p className="text-xl font-bold font-inter">R$ {top.rsPorM2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/m²</p>
                        <p className="text-[10px] text-white/20 uppercase mt-4">Margem média de {top.margem.toFixed(1)}%</p>
                      </>
                    ) : '-';
                  })()}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="alertas">
            <div className="max-w-4xl mx-auto space-y-4">
              {activeAlerts.length === 0 ? (
                <div className="bg-white/5 border border-green-500/20 p-12 text-center flex flex-col items-center gap-4">
                  <CheckCircle2 className="text-green-500 w-12 h-12" />
                  <div>
                    <h3 className="text-green-500 font-bold uppercase tracking-widest">Tudo sob controle</h3>
                    <p className="text-white/40 text-xs mt-2">Nenhum alerta crítico ou preditivo no momento.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-6 px-2">
                    <Bell size={16} className="text-bronze" />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Alertas Ativos ({activeAlerts.length})</h3>
                  </div>
                  {activeAlerts.map((alerta, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "p-6 border flex items-center justify-between group transition-all",
                        alerta.cor === 'red' ? "bg-red-500/5 border-red-500/20" : 
                        alerta.cor === 'amber' ? "bg-amber-500/5 border-amber-500/20" : 
                        "bg-green-500/5 border-green-500/20"
                      )}
                    >
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "p-3 rounded-full",
                          alerta.cor === 'red' ? "bg-red-500/10 text-red-500" : 
                          alerta.cor === 'amber' ? "bg-amber-500/10 text-amber-500" : 
                          "bg-green-500/10 text-green-500"
                        )}>
                          {alerta.cor === 'red' ? <AlertCircle size={20} /> : <Activity size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:translate-x-1 transition-transform">{alerta.mensagem}</p>
                          <p className="text-[10px] uppercase tracking-widest text-white/20 mt-1">Alerta {alerta.tipo.replace('_', ' ')}</p>
                        </div>
                      </div>
                      
                      {alerta.acao && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => alerta.tab && setActiveTab(alerta.tab)}
                          className="rounded-none border-white/10 text-[9px] uppercase tracking-widest hover:bg-white/10"
                        >
                          {alerta.acao}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                    <span className="text-[11px] text-[#777777] uppercase font-normal font-inter block mb-2">Margem Média Geral</span>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "text-[22px] font-normal font-inter",
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
                    <span className="text-[11px] text-[#777777] uppercase font-normal font-inter block mb-2">Total Recebido vs Custo Real</span>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[11px] text-[#777777] uppercase font-normal font-inter mb-1">Recebido</p>
                        <p className="text-[22px] font-normal text-[#FFFFFF] font-inter">R$ {(lucroResumo?.totalRecebido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#777777] uppercase font-normal font-inter mb-1">Custo Total</p>
                        <p className="text-[22px] font-normal text-[#777777] font-inter">R$ {(lucroResumo?.totalCusto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
          <DialogContent className="bg-[#0A0A0A] border-white/10 text-white rounded-none">
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

              <div className="pt-4 border-t border-white/5 space-y-4">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="nf_emitida"
                    className="w-4 h-4 rounded-none border-white/10 bg-white/5 accent-bronze"
                    checked={confirmData.nf_emitida}
                    onChange={e => setConfirmData({ ...confirmData, nf_emitida: e.target.checked })}
                  />
                  <label htmlFor="nf_emitida" className="text-[10px] uppercase tracking-widest text-white/60">NFS-e emitida</label>
                </div>

                {confirmData.nf_emitida && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Número da Nota</label>
                      <Input 
                        placeholder="Ex: 2024001"
                        className="bg-white/5 border-white/10 rounded-none h-10 text-xs"
                        value={confirmData.nf_numero}
                        onChange={e => setConfirmData({ ...confirmData, nf_numero: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Data de Emissão</label>
                      <Input 
                        type="date" 
                        className="bg-white/5 border-white/10 rounded-none h-10 text-xs"
                        value={confirmData.nf_data_emissao}
                        onChange={e => setConfirmData({ ...confirmData, nf_data_emissao: e.target.value })}
                      />
                    </div>
                  </div>
                )}
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