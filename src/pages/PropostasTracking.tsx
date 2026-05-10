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
  LayoutDashboard
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
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [expandedEngagements, setExpandedEngagements] = useState<Record<string, boolean>>({});

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

  const handleGenerateFollowup = async (proposal: Proposal, analysisContext?: string) => {
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
        validade = 30 
      } = proposal;

      const now = new Date();
      const sentAt = new Date(sentDate);
      const daysSinceSent = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24));
      
      const expiryDate = new Date(sentAt);
      expiryDate.setDate(expiryDate.getDate() + validade);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let specificInstruction = "";
      if (views_count === 1) {
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
Tom: condutor, técnico, sem pressão, sem urgência artificial. 
Nunca use "oportunidade única", "corre", "promoção". A NL não pressiona — conduz. 
Máximo 3 linhas. Termine com uma pergunta aberta simples.

Contexto da proposta:
Cliente: ${cliente}
Tipo de proposta: ${tipo}
Status atual: ${status}
Vezes aberta: ${views_count}
Dias desde o envio: ${daysSinceSent}
Dias para o vencimento: ${daysUntilExpiry}

${analysisContext ? `Análise de Engajamento Adicional: ${analysisContext}\n` : ''}

Instrução específica: ${specificInstruction}

Gere a mensagem de WhatsApp.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": (import.meta as any).env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      const text = data?.content?.[0]?.text;
      
      if (text) {
        setFollowupMessage(text);
      } else if (data?.error) {
        setFollowupMessage(`Erro: ${data.error.message || JSON.stringify(data.error)}`);
      } else {
        setFollowupMessage("Não foi possível gerar a mensagem. Tente novamente.");
      }
    } catch (error: any) {
      console.error('Error generating follow-up:', error);
      setFollowupMessage("Erro ao gerar follow-up. Verifique sua conexão ou se a IA está disponível.");
      toast.error('Erro ao gerar follow-up');
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
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A]">
      <Sidebar user="Sócio" />
      <main className="ml-[230px] p-12">
        <header className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-graphite font-cormorant text-gradient">04 · Tracking de Propostas</h1>
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

          <div className="grid grid-cols-5 gap-6">
            {[
              { label: 'Total Enviadas', value: proposals.length, icon: Send },
              { label: 'Aguardando', value: proposals.filter(p => p.status === 'Enviada' || p.status === 'Vista').length, icon: Clock },
              { label: 'Alto Interesse', value: proposals.filter(p => (p.views_count || 0) >= 3).length, icon: Activity, highlight: true },
              { label: 'Aprovadas', value: proposals.filter(p => p.status === 'Aprovada').length, icon: CheckCircle2 },
              { label: 'Taxa de Conversão', value: `${proposals.length > 0 ? Math.round((proposals.filter(p => p.status === 'Aprovada').length / proposals.length) * 100) : 0}%`, icon: History },
            ].map((m, i) => (
              <div 
                key={i}
                className={cn(
                  "bg-white p-6 rounded-[2px] border shadow-sm relative overflow-hidden group transition-all",
                  m.highlight ? "border-bronze/50 bg-bronze/[0.02]" : "border-[#E8E4DF]"
                )}
              >
                <div className="relative z-10">
                  <p className={cn(
                    "text-[10px] uppercase tracking-[0.2em] mb-1 font-bold",
                    m.highlight ? "text-bronze" : "text-muted-foreground"
                  )}>{m.label}</p>
                  <h2 className="text-2xl font-bold text-[#1A1A1A]">{m.value}</h2>
                </div>
                <m.icon size={40} className={cn(
                  "absolute right-[-10px] bottom-[-10px] transition-colors",
                  m.highlight ? "text-bronze/20" : "text-bronze/5 group-hover:text-bronze/10"
                )} />
              </div>
            ))}
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

            <div className="flex items-center justify-between bg-white p-4 border border-[#E8E4DF] rounded-[2px] shadow-sm">
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
                  className="h-9 pl-9 w-64 border-[#E8E4DF] rounded-[2px] text-[10px] uppercase tracking-widest bg-[#FDFDFD]"
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
                  className="bg-white border border-[#E8E4DF] rounded-[2px] overflow-hidden hover:border-bronze/30 transition-all group flex flex-col hover:shadow-lg"
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

                    <h3 className="text-lg font-bold text-graphite mb-1 font-cormorant">{p.cliente}</h3>
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

                  <div className="px-6 py-4 bg-[#FDFDFD] border-t border-[#E8E4DF] space-y-3">
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
                        className="bg-graphite hover:bg-graphite/90 text-white rounded-[2px] h-9 text-[9px] font-bold uppercase tracking-widest shadow-sm"
                      >
                        <MessageSquare size={12} className="mr-2" />
                        Gerar Follow-up
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(p)}
                        className="rounded-[2px] text-[8px] font-bold uppercase tracking-widest h-8 border-[#E8E4DF] text-muted-foreground hover:text-graphite"
                      >
                        <Copy size={11} className="mr-2" />
                        Link
                      </Button>
                      
                      <Select onValueChange={(val) => handleStatusUpdate(p.id, val)}>
                        <SelectTrigger className="rounded-[2px] text-[8px] font-bold uppercase tracking-widest h-8 border-[#E8E4DF] bg-white text-muted-foreground">
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
        <DialogContent className="max-w-md bg-white rounded-[2px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-cormorant text-graphite uppercase tracking-wider">Follow-up Personalizado</DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            {isGeneratingFollowup ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 size={32} className="text-bronze animate-spin mb-4" />
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">O Claude está redigindo a mensagem...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedProposal && !leads.find(l => l.nome === selectedProposal.cliente)?.whats && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-[2px] flex items-start gap-3">
                    <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-red-700 font-medium leading-tight">
                      Atenção: Este lead não possui número de WhatsApp cadastrado. 
                      O botão de envio direto não funcionará.
                    </p>
                  </div>
                )}
                <div className="bg-[#F8F9FA] p-4 border border-[#E8E4DF] rounded-[2px]">
                  <p className="text-sm leading-relaxed text-graphite whitespace-pre-wrap font-medium italic">
                    "{followupMessage}"
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">
                  Essa mensagem foi gerada considerando o status e interesse do cliente.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsFollowupModalOpen(false)}
              className="rounded-[2px] uppercase tracking-widest text-[10px] font-bold h-11 px-8"
            >
              Fechar
            </Button>
            {!isGeneratingFollowup && followupMessage && !followupMessage.includes('Erro') && (
              <div className="flex gap-2">
                <Button 
                  onClick={copyFollowupMessage}
                  variant="outline"
                  className="rounded-[2px] uppercase tracking-widest text-[10px] font-bold h-11 px-6 border-bronze text-bronze hover:bg-bronze hover:text-white"
                >
                  <Copy size={14} className="mr-2" />
                  Copiar
                </Button>
                <Button 
                  onClick={handleSendWhatsApp}
                  disabled={!selectedProposal || !leads.find(l => l.nome === selectedProposal.cliente)?.whats}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-[2px] uppercase tracking-widest text-[10px] font-bold h-11 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageSquare size={14} className="mr-2" />
                  Enviar no WhatsApp
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-[2px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-cormorant text-graphite uppercase tracking-wider">Análise de Interesse (IA)</DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 size={32} className="text-bronze animate-spin mb-4" />
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">O Claude está analisando os dados...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-bronze/5 border border-bronze/10 p-4 rounded-[2px]">
                  <p className="text-sm text-graphite leading-relaxed whitespace-pre-wrap">
                    {analysisText}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-[#E8E4DF] pt-6 flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsAnalysisModalOpen(false)}
              className="rounded-[2px] uppercase tracking-widest text-[10px] font-bold h-11 flex-1 border-[#E8E4DF]"
            >
              Fechar
            </Button>
            <Button 
              onClick={handleGenerateFollowupFromAnalysis}
              disabled={isAnalyzing || !analysisText || analysisText.includes('Não foi possível') || analysisText.includes('Erro')}
              className="bg-bronze hover:bg-bronze/90 text-white rounded-[2px] uppercase tracking-widest text-[10px] font-bold h-11 flex-[2] disabled:opacity-50"
            >
              <MessageSquare size={16} className="mr-2" />
              Gerar Follow-up
            </Button>
          </DialogFooter>
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
                onAnalyze={() => handleAnalyzeEngagement(selectedProposal)}
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
