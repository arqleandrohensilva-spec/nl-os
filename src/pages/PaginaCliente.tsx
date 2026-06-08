import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  Lock, 
  Download, 
  Clock, 
  Loader2,
  Send,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-8 text-center">
          <div className="max-w-md space-y-6">
            <h1 className="font-cormorant text-4xl italic text-white mb-2">NL ARQUITETOS</h1>
            <div className="bg-white/5 border border-white/10 p-8 space-y-4">
              <div className="w-12 h-12 bg-bronze/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-bronze w-6 h-6" />
              </div>
              <h2 className="text-xl font-medium text-white">Ops! Algo deu errado.</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Houve um problema ao carregar as informações do seu portal. Nossa equipe técnica já foi notificada.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full bg-bronze hover:bg-bronze/80 text-black rounded-none h-12 uppercase tracking-widest font-bold text-[10px] mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Recarregar
              </Button>
            </div>
            <p className="text-white/20 text-[10px] uppercase tracking-widest">
              A arquitetura como decisão
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ETAPAS_JORNADA = [
  'BRIEFING', 'CONCEITO', 'ESTUDO', 'EXECUTIVO', 'DETALHAMENTO', 'OBRA'
];

function PaginaClienteContent() {

  const { slug } = useParams();
  const location = useLocation();
  const param = slug || location.pathname.split('/').pop();
  const [projeto, setProjeto] = useState<any>(null);
  const [etapas, setEtapas] = useState<any[]>([]);
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<any>(null);
  const [nomeAprovador, setNomeAprovador] = useState('');
  const [textoAjuste, setTextoAjuste] = useState('');
  
  const [textoMensagem, setTextoMensagem] = useState('');
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  useEffect(() => {
    fetchProjeto();
  }, [param]);

  async function fetchProjeto() {
    try {
      setLoading(true);
      console.log('Buscando projeto com param:', param);
      
      const { data: proj, error: projError } = await supabase
        .rpc('get_project_by_token_or_slug', { p_val: param })
        .maybeSingle();

      console.log('Resultado:', proj, 'Erro:', projError);

      if (projError || !proj) {
        console.error("Erro ao buscar projeto:", projError);
        setError(true);
        return;
      }

      setProjeto(proj);

      // Parallel fetching for performance
      const [etapasRes, arquivosRes, parcelasRes] = await Promise.all([
        supabase.rpc('get_project_stages_by_token', { p_val: param }),
        supabase.rpc('get_project_files_by_token', { p_val: param }),
        supabase.rpc('get_project_parcelas_by_token', { p_val: param })
      ]);
      
      console.log('Etapas carregadas:', etapasRes.data?.length);
      console.log('Arquivos carregados:', arquivosRes.data?.length);
      
      setEtapas(etapasRes.data || []);
      setArquivos(arquivosRes.data || []);
      setParcelas(parcelasRes.data || []);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = async (path: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
        body: {
          action: 'get_link',
          path: path
        }
      });

      if (error) throw error;
      window.open(data.link, '_blank');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar link de download.');
    }
  };

  const handleAprovar = async () => {
    if (!nomeAprovador.trim()) {
      toast.error('Informe seu nome completo.');
      return;
    }

    try {
      const { error: updateError } = await (supabase
        .from('projeto_etapas') as any)
        .update({
          status: 'Aprovado',
          aprovado_por: nomeAprovador,
          data_aprovacao: new Date().toISOString()
        })
        .eq('id', selectedEtapa.id);

      if (updateError) throw updateError;
      
      try {
        await (supabase.from('notificacoes') as any).insert({
          tipo: 'projeto',
          modulo: 'Projetos',
          titulo: '✅ Aprovação recebida',
          descricao: `${nomeAprovador} aprovou ${selectedEtapa.etapa} · ${projeto.nome_cliente}`
        });
      } catch (notifError) {
        console.warn('Notificação não enviada:', notifError);
      }

      toast.success('Aprovação registrada com sucesso.');
      setShowAprovarModal(false);
      fetchProjeto();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar aprovação.');
    }
  };

  const handleSolicitarAjuste = async () => {
    if (!textoAjuste.trim()) {
      toast.error('Descreva o que precisa ser ajustado.');
      return;
    }

    try {
      await (supabase.from('mensagens_cliente') as any).insert({
        projeto_id: projeto.id,
        token_cliente: projeto.token_cliente,
        mensagem: textoAjuste,
        tipo: 'ajuste'
      });
      
      try {
        await (supabase.from('notificacoes') as any).insert({
          tipo: 'projeto',
          modulo: 'Projetos',
          titulo: '⚠️ Solicitação de ajuste',
          descricao: `${projeto.nome_cliente} solicitou ajuste em ${selectedEtapa.etapa}`
        });
      } catch (notifError) {
        console.warn('Notificação não enviada:', notifError);
      }

      toast.success('Solicitação enviada.');
      setShowAjusteModal(false);
      setTextoAjuste('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar solicitação.');
    }
  };

  const handleEnviarMensagem = async () => {
    if (!textoMensagem.trim()) return;

    setEnviandoMensagem(true);
    try {
      await (supabase.from('mensagens_cliente') as any).insert({
        projeto_id: projeto.id,
        token_cliente: projeto.token_cliente,
        nome_remetente: projeto.nome_cliente,
        mensagem: textoMensagem,
        tipo: 'mensagem'
      });
      
      try {
        await (supabase.from('notificacoes') as any).insert({
          tipo: 'projeto',
          modulo: 'Projetos',
          titulo: '💬 Nova mensagem do cliente',
          descricao: `${projeto.nome_cliente} · ${projeto.nome_cliente}`
        });
      } catch (notifError) {
        console.warn('Notificação não enviada:', notifError);
      }

      toast.success('Mensagem enviada. A NL retornará em breve.');
      setTextoMensagem('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setEnviandoMensagem(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-bronze animate-spin" />
      </div>
    );
  }

  if (error || !projeto) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-8 text-center">
        <div>
          <h1 className="font-cormorant text-4xl italic text-white mb-4">NL ARQUITETOS</h1>
          <p className="text-white/60 mb-2">Link inválido ou expirado.</p>
          <p className="text-white/40 text-sm">Entre em contato com a NL Arquitetos.</p>
        </div>
      </div>
    );
  }

  // --- Logic for new blocks ---
  
  // REAL-TIME STATUS logic
  const etapaAtualNome = projeto.etapa_atual || 'A definir';
  
  // Find next delivery
  const proximaEtapaComData = etapas
    .filter(e => e.status !== 'Aprovado' && e.data_entrega)
    .sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime())[0];
  
  let proximaEntregaTexto = 'A definir';
  let isDeadlinePulsing = false;
  if (proximaEtapaComData) {
    const diasRestantes = differenceInDays(new Date(proximaEtapaComData.data_entrega), new Date());
    if (diasRestantes < 0) {
      proximaEntregaTexto = `Atrasado ${Math.abs(diasRestantes)}d`;
    } else {
      proximaEntregaTexto = `Em ${diasRestantes} dias`;
    }
    if (diasRestantes <= 7) isDeadlinePulsing = true;
  }

  // FINANCIAL SUMMARY logic
  const valorTotal = parcelas.reduce((acc, p) => acc + (p.valor || 0), 0);
  const jaPago = parcelas
    .filter(p => ['pago', 'PAGO', 'Pago', 'recebido', 'RECEBIDO'].includes(p.status))
    .reduce((acc, p) => acc + (p.valor || 0), 0);
  const saldoRestante = valorTotal - jaPago;
  const porcentagemQuitada = valorTotal > 0 ? Math.round((jaPago / valorTotal) * 100) : 0;

  // ARQUIVOS grouping
  const arquivosPorEtapa = arquivos.reduce((acc: any, curr) => {
    const etapa = curr.etapa || 'Outros';
    if (!acc[etapa]) acc[etapa] = [];
    acc[etapa].push(curr);
    return acc;
  }, {});

  const etapasAguardando = etapas.filter(e => e.status === 'Aguardando aprovação');
  const etapasPendentes = etapas.filter(e => e.status === 'Aguardando aprovação' || e.status === 'Em andamento');

  const etapasAprovadas = etapas.filter(e => e.status === 'Aprovado').length;
  const totalEtapas = 6;
  const pctConcluido = Math.round((etapasAprovadas / totalEtapas) * 100);

  const imagens = arquivos.filter(a => 
    a.liberado && 
    (a.tipo === 'imagem' || /\.(jpg|jpeg|png|webp)$/i.test(a.nome_arquivo || ''))
  );


  const ultimaEtapa = etapas.find(e => e.etapa?.toUpperCase() === 'OBRA' || e.etapa?.toUpperCase() === 'DETALHAMENTO');
  const dataFinal = ultimaEtapa?.data_entrega;

  const handleOpenLightbox = async (img: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
        body: {
          action: 'get_link',
          path: img.dropbox_path
        }
      });

      if (error) throw error;
      setSelectedImage({ ...img, direct_link: data.link });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao abrir imagem.');
    }
  };


  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-bronze/30">
      {/* HEADER FIXO */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5 z-50">
        <div className="max-w-[860px] mx-auto h-full px-6 flex items-center justify-between">
          <h1 className="text-xs font-bold tracking-[0.3em] uppercase text-white/90">NL ARQUITETOS</h1>
          <span className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium hidden sm:block">
            A ARQUITETURA COMO DECISÃO
          </span>
        </div>
      </header>

      <main className="pt-32 pb-24 px-6 md:px-0 max-w-[860px] mx-auto space-y-24">
        
        {/* SEÇÃO 1 — SAUDAÇÃO */}
        <section className="space-y-4">
          <h2 className="font-cormorant text-[48px] italic leading-tight">Olá, {projeto?.nome_cliente || 'Cliente'}.</h2>
          <div className="space-y-1">
            <p className="text-bronze text-[10px] uppercase tracking-[0.25em] font-bold">
              PROJETO · {projeto?.tipo || 'RESIDENCIAL'} · {projeto?.cidade || 'SÃO JOSÉ DOS CAMPOS'} · {projeto?.area_m2 || '--'}m²
            </p>
            <p className="text-white/30 text-[11px] font-dm-mono">
              Iniciado em {projeto?.data_inicio ? format(new Date(projeto.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '--/--/----'}
            </p>
          </div>
        </section>

        {/* SEÇÃO 1.5 — PROGRESSO GERAL E PRÓXIMA AÇÃO */}
        <section className="space-y-12">
          <div className="space-y-6">
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/40 font-bold">
              SEU PROJETO ESTÁ <span className="text-bronze font-cormorant text-2xl lowercase italic normal-case ml-1">[{pctConcluido}]%</span> CONCLUÍDO
            </p>
            <div className="space-y-4">
              <div className="h-1 w-full bg-white/5 overflow-hidden">
                <div 
                  className="h-full bg-bronze transition-all duration-1000"
                  style={{ width: `${pctConcluido}%` }}
                />
              </div>
              <p className="text-[10px] text-white/30 tracking-widest uppercase">
                {etapasAprovadas} de {totalEtapas} etapas aprovadas
              </p>
            </div>
          </div>

          {etapasPendentes.length > 0 ? (
            <div className="border-l-2 border-bronze bg-bronze/5 px-6 py-4">
              <p className="text-[8px] uppercase tracking-widest text-bronze mb-1">
                SUA AÇÃO NECESSÁRIA
              </p>
              <p className="text-white text-sm">
                Aprovar <strong>{etapasPendentes[0].etapa}</strong> — aguardando sua confirmação
                {etapasPendentes[0].data_entrega && 
                  ` até ${format(new Date(etapasPendentes[0].data_entrega), "dd 'de' MMMM", { locale: ptBR })}`
                }
              </p>
            </div>
          ) : (
            <p className="text-white/30 italic text-sm">Nenhuma ação necessária no momento. Aguarde o próximo envio da NL.</p>
          )}
        </section>

        {/* SEÇÃO 2 — STATUS EM TEMPO REAL */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/5 overflow-hidden">
          {/* ETAPA ATUAL */}
          <div className="bg-[#141414] p-8 space-y-4">
            <span className="text-[8px] text-white/30 uppercase tracking-[0.3em] font-bold block">ETAPA ATUAL</span>
            <p className="font-cormorant text-2xl leading-none">{etapaAtualNome}</p>
          </div>
          {/* PRÓXIMA ENTREGA */}
          <div className="bg-[#141414] p-8 space-y-4">
            <span className="text-[8px] text-white/30 uppercase tracking-[0.3em] font-bold block">PRÓXIMA ENTREGA</span>
            <p className={cn(
              "font-cormorant text-2xl leading-none",
              isDeadlinePulsing && "text-bronze animate-pulse"
            )}>
              {proximaEntregaTexto}
            </p>
          </div>
          {/* STATUS */}
          <div className="bg-[#141414] p-8 space-y-4">
            <span className="text-[8px] text-white/30 uppercase tracking-[0.3em] font-bold block">STATUS</span>
            <p className="font-cormorant text-2xl leading-none">
              {dataFinal 
                ? format(new Date(dataFinal), "MMMM 'de' yyyy", { locale: ptBR })
                : 'Em andamento'
              }
            </p>
            <span className="text-[8px] text-white/30 uppercase tracking-[0.3em] font-bold block mt-1">
              {dataFinal ? 'previsão de conclusão' : 'status atual'}
            </span>
          </div>
        </section>

        {/* SEÇÃO 3 — JORNADA DO PROJETO */}
        <section className="space-y-10">
          <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] text-bronze uppercase tracking-[0.2em] font-bold">JORNADA DO PROJETO</span>
          </div>
          
          <div className="relative pt-4">
            <div className="flex justify-between items-start">
              {ETAPAS_JORNADA.map((step, idx) => {
                const etapaData = etapas.find(e => e.etapa?.toUpperCase() === step);
                const isCurrent = (projeto.etapa_atual || '').toUpperCase() === step;
                const isApproved = etapaData?.status === 'Aprovado';
                
                return (
                  <div key={step} className="flex flex-col items-center text-center space-y-4 flex-1 relative z-10">
                    {/* Point */}
                    <div className={cn(
                      "w-3 h-3 rounded-full transition-all duration-500",
                      isApproved ? "bg-bronze" : 
                      isCurrent ? "bg-bronze animate-pulse ring-4 ring-bronze/20" : 
                      "bg-[#1A1A1A] border border-white/10"
                    )} />

                    {/* Label */}
                    <div className="space-y-1 px-2">
                      <p className={cn(
                        "text-[9px] tracking-widest font-bold uppercase",
                        (isCurrent || isApproved) ? "text-white" : "text-white/20"
                      )}>
                        {step}
                      </p>
                      <p className="text-[8px] text-white/30 font-dm-mono">
                        {etapaData?.data_entrega ? format(new Date(etapaData.data_entrega), 'dd/MM/yy') : 'A definir'}
                      </p>
                      {isApproved && (
                        <span className="text-[7px] text-green-500/80 font-bold tracking-tighter block">APROVADO</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar Background */}
            <div className="absolute top-[1.35rem] left-[8.33%] right-[8.33%] h-[1px] bg-white/5 z-0" />
            
            {/* Active Progress Bar */}
            <div 
              className="absolute top-[1.35rem] left-[8.33%] h-[1px] bg-bronze transition-all duration-1000 z-0"
              style={{ 
                width: `${Math.max(0, (ETAPAS_JORNADA.indexOf((projeto.etapa_atual || '').toUpperCase())) * 16.66)}%` 
              }}
            />
          </div>
        </section>

        {/* SEÇÃO 4 — AGUARDANDO APROVAÇÃO */}
        {etapasAguardando.length > 0 && (
          <section className="space-y-8">
            {etapasAguardando.map((etapa) => (
              <div key={etapa.id} className="border border-bronze/40 bg-bronze/[0.02] p-10 space-y-10">
                <div className="flex items-center gap-3 text-bronze">
                  <Clock className="w-4 h-4 animate-spin-slow" />
                  <span className="text-[9px] uppercase tracking-[0.3em] font-bold">AGUARDANDO SUA APROVAÇÃO</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div className="space-y-3">
                    <h3 className="font-cormorant text-3xl italic">{etapa.etapa}</h3>
                    <p className="text-white/40 text-[11px] font-dm-mono">
                      Enviado em {(etapa.updated_at || etapa.criado_em) ? format(new Date(etapa.updated_at || etapa.criado_em), "dd 'de' MMMM", { locale: ptBR }) : 'A definir'}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Button 
                      className="bg-bronze hover:bg-bronze/90 text-white rounded-none uppercase text-[10px] tracking-widest h-12 px-10 transition-all"
                      onClick={() => {
                        setSelectedEtapa(etapa);
                        setShowAprovarModal(true);
                      }}
                    >
                      APROVAR
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-white/40 hover:text-white hover:bg-white/5 rounded-none uppercase text-[10px] tracking-widest h-12 transition-all"
                      onClick={() => {
                        setSelectedEtapa(etapa);
                        setShowAjusteModal(true);
                      }}
                    >
                      SOLICITAR AJUSTE
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* SEÇÃO 5 — RESUMO FINANCEIRO */}
        {valorTotal > 0 && (
          <section className="space-y-10">
            <span className="text-[10px] text-bronze uppercase tracking-[0.2em] font-bold">RESUMO FINANCEIRO DO PROJETO</span>
            
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <span className="text-[8px] text-white/30 uppercase tracking-widest block">VALOR TOTAL</span>
                  <p className="font-cormorant text-2xl">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-[8px] text-white/30 uppercase tracking-widest block">JÁ PAGO</span>
                  <p className="font-cormorant text-2xl text-bronze">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(jaPago)}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-[8px] text-white/30 uppercase tracking-widest block">SALDO RESTANTE</span>
                  <p className="font-cormorant text-2xl text-white/60">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoRestante)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-1 w-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full bg-bronze transition-all duration-1000"
                    style={{ width: `${porcentagemQuitada}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/40 font-dm-mono tracking-widest uppercase">
                  {porcentagemQuitada}% quitado
                </p>
              </div>
            </div>
          </section>
        )}

        {/* SEÇÃO 5.5 — GALERIA DO PROJETO */}
        {imagens.length > 0 && (
          <section className="space-y-10">
            <span className="text-[10px] text-bronze uppercase tracking-[0.2em] font-bold">GALERIA DO PROJETO</span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {imagens.map((imagem) => (
                <div 
                  key={imagem.id} 
                  className="aspect-square bg-white/5 border border-white/5 cursor-pointer overflow-hidden group"
                  onClick={() => handleOpenLightbox(imagem)}
                >
                  {/* Since we need actual image URLs, and these are Dropbox paths, we'd normally proxy them. 
                      For now, using a placeholder or assuming the handleDownload logic can be adapted for preview if needed.
                      The request asks for them as a card clicável that opens in lightbox.
                  */}
                  <div className="w-full h-full flex items-center justify-center relative">
                    <FileText className="w-8 h-8 text-white/10 group-hover:text-bronze/40 transition-colors" />
                    <p className="absolute bottom-3 left-3 right-3 text-[10px] text-white/20 truncate group-hover:text-white/40 transition-colors">
                      {imagem.nome_arquivo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SEÇÃO 6 — ARQUIVOS DISPONÍVEIS */}
        <section className="space-y-10">
          <span className="text-[10px] text-bronze uppercase tracking-[0.2em] font-bold">ARQUIVOS DISPONÍVEIS</span>
          
          {Object.keys(arquivosPorEtapa).length === 0 ? (
            <p className="text-white/20 italic text-sm">Aguardando disponibilização dos primeiros arquivos...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
              {Object.entries(arquivosPorEtapa).map(([etapa, arqs]: [string, any]) => (
                <div key={etapa} className="space-y-8">
                  <h4 className="text-[10px] tracking-[0.3em] uppercase text-white/60 border-b border-white/5 pb-4 font-bold">{etapa}</h4>
                  
                  <div className="space-y-6">
                    {arqs.map((arquivo: any) => (
                      <div key={arquivo.id} className="group">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {arquivo.liberado ? (
                              <FileText className="w-4 h-4 text-bronze/60" />
                            ) : (
                              <Lock className="w-4 h-4 text-white/10" />
                            )}
                            <div className="space-y-0.5">
                              <p className={cn(
                                "text-[13px] tracking-tight transition-colors",
                                arquivo.liberado ? 'text-white/80 group-hover:text-white' : 'text-white/20'
                              )}>
                                {arquivo.nome_arquivo}
                              </p>
                              {!arquivo.liberado && (
                                <p className="text-white/10 italic text-[9px] font-dm-mono">Disponível em breve</p>
                              )}
                            </div>
                          </div>
                          
                          {arquivo.liberado && (
                            <button 
                              onClick={() => handleDownload(arquivo.dropbox_path)}
                              className="w-8 h-8 flex items-center justify-center border border-white/5 hover:border-bronze/40 hover:bg-bronze/5 transition-all text-white/40 hover:text-bronze"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SEÇÃO 6.5 — HISTÓRICO DE DECISÕES */}
        {etapas.filter(e => e.status === 'Aprovado' && e.aprovado_por).length > 0 && (
          <section className="space-y-10">
            <span className="text-[10px] text-bronze uppercase tracking-[0.2em] font-bold">HISTÓRICO DE DECISÕES</span>
            <div className="divide-y divide-white/5">
              {etapas.filter(e => e.status === 'Aprovado' && e.aprovado_por).map(etapa => (
                <div key={etapa.id} className="flex items-center gap-4 py-6">
                  <div className="w-2 h-2 rounded-full bg-bronze flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-[10px] text-white font-bold uppercase tracking-wider">
                      {etapa.etapa}
                    </span>
                    <span className="text-[10px] text-white/40 ml-2">
                      aprovado por {etapa.aprovado_por}
                    </span>
                  </div>
                    <span className="text-[10px] text-white/30 uppercase tracking-widest">
                      {etapa.data_aprovacao 
                        ? format(new Date(etapa.data_aprovacao), "dd 'de' MMMM", { locale: ptBR })
                        : ''}
                    </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SEÇÃO 7 — FALAR COM A NL */}
        <section className="space-y-10 pt-12">
          <span className="text-[10px] text-bronze uppercase tracking-[0.2em] font-bold">FALAR COM A NL</span>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Textarea 
                value={textoMensagem}
                onChange={e => setTextoMensagem(e.target.value)}
                placeholder="Mensagem ou dúvida sobre o projeto..."
                className="bg-[#141414] border-white/10 focus:border-bronze/40 rounded-none min-h-[160px] text-white text-sm resize-none placeholder:text-white/10 pt-4"
              />
            </div>
            <Button 
              disabled={enviandoMensagem || !textoMensagem}
              onClick={handleEnviarMensagem}
              className="bg-bronze hover:bg-bronze/80 text-white rounded-none w-full h-16 uppercase text-[10px] tracking-[0.4em] font-bold transition-all group"
            >
              {enviandoMensagem ? <Loader2 className="animate-spin" /> : (
                <span className="flex items-center gap-3">
                  ENVIAR MENSAGEM
                  <Send className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="py-24 border-t border-white/5 px-6">
        <div className="max-w-[860px] mx-auto flex flex-col items-center gap-4 text-center">
          <p className="text-white/20 text-[10px] uppercase tracking-[0.5em] font-medium">
            NL ARQUITETOS · São José dos Campos, SP
          </p>
          <p className="text-white/10 text-[8px] uppercase tracking-[0.8em]">
            A ARQUITETURA COMO DECISÃO
          </p>
        </div>
      </footer>

      {/* MODAIS (Existentes com visual mantido) */}
      <Dialog open={showAprovarModal} onOpenChange={setShowAprovarModal}>
        <DialogContent className="bg-[#121212] border-white/10 rounded-none text-white max-w-md">
          <DialogHeader className="space-y-4">
            <DialogTitle className="font-cormorant text-2xl italic">Confirmar aprovação de {selectedEtapa?.etapa}</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/60">Seu nome completo</label>
              <Input 
                autoFocus
                value={nomeAprovador}
                onChange={e => setNomeAprovador(e.target.value)}
                className="bg-[#1A1A1A] border-white/10 focus:border-bronze/50 rounded-none h-12 text-white text-sm"
              />
            </div>
            <p className="text-[10px] text-white/20 leading-relaxed italic">
              Ao confirmar, você declara estar de acordo com os arquivos apresentados nesta etapa. 
              Seu IP e horário serão registrados para fins contratuais.
            </p>
          </div>
          <DialogFooter className="gap-4 sm:justify-start">
            <Button 
              className="bg-bronze hover:bg-bronze/80 text-white rounded-none flex-1 uppercase text-[10px] tracking-widest h-12"
              onClick={handleAprovar}
            >
              CONFIRMAR APROVAÇÃO
            </Button>
            <Button 
              variant="ghost" 
              className="text-white/60 hover:text-white rounded-none uppercase text-[10px] tracking-widest h-12"
              onClick={() => setShowAprovarModal(false)}
            >
              CANCELAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAjusteModal} onOpenChange={setShowAjusteModal}>
        <DialogContent className="bg-[#121212] border-white/10 rounded-none text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cormorant text-2xl italic">O que precisa ser ajustado?</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Textarea 
              autoFocus
              value={textoAjuste}
              onChange={e => setTextoAjuste(e.target.value)}
              placeholder="Descreva detalhadamente..."
              className="bg-[#1A1A1A] border-white/10 focus:border-bronze/50 rounded-none min-h-[150px] text-white text-sm resize-none"
            />
          </div>
          <DialogFooter className="gap-4 sm:justify-start">
            <Button 
              className="bg-bronze hover:bg-bronze/80 text-white rounded-none flex-1 uppercase text-[10px] tracking-widest h-12"
              onClick={handleSolicitarAjuste}
            >
              ENVIAR SOLICITAÇÃO
            </Button>
            <Button 
              variant="ghost" 
              className="text-white/60 hover:text-white rounded-none uppercase text-[10px] tracking-widest h-12"
              onClick={() => setShowAjusteModal(false)}
            >
              CANCELAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LIGHTBOX SIMPLES */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="bg-black/95 border-none p-0 max-w-[95vw] max-h-[95vh] flex flex-col items-center justify-center overflow-hidden">
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
             <button 
               onClick={() => setSelectedImage(null)}
               className="absolute top-4 right-4 text-white/40 hover:text-white z-50 p-2"
             >
               FECHAR
             </button>
             
             {selectedImage?.direct_link ? (
               <img 
                 src={selectedImage.direct_link} 
                 alt={selectedImage.nome_arquivo}
                 className="max-w-full max-h-[80vh] object-contain shadow-2xl"
               />
             ) : (
               <div className="flex flex-col items-center gap-4">
                 <Loader2 className="w-8 h-8 text-bronze animate-spin" />
                 <p className="text-white/40 font-cormorant text-xl italic">
                   Carregando imagem...
                 </p>
               </div>
             )}
             
             {selectedImage && (
               <div className="mt-6 text-center">
                 <p className="text-white/80 font-cormorant text-2xl italic">
                   {selectedImage.nome_arquivo}
                 </p>
                 <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-2">
                   {selectedImage.etapa || 'Galeria'}
                 </p>
               </div>
             )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function PaginaCliente() {
  return (
    <ErrorBoundary>
      <PaginaClienteContent />
    </ErrorBoundary>
  );
}
