import React, { useState, useEffect } from 'react';
import { Lead, Stage, Temp, TipoProjeto, ConfigEscritorio, Origem } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import MetricsBar from '@/components/MetricsBar';
import KanbanColumn from '@/components/KanbanColumn';
import LeadDetailPanel from '@/components/LeadDetailPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  Settings2,
  Eye,
  Download,
  Users,
  X,
  TrendingUp,
  MapPin,
  Maximize2,
  Clock,
  LayoutGrid,
  Calendar
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';
import { 
  DndContext, 
  DragOverlay, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragEndEvent,
  DragOverEvent,
  closestCorners,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  sortableKeyboardCoordinates, 
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { toast } from "sonner";
import OriginBreakdown from '@/components/OriginBreakdown';
import LeadCard from '@/components/LeadCard';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STAGES: Stage[] = [
  'Novo Lead', 
  'Reunião Agendada', 
  'Briefing Preenchido',
  'Proposta Enviada', 
  'Negociação', 
  'Fechado', 
  'Perdido'
];

const Index = () => {
  const [user, setUser] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TipoProjeto | 'Todos'>('Todos');
  const [filterTemp, setFilterTemp] = useState<Temp[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [filterResponsavel, setFilterResponsavel] = useState<'Todos' | 'Leandro' | 'Neandro'>('Todos');
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);
  const [config, setConfig] = useState<ConfigEscritorio | null>(null);
  const [newLead, setNewLead] = useState({
    nome: '',
    whats: '',
    cidade: '',
    tipo: 'Arq+Int' as TipoProjeto,
    area: 0,
    orcamento: 0,
    origem: 'Instagram' as Origem,
    temp: 'Morno' as Temp,
    obs: ''
  });

  // Project Conversion State
  const [showProjectConversion, setShowProjectConversion] = useState(false);
  const [conversionLead, setConversionLead] = useState<Lead | null>(null);
  const [conversionHours, setConversionHours] = useState({
    briefing: 20,
    conceito: 40,
    estudo: 80,
    executivo: 100,
    detalhamento: 60,
    acompanhamento: 40
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('config_escritorio').select('*').single();
      if (data) setConfig(data as ConfigEscritorio);
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
          setUser(name.charAt(0).toUpperCase() + name.slice(1));
          sessionStorage.setItem('nl_user', name.charAt(0).toUpperCase() + name.slice(1));
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
        setUser(formattedName);
        sessionStorage.setItem('nl_user', formattedName);
      } else {
        setUser(null);
        sessionStorage.removeItem('nl_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchLeads();

    // Realtime subscriptions
    const leadsChannel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_logs' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, [session]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          logs:lead_logs(*)
        `)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Map Supabase data to our Lead type
      const mappedLeads: Lead[] = (leadsData || []).map((l: any) => ({
        ...l,
        logs: (l.logs || []).sort((a: any, b: any) => 
          new Date(b.data).getTime() - new Date(a.data).getTime()
        )
      }));

      setLeads(mappedLeads);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast.error('Erro ao carregar leads');
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTempFilter = (temp: Temp) => {
    setFilterTemp(prev => 
      prev.includes(temp) ? prev.filter(t => t !== temp) : [...prev, temp]
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = active.data.current?.lead;
    if (lead) setActiveLead(lead);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || activeData.type !== 'Lead') return;

    // Se estiver sobre uma coluna
    if (overData?.type === 'Column') {
      const overStage = overData.stage as Stage;
      const lead = leads.find(l => l.id === activeId);
      
      if (lead && lead.stage !== overStage) {
        const updateData = { 
          stage: overStage, 
          etapa_desde: new Date().toISOString(),
          fechado_em: overStage === 'Fechado' ? new Date().toISOString() : lead.fechado_em
        };

        const newLog = { 
          tipo: 'N' as const, 
          nota: `Movido para ${overStage}`, 
          data: new Date().toISOString(), 
          autor: user || 'Sistema' 
        };

        // Optimistic update
        setLeads(prev => prev.map(l => 
          l.id === activeId ? { 
            ...l, 
            ...updateData,
            logs: [newLog, ...l.logs]
          } : l
        ));

        // Background update
        Promise.all([
          supabase.from('leads').update(updateData).eq('id', activeId),
          supabase.from('lead_logs').insert({ ...newLog, lead_id: activeId })
        ]).then(() => {
          if (overStage === 'Fechado') {
            setConversionLead(lead);
            setShowProjectConversion(true);
          }
        }).catch(err => {
          console.error('Error updating stage:', err);
          toast.error('Erro ao salvar no banco');
          fetchLeads(); // Revert on error
        });
      }
      return;
    }

    // Se estiver sobre outro lead
    if (overData?.type === 'Lead') {
      const overLead = overData.lead as Lead;
      const activeLead = activeData.lead as Lead;
      
      if (activeLead.stage !== overLead.stage) {
        setLeads(prev => prev.map(l => 
          l.id === activeId ? { ...l, stage: overLead.stage, etapa_desde: new Date().toISOString() } : l
        ));
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);
    
    if (!over) return;
    
    if (active.id !== over.id) {
      const oldIndex = leads.findIndex(l => l.id === active.id);
      const newIndex = leads.findIndex(l => l.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setLeads(prev => arrayMove(prev, oldIndex, newIndex));
      }
    }
    
    const lead = leads.find(l => l.id === active.id);
    if (lead) {
      toast.success(`Lead atualizado`);
    }
  };

  const showMockToast = () => {
    const randomLead = leads[Math.floor(Math.random() * leads.length)];
    toast.custom((t) => (
      <div className="bg-[#1A1A1A] text-white p-4 rounded-[2px] shadow-2xl border-l-4 border-bronze flex items-center justify-between gap-4 min-w-[320px] animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-bronze/10 rounded-full">
            <Eye size={18} className="text-bronze" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest">{randomLead.nome} abriu a proposta agora</p>
            <p className="text-[9px] text-white/50">Módulo 04 · Tracking em tempo real</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setSelectedLeadId(randomLead.id);
            toast.dismiss(t);
          }}
          className="text-[9px] font-bold text-bronze uppercase tracking-widest hover:text-white transition-colors"
        >
          Ver Lead
        </button>
      </div>
    ), { duration: 6000, position: 'bottom-right' });
  };

  const handleUpdateStage = async (leadId: string, newStage: Stage) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const updateData = { 
      stage: newStage, 
      etapa_desde: new Date().toISOString(),
      fechado_em: newStage === 'Fechado' ? new Date().toISOString() : lead.fechado_em
    };

    const newLog = { 
      tipo: 'N' as const, 
      nota: `Movido para ${newStage}`, 
      data: new Date().toISOString(), 
      autor: user || 'Sistema' 
    };

    // Optimistic update
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { 
        ...l, 
        ...updateData,
        logs: [newLog, ...l.logs]
      } : l
    ));

    try {
      const { error: updateError } = await supabase.from('leads').update(updateData).eq('id', leadId);
      if (updateError) throw updateError;
      
      const { error: logError } = await supabase.from('lead_logs').insert({ ...newLog, lead_id: leadId });
      if (logError) throw logError;
      
      toast.success(`Lead movido para ${newStage}`);

      // Se foi fechado, abre o modal de conversão
      if (newStage === 'Fechado') {
        setConversionLead(lead);
        setShowProjectConversion(true);
      }
    } catch (err) {
      console.error('Error updating stage:', err);
      toast.error('Erro ao atualizar estágio');
      fetchLeads();
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadId);
      if (error) throw error;
      
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setSelectedLeadId(null);
      toast.success("Lead excluído com sucesso");
    } catch (err) {
      console.error('Error deleting lead:', err);
      toast.error('Erro ao excluir lead');
    }
  };

  const handleQuickNote = async (leadId: string, note: string) => {
    const log = {
      tipo: 'N' as const,
      nota: note,
      data: new Date().toISOString(),
      autor: user || 'Sistema'
    };
    
    try {
      const { data, error } = await supabase
        .from('lead_logs')
        .insert({ ...log, lead_id: leadId })
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, logs: [data as any, ...l.logs] } : l
      ));
      toast.success("Interação registrada");
    } catch (err) {
      console.error('Error adding quick note:', err);
      toast.error('Erro ao registrar interação');
    }
  };

  const handleAddLog = async (leadId: string, log: any) => {
    try {
      const { data, error } = await supabase
        .from('lead_logs')
        .insert({ ...log, lead_id: leadId })
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, logs: [data as any, ...l.logs] } : l
      ));
      toast.success("Contato registrado");
    } catch (err) {
      console.error('Error adding log:', err);
      toast.error('Erro ao registrar contato');
    }
  };

  const handleCreateLead = async () => {
    if (!newLead.nome || !newLead.whats || !newLead.cidade) {
      toast.error("Preencha o nome, WhatsApp e cidade");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          nome: newLead.nome,
          whats: newLead.whats,
          cidade: newLead.cidade,
          tipo: newLead.tipo,
          area: Number(newLead.area),
          orcamento: Number(newLead.orcamento),
          origem: newLead.origem,
          temp: newLead.temp,
          obs: newLead.obs,
          stage: 'Novo Lead',
          etapa_desde: new Date().toISOString(),
          criado_por: user || 'Sócio'
        })
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => [data as any, ...prev]);
      setIsNewLeadDialogOpen(false);
      setNewLead({
        nome: '',
        whats: '',
        cidade: '',
        tipo: 'Arq+Int',
        area: 0,
        orcamento: 0,
        origem: 'Instagram',
        temp: 'Morno',
        obs: ''
      });
      toast.success("Lead criado com sucesso");
    } catch (err) {
      console.error('Error creating lead:', err);
      toast.error('Erro ao criar lead');
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.nome.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'Todos' || l.tipo === filterType;
    const matchesTemp = filterTemp.length === 0 || filterTemp.includes(l.temp);
    
    let matchesResponsavel = true;
    if (filterResponsavel !== 'Todos') {
      const isCreator = l.criado_por === filterResponsavel;
      const isLogAuthor = l.logs.some(log => log.autor === filterResponsavel);
      matchesResponsavel = isCreator || isLogAuthor;
    }
    
    return matchesSearch && matchesType && matchesTemp && matchesResponsavel;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Cores NL
    const graphite = [26, 26, 26]; // #1A1A1A
    const bronze = [139, 115, 85]; // #8B7355

    // Capa
    doc.setFillColor(graphite[0], graphite[1], graphite[2]);
    doc.rect(0, 0, 210, 297, 'F');
    
    // Logo na Capa do PDF
    const logoUrl = "https://krzuroijejfozljhchok.supabase.co/storage/v1/object/public/assets/logo.png";
    // Adicionamos a logo com fundo transparente. No jsPDF, imagens remotas precisam ser carregadas ou convertidas.
    // Para simplificar e garantir funcionamento imediato, usaremos a URL direta se o jsPDF suportar ou apenas texto se falhar.
    try {
      doc.addImage(logoUrl, 'PNG', 65, 80, 80, 40); // Ajustado para ficar centralizado e maior no lugar do texto
    } catch (e) {
      console.error("Erro ao carregar logo no PDF:", e);
    }

    doc.setTextColor(bronze[0], bronze[1], bronze[2]);
    doc.setFontSize(24);
    doc.text('Pipeline de Leads', 105, 130, { align: 'center' });
    
    doc.setTextColor(255, 255, 255, 0.5);
    doc.setFontSize(10);
    doc.text(`Gerado em ${dateStr} às ${timeStr}`, 105, 140, { align: 'center' });

    doc.addPage();
    doc.setTextColor(graphite[0], graphite[1], graphite[2]);

    // Resumo Executivo
    doc.setFontSize(14);
    doc.setTextColor(bronze[0], bronze[1], bronze[2]);
    doc.text('RESUMO EXECUTIVO', 14, 20);
    
    const activeLeads = filteredLeads.filter(l => l.stage !== 'Fechado' && l.stage !== 'Perdido').length;
    const totalValue = filteredLeads.reduce((acc, l) => acc + (l.orcamento || 0), 0);
    
    doc.setFontSize(10);
    doc.setTextColor(graphite[0], graphite[1], graphite[2]);
    doc.text(`Leads Ativos: ${activeLeads}`, 14, 30);
    doc.text(`Volume Total: R$ ${(totalValue / 1000).toLocaleString('pt-BR')}k`, 14, 35);

    // Tabela por Etapa
    let yPos = 45;
    STAGES.forEach(stage => {
      const stageLeads = filteredLeads.filter(l => l.stage === stage);
      if (stageLeads.length === 0) return;

      doc.setFontSize(12);
      doc.setTextColor(bronze[0], bronze[1], bronze[2]);
      doc.text(stage.toUpperCase(), 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Nome', 'Tipo', 'Cidade', 'Orçamento', 'Score', 'Dias']],
        body: stageLeads.map(l => [
          l.nome,
          l.tipo,
          l.cidade,
          `R$ ${(l.orcamento / 1000).toLocaleString('pt-BR')}k`,
          l.score,
          Math.floor((new Date().getTime() - new Date(l.etapa_desde).getTime()) / (1000 * 60 * 60 * 24))
        ]),
        headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
    });

    // Rodapé em todas as páginas
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`NL Arquitetos · São José dos Campos · gerado em ${dateStr}`, 105, 285, { align: 'center' });
    }

    doc.save(`Pipeline_NL_OS_${dateStr.replace(/\//g, '-')}.pdf`);
    toast.success('Pipeline exportado com sucesso');
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar user={user} />
      
      <main className="flex-1 ml-[230px] flex flex-col h-screen overflow-hidden">
        {/* Header Section */}


        {/* Header Section */}
        <div className="flex-shrink-0 bg-[#0A0A0A] z-10">
          <div className="px-10 py-6 border-b border-white/10 flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-cormorant text-white tracking-tight leading-none uppercase">Pipeline de Leads</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-medium">Captação e conversão de clientes</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-bronze transition-colors" />
                <Input 
                  placeholder="BUSCAR LEAD..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-72 h-10 pl-10 bg-[#0A0A0A] border-white/10 focus:border-bronze focus:ring-0 rounded-[2px] text-[10px] tracking-widest uppercase"
                />
              </div>
              <div className="h-8 w-[1px] bg-white/10" />
              <div className="flex items-center gap-3">
                <button 
                  onClick={exportToPDF}
                  className="p-2 text-white/40 hover:text-bronze transition-colors"
                  title="Exportar Pipeline"
                >
                  <Download size={18} />
                </button>
                <Dialog open={isNewLeadDialogOpen} onOpenChange={setIsNewLeadDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="h-10 px-8 bg-graphite hover:bg-bronze text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 rounded-[2px] flex items-center gap-3 group">
                      <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                      Novo Lead
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[550px] bg-white border-none rounded-[4px] p-0 overflow-hidden">
                    <div className="bg-graphite p-6">
                      <DialogTitle className="font-cormorant text-2xl font-bold text-white uppercase tracking-tight">Captação de Novo Lead</DialogTitle>
                      <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] mt-1">Módulo 01 · Registro inicial no ecossistema NL</p>
                    </div>
                    
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-custom">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-dm-mono text-white/40 uppercase tracking-widest">Nome do Cliente</label>
                          <Input 
                            value={newLead.nome} 
                            onChange={(e) => setNewLead({ ...newLead, nome: e.target.value })}
                            placeholder="Ex: João Silva"
                            className="h-10 border-white/10 text-xs font-dm-mono focus:border-bronze"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-dm-mono text-white/40 uppercase tracking-widest">WhatsApp</label>
                          <Input 
                            value={newLead.whats} 
                            onChange={(e) => setNewLead({ ...newLead, whats: e.target.value })}
                            placeholder="(00) 00000-0000"
                            className="h-10 border-white/10 text-xs font-dm-mono focus:border-bronze"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-dm-mono text-white/40 uppercase tracking-widest">Cidade</label>
                          <Select 
                            value={newLead.cidade} 
                            onValueChange={(val) => setNewLead({ ...newLead, cidade: val })}
                          >
                            <SelectTrigger className="h-10 border-white/10 text-xs font-dm-mono focus:border-bronze">
                              <SelectValue placeholder="Selecione a cidade" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1A1A1A] border border-white/10 text-white">
                              {config?.mercados?.map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                              <SelectItem value="Outra cidade">Outra cidade</SelectItem>
                             </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-dm-mono text-white/40 uppercase tracking-widest">Tipo de Projeto</label>
                          <Select 
                            value={newLead.tipo} 
                            onValueChange={(val: TipoProjeto) => setNewLead({ ...newLead, tipo: val })}
                          >
                            <SelectTrigger className="h-10 border-white/10 text-xs font-dm-mono focus:border-bronze">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1A1A1A] border border-white/10 text-white">
                              <SelectItem value="Arq+Int">Arquitetura + Interiores</SelectItem>
                              <SelectItem value="Interiores">Somente Interiores</SelectItem>
                              <SelectItem value="Comercial">Comercial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-dm-mono text-white/40 uppercase tracking-widest">Área Estimada (m²)</label>
                          <Input 
                            type="number"
                            value={newLead.area || ''} 
                            onChange={(e) => setNewLead({ ...newLead, area: Number(e.target.value) })}
                            placeholder="0"
                             className="h-10 border-white/10 text-xs font-dm-mono focus:border-bronze bg-[#1A1A1A] text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-dm-mono text-white/40 uppercase tracking-widest">Orçamento (R$)</label>
                          <Input 
                            type="number"
                            value={newLead.orcamento || ''} 
                            onChange={(e) => setNewLead({ ...newLead, orcamento: Number(e.target.value) })}
                            placeholder="0"
                             className="h-10 border-white/10 text-xs font-dm-mono focus:border-bronze bg-[#1A1A1A] text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-dm-mono text-white/40 uppercase tracking-widest">Origem</label>
                          <Select 
                            value={newLead.origem} 
                            onValueChange={(val: Origem) => setNewLead({ ...newLead, origem: val })}
                          >
                            <SelectTrigger className="h-10 border-white/10 text-xs font-dm-mono focus:border-bronze">
                              <SelectValue />
                            </SelectTrigger>
                             <SelectContent className="bg-[#1A1A1A] border border-white/10 text-white">
                              <SelectItem value="Instagram">Instagram</SelectItem>
                              <SelectItem value="Indicação">Indicação</SelectItem>
                              <SelectItem value="Site">Site</SelectItem>
                              <SelectItem value="Google">Google Ads</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-dm-mono text-white/40 uppercase tracking-widest">Temperatura</label>
                          <div className="flex gap-2">
                            {(['Quente', 'Morno', 'Frio'] as Temp[]).map(t => (
                              <button
                                key={t}
                                onClick={() => setNewLead({ ...newLead, temp: t })}
                                className={cn(
                                  "flex-1 h-10 border text-[9px] font-bold uppercase tracking-widest rounded-[2px] transition-all",
                                  newLead.temp === t 
                                    ? (t === 'Quente' ? "bg-red text-white border-red" : t === 'Morno' ? "bg-amber text-white border-amber" : "bg-graphite text-white border-graphite")
                                    : "border-white/10 text-white/40 hover:border-bronze"
                                )}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-dm-mono text-white/40 uppercase tracking-widest">Observações Iniciais</label>
                        <textarea 
                          value={newLead.obs}
                          onChange={(e) => setNewLead({ ...newLead, obs: e.target.value })}
                          className="w-full min-h-[100px] p-4 border border-white/10 text-xs font-dm-mono focus:border-bronze outline-none rounded-[2px] resize-none bg-[#1A1A1A] text-white"
                          placeholder="Notas sobre o primeiro contato..."
                        />
                      </div>

                      <Button 
                        onClick={handleCreateLead}
                        className="w-full h-14 bg-graphite hover:bg-bronze text-white text-[11px] tracking-[0.3em] uppercase font-bold transition-all duration-300 rounded-[2px]"
                      >
                        Criar Lead no Pipeline
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <MetricsBar leads={leads} />
          <OriginBreakdown leads={leads} />

          <div className="px-10 py-4 border-b border-white/10 flex items-center justify-between bg-[#0A0A0A] shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative">
            <div className="flex items-center gap-3">
              <button 
                onClick={showMockToast}
                className="p-2 border border-white/10 rounded-[2px] text-white/40 hover:text-bronze transition-colors"
                title="Simular proposta aberta"
              >
                <Settings2 size={14} />
              </button>
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-[2px]">
                {(['Todos', 'Arq+Int', 'Interiores', 'Comercial'] as const).map(type => (
                  <button key={type} onClick={() => setFilterType(type)} className={cn("px-5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 rounded-[1px]", filterType === type ? "bg-bronze text-white shadow-sm" : "text-white/40 hover:text-white")}>{type}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Responsável:</span>
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-[2px]">
                  {(['Todos', 'Leandro', 'Neandro'] as const).map(resp => (
                    <button 
                      key={resp} 
                      onClick={() => setFilterResponsavel(resp)} 
                      className={cn(
                        "px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 rounded-[1px] flex items-center gap-2", 
                        filterResponsavel === resp ? "bg-bronze text-white shadow-sm" : "text-white/40 hover:text-white"
                      )}
                    >
                      {resp === 'Todos' ? <Users size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-bronze" />}
                      {resp}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Prioridade:</span>
                <div className="flex items-center gap-2">
                  {(['Quente', 'Morno', 'Frio'] as Temp[]).map(temp => (
                    <button key={temp} onClick={() => toggleTempFilter(temp)} className={cn("flex items-center gap-2.5 px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 border rounded-[1px]", filterTemp.includes(temp) ? "border-bronze text-white bg-bronze" : "border-white/10 text-white/40 hover:text-white hover:border-white/20")}><div className={cn("w-1.5 h-1.5 rounded-full", temp === 'Quente' ? "bg-red" : temp === 'Morno' ? "bg-amber" : "bg-white/40")} />{temp}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/40 hover:text-white cursor-pointer transition-colors"><span className="text-[9px] font-bold uppercase tracking-widest">Ordenar: Score ↓</span><ChevronDown size={14} /></div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 bg-[#0A0A0A] overflow-y-auto p-6 pt-2 scrollbar-custom">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToWindowEdges]}
          >
            <div className="grid grid-cols-6 h-full gap-4">
              {STAGES.map(stage => (
                <KanbanColumn 
                  key={stage}
                  stage={stage}
                  leads={filteredLeads.filter(l => l.stage === stage)}
                  onLeadClick={(lead) => setSelectedLeadId(lead.id)}
                  onUpdateStatus={handleUpdateStage}
                  onQuickNote={handleQuickNote}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: {
                    opacity: '0.4',
                  },
                },
              }),
            }}>
              {activeLead ? (
                <LeadCard 
                  lead={activeLead} 
                  index={0} 
                  onClick={() => {}} 
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </main>

      {selectedLead && (
        <LeadDetailPanel 
          lead={selectedLead}
          onClose={() => setSelectedLeadId(null)}
          onUpdateStage={handleUpdateStage}
          onDelete={handleDeleteLead}
          onAddLog={handleAddLog}
        />
      )}

      {/* Project Conversion Modal */}
      <Dialog open={showProjectConversion} onOpenChange={setShowProjectConversion}>
        <DialogContent className="bg-[#1A1A1A] border-white/5 text-white rounded-none p-0 max-w-md">
          <div className="p-8">
            <h2 className="text-2xl font-cormorant font-bold mb-1">Converter em Projeto?</h2>
            <p className="text-[11px] text-white/40 mb-8 font-mono">{conversionLead?.nome} acabou de ser fechado. Deseja criar o projeto no Controle de Horas?</p>
            
            <div className="space-y-6">
              <div className="p-4 bg-white/5 border border-white/10 rounded-none space-y-2">
                <p className="text-[10px] uppercase font-bold tracking-widest text-bronze">Resumo do Lead</p>
                <div className="grid grid-cols-2 gap-4 text-[11px]">
                  <div>
                    <span className="text-white/30 block text-[9px] uppercase">Nome</span>
                    {conversionLead?.nome}
                  </div>
                  <div>
                    <span className="text-white/30 block text-[9px] uppercase">Cliente</span>
                    {conversionLead?.nome}
                  </div>
                  <div>
                    <span className="text-white/30 block text-[9px] uppercase">Tipo</span>
                    {conversionLead?.tipo} · {conversionLead?.area}m²
                  </div>
                  <div>
                    <span className="text-white/30 block text-[9px] uppercase">Valor</span>
                    R$ {conversionLead?.orcamento?.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] uppercase font-bold tracking-widest text-white/40">Horas Estimadas</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {[
                    { id: 'briefing', label: 'Briefing' },
                    { id: 'conceito', label: 'Conceito' },
                    { id: 'estudo', label: 'Estudo' },
                    { id: 'executivo', label: 'Executivo' },
                    { id: 'detalhamento', label: 'Detalhamento' },
                    { id: 'acompanhamento', label: 'Acompanhamento' },
                  ].map(h => (
                    <div key={h.id}>
                      <label className="text-[9px] uppercase text-white/30 block mb-1.5">{h.label}</label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number"
                          value={(conversionHours as any)[h.id]}
                          onChange={(e) => setConversionHours({...conversionHours, [h.id]: Number(e.target.value)})}
                          className="bg-white/5 border-white/10 text-white rounded-none h-9 text-xs"
                        />
                        <span className="text-[9px] text-white/30 uppercase">h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="ghost" onClick={() => setShowProjectConversion(false)} className="flex-1 rounded-none text-[10px] uppercase font-bold text-white/40 hover:text-white">Agora não</Button>
                <Button 
                  onClick={async () => {
                    if (!conversionLead) return;
                    try {
                      const { error } = await supabase.from('projetos').insert({
                        nome: conversionLead.nome,
                        nome_cliente: conversionLead.nome,
                        cliente_id: conversionLead.id,
                        tipo: conversionLead.tipo,
                        area_m2: conversionLead.area,
                        valor_proposta: conversionLead.orcamento,
                        horas_estimadas: conversionHours.briefing + conversionHours.conceito + conversionHours.estudo + conversionHours.executivo + conversionHours.detalhamento + conversionHours.acompanhamento,
                        horas_briefing: conversionHours.briefing,
                        horas_conceito: conversionHours.conceito,
                        horas_anteprojeto: conversionHours.estudo,
                        horas_executivo: conversionHours.executivo,
                        horas_detalhamento: conversionHours.detalhamento,
                        horas_acompanhamento: conversionHours.acompanhamento,
                        status_geral: 'ativo'
                      });
                      if (error) throw error;
                      toast.success("Projeto criado no Controle de Horas!");
                      setShowProjectConversion(false);
                    } catch (err) {
                      toast.error("Erro ao criar projeto");
                    }
                  }}
                  className="flex-1 bg-bronze hover:bg-bronze/90 text-white rounded-none h-12 text-[10px] uppercase font-bold tracking-widest"
                >
                  Criar Projeto
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Index;