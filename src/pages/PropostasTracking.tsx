import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { 
  Plus, 
  Search, 
  Copy, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Send,
  Loader2,
  Filter,
  Calendar,
  ExternalLink,
  History,
  Clock,
  MessageSquare,
  ChevronDown,
  Activity,
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  FileText, 
  Users,
  Shield,
  AlertTriangle,
  AlertCircle,
  Ban,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import EngagementDashboard from '@/components/EngagementDashboard';
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Engagement {
  id: string;
  proposta_id: string;
  secao_capa_tempo: number;
  secao_manifesto_tempo: number;
  secao_diagnostico_tempo: number;
  secao_escopo_tempo: number;
  secao_investimento_tempo: number;
  secao_fechamento_tempo: number;
  dispositivo: string;
  tempo_total: number;
}

export interface Proposal {
  id: string;
  cliente: string;
  tipo: 'ArqInt' | 'Interiores' | 'Comercial';
  cidade: string;
  estado: string;
  area: number;
  objetivo: string;
  valor_executivo: number;
  valor_completo: number;
  validade: number;
  data: string;
  status: 'Enviada' | 'Vista' | 'Aprovada' | 'Recusada';
  created_at: string;
  views_count?: number;
  last_view_at?: string;
  proposta_engajamento?: Engagement[];
}

interface Lead {
  id: string;
  nome: string;
  whats?: string;
  cidade: string;
  estado: string;
  tipo: string;
  area: number;
}

const PropostasTracking = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLeads, setShowLeads] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [followupMessage, setFollowupMessage] = useState('');
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
  const [followupTone, setFollowupTone] = useState<'formal' | 'direto'>('direto');
  const [followupLang, setFollowupLang] = useState<'pt' | 'en' | 'es'>('pt');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [expandedEngagements, setExpandedEngagements] = useState<Record<string, boolean>>({});
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<any>(null);

  const [newProposal, setNewProposal] = useState<Partial<Proposal>>({
    tipo: 'ArqInt',
    validade: 30,
    data: format(new Date(), 'yyyy-MM-dd'),
    status: 'Enviada'
  });

  useEffect(() => {
    fetchProposals();
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await (supabase
        .from('leads') as any)
        .select('id, nome, whats, cidade, estado, tipo, area')
        .order('nome');
      
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          proposal_views (
            viewed_at
          ),
          proposta_engajamento (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProposals = data.map((p: any) => ({
        ...p,
        views_count: p.proposal_views?.length || 0,
        last_view_at: p.proposal_views?.length > 0 
          ? p.proposal_views.sort((a: any, b: any) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime())[0].viewed_at 
          : null
      }));

      setProposals(formattedProposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Erro ao carregar propostas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!newProposal.cliente) {
      toast.error('Por favor, informe o nome do cliente');
      return;
    }

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('proposals')
        .insert([newProposal as any])
        .select()
        .single();

      if (error) throw error;

      toast.success('Proposta criada com sucesso!');
      setIsModalOpen(false);
      fetchProposals();
      
      // Reset form
      setNewProposal({
        tipo: 'ArqInt',
        validade: 30,
        data: format(new Date(), 'yyyy-MM-dd'),
        status: 'Enviada'
      });
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error('Erro ao criar proposta');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeadSelect = (leadId: string) => {
    const selectedLead = leads.find(l => l.id === leadId);
    if (selectedLead) {
      setNewProposal(prev => ({
        ...prev,
        cliente: selectedLead.nome,
        cidade: selectedLead.cidade || prev.cidade,
        estado: selectedLead.estado || prev.estado,
        area: selectedLead.area || prev.area,
        tipo: (['ArqInt', 'Interiores', 'Comercial'].includes(selectedLead.tipo) ? selectedLead.tipo : prev.tipo) as Proposal['tipo']
      }));
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Status atualizado para ${newStatus}`);
      fetchProposals();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const generateLink = (proposal: Proposal) => {
    let baseUrl = "https://nlarquitetosapresentacao.lovable.app/proposta/";
    const typeSlug = proposal.tipo === 'ArqInt' ? 'arqint' : proposal.tipo === 'Interiores' ? 'int' : 'comercial';
    
    const params = new URLSearchParams({
      id: proposal.id,
      nome: proposal.cliente,
      tipo: proposal.tipo,
      cidade: proposal.cidade || '',
      estado: proposal.estado || '',
      area: proposal.area?.toString() || '',
      objetivo: proposal.objetivo || '',
      data: proposal.data,
      valor_executivo: proposal.valor_executivo?.toString() || '',
      valor_completo: proposal.valor_completo?.toString() || '',
      validade: proposal.validade?.toString() || '30'
    });

    return `${baseUrl}${typeSlug}?${params.toString()}`;
  };

  const copyLink = (proposal: Proposal) => {
    const link = generateLink(proposal);
    navigator.clipboard.writeText(link);
    toast.success('Link copiado para a área de transferência');
  };

  const handleGenerateFollowup = async (proposal: Proposal, analysisContext?: string, toneOverride?: 'formal' | 'direto', langOverride?: 'pt' | 'en' | 'es') => {
    const tone = toneOverride || followupTone;
    const lang = langOverride || followupLang;
    try {
      setSelectedProposal(proposal);
      setIsGeneratingFollowup(true);
      setFollowupMessage('');
      setIsFollowupModalOpen(true);

      const { 
        cliente, 
        tipo, 
        status, 
        views_count = 0, 
        data: sentDate, 
        validade = 30,
        proposta_engajamento = []
      } = proposal;

      // Local analysis if context is not provided
      let localContext = analysisContext || "";
      if (!localContext && proposta_engajamento.length > 0) {
        const stats = getEngagementStats(proposta_engajamento);
        if (stats) {
          const totalMins = Math.floor(stats.totalSeconds / 60);
          localContext = `O cliente viu a proposta ${views_count} vezes, totalizando ${totalMins}m ${stats.totalSeconds % 60}s. A seção mais vista foi "${stats.mostViewed?.label}". Acesso via ${stats.dispositivo}.`;
        }
      }

      const now = new Date();
      const sentAt = new Date(sentDate);
      const daysSinceSent = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24));
      
      const expiryDate = new Date(sentAt);
      expiryDate.setDate(expiryDate.getDate() + validade);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let specificInstruction = "";
      if (status === 'Aprovada') {
        specificInstruction = "A proposta já foi aprovada. Gere uma mensagem de boas-vindas e próximos passos (contrato/briefing).";
      } else if (status === 'Recusada') {
        specificInstruction = "A proposta foi recusada. Gere uma mensagem agradecendo o tempo e deixando as portas abertas para o futuro.";
      } else if (views_count === 1) {
        specificInstruction = "A proposta foi vista 1 vez. Verifique suavemente se surgiu alguma dúvida.";
      } else if (views_count >= 3) {
        specificInstruction = "A proposta foi vista 3 ou mais vezes. Reconheça o interesse e ofereça uma conversa para alinhar detalhes.";
      } else if (views_count === 0 && daysSinceSent >= 3) {
        specificInstruction = "A proposta ainda não foi aberta e já se passaram 3 dias. Verifique se o link chegou corretamente.";
      } else if (daysUntilExpiry <= 2 && daysUntilExpiry >= 0) {
        specificInstruction = "A proposta vence em 2 dias. Informe sobre a validade de forma suave, sem pressão.";
      } else {
        specificInstruction = "Faça um follow-up padrão, mantendo o tom da NL Arquitetos.";
      }

      const prompt = `Você é o assistente da NL Arquitetos. Gere uma mensagem curta e profissional para WhatsApp de follow-up de proposta. 
Tom: ${tone === 'formal' ? 'Polido, elegante, respeitoso e profissional.' : 'Direto, amigável, ágil e focado no próximo passo.'}
Idioma: ${lang === 'pt' ? 'Português' : lang === 'en' ? 'Inglês' : 'Espanhol'}
Estilo NL Arquitetos: condutor, técnico, sem pressão, sem urgência artificial. 
Nunca use "oportunidade única", "corre", "promoção". A NL não pressiona — conduz. 
Máximo 3 linhas. Termine com uma pergunta aberta simples.

Contexto da proposta:
Cliente: ${cliente}
Tipo de proposta: ${tipo}
Status atual: ${status}
Vezes aberta: ${views_count}
Dias desde o envio: ${daysSinceSent}
Dias para o vencimento: ${daysUntilExpiry}

${localContext ? `Análise de Engajamento Adicional: ${localContext}\n` : ''}
Instrução específica: ${specificInstruction}
Sugira também um CTA claro para o próximo passo (ex: agendar conversa sobre valores, alinhamento de escopo ou validação do diagnóstico) com base na seção mais vista.

Gere a mensagem de WhatsApp.`;

      // Improved fallback message based on context if AI fails
      let fallbackMessage = "";
      const firstName = cliente.split(' ')[0];
      const stats = proposta_engajamento.length > 0 ? getEngagementStats(proposta_engajamento) : null;
      const mostViewedLabel = stats?.mostViewed?.label || "";
      
      // Análise detalhada de motivos e CTA baseada nos dados por seção
      let reasonInsight = "";
      if (stats) {
        const sections = [
          { id: 'diagnostico', label: 'Diagnóstico', time: stats.sections.find(s => s.id === 'diagnostico')?.time || 0, nextStep: 'validar se o diagnóstico que fizemos faz sentido para você' },
          { id: 'escopo', label: 'Escopo', time: stats.sections.find(s => s.id === 'escopo')?.time || 0, nextStep: 'alinharmos os detalhes do escopo' },
          { id: 'investimento', label: 'Investimento', time: stats.sections.find(s => s.id === 'investimento')?.time || 0, nextStep: 'conversarmos sobre os valores e condições de investimento' }
        ].sort((a, b) => b.time - a.time);

        const primarySection = sections[0];
        const formattedTime = Math.floor(primarySection.time / 60) > 0 
          ? `${Math.floor(primarySection.time / 60)}m ${primarySection.time % 60}s`
          : `${primarySection.time}s`;

        if (primarySection.time > 20) {
          if (primarySection.id === 'investimento') {
            reasonInsight = ` Notei que você analisou detalhadamente a seção de Investimento (por cerca de ${formattedTime}). Que tal marcarmos um papo rápido para falarmos sobre os valores e tirar qualquer dúvida?`;
          } else if (primarySection.id === 'escopo') {
            reasonInsight = ` Vi que você dedicou um bom tempo revisando o Escopo do projeto (foram ${formattedTime} de atenção). Podemos agendar um alinhamento para garantir que as entregas atendam 100% à sua expectativa?`;
          } else if (primarySection.id === 'diagnostico') {
            reasonInsight = ` Percebi que você revisitou bastante o nosso Diagnóstico (por ${formattedTime}). Faz sentido para você os pontos que levantamos? Gostaria de validar esses detalhes com você.`;
          }
        } else if (stats.totalSeconds > 300) {
          reasonInsight = ` Vi que você analisou a proposta detalhadamente por mais de ${Math.floor(stats.totalSeconds / 60)} minutos, o que é ótimo! Gostaria de agendar uma breve conversa para avançarmos para o próximo passo?`;
        }
      }

      if (status === 'Aprovada') {
        fallbackMessage = `Olá, ${firstName}! Que notícia excelente a aprovação da proposta de ${tipo}. Já estamos preparando os próximos passos e o contrato para darmos início ao seu projeto!`;
      } else if (status === 'Recusada') {
        fallbackMessage = `Olá, ${firstName}! Agradeço pelo retorno sobre a proposta de ${tipo}. Entendo perfeitamente e fico à disposição caso precise de algo no futuro ou queira retomar o projeto em outro momento.`;
      } else if (views_count === 0) {
        if (daysSinceSent >= 3) {
          fallbackMessage = `Olá, ${firstName}! Tudo bem? Gostaria de confirmar se você recebeu o link da proposta de ${tipo} que enviamos há alguns dias. Às vezes o link pode se perder, então me avise se precisar que eu reenvie!`;
        } else {
          fallbackMessage = `Olá, ${firstName}! Tudo bem? Acabamos de te enviar a proposta de ${tipo}. Quando tiver um tempinho para olhar, fico à disposição para conversarmos sobre o projeto.`;
        }
      } else {
        // Mensagem baseada em engajamento real
        const baseMsg = `Olá, ${firstName}! Tudo bem? Gostaria de saber se você conseguiu visualizar a proposta de ${tipo} com calma.`;
        fallbackMessage = `${baseMsg}${reasonInsight || " Ficou alguma dúvida sobre o escopo ou os próximos passos?"}`;
      }

      try {
        const { data: invokeData, error: invokeError } = await supabase.functions.invoke('generate-followup', {
          body: { 
            prompt,
            proposal: {
              cliente,
              tipo,
              status,
              views_count,
              daysSinceSent,
              daysUntilExpiry,
              analysisContext: localContext
            }
          }
        });

        if (invokeError) throw invokeError;
        
        const text = invokeData?.message || invokeData?.text;
        
        if (text && !text.includes("Empty response from AI") && !text.includes("insuficientes")) {
          setFollowupMessage(text);
        } else {
          setFollowupMessage(fallbackMessage);
        }
      } catch (error) {
        console.error('Error calling AI:', error);
        setFollowupMessage(fallbackMessage);
      }
    } catch (error: any) {
      console.error('Error generating follow-up:', error);
      toast.error('Erro ao preparar follow-up');
    } finally {
      setIsGeneratingFollowup(false);
    }
  };

  const getEngagementStats = (engagement: Engagement[]) => {
    if (!engagement || engagement.length === 0) return null;
    
    const totalSeconds = engagement.reduce((acc, curr) => acc + (curr.tempo_total || 0), 0);
    const dispositivo = engagement[engagement.length - 1].dispositivo;
    
    const sections = [
      { id: 'capa', label: 'Capa', time: engagement.reduce((acc, curr) => acc + (curr.secao_capa_tempo || 0), 0) },
      { id: 'manifesto', label: 'Manifesto', time: engagement.reduce((acc, curr) => acc + (curr.secao_manifesto_tempo || 0), 0) },
      { id: 'diagnostico', label: 'Diagnóstico', time: engagement.reduce((acc, curr) => acc + (curr.secao_diagnostico_tempo || 0), 0) },
      { id: 'escopo', label: 'Escopo', time: engagement.reduce((acc, curr) => acc + (curr.secao_escopo_tempo || 0), 0) },
      { id: 'investimento', label: 'Investimento', time: engagement.reduce((acc, curr) => acc + (curr.secao_investimento_tempo || 0), 0) },
      { id: 'fechamento', label: 'Fechamento', time: engagement.reduce((acc, curr) => acc + (curr.secao_fechamento_tempo || 0), 0) },
    ];
    
    const mostViewed = [...sections].sort((a, b) => b.time - a.time)[0];
    const maxTime = Math.max(...sections.map(s => s.time));
    
    return {
      totalSeconds,
      dispositivo,
      sections: sections.map(s => ({ ...s, percentage: maxTime > 0 ? (s.time / maxTime) * 100 : 0 })),
      mostViewed
    };
  };

  const handleOpenDashboard = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setIsDashboardModalOpen(true);
  };

  const handleReviewProposal = async (proposal: Proposal) => {
    try {
      setSelectedProposal(proposal);
      setIsReviewing(true);
      setReviewResult(null);
      setIsReviewModalOpen(true);

      const prompt = `Você é o revisor interno da NL Arquitetos. Analise a proposta abaixo e verifique três aspectos:

1. TOM DE VOZ: O texto segue o tom técnico, condutor e centrado no cliente da NL? Identifique trechos que soem como vendedor ansioso, informal ou romantizado.

2. PALAVRAS PROIBIDAS: Verifique se contém alguma dessas palavras ou expressões:
"casa dos sonhos", "projeto dos sonhos", "obra sem dor de cabeça garantida", "luxo acessível", "design exclusivo", "rapidinho", "baratinho", "método revolucionário", "fórmula secreta", "corre que acaba", "oportunidade única hoje", "sem risco nenhum", "zero problema garantido", "qualquer arquiteto faz isso", "obra sempre tem imprevisto faz parte", "pode confiar a gente resolve"

3. CHECKLIST TÉCNICO: Verifique se a proposta contém:
- Recapitulação do problema do cliente
- Solução apresentada claramente  
- Entregáveis listados
- Método R.E.S.O.L.V.E. mencionado
- Investimento apresentado com contexto
- Próximo passo definido
- Ausência de urgência artificial ou pressão de venda

PROPOSTA:
Cliente: ${proposal.cliente}
Tipo: ${proposal.tipo}
Objetivo/Conteúdo: ${proposal.objetivo}
Valor Executivo: R$ ${proposal.valor_executivo}
Valor Completo: R$ ${proposal.valor_completo}

Retorne APENAS JSON válido:
{
  "tom": {
    "status": "APROVADO" | "ATENÇÃO" | "CORRIGIR",
    "problemas": [{"trecho": "...", "sugestao": "..."}]
  },
  "palavras_proibidas": {
    "status": "APROVADO" | "ENCONTRADAS",
    "encontradas": [{"palavra": "...", "contexto": "..."}]
  },
  "checklist": {
    "recapitulacao": true/false,
    "solucao": true/false,
    "entregaveis": true/false,
    "metodo_resolve": true/false,
    "investimento": true/false,
    "proximo_passo": true/false,
    "sem_urgencia": true/false
  }
}`;

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { 
          prompt, 
          model: 'claude-sonnet-4-20250514'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error.message);

      const content = data.choices[0].message.content;
      // Extract JSON if AI wrapped it in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      
      setReviewResult(result);
    } catch (error: any) {
      console.error('Error reviewing proposal:', error);
      toast.error('Erro ao revisar proposta: ' + error.message);
      setIsReviewModalOpen(false);
    } finally {
      setIsReviewing(false);
    }
  };

  const toggleEngagement = (id: string) => {
    setExpandedEngagements(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyFollowupMessage = () => {
    navigator.clipboard.writeText(followupMessage);
    toast.success('Mensagem copiada!');
  };

  const handleSendWhatsApp = () => {
    if (!selectedProposal || !followupMessage) return;
    
    const lead = leads.find(l => l.nome === selectedProposal.cliente);
    if (!lead || !lead.whats) {
      toast.error('Número de WhatsApp não encontrado para este lead');
      return;
    }

    // Remover caracteres não numéricos
    let number = lead.whats.replace(/\D/g, '');
    
    // Adicionar 55 se não tiver código do país
    if (number.length <= 11) {
      number = '55' + number;
    }

    const url = `https://wa.me/${number}?text=${encodeURIComponent(followupMessage)}`;
    window.open(url, '_blank');
  };

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.cliente.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.tipo === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enviada': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Vista': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Aprovada': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Recusada': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1816] text-white">
      <Sidebar user="Sócio" />
      <main className="ml-[230px] p-12">
        <header className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-white font-cormorant text-gradient">04 · Tracking de Propostas</h1>
                <div className="flex items-center gap-2 px-2 py-0.5 bg-bronze/5 border border-bronze/20 rounded-full h-fit">
                  <div className="w-1.5 h-1.5 bg-bronze rounded-full animate-pulse" />
                  <span className="text-[8px] font-bold text-bronze uppercase tracking-[0.2em]">Premium Tracking</span>
                </div>

              </div>
              <p className="text-muted-foreground mt-1 text-xs uppercase tracking-widest font-bold">Módulo 04 · Gestão e Rastreamento de Propostas</p>
            </div>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-bronze hover:bg-bronze/90 text-white rounded-[2px] h-11 px-6 font-bold uppercase tracking-wider text-[11px] transition-all"
            >
              <Plus size={16} className="mr-2" />
              Nova Proposta
            </Button>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="bg-[#1A1816] p-6 border border-white/10 rounded-[2px] flex flex-col gap-1">
              <span className="text-[11px] text-white/40 uppercase font-normal font-inter">PROPOSTAS ENVIADAS</span>
              <span className="text-[22px] font-normal text-white font-inter">
                {proposals.length}
              </span>
            </div>
            <div className="bg-[#1A1816] p-6 border border-white/10 rounded-[2px] flex flex-col gap-1">
              <span className="text-[11px] text-white/40 uppercase font-normal font-inter">TAXA DE ABERTURA</span>
              <span className="text-[22px] font-normal text-white font-inter">
                {proposals.length > 0 
                  ? `${Math.round((proposals.filter(p => p.views_count && p.views_count > 0).length / proposals.length) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="bg-[#1A1816] p-6 border border-white/10 rounded-[2px] flex flex-col gap-1">
              <span className="text-[11px] text-white/40 uppercase font-normal font-inter">APROVAÇÃO</span>
              <span className="text-[22px] font-normal text-white font-inter">
                {proposals.length > 0 
                  ? `${Math.round((proposals.filter(p => p.status === 'Aprovada').length / proposals.length) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="bg-[#1A1816] p-6 border border-white/10 rounded-[2px] flex flex-col gap-1">
              <span className="text-[11px] text-white/40 uppercase font-normal font-inter">LEADS NO FUNIL</span>
              <span className="text-[22px] font-normal text-white font-inter">
                {leads.length}
              </span>
            </div>
            <div className="bg-[#1A1816] p-6 border border-bronze/20 rounded-[2px] flex flex-col gap-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
                <TrendingUp size={12} className="text-bronze" />
              </div>
              <span className="text-[11px] text-white/40 uppercase font-normal font-inter">VALOR EM NEGOCIAÇÃO</span>
              <span className="text-[22px] font-normal text-white font-inter">
                R$ {proposals
                  .filter(p => p.status !== 'Aprovada' && p.status !== 'Recusada')
                  .reduce((acc, p) => acc + (p.valor_completo || 0), 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E8E4DF] pb-1">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'Enviada', label: 'Aguardando' },
                { id: 'Vista', label: 'Vistas' },
                { id: 'Aprovada', label: 'Aprovadas' },
                { id: 'Recusada', label: 'Recusadas' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all border-b-2 -mb-[2px]",
                    statusFilter === tab.id 
                      ? "border-bronze text-bronze" 
                      : "border-transparent text-muted-foreground hover:text-graphite hover:border-[#E8E4DF]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between bg-[#242220] p-4 border border-white/10 rounded-[2px] shadow-sm">
              <div className="flex gap-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-40 border-[#E8E4DF] rounded-[2px] text-[10px] uppercase tracking-widest font-bold">
                    <SelectValue placeholder="TIPO" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    <SelectItem value="ArqInt">ArqInt</SelectItem>
                    <SelectItem value="Interiores">Interiores</SelectItem>
                    <SelectItem value="Comercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="BUSCAR CLIENTE..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 w-64 border-white/10 rounded-[2px] text-[10px] uppercase tracking-widest bg-[#1A1816]"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 className="w-10 h-10 text-bronze animate-spin mb-4" />
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Carregando propostas...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProposals.map((p) => (
                <div 
                  key={p.id}
                  className="bg-[#242220] border border-white/10 rounded-[2px] overflow-hidden hover:border-bronze/30 transition-all group flex flex-col hover:shadow-lg"
                >
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <span className={cn(
                        "text-[9px] uppercase tracking-[0.2em] font-bold px-2 py-1 border rounded-[2px]",
                        getStatusColor(p.status)
                      )}>
                        {p.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {format(new Date(p.data), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1 font-cormorant">{p.cliente}</h3>
                    <p className="text-[10px] text-bronze uppercase tracking-widest font-bold mb-4">{p.tipo}</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Executivo</p>
                        <p className="text-xs font-bold">R$ {p.valor_executivo?.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Completo</p>
                        <p className="text-xs font-bold">R$ {p.valor_completo?.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 py-3 border-y border-dashed border-[#E8E4DF] mb-4 relative overflow-hidden group/view">
                      <div className="flex items-center gap-2">
                        <Eye size={12} className="text-bronze" />
                        <span className="text-[10px] font-medium tracking-tight">Aberta {p.views_count} vezes</span>
                      </div>
                      {p.last_view_at && (
                        <div className="flex items-center gap-2 border-l border-[#E8E4DF] pl-4">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            new Date().getTime() - new Date(p.last_view_at).getTime() < 1000 * 60 * 60 * 24 
                              ? "bg-green-500 animate-pulse" 
                              : "bg-muted-foreground/30"
                          )} />
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold whitespace-nowrap">Visto em {format(new Date(p.last_view_at), 'dd/MM HH:mm')}</span>
                        </div>
                      )}
                      
                      {p.views_count !== undefined && p.views_count >= 3 && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-0.5 bg-bronze/10 text-bronze text-[8px] font-bold uppercase tracking-widest rounded-l-full border-l border-y border-bronze/20">
                          <Activity size={10} className="animate-pulse" />
                          <span>Hot</span>
                        </div>
                      )}
                    </div>

                    {p.proposta_engajamento && p.proposta_engajamento.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[#E8E4DF]">
                        <button 
                          onClick={() => toggleEngagement(p.id)}
                          className="flex items-center justify-between w-full group/eng py-1"
                        >
                          <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-graphite flex items-center gap-2">
                            <History size={12} className="text-bronze" />
                            Engajamento
                            <ChevronDown 
                              size={12} 
                              className={cn(
                                "text-muted-foreground transition-transform duration-200",
                                expandedEngagements[p.id] && "rotate-180"
                              )} 
                            />
                          </h4>
                          {!expandedEngagements[p.id] && (
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-bronze">
                                {Math.floor((getEngagementStats(p.proposta_engajamento)?.totalSeconds || 0) / 60)}m {(getEngagementStats(p.proposta_engajamento)?.totalSeconds || 0) % 60}s
                              </span>
                            </div>
                          )}
                        </button>

                        {expandedEngagements[p.id] && (
                          <div className="mt-4 space-y-4 pb-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground px-1 py-0.5 bg-muted rounded-[2px]">
                                {getEngagementStats(p.proposta_engajamento)?.dispositivo}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-bronze">
                                {Math.floor((getEngagementStats(p.proposta_engajamento)?.totalSeconds || 0) / 60)}m {(getEngagementStats(p.proposta_engajamento)?.totalSeconds || 0) % 60}s
                              </span>
                            </div>

                            <div className="space-y-2">
                              {getEngagementStats(p.proposta_engajamento)?.sections.map((section) => (
                                <div key={section.id} className="space-y-1">
                                  <div className="flex justify-between items-center text-[8px]">
                                    <span className={cn(
                                      "uppercase tracking-widest font-bold",
                                      getEngagementStats(p.proposta_engajamento)?.mostViewed?.id === section.id ? "text-bronze" : "text-muted-foreground"
                                    )}>
                                      {section.label}
                                    </span>
                                    <span className="font-medium text-muted-foreground">{section.time}s</span>
                                  </div>
                                  <div className="h-1 w-full bg-[#F0EEEB] rounded-full overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full transition-all duration-500",
                                        getEngagementStats(p.proposta_engajamento)?.mostViewed?.id === section.id ? "bg-bronze" : "bg-muted-foreground/30"
                                      )}
                                      style={{ width: `${section.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 bg-[#242220] border-t border-white/10 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => handleOpenDashboard(p)}
                        className="bg-bronze hover:bg-bronze/90 text-white rounded-[2px] h-9 text-[9px] font-bold uppercase tracking-widest shadow-sm"
                      >
                        <LayoutDashboard size={12} className="mr-2" />
                        Ver Dashboard
                      </Button>
                      
                      <Button 
                        onClick={() => handleGenerateFollowup(p)}
                        className="bg-white/10 hover:bg-white/20 text-white rounded-[2px] h-9 text-[9px] font-bold uppercase tracking-widest shadow-sm"
                      >
                        <MessageSquare size={12} className="mr-2" />
                        Gerar Follow-up
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => handleReviewProposal(p)}
                        className="bg-bronze hover:bg-bronze/90 text-white rounded-[2px] h-8 text-[8px] font-bold uppercase tracking-widest shadow-sm"
                      >
                        <Shield size={11} className="mr-2" />
                        Revisar com IA
                      </Button>
                      
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(p)}
                        className="rounded-[2px] text-[8px] font-bold uppercase tracking-widest h-8 border-[#E8E4DF] text-muted-foreground hover:text-graphite"
                      >
                        <Copy size={11} className="mr-2" />
                        Link
                      </Button>
                    </div>
                    
                    <Select onValueChange={(val) => handleStatusUpdate(p.id, val)}>
                      <SelectTrigger className="w-full rounded-[2px] text-[8px] font-bold uppercase tracking-widest h-8 border-[#E8E4DF] bg-white text-muted-foreground">
                        <SelectValue placeholder="STATUS" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Enviada">Enviada</SelectItem>
                        <SelectItem value="Vista">Vista</SelectItem>
                        <SelectItem value="Aprovada">Aprovada</SelectItem>
                        <SelectItem value="Recusada">Recusada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-[2px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-cormorant text-graphite uppercase tracking-wider">Nova Proposta</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6 py-6">
            <div className="space-y-4">
              <div className="space-y-1.5 relative">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Cliente</label>
                <div className="relative">
                  <Input 
                    placeholder="Buscar lead ou digitar nome..."
                    value={newProposal.cliente || ''}
                    onChange={(e) => {
                      setNewProposal(prev => ({ ...prev, cliente: e.target.value }));
                      setShowLeads(true);
                    }}
                    onFocus={() => setShowLeads(true)}
                    onBlur={() => setTimeout(() => setShowLeads(false), 200)}
                    className="rounded-[2px] border-[#E8E4DF] h-10"
                  />
                  {showLeads && leads.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#E8E4DF] rounded-[2px] shadow-lg max-h-60 overflow-auto z-[100]">
                      {leads
                        .filter(lead => 
                          !newProposal.cliente || 
                          lead.nome.toLowerCase().includes(newProposal.cliente.toLowerCase())
                        )
                        .map(lead => (
                          <div 
                            key={lead.id}
                            className="p-3 hover:bg-bronze/5 cursor-pointer text-sm border-b border-[#F8F9FA] last:border-0"
                            onClick={() => {
                              handleLeadSelect(lead.id);
                              setShowLeads(false);
                            }}
                          >
                            <div className="font-medium text-graphite">{lead.nome}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{lead.tipo} • {lead.cidade}</div>
                          </div>
                        ))
                      }
                      {leads.filter(lead => 
                        !newProposal.cliente || 
                        lead.nome.toLowerCase().includes(newProposal.cliente.toLowerCase())
                      ).length === 0 && (
                        <div className="p-3 text-xs text-muted-foreground italic">Nenhum lead encontrado</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Tipo</label>
                  <Select 
                    value={newProposal.tipo} 
                    onValueChange={(val: any) => setNewProposal({...newProposal, tipo: val})}
                  >
                    <SelectTrigger className="rounded-[2px] border-[#E8E4DF] h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ArqInt">ArqInt</SelectItem>
                      <SelectItem value="Interiores">Interiores</SelectItem>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Data</label>
                  <Input 
                    type="date"
                    value={newProposal.data}
                    onChange={(e) => setNewProposal({...newProposal, data: e.target.value})}
                    className="rounded-[2px] border-[#E8E4DF] h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Cidade</label>
                  <Input 
                    value={newProposal.cidade || ''}
                    onChange={(e) => setNewProposal({...newProposal, cidade: e.target.value})}
                    className="rounded-[2px] border-[#E8E4DF] h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Estado</label>
                  <Input 
                    value={newProposal.estado || ''}
                    onChange={(e) => setNewProposal({...newProposal, estado: e.target.value})}
                    className="rounded-[2px] border-[#E8E4DF] h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Área (m²)</label>
                  <Input 
                    type="number"
                    value={newProposal.area || ''}
                    onChange={(e) => setNewProposal({...newProposal, area: Number(e.target.value)})}
                    className="rounded-[2px] border-[#E8E4DF] h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Validade (dias)</label>
                  <Input 
                    type="number"
                    value={newProposal.validade}
                    onChange={(e) => setNewProposal({...newProposal, validade: Number(e.target.value)})}
                    className="rounded-[2px] border-[#E8E4DF] h-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Objetivo</label>
                <textarea 
                  value={newProposal.objetivo || ''}
                  onChange={(e) => setNewProposal({...newProposal, objetivo: e.target.value})}
                  className="w-full h-[106px] rounded-[2px] border border-[#E8E4DF] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-bronze/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Valor Executivo (R$)</label>
                <Input 
                  type="number"
                  value={newProposal.valor_executivo || ''}
                  onChange={(e) => setNewProposal({...newProposal, valor_executivo: Number(e.target.value)})}
                  className="rounded-[2px] border-[#E8E4DF] h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Valor Completo (R$)</label>
                <Input 
                  type="number"
                  value={newProposal.valor_completo || ''}
                  onChange={(e) => setNewProposal({...newProposal, valor_completo: Number(e.target.value)})}
                  className="rounded-[2px] border-[#E8E4DF] h-10"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-[#E8E4DF] pt-6">
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              className="rounded-[2px] uppercase tracking-widest text-[10px] font-bold h-11 px-8"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateProposal}
              disabled={isSaving}
              className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-[2px] uppercase tracking-widest text-[10px] font-bold h-11 px-8"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Criar Proposta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isFollowupModalOpen} onOpenChange={setIsFollowupModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white rounded-[2px] border-[#E8E4DF] p-0 overflow-hidden animate-in fade-in zoom-in duration-200">
          <DialogHeader className="p-6 bg-graphite text-white">
            <DialogTitle className="text-xl font-bold font-cormorant flex items-center gap-2 uppercase tracking-tight">
              <MessageSquare size={20} className="text-bronze" />
              Follow-up Inteligente
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tom de Voz</label>
                <Select 
                  value={followupTone} 
                  onValueChange={(v: 'formal' | 'direto') => {
                    setFollowupTone(v);
                    if (selectedProposal) handleGenerateFollowup(selectedProposal, undefined, v, followupLang);
                  }}
                >
                  <SelectTrigger className="h-9 rounded-[2px] border-[#E8E4DF] text-xs font-bold uppercase tracking-wider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E8E4DF] rounded-[2px]">
                    <SelectItem value="direto" className="text-xs font-bold uppercase tracking-wider">Direto / Amigável</SelectItem>
                    <SelectItem value="formal" className="text-xs font-bold uppercase tracking-wider">Formal / Polido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Idioma</label>
                <Select 
                  value={followupLang} 
                  onValueChange={(v: 'pt' | 'en' | 'es') => {
                    setFollowupLang(v);
                    if (selectedProposal) handleGenerateFollowup(selectedProposal, undefined, followupTone, v);
                  }}
                >
                  <SelectTrigger className="h-9 rounded-[2px] border-[#E8E4DF] text-xs font-bold uppercase tracking-wider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E8E4DF] rounded-[2px]">
                    <SelectItem value="pt" className="text-xs font-bold uppercase tracking-wider">Português</SelectItem>
                    <SelectItem value="en" className="text-xs font-bold uppercase tracking-wider">English</SelectItem>
                    <SelectItem value="es" className="text-xs font-bold uppercase tracking-wider">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -top-3 left-3 px-2 bg-white text-[9px] font-black uppercase tracking-[0.2em] text-bronze z-10">
                Script Recomendado
              </div>
              {isGeneratingFollowup ? (
                <div className="h-32 flex flex-col items-center justify-center bg-[#FDFDFD] border border-[#E8E4DF] rounded-[2px]">
                  <Loader2 size={24} className="animate-spin text-bronze mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Gerando análise...</span>
                </div>
              ) : (
                <textarea
                  className="w-full h-40 p-5 text-xs font-medium leading-relaxed bg-[#FDFDFD] border border-[#E8E4DF] rounded-[2px] focus:border-bronze focus:ring-1 focus:ring-bronze outline-none resize-none transition-all"
                  value={followupMessage}
                  onChange={(e) => setFollowupMessage(e.target.value)}
                  placeholder="Aguardando geração do script..."
                />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={copyFollowupMessage}
                variant="outline"
                className="border-[#E8E4DF] text-graphite hover:bg-[#FDFDFD] rounded-[2px] h-11 text-[11px] font-bold uppercase tracking-[0.2em]"
              >
                <Copy size={16} className="mr-2 text-bronze" />
                Copiar
              </Button>
              <Button 
                onClick={handleSendWhatsApp}
                className="bg-graphite hover:bg-black text-white rounded-[2px] h-11 text-[11px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-graphite/10"
              >
                <Send size={16} className="mr-2 text-bronze" />
                WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isDashboardModalOpen} onOpenChange={setIsDashboardModalOpen}>
        <DialogContent className="max-w-4xl bg-[#FDFDFD] border-none rounded-[2px] p-0 overflow-hidden shadow-2xl">
          <div className="bg-graphite px-8 py-10 flex justify-between items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Activity size={200} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="px-2 py-0.5 bg-bronze/20 border border-bronze/30 rounded-full">
                  <span className="text-[8px] font-bold text-bronze uppercase tracking-[0.2em]">Relatório Premium</span>
                </div>
              </div>
              <DialogTitle className="text-4xl font-bold font-cormorant text-white tracking-tight mb-1">
                Análise de Engajamento
              </DialogTitle>
              <p className="text-white/50 text-[11px] uppercase tracking-[0.3em] font-bold">
                {selectedProposal?.cliente} <span className="text-bronze mx-2">|</span> {selectedProposal?.tipo}
              </p>
            </div>
          </div>
          <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {selectedProposal && (
              <EngagementDashboard 
                proposal={selectedProposal} 
                onGenerateFollowup={(analysis) => handleGenerateFollowup(selectedProposal, analysis)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropostasTracking;
