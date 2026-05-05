import React, { useState, useEffect } from 'react';
import { Lead, Stage, Temp, TipoProjeto } from '@/lib/types';
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
  Users
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

const STAGES: Stage[] = [
  'Novo Lead', 
  'Reunião Agendada', 
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
    // Check current session
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
          setUser(name.charAt(0).toUpperCase() + name.slice(1));
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
        setUser(name.charAt(0).toUpperCase() + name.slice(1));
      } else {
        setUser(null);
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
        ]).catch(err => {
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
      await Promise.all([
        supabase.from('leads').update(updateData).eq('id', leadId),
        supabase.from('lead_logs').insert({ ...newLog, lead_id: leadId })
      ]);
      toast.success(`Lead movido para ${newStage}`);
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
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(40);
    doc.text('NL OS', 105, 100, { align: 'center' });
    
    doc.setTextColor(bronze[0], bronze[1], bronze[2]);
    doc.setFontSize(24);
    doc.text('Pipeline de Leads', 105, 120, { align: 'center' });
    
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
    <div className="flex min-h-screen bg-[#FDFDFD]">
      <Sidebar user={user} />
      
      <main className="flex-1 ml-[230px] flex flex-col h-screen overflow-hidden">
        {/* Header Section */}
        <div className="flex-shrink-0 bg-white z-10">
          <div className="px-10 py-6 border-b border-beige flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-cormorant text-graphite tracking-tight leading-none uppercase">Pipeline de Leads</h1>
              <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-medium">Captação e conversão de clientes</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-bronze transition-colors" />
                <Input 
                  placeholder="BUSCAR LEAD..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-72 h-10 pl-10 bg-[#FAFAFA] border-beige focus:border-bronze focus:ring-0 rounded-[2px] text-[10px] tracking-widest uppercase"
                />
              </div>
              <div className="h-8 w-[1px] bg-beige" />
              <div className="flex items-center gap-3">
                <button 
                  onClick={exportToPDF}
                  className="p-2 text-muted hover:text-bronze transition-colors"
                  title="Exportar Pipeline"
                >
                  <Download size={18} />
                </button>
                <Button className="h-10 bg-[#1A1A1A] hover:bg-bronze transition-all duration-300 rounded-[2px] text-[10px] uppercase tracking-[0.2em] px-8 gap-3 font-bold font-mono">
                  + Novo Lead
                </Button>
              </div>
            </div>
          </div>

          <MetricsBar leads={leads} />
          <OriginBreakdown leads={leads} />

          <div className="px-10 py-4 border-b border-beige flex items-center justify-between bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative">
            <div className="flex items-center gap-3">
              <button 
                onClick={showMockToast}
                className="p-2 border border-beige rounded-[2px] text-muted hover:text-bronze transition-colors"
                title="Simular proposta aberta"
              >
                <Settings2 size={14} />
              </button>
              <div className="flex items-center gap-1 bg-beige/20 p-1 rounded-[2px]">
                {(['Todos', 'Arq+Int', 'Interiores', 'Comercial'] as const).map(type => (
                  <button key={type} onClick={() => setFilterType(type)} className={cn("px-5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 rounded-[1px]", filterType === type ? "bg-white text-graphite shadow-sm" : "text-muted hover:text-graphite")}>{type}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Responsável:</span>
                <div className="flex items-center gap-1 bg-beige/20 p-1 rounded-[2px]">
                  {(['Todos', 'Leandro', 'Neandro'] as const).map(resp => (
                    <button 
                      key={resp} 
                      onClick={() => setFilterResponsavel(resp)} 
                      className={cn(
                        "px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 rounded-[1px] flex items-center gap-2", 
                        filterResponsavel === resp ? "bg-white text-graphite shadow-sm" : "text-muted hover:text-graphite"
                      )}
                    >
                      {resp === 'Todos' ? <Users size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-bronze" />}
                      {resp}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Prioridade:</span>
                <div className="flex items-center gap-2">
                  {(['Quente', 'Morno', 'Frio'] as Temp[]).map(temp => (
                    <button key={temp} onClick={() => toggleTempFilter(temp)} className={cn("flex items-center gap-2.5 px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 border rounded-[1px]", filterTemp.includes(temp) ? "border-bronze text-graphite bg-bronze/5" : "border-beige text-muted hover:border-muted-foreground")}><div className={cn("w-1.5 h-1.5 rounded-full", temp === 'Quente' ? "bg-red" : temp === 'Morno' ? "bg-amber" : "bg-muted")} />{temp}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted hover:text-graphite cursor-pointer transition-colors"><span className="text-[9px] font-bold uppercase tracking-widest">Ordenar: Score ↓</span><ChevronDown size={14} /></div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 bg-[#FAFAFA] overflow-hidden p-6 pt-2">
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
    </div>
  );
};

export default Index;