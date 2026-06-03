import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  FileText,
  TrendingUp,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { format, parseISO, isBefore, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  cliente_id?: string;
  cliente_nome?: string;
  numero_parcela: number;
  total_parcelas: number;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  data_recebimento?: string;
  valor_recebido?: number;
  dias?: number;
}

interface Projeto {
  id: string;
  nome: string;
  nome_cliente: string;
  tipo: string;
  cidade: string;
  cliente_id?: string;
  valor_total?: number;
}

const ProjetoFinanceiro = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<any>(null);
  const [contrato, setContrato] = useState<any>(null);
  
  // Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedParcela, setSelectedParcela] = useState<Parcela | null>(null);
  const [confirmData, setConfirmData] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    valor: ''
  });

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      
      // Buscar projeto
      const { data: pData } = await supabase
        .from('projetos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (pData) {
        setProjeto(pData);
        
        // Buscar lead/cliente para o WhatsApp
        if (pData.cliente_id) {
          const { data: leadData } = await supabase
            .from('leads')
            .select('*')
            .eq('id', pData.cliente_id)
            .maybeSingle();
          if (leadData) setLead(leadData);

          // Buscar contrato para número e outros detalhes
          const { data: contratoData } = await supabase
            .from('contratos')
            .select('*')
            .eq('cliente_id', pData.cliente_id)
            .not('status', 'eq', 'Arquivado')
            .not('status', 'eq', 'Inativo')
            .order('criado_em', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (contratoData) setContrato(contratoData);
        }
      }

      // Buscar parcelas do projeto
      const { data: parcelasRaw } = await supabase
        .from('financeiro_parcelas')
        .select('*')
        .eq('projeto_id', id)
        .order('numero_parcela', { ascending: true });

      // Calcular status real de cada parcela
      const processedParcelas = (parcelasRaw || []).map(p => {
        if (p.status === 'PAGO' || p.status === 'PAGO PARCIAL') return p;
        
        const dateVenc = parseISO(p.data_vencimento);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dias = differenceInDays(dateVenc, today);
        let status = p.status;
        
        if (dias < 0) status = 'ATRASADO';
        else if (dias === 0) status = 'VENCE HOJE';
        else if (dias <= 7) status = 'VENCE EM BREVE';
        else status = 'PENDENTE';
        
        return { ...p, status, dias };
      });
      
      setParcelas(processedParcelas);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const summary = useMemo(() => {
    const total = parcelas.reduce((acc, p) => acc + (p.valor || 0), 0);
    const recebido = parcelas.filter(p => p.status === 'PAGO' || p.status === 'PAGO PARCIAL').reduce((acc, p) => acc + (p.valor_recebido || p.valor || 0), 0);
    const emAberto = total - recebido;
    const proximoVencimento = parcelas
      .filter(p => p.status !== 'PAGO' && p.status !== 'PAGO PARCIAL')
      .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())[0]?.data_vencimento;

    return { total, recebido, emAberto, proximoVencimento };
  }, [parcelas]);

  const handleOpenConfirm = (parcela: Parcela) => {
    setSelectedParcela(parcela);
    setConfirmData({
      data: format(new Date(), 'yyyy-MM-dd'),
      valor: parcela.valor.toString()
    });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmPago = async () => {
    if (!selectedParcela) return;
    
    try {
      const valorPago = parseFloat(confirmData.valor.replace(/\./g, '').replace(',', '.'));
      const valorTotal = selectedParcela.valor;
      const isParcial = valorPago < valorTotal;

      // Atualizar parcela atual como paga
      const { error } = await supabase
        .from('financeiro_parcelas')
        .update({
          status: isParcial ? 'PAGO PARCIAL' : 'PAGO',
          data_recebimento: new Date(confirmData.data).toISOString(),
          valor_recebido: valorPago,
        })
        .eq('id', selectedParcela.id);

      if (error) throw error;
      
      // Se pagamento parcial, criar nova parcela com saldo restante
      if (isParcial) {
        const saldo = valorTotal - valorPago;
        const { error: insertError } = await supabase
          .from('financeiro_parcelas')
          .insert({
            projeto_id: selectedParcela.projeto_id,
            cliente_id: selectedParcela.cliente_id,
            cliente_nome: selectedParcela.cliente_nome,
            numero_parcela: selectedParcela.numero_parcela,
            total_parcelas: selectedParcela.total_parcelas,
            descricao: `${selectedParcela.descricao} — Saldo restante`,
            valor: saldo,
            data_vencimento: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
            status: 'PENDENTE',
          });
        
        if (insertError) throw insertError;
        
        toast.success(`R$ ${valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrado. Saldo de R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} criado como nova parcela.`);
      } else {
        toast.success('Pagamento registrado com sucesso!');
      }

      setIsConfirmModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      toast.error('Erro ao atualizar parcela');
    }
  };

  const handleImportarContrato = async () => {
    if (!projeto) return;
    
      const { data: contrato } = await supabase
        .from('contratos_clientes')
        .select('valor_total, marco1_valor, marco2_valor, marco3_valor')
        .eq('cliente_id', projeto.cliente_id)
        .not('status', 'eq', 'Arquivado')
        .not('status', 'eq', 'Inativo')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!contrato) {
      toast.error('Nenhum contrato assinado encontrado para este cliente.');
      return;
    }

    const parseValor = (val: string) => parseFloat(String(val || '0').replace(/\./g, '').replace(',', '.')) || 0;
    const hoje = new Date();

    const novasParcelas = [
      {
        projeto_id: id,
        cliente_id: projeto.cliente_id,
        cliente_nome: projeto.nome_cliente,
        numero_parcela: 1,
        total_parcelas: 3,
        descricao: 'Marco 1 — Entrada (30%)',
        valor: parseValor(contrato.marco1_valor),
        data_vencimento: new Date().toISOString().split('T')[0],
        status: 'PENDENTE',
      },
      {
        projeto_id: id,
        cliente_id: projeto.cliente_id,
        cliente_nome: projeto.nome_cliente,
        numero_parcela: 2,
        total_parcelas: 3,
        descricao: 'Marco 2 — Anteprojeto aprovado (40%)',
        valor: parseValor(contrato.marco2_valor),
        data_vencimento: new Date(hoje.setDate(hoje.getDate() + 45)).toISOString().split('T')[0],
        status: 'PENDENTE',
      },
      {
        projeto_id: id,
        cliente_id: projeto.cliente_id,
        cliente_nome: projeto.nome_cliente,
        numero_parcela: 3,
        total_parcelas: 3,
        descricao: 'Marco 3 — Entrega do executivo (30%)',
        valor: parseValor(contrato.marco3_valor),
        data_vencimento: new Date(hoje.setDate(hoje.getDate() + 90)).toISOString().split('T')[0],
        status: 'PENDENTE',
      },
    ];

    const { error } = await supabase.from('financeiro_parcelas').insert(novasParcelas);

    if (error) {
      toast.error('Erro ao importar parcelas: ' + error.message);
      return;
    }

    toast.success('Parcelas importadas do contrato com sucesso!');
    fetchData();
  };

  const handleCobrarWhatsApp = (parcela: Parcela) => {
    if (!projeto || !lead?.whats) {
        toast.error('Dados de contato do cliente não encontrados');
        return;
    }
    const dataFormatada = format(parseISO(parcela.data_vencimento), 'dd/MM/yyyy');
    const msg = `Olá ${projeto.nome_cliente}, lembrando que o ${parcela.descricao} no valor de R$ ${parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vence em ${dataFormatada}. Qualquer dúvida estou à disposição.`;
    window.open(`https://wa.me/55${lead.whats.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleGerarRecibo = async (parcela: any) => {
    const { data: todasParcelas } = await supabase
      .from('financeiro_parcelas')
      .select('*')
      .eq('projeto_id', parcela.projeto_id)
      .order('numero_parcela', { ascending: true });

    const { data: contratoInfo } = await supabase
      .from('contratos_clientes')
      .select('numero')
      .eq('cliente_id', parcela.cliente_id)
      .not('status', 'eq', 'Arquivado')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle();

    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const W = 210;
    const bronze: [number, number, number] = [139, 115, 85];
    const grafite: [number, number, number] = [58, 58, 58];
    const cinza: [number, number, number] = [120, 120, 120];

    // Número do recibo baseado nas parcelas pagas
    const pagas = (todasParcelas || []).filter(p => p.status === 'PAGO' || p.status === 'PAGO PARCIAL');
    const nroRecibo = `REC-${String(pagas.length).padStart(3, '0')}/${new Date().getFullYear()}`;

    // Data formatada corretamente
    const formatarData = (dataStr: string | null) => {
      if (!dataStr) return '—';
      const d = new Date(dataStr + 'T12:00:00');
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('pt-BR');
    };

    // === CABEÇALHO GRAFITE ===
    doc.setFillColor(...grafite);
    doc.rect(0, 0, W, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('NL', 15, 22);

    doc.setDrawColor(...bronze);
    doc.setLineWidth(0.5);
    doc.line(30, 10, 30, 32);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text('ARQUITETOS', 33, 18);
    doc.setFontSize(7);
    doc.setTextColor(...bronze);
    doc.text('A ARQUITETURA COMO DECISÃO', 33, 24);

    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Contrato: ${contratoInfo?.numero || '—'}`, W - 15, 18, { align: 'right' });
    doc.text('São José dos Campos, SP', W - 15, 24, { align: 'right' });

    // === TÍTULO + NÚMERO DO RECIBO ===
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grafite);
    doc.text('RECIBO DE PAGAMENTO', 15, 58);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...cinza);
    doc.text(`Nº ${nroRecibo}`, W - 15, 58, { align: 'right' });

    doc.setDrawColor(...bronze);
    doc.setLineWidth(0.8);
    doc.line(15, 62, W - 15, 62);

    // === DADOS ===
    let y = 72;
    const col1 = 15;
    const col2 = 65;

    const addLinha = (label: string, valor: string, destaque = false) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...cinza);
      doc.text(label, col1, y);
      doc.setFont('helvetica', 'normal');
      if (destaque) {
        doc.setTextColor(...bronze);
        doc.setFontSize(11);
      } else {
        doc.setTextColor(...grafite);
        doc.setFontSize(9);
      }
      doc.text(valor, col2, y);
      y += 8;
    };

    addLinha('CLIENTE:', parcela.cliente_nome || projeto?.nome_cliente || '—');
    addLinha('REFERENTE:', parcela.descricao || '—');
    addLinha('ESCOPO:', `${projeto?.tipo || 'Arquitetura + Interiores'} · ${projeto?.area_m2 ? projeto.area_m2 + 'm²' : 'N/A'} · ${projeto?.cidade || 'SJC'}`);
    addLinha('VALOR RECEBIDO:', `R$ ${(parcela.valor_recebido || parcela.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, true);
    addLinha('DATA DE RECEBIMENTO:', formatarData(parcela.data_recebimento));
    addLinha('FORMA DE PAGAMENTO:', 'Transferência bancária / PIX');

    y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(col1, y, W - 15, y);
    y += 10;

    // === HISTÓRICO DE PAGAMENTOS ===
    const historico = (todasParcelas || []).filter(p =>
      p.status === 'PAGO' || p.status === 'PAGO PARCIAL'
    );

    if (historico.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...grafite);
      doc.text('HISTÓRICO DE PAGAMENTOS', col1, y);
      y += 6;

      historico.forEach(p => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...cinza);
        doc.text(`• ${p.descricao}`, col1, y);
        doc.setTextColor(...grafite);
        doc.text(`R$ ${Number(p.valor_recebido || p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 110, y);
        doc.text(formatarData(p.data_recebimento), 148, y);
        doc.setTextColor(80, 160, 80);
        doc.text('✓ PAGO', 178, y);
        y += 7;
      });

      y += 4;
    }

    // === VALORES EM ABERTO ===
    const emAberto = (todasParcelas || []).filter(p =>
      p.status !== 'PAGO' && p.status !== 'PAGO PARCIAL'
    );

    if (emAberto.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...grafite);
      doc.text('VALORES EM ABERTO', col1, y);
      y += 6;

      emAberto.forEach(p => {
        const dias = p.data_vencimento
          ? Math.ceil((new Date(p.data_vencimento + 'T12:00:00').getTime() - Date.now()) / 86400000)
          : null;
        const diasStr = dias !== null
          ? dias < 0 ? `ATRASADO ${Math.abs(dias)}d` : dias === 0 ? 'VENCE HOJE' : `em ${dias} dias`
          : '';
        const corDias: [number, number, number] = dias !== null && dias < 0 ? [220, 80, 80] : [100, 100, 100];

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...cinza);
        doc.text(`• ${p.descricao}`, col1, y);
        doc.setTextColor(...grafite);
        doc.text(`R$ ${Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 110, y);
        doc.text(formatarData(p.data_vencimento), 148, y);
        doc.setTextColor(...corDias);
        doc.text(diasStr, 178, y);
        y += 7;
      });

      y += 4;
    } else {
      doc.setFontSize(8);
      doc.setTextColor(80, 160, 80);
      doc.text('✓ Não há valores em aberto para este projeto.', col1, y);
      y += 10;
    }

    // === CONTRATADOS ===
    doc.setDrawColor(...bronze);
    doc.setLineWidth(0.5);
    doc.line(col1, y, W - 15, y);
    y += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grafite);
    doc.text('CONTRATADOS', col1, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...cinza);
    doc.text('Leandro Henrique da Silva  ·  CPF 425.437.568-92  ·  CAU nº 252250-0', col1, y);
    y += 6;
    doc.text('Neandro Jacque Garcia  ·  CPF 382.857.218-92  ·  CAU nº 264629-3', col1, y);
    y += 10;

    // === RODAPÉ ===
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(col1, y, W - 15, y);
    y += 6;

    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(`Recibo gerado em ${new Date().toLocaleDateString('pt-BR')} · NL Arquitetos · app.nl.arq.br`, col1, y);
    y += 5;
    doc.text('Este documento comprova o recebimento do valor acima indicado.', col1, y);

    doc.save(`Recibo_NL_${nroRecibo}_${(parcela.cliente_nome || '').replace(/\s+/g, '_')}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAGO':
      case 'PAGO PARCIAL': return '#4ade80';
      case 'ATRASADO': return '#f87171';
      case 'VENCE HOJE':
      case 'VENCE EM BREVE': return '#fbbf24';
      default: return '#555';
    }
  };

  if (loading || !projeto) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-white/40">CARREGANDO...</div>;

  return (
    <div className="flex min-h-screen bg-[#0d0d0d] text-[#e8e8e8] font-sans">
      <Sidebar user="Equipe NL" />
      <main className="flex-1 ml-[230px] p-8">
        
        {/* HEADER */}
        <header className="mb-12">
            <Button variant="ghost" onClick={() => navigate(`/projetos/detalhe/${id}`)} className="text-[#555] hover:text-white px-0 hover:bg-transparent text-xs uppercase tracking-widest mb-6">
                <ArrowLeft className="mr-2" size={14} /> Voltar ao Projeto
            </Button>
            <div className="flex items-end justify-between">
                <div className="space-y-2">
                    <h1 className="text-[32px] font-['Georgia'] text-white leading-tight">{projeto.nome_cliente}</h1>
                    <div className="flex items-center gap-4 text-[#555] font-['Arial'] text-[12px]">
                        <span className="text-[#8B7355] font-bold uppercase font-['Courier_New'] text-[10px] tracking-widest">{projeto.tipo}</span>
                        <span>{projeto.cidade}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-['Courier_New'] text-[#8B7355] text-[10px] uppercase font-bold tracking-[0.2em]">
                      FINANCEIRO DO PROJETO
                    </div>
                </div>
            </div>
        </header>

        {/* RESUMO NO TOPO */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Valor Total', value: summary.total, icon: DollarSign, color: 'text-white' },
            { label: 'Recebido', value: summary.recebido, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'Em aberto', value: summary.emAberto, icon: Clock, color: 'text-amber-500' },
            { label: 'Próximo Vencimento', value: summary.proximoVencimento ? format(parseISO(summary.proximoVencimento), 'dd/MM/yyyy') : '—', icon: Calendar, color: 'text-[#8B7355]', isCurrency: false }
          ].map((card, i) => (
            <div key={i} className="bg-[#141414] border border-white/5 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#555] font-['Arial']">{card.label}</span>
                <card.icon size={14} className="text-[#8B7355]" />
              </div>
              <div className={cn("font-['Georgia'] text-xl", card.color)}>
                {typeof card.value === 'number' ? `R$ ${card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : card.value}
              </div>
            </div>
          ))}
        </div>

        {/* TABELA DE MARCOS */}
        <div className="bg-[#141414] border border-white/5 rounded-lg overflow-hidden mb-12">
            <div className="grid grid-cols-[0.5fr_2.5fr_1.2fr_1.2fr_1fr_1.2fr] p-4 border-bottom border-white/5 text-[10px] uppercase font-bold tracking-widest text-[#555] font-['Arial'] bg-white/[0.02]">
                <div>MARCO</div>
                <div>DESCRIÇÃO</div>
                <div>VALOR</div>
                <div>VENCIMENTO</div>
                <div>STATUS</div>
                <div className="text-right">AÇÕES</div>
            </div>
            {parcelas.map((p) => (
                <div key={p.id} className="grid grid-cols-[0.5fr_2.5fr_1.2fr_1.2fr_1fr_1.2fr] p-4 items-center border-t border-white/5 hover:bg-white/[0.01] transition-colors">
                    <div className="font-['Courier_New'] text-[11px] text-[#333]">{p.numero_parcela.toString().padStart(2, '0')}</div>
                    <div className="font-['Arial'] text-[13px] text-[#ccc]">{p.descricao}</div>
                    <div className="font-['Georgia'] text-[14px] text-white">
                        R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="font-['Arial'] text-[13px] text-[#555]">
                        {format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span 
                                className="w-1.5 h-1.5 rounded-full" 
                                style={{ backgroundColor: getStatusColor(p.status) }} 
                            />
                            <span className="text-[10px] uppercase font-bold tracking-widest font-['Arial']" style={{ color: getStatusColor(p.status) }}>
                                {p.status === 'PAGO' ? '✅ PAGO' : p.status === 'PAGO PARCIAL' ? '✅ PAGO PARCIAL' : p.status === 'ATRASADO' ? '⚠️ ATRASADO' : p.status === 'VENCE HOJE' ? '⏳ HOJE' : p.status === 'VENCE EM BREVE' ? `⏳ EM ${p.dias} DIAS` : '⬜ PENDENTE'}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        {p.status !== 'PAGO' && p.status !== 'PAGO PARCIAL' && (
                            <>
                                <button 
                                    style={{
                                      fontFamily: 'Courier New',
                                      fontSize: '9px',
                                      color: '#8B7355',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.1em',
                                      background: 'transparent',
                                      border: '1px solid #8B7355',
                                      padding: '5px 10px',
                                      cursor: 'pointer',
                                      borderRadius: '3px',
                                    }}
                                    onClick={() => handleOpenConfirm(p)}
                                >
                                    PAGO
                                </button>
                                <button 
                                    style={{
                                      fontFamily: 'Courier New',
                                      fontSize: '9px',
                                      color: '#8B7355',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.1em',
                                      background: 'transparent',
                                      border: '1px solid #8B7355',
                                      padding: '5px 10px',
                                      cursor: 'pointer',
                                      borderRadius: '3px',
                                    }}
                                    onClick={() => handleCobrarWhatsApp(p)}
                                >
                                    COBRAR
                                </button>
                            </>
                        )}
                        {(p.status === 'PAGO' || p.status === 'PAGO PARCIAL') && (
                            <button 
                                style={{
                                  fontFamily: 'Courier New',
                                  fontSize: '9px',
                                  color: '#8B7355',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                  background: 'transparent',
                                  border: '1px solid #8B7355',
                                  padding: '5px 10px',
                                  cursor: 'pointer',
                                  borderRadius: '3px',
                                }}
                                onClick={() => handleGerarRecibo(p)}
                            >
                                RECIBO
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {parcelas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
            <p style={{ fontFamily: 'Arial', fontSize: '13px', marginBottom: '16px' }}>
              Nenhuma parcela cadastrada para este projeto.
            </p>
            <button
              onClick={handleImportarContrato}
              style={{ fontFamily: 'Courier New', fontSize: '9px', color: '#8B7355', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'none', border: '1px solid #8B7355', padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}
            >
              IMPORTAR DO CONTRATO
            </button>
          </div>
        )}

        {/* SEÇÃO DE HISTÓRICO */}
        <section className="mt-16">
            <h2 className="text-[#8B7355] text-[10px] uppercase tracking-[0.4em] font-bold mb-6 flex items-center gap-2">
                <TrendingUp size={14} /> Histórico de Recebimentos
            </h2>
            <div className="space-y-4">
                {parcelas.filter(p => p.status === 'PAGO' || p.status === 'PAGO PARCIAL').length === 0 ? (
                    <div className="text-[#555] text-[12px] font-['Arial'] italic">Nenhum pagamento registrado ainda.</div>
                ) : (
                    parcelas.filter(p => p.status === 'PAGO' || p.status === 'PAGO PARCIAL').map(p => (
                        <div key={p.id} className="bg-[#141414] border-l-2 border-[#4ade80] p-4 flex items-center justify-between">
                            <div>
                                <div className="text-[12px] font-['Arial'] text-white">{p.descricao}</div>
                                <div className="text-[10px] font-['Arial'] text-[#555] uppercase tracking-wider mt-1">
                                    Recebido em {p.data_recebimento ? format(parseISO(p.data_recebimento), 'dd/MM/yyyy') : 'N/A'}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[14px] font-['Georgia'] text-[#4ade80]">
                                    R$ {(p.valor_recebido || p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <Button 
                                    variant="link" 
                                    className="h-auto p-0 text-[10px] text-[#8B7355] uppercase font-bold mt-1"
                                    onClick={() => handleGerarRecibo(p)}
                                >
                                    Ver Recibo
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>

      </main>

      {/* MODAL DE CONFIRMAÇÃO DE PAGAMENTO */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="bg-[#0d0d0d] border border-white/10 text-[#e8e8e8]">
          <DialogHeader>
            <DialogTitle className="font-['Georgia']">Confirmar Recebimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-[#555]">Data do Recebimento</label>
              <Input 
                type="date" 
                value={confirmData.data}
                onChange={(e) => setConfirmData({...confirmData, data: e.target.value})}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-[#555]">Valor Recebido (R$)</label>
              <Input 
                type="number" 
                value={confirmData.valor}
                onChange={(e) => setConfirmData({...confirmData, valor: e.target.value})}
                className="bg-white/5 border-white/10"
              />
              {confirmData.valor && parseFloat(confirmData.valor.replace(/\./g, '').replace(',', '.')) < (selectedParcela?.valor || 0) && (
                <p style={{ fontFamily: 'Arial', fontSize: '11px', color: '#fbbf24', marginTop: '8px' }}>
                  Pagamento parcial — saldo de R$ {( (selectedParcela?.valor || 0) - parseFloat(confirmData.valor.replace(/\./g, '').replace(',', '.'))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} será criado como nova parcela com vencimento em 15 dias.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} className="bg-white/5 border-white/10 text-xs">Cancelar</Button>
            <Button onClick={handleConfirmPago} className="bg-[#8B7355] text-white text-xs">Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjetoFinanceiro;