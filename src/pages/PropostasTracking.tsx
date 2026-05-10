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
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Proposal {
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
          )
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

  const handleGenerateFollowup = async (proposal: Proposal) => {
    try {
      setIsGeneratingFollowup(true);
      setFollowupMessage('');
      setIsFollowupModalOpen(true);

      const { data, error } = await supabase.functions.invoke('generate-followup', {
        body: { proposal }
      });

      if (error) throw error;
      setFollowupMessage(data.message);
    } catch (error) {
      console.error('Error generating follow-up:', error);
      toast.error('Erro ao gerar follow-up. Verifique se a função está implantada.');
      setIsFollowupModalOpen(false);
    } finally {
      setIsGeneratingFollowup(false);
    }
  };

  const copyFollowupMessage = () => {
    navigator.clipboard.writeText(followupMessage);
    toast.success('Mensagem copiada!');
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
              <h1 className="text-3xl font-bold tracking-tight text-graphite font-cormorant">04 · Tracking de Propostas</h1>
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

          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'Total Enviadas', value: proposals.length, icon: Send },
              { label: 'Aguardando', value: proposals.filter(p => p.status === 'Enviada' || p.status === 'Vista').length, icon: Clock },
              { label: 'Aprovadas', value: proposals.filter(p => p.status === 'Aprovada').length, icon: CheckCircle2 },
              { label: 'Taxa de Conversão', value: `${proposals.length > 0 ? Math.round((proposals.filter(p => p.status === 'Aprovada').length / proposals.length) * 100) : 0}%`, icon: History },
            ].map((m, i) => (
              <div 
                key={i}
                className="bg-white p-6 rounded-[2px] border border-[#E8E4DF] shadow-sm relative overflow-hidden group"
              >
                <div className="relative z-10">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-bold">{m.label}</p>
                  <h2 className="text-2xl font-bold text-[#1A1A1A]">{m.value}</h2>
                </div>
                <m.icon size={40} className="absolute right-[-10px] bottom-[-10px] text-bronze/5 group-hover:text-bronze/10 transition-colors" />
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
                  className="bg-white border border-[#E8E4DF] rounded-[2px] overflow-hidden hover:border-bronze/30 transition-all group flex flex-col"
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

                    <div className="flex items-center gap-4 py-3 border-y border-dashed border-[#E8E4DF] mb-4">
                      <div className="flex items-center gap-2">
                        <Eye size={12} className="text-bronze" />
                        <span className="text-[10px] font-medium">Aberta {p.views_count} vezes</span>
                      </div>
                      {p.last_view_at && (
                        <div className="flex items-center gap-2 border-l border-[#E8E4DF] pl-4">
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Último acesso:</span>
                          <span className="text-[10px] font-medium">{format(new Date(p.last_view_at), 'dd/MM HH:mm')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-[#FDFDFD] border-t border-[#E8E4DF] space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(p)}
                        className="rounded-[2px] text-[9px] font-bold uppercase tracking-widest h-8 border-[#E8E4DF]"
                      >
                        <Copy size={12} className="mr-2" />
                        Link
                      </Button>
                      
                      <Select onValueChange={(val) => handleStatusUpdate(p.id, val)}>
                        <SelectTrigger className="rounded-[2px] text-[9px] font-bold uppercase tracking-widest h-8 border-[#E8E4DF] bg-white">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Enviada">Enviada</SelectItem>
                          <SelectItem value="Vista">Vista</SelectItem>
                          <SelectItem value="Aprovada">Aprovada</SelectItem>
                          <SelectItem value="Recusada">Recusada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateFollowup(p)}
                      className="w-full rounded-[2px] text-[9px] font-bold uppercase tracking-widest h-8 border-[#E8E4DF] hover:bg-bronze hover:text-white hover:border-bronze transition-colors"
                    >
                      <MessageSquare size={12} className="mr-2" />
                      Gerar Follow-up
                    </Button>
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

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsFollowupModalOpen(false)}
              className="rounded-[2px] uppercase tracking-widest text-[10px] font-bold h-11 px-8"
            >
              Fechar
            </Button>
            {!isGeneratingFollowup && (
              <Button 
                onClick={copyFollowupMessage}
                className="bg-bronze hover:bg-bronze/90 text-white rounded-[2px] uppercase tracking-widest text-[10px] font-bold h-11 px-8"
              >
                <Copy size={14} className="mr-2" />
                Copiar Mensagem
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropostasTracking;
