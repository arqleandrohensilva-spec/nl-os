import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Monitor, 
  X, 
  Check, 
  Clock, 
  ChevronRight,
  AlertCircle,
  Send,
  FileText,
  UserCheck,
  Calendar
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Projeto {
  id: string;
  nome: string;
  nome_cliente: string;
  tipo: string;
  cidade: string;
  area_m2: number;
  etapa_atual: string;
  status_geral: string;
  token_cliente?: string;
}

interface Etapa {
  id: string;
  etapa: string;
  status: string;
  data_inicio: string;
  data_entrega: string;
  data_aprovacao?: string;
  aprovado_por?: string;
  notas?: string;
}

interface ChecklistItem {
  id: string;
  etapa: string;
  item: string;
  concluido: boolean;
}

interface TimelineEvent {
  id: string;
  data: string;
  titulo: string;
  tipo: 'etapa' | 'documento' | 'aprovacao' | 'previsto';
  concluido: boolean;
}

const ETAPAS_ORDER = ['BRIEFING', 'CONCEITO', 'ESTUDO', 'EXECUTIVO', 'DETALHAMENTO', 'ACOMPANHAMENTO'];

const ModoApresentacao = () => {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // State for approval modal
  const [approvalModal, setApprovalModal] = useState<{ open: boolean; etapa: Etapa | null }>({ open: false, etapa: null });
  const [aprovadorNome, setAprovadorNome] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let query = supabase.from('projetos').select('*');
      
      if (token) {
        query = query.eq('token_cliente', token);
      } else {
        query = query.eq('id', id);
      }

      const { data: pData, error: pError } = await query.maybeSingle();
      
      if (pError || !pData) {
        setProjeto(null);
        setLoading(false);
        return;
      }
      
      setProjeto(pData);
      const projetoId = pData.id;

      // Fetch stages
      const { data: eData } = await supabase.from('projeto_etapas').select('*').eq('projeto_id', projetoId);
      if (eData) setEtapas(eData);

      // Fetch checklist
      const { data: cData } = await supabase.from('projeto_checklist').select('*').eq('projeto_id', projetoId);
      if (cData) setChecklist(cData);

      // Fetch documents for timeline
      const { data: docData } = await supabase.from('documentos').select('*').eq('projeto_id', projetoId);
      
      // Fetch approvals for timeline
      const { data: apData } = await supabase.from('aprovacoes').select('*').eq('projeto_id', projetoId);

      // Build timeline
      const events: TimelineEvent[] = [];
      
      // Stage changes / completions
      eData?.forEach(e => {
        if (e.status === 'Aprovado' && e.data_aprovacao) {
          events.push({
            id: `etapa-${e.id}`,
            data: e.data_aprovacao,
            titulo: `${e.etapa} finalizado`,
            tipo: 'etapa',
            concluido: true
          });
        } else if (e.status !== 'Aprovado' && e.data_entrega) {
          events.push({
            id: `etapa-prev-${e.id}`,
            data: e.data_entrega,
            titulo: `${e.etapa} — previsto`,
            tipo: 'previsto',
            concluido: false
          });
        }
      });

      // Documents
      docData?.forEach(d => {
        events.push({
          id: `doc-${d.id}`,
          data: d.criado_em,
          titulo: `Documento enviado: ${d.nome}`,
          tipo: 'documento',
          concluido: true
        });
      });

      // Approvals
      apData?.forEach(a => {
        events.push({
          id: `ap-${a.id}`,
          data: a.data,
          titulo: `${a.etapa} aprovado por ${a.nome_aprovador}`,
          tipo: 'aprovacao',
          concluido: true
        });
      });

      // Sort events by date
      events.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setTimelineEvents(events);

    } catch (error) {
      console.error('Error fetching data for presentation mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !projeto) return;
    
    try {
      setSendingMessage(true);
      const { error } = await supabase.from('mensagens_cliente').insert({
        projeto_id: projeto.id,
        token_cliente: projeto.token_cliente,
        mensagem: message
      });

      if (error) throw error;

      // Create notification
      await supabase.from('notificacoes').insert({
        titulo: 'Nova mensagem do cliente',
        descricao: `Mensagem de ${projeto.nome_cliente} para o projeto ${projeto.tipo}`,
        modulo: 'Gestão de Projetos',
        tipo: 'projeto'
      });

      toast.success("Mensagem enviada. A NL retornará em breve.");
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleConfirmApproval = async () => {
    if (!aprovadorNome.trim() || !approvalModal.etapa || !projeto) return;

    try {
      setIsApproving(true);
      
      // Get IP Address
      let ip = '0.0.0.0';
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ip = data.ip;
      } catch (e) {
        console.warn("Could not get IP address", e);
      }

      // Save formal approval
      const { error: apError } = await supabase.from('aprovacoes').insert({
        projeto_id: projeto.id,
        etapa: approvalModal.etapa.etapa,
        nome_aprovador: aprovadorNome,
        ip_address: ip,
        token_cliente: projeto.token_cliente
      });

      if (apError) throw apError;

      // Update stage status
      const { error: stError } = await supabase
        .from('projeto_etapas')
        .update({ 
          status: 'Aprovado',
          data_aprovacao: new Date().toISOString(),
          aprovado_por: aprovadorNome
        })
        .eq('id', approvalModal.etapa.id);

      if (stError) throw stError;

      // Create notification
      await supabase.from('notificacoes').insert({
        titulo: 'Etapa Aprovada',
        descricao: `✅ ${aprovadorNome} aprovou ${approvalModal.etapa.etapa} — ${format(new Date(), 'dd/MM')}`,
        modulo: 'Gestão de Projetos',
        tipo: 'projeto'
      });

      toast.success("Aprovação registrada com sucesso.");
      setApprovalModal({ open: false, etapa: null });
      setAprovadorNome('');
      fetchData();
    } catch (error) {
      console.error('Error recording approval:', error);
      toast.error('Erro ao registrar aprovação');
    } finally {
      setIsApproving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white/40 font-mono">PREPARANDO APRESENTAÇÃO...</div>;
  }

  if (!projeto) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white/40 font-mono p-8 text-center">
        <AlertCircle size={48} className="mb-6 opacity-20" />
        <h2 className="text-2xl font-cormorant italic text-white mb-2">ACESSO NÃO AUTORIZADO</h2>
        <p className="text-sm max-w-md">O link de apresentação expirou ou é inválido. Por favor, solicite um novo link ao seu arquiteto.</p>
        {!token && (
          <Button onClick={() => navigate('/projetos/gestao')} variant="ghost" className="mt-8 text-xs uppercase tracking-widest text-white/20 hover:text-white">
            VOLTAR AO PAINEL
          </Button>
        )}
      </div>
    );
  }

  const etapaAtualData = etapas.find(e => e.etapa.toUpperCase() === projeto.etapa_atual.toUpperCase());
  
  const daysRemaining = etapaAtualData?.data_entrega 
    ? differenceInDays(parseISO(etapaAtualData.data_entrega), new Date()) 
    : null;

  const entregues = etapas.filter(e => e.status === 'Aprovado');
  const proximas = etapas.filter(e => e.status !== 'Aprovado');

  const getStatusColor = (days: number | null) => {
    if (days === null) return "text-white/60";
    if (days > 7) return "text-emerald-500";
    if (days >= 3) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-inter p-12 md:p-20 flex flex-col gap-20 select-none overflow-x-hidden">
      {/* HEADER */}
      <header className="flex justify-between items-center w-full">
        <div className="text-2xl font-cormorant font-light tracking-widest italic text-white/80">
          NL ARQUITETOS
        </div>
        {!token && (
          <button 
            onClick={() => navigate(-1)}
            className="bg-white/5 border border-white/10 px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all rounded-none"
          >
            SAIR
          </button>
        )}
      </header>

      {/* BLOCO 1 - CABEÇALHO */}
      <section className="space-y-4">
        <p className="text-bronze text-sm uppercase tracking-[0.4em] font-bold">PROJETO</p>
        <h1 className="text-6xl md:text-8xl font-cormorant font-light italic leading-tight">{projeto.nome_cliente}</h1>
        <div className="flex flex-wrap gap-4 text-white/40 text-xl font-light">
          <span>{projeto.tipo}</span>
          <span>·</span>
          <span>{projeto.cidade}</span>
          <span>·</span>
          <span>{projeto.area_m2}m²</span>
        </div>
      </section>

      {/* BLOCO 2 - LINHA DO TEMPO */}
      <section className="space-y-12">
        <p className="text-bronze text-sm uppercase tracking-[0.4em] font-bold">JORNADA DO PROJETO</p>
        <div className="relative pt-8 overflow-x-auto">
          <div className="absolute top-[45px] left-0 w-full h-[1px] bg-white/5 min-w-[800px]" />
          <div className="relative flex justify-between min-w-[800px]">
            {ETAPAS_ORDER.map((etapaNome) => {
              const etapaData = etapas.find(e => e.etapa.toUpperCase() === etapaNome);
              const isCurrent = projeto.etapa_atual.toUpperCase() === etapaNome;
              const isDone = etapaData?.status === 'Aprovado';
              
              return (
                <div key={etapaNome} className="flex flex-col items-center gap-6 flex-1 text-center">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 z-10 transition-all duration-1000",
                    isDone ? "bg-bronze border-bronze" : 
                    isCurrent ? "bg-bronze/20 border-bronze animate-pulse shadow-[0_0_15px_rgba(139,115,85,0.4)]" : 
                    "bg-[#0A0A0A] border-white/20"
                  )}>
                    {isCurrent && <div className="w-full h-full rounded-full bg-bronze scale-50" />}
                  </div>
                  <div className="space-y-2">
                    <p className={cn(
                      "text-sm font-bold tracking-widest uppercase",
                      isCurrent ? "text-bronze" : isDone ? "text-white/80" : "text-white/20"
                    )}>
                      {etapaNome}
                    </p>
                    <p className="text-[10px] text-white/40 font-medium">
                      {isDone && etapaData?.data_aprovacao 
                        ? format(parseISO(etapaData.data_aprovacao), 'dd/MM/yyyy')
                        : etapaData?.data_entrega 
                          ? format(parseISO(etapaData.data_entrega), 'dd/MM/yyyy')
                          : <span className="text-white/30 italic">A definir</span>
                      }
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* NOVO BLOCO - HISTÓRICO REAL */}
      <section className="space-y-12">
        <p className="text-bronze text-sm uppercase tracking-[0.4em] font-bold">HISTÓRICO DO PROJETO</p>
        <div className="relative space-y-8 pl-8 border-l border-white/5 max-w-2xl">
          {timelineEvents.map((event, idx) => (
            <div key={event.id} className="relative group">
              <div className={cn(
                "absolute -left-[37px] top-1.5 w-4 h-4 rounded-full border-2 transition-all duration-500",
                event.concluido ? "bg-bronze border-bronze" : "bg-[#0A0A0A] border-white/20"
              )} />
              <div className="space-y-1">
                <p className={cn(
                  "text-[10px] font-bold tracking-widest uppercase",
                  event.concluido ? "text-white/40" : "text-white/20"
                )}>
                  {format(parseISO(event.data), 'dd/MM/yyyy')}
                  {event.tipo === 'previsto' && " · PREVISTO"}
                </p>
                <p className={cn(
                  "text-lg font-light",
                  event.concluido ? "text-white" : "text-white/30 italic"
                )}>
                  {event.titulo}
                </p>
              </div>
            </div>
          ))}
          {timelineEvents.length === 0 && (
            <p className="text-white/20 italic">Aguardando os primeiros marcos do projeto.</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        <div className="space-y-20">
          {/* BLOCO 3 - ETAPA ATUAL */}
          <section className="bg-white/[0.02] border border-bronze/30 p-12 space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Clock size={80} />
            </div>
            <div className="space-y-2">
              <p className="text-bronze text-[10px] uppercase tracking-[0.4em] font-bold">ETAPA ATUAL</p>
              <h2 className="text-4xl font-cormorant italic font-light uppercase tracking-tight">{projeto.etapa_atual}</h2>
            </div>
            
            <div className="h-[1px] w-full bg-bronze/20" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
              <div className="space-y-2">
                <p className="text-white/20 text-[10px] uppercase tracking-widest font-bold">Início</p>
                <p className="text-xl font-light">
                  {etapaAtualData?.data_inicio ? format(parseISO(etapaAtualData.data_inicio), 'dd/MM/yyyy') : <span className="text-white/30 italic">A definir</span>}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-white/20 text-[10px] uppercase tracking-widest font-bold">Próxima Entrega</p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <p className="text-xl font-light">
                    {etapaAtualData?.data_entrega ? format(parseISO(etapaAtualData.data_entrega), 'dd/MM/yyyy') : <span className="text-white/30 italic">A definir</span>}
                  </p>
                  {daysRemaining !== null && (
                    <span className={cn("text-xs font-bold uppercase tracking-widest", getStatusColor(daysRemaining))}>
                      {daysRemaining === 0 ? "Hoje" : daysRemaining < 0 ? "Em atraso" : `${daysRemaining} dias restantes`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* BLOCO 4 - ENTREGAS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <p className="text-bronze text-sm uppercase tracking-[0.4em] font-bold">JÁ ENTREGUE</p>
              <ul className="space-y-6">
                {entregues.map(e => (
                  <li key={e.id} className="flex items-center gap-4 text-white/80 text-lg">
                    <Check size={20} className="text-bronze" />
                    <span>{e.etapa} completo</span>
                  </li>
                ))}
                {entregues.length === 0 && (
                  <li className="text-white/20 italic">Iniciando jornada...</li>
                )}
              </ul>
            </div>
            <div className="space-y-8">
              <p className="text-bronze text-sm uppercase tracking-[0.4em] font-bold">PRÓXIMAS ENTREGAS</p>
              <ul className="space-y-6">
                {proximas.slice(0, 3).map(e => (
                  <li key={e.id} className="flex items-center gap-4 text-white/40 text-lg">
                    <div className="w-5 h-5 rounded-full border border-white/10" />
                    <div className="flex flex-col">
                      <span>{e.etapa}</span>
                      <span className="text-xs">{e.data_entrega ? format(parseISO(e.data_entrega), 'dd/MM') : <span className="text-white/30 italic">A definir</span>}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* BLOCO 5 - APROVAÇÕES PENDENTES */}
        <section className="space-y-12">
          <p className="text-bronze text-sm uppercase tracking-[0.4em] font-bold">APROVAÇÕES PENDENTES</p>
          
          {etapas.filter(e => e.status === 'Aguardando aprovação' || e.status === 'Aprovado').length > 0 ? (
            <div className="space-y-8">
              {etapas.filter(e => e.status === 'Aguardando aprovação' || e.status === 'Aprovado').map(e => (
                <div key={e.id} className={cn(
                  "bg-white/[0.03] border p-12 space-y-10 transition-all duration-500",
                  e.status === 'Aguardando aprovação' ? "border-bronze animate-pulse-subtle" : "border-white/10 opacity-60"
                )}>
                  <div className={cn(
                    "flex items-center gap-4 uppercase tracking-[0.3em] font-bold text-sm",
                    e.status === 'Aprovado' ? "text-emerald-500" : "text-bronze"
                  )}>
                    {e.status === 'Aprovado' ? <Check size={18} /> : <Clock size={18} />} 
                    {e.status === 'Aprovado' ? 'APROVADO FORMALMENTE' : 'AGUARDANDO SUA APROVAÇÃO'}
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-4xl font-cormorant italic font-light uppercase tracking-tight">{e.etapa}</h3>
                    <p className="text-white/40 text-sm">
                      {e.status === 'Aprovado' 
                        ? `Aprovado por ${e.aprovado_por} em ${e.data_aprovacao ? format(parseISO(e.data_aprovacao), 'dd/MM/yyyy') : ''}`
                        : `Enviado em ${e.data_entrega ? format(parseISO(e.data_entrega), 'dd/MM/yyyy') : 'A definir'}`}
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6">
                    <Button 
                      disabled={e.status === 'Aprovado'}
                      onClick={() => setApprovalModal({ open: true, etapa: e })}
                      className={cn(
                        "flex-1 rounded-none h-16 text-xs uppercase font-bold tracking-[0.3em] transition-all",
                        e.status === 'Aprovado' 
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                          : "bg-bronze hover:bg-bronze/80 text-white"
                      )}
                    >
                      {e.status === 'Aprovado' ? '✅ APROVADO' : 'APROVAR'}
                    </Button>
                    {e.status !== 'Aprovado' && (
                      <Button 
                        onClick={async () => {
                          const { error } = await supabase
                            .from('projeto_etapas')
                            .update({ status: 'Ajuste Solicitado' })
                            .eq('id', e.id);
                          
                          if (!error) {
                            toast.success("Solicitação de ajuste enviada para a NL.");
                            fetchData();
                          }
                        }}
                        variant="ghost"
                        className="flex-1 border border-white/10 hover:bg-white/5 text-white/60 hover:text-white rounded-none h-16 text-xs uppercase font-bold tracking-[0.3em] transition-all"
                      >
                        SOLICITAR AJUSTE
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border border-dashed border-white/5 p-20 text-center">
              <p className="text-white/20 italic text-xl">Não há aprovações pendentes no momento.</p>
            </div>
          )}
        </section>
      </div>

      {/* MENSAGEM DIRETA PARA A NL */}
      <section className="mt-20 bg-white/[0.02] border border-white/5 p-12 max-w-2xl mx-auto w-full">
        <p className="text-bronze text-[10px] uppercase tracking-[0.4em] font-bold mb-6">ENVIAR MENSAGEM PARA A NL</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Dúvida, observação ou aprovação..."
            className="bg-white/5 border-white/10 rounded-none h-14 text-white focus:border-bronze focus:ring-0 transition-all flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={sendingMessage || !message.trim()}
            className="bg-bronze hover:bg-bronze/80 text-white rounded-none h-14 px-8 text-[10px] uppercase font-bold tracking-widest transition-all"
          >
            {sendingMessage ? 'ENVIANDO...' : 'ENVIAR'}
          </Button>
        </div>
      </section>

      {/* FOOTER DISCRETO */}
      <footer className="mt-auto pt-20 border-t border-white/5 flex justify-center items-center gap-4 text-xs text-white/20 uppercase tracking-widest font-bold">
        <span>PATRIMÔNIO EM EVOLUÇÃO</span>
        <span>·</span>
        <span>MODO APRESENTAÇÃO ATIVO</span>
      </footer>

      {/* APPROVAL MODAL */}
      <Dialog open={approvalModal.open} onOpenChange={(open) => !open && setApprovalModal({ open: false, etapa: null })}>
        <DialogContent className="bg-[#0A0A0A] border border-bronze p-12 max-w-xl text-white rounded-none">
          <DialogHeader className="space-y-6">
            <DialogTitle className="text-3xl font-cormorant italic font-light uppercase tracking-tight text-center">
              Confirmação de Aprovação
            </DialogTitle>
            <DialogDescription className="text-center text-white/60 font-inter text-sm">
              Ao confirmar, você aprova formalmente a etapa:<br/>
              <span className="text-bronze font-bold text-lg uppercase tracking-widest mt-2 block">
                {approvalModal.etapa?.etapa}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-8">
            <div className="space-y-2">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Nome Completo</p>
              <Input 
                value={aprovadorNome}
                onChange={(e) => setAprovadorNome(e.target.value)}
                placeholder="Seu nome completo para assinatura digital..."
                className="bg-white/5 border-white/10 rounded-none h-14 text-white focus:border-bronze focus:ring-0 transition-all"
              />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Data da Aprovação</p>
              <div className="bg-white/5 border border-white/10 h-14 flex items-center px-4 text-white/60">
                {format(new Date(), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-4">
            <Button 
              onClick={handleConfirmApproval}
              disabled={isApproving || !aprovadorNome.trim()}
              className="w-full bg-bronze hover:bg-bronze/80 text-white rounded-none h-16 text-xs uppercase font-bold tracking-[0.3em] transition-all"
            >
              {isApproving ? 'PROCESSANDO...' : 'CONFIRMAR APROVAÇÃO'}
            </Button>
            <Button 
              onClick={() => setApprovalModal({ open: false, etapa: null })}
              variant="ghost"
              className="w-full text-white/20 hover:text-white hover:bg-white/5 rounded-none text-[10px] uppercase tracking-widest font-bold h-12"
            >
              CANCELAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModoApresentacao;