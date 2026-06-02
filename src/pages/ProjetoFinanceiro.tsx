import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
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
            .eq('status', 'assinado')
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
        if (p.status === 'PAGO') return p;
        
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
    const recebido = parcelas.filter(p => p.status === 'PAGO').reduce((acc, p) => acc + (p.valor_recebido || p.valor || 0), 0);
    const emAberto = total - recebido;
    const proximoVencimento = parcelas
      .filter(p => p.status !== 'PAGO')
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
      const { error } = await supabase
        .from('financeiro_parcelas')
        .update({
          status: 'PAGO',
          data_recebimento: new Date(confirmData.data).toISOString(),
          valor_recebido: parseFloat(confirmData.valor)
        })
        .eq('id', selectedParcela.id);

      if (error) throw error;
      
      toast.success('Parcela marcada como paga!');
      setIsConfirmModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      toast.error('Erro ao atualizar parcela');
    }
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

  const generateReceipt = (parcela: Parcela) => {
    // Basic implementation using jspdf as seen in other parts of the app
    const jspdf = (window as any).jspdf;
    if (!jspdf) {
      toast.error('Biblioteca de PDF não carregada');
      return;
    }
    
    const doc = new jspdf.jsPDF();
    const dataRec = parcela.data_recebimento ? format(parseISO(parcela.data_recebimento), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');
    const valor = (parcela.valor_recebido || parcela.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(58, 58, 58);
    doc.text("NL ARQUITETOS", 105, 30, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(139, 115, 85);
    doc.text("RECIBO DE PAGAMENTO", 105, 38, { align: "center" });
    
    // Content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    let y = 60;
    const leftX = 20;
    
    doc.text(`Cliente: ${projeto?.nome_cliente}`, leftX, y); y += 10;
    doc.text(`Contrato: ${contrato?.numero || 'N/A'}`, leftX, y); y += 10;
    doc.text(`Referente a: ${parcela.descricao}`, leftX, y); y += 10;
    doc.text(`Parcela: ${parcela.numero_parcela}/${parcela.total_parcelas}`, leftX, y); y += 10;
    
    doc.setFont("helvetica", "bold");
    doc.text(`Valor: R$ ${valor}`, leftX, y); y += 10;
    doc.text(`Data de recebimento: ${dataRec}`, leftX, y); y += 30;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Recibo gerado por NL Arquitetos", 105, y, { align: "center" });
    
    doc.save(`Recibo_${projeto?.nome_cliente.replace(/\s+/g, '_')}_M${parcela.numero_parcela}.pdf`);
    toast.success('Recibo gerado!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAGO': return '#4ade80';
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
                                {p.status === 'PAGO' ? '✅ PAGO' : p.status === 'ATRASADO' ? '⚠️ ATRASADO' : p.status === 'VENCE HOJE' ? '⏳ HOJE' : p.status === 'VENCE EM BREVE' ? `⏳ EM ${p.dias} DIAS` : '⬜ PENDENTE'}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        {p.status !== 'PAGO' && (
                            <>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-[9px] uppercase font-bold border-white/10 hover:bg-[#8B7355] hover:text-white"
                                    onClick={() => handleOpenConfirm(p)}
                                >
                                    PAGO
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 text-[#8B7355] hover:text-[#8B7355] hover:bg-[#8B7355]/10 p-2"
                                    onClick={() => handleCobrarWhatsApp(p)}
                                >
                                    <MessageCircle size={14} />
                                </Button>
                            </>
                        )}
                        {p.status === 'PAGO' && (
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 text-[#8B7355] hover:text-[#8B7355] hover:bg-[#8B7355]/10 p-2"
                                onClick={() => generateReceipt(p)}
                            >
                                <Receipt size={14} className="mr-1" />
                                <span className="text-[9px] uppercase font-bold">Recibo</span>
                            </Button>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* SEÇÃO DE HISTÓRICO */}
        <section className="mt-16">
            <h2 className="text-[#8B7355] text-[10px] uppercase tracking-[0.4em] font-bold mb-6 flex items-center gap-2">
                <TrendingUp size={14} /> Histórico de Recebimentos
            </h2>
            <div className="space-y-4">
                {parcelas.filter(p => p.status === 'PAGO').length === 0 ? (
                    <div className="text-[#555] text-[12px] font-['Arial'] italic">Nenhum pagamento registrado ainda.</div>
                ) : (
                    parcelas.filter(p => p.status === 'PAGO').map(p => (
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
                                    onClick={() => generateReceipt(p)}
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