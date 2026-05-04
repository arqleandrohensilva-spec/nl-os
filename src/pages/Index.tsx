import React, { useState } from 'react';
import { initialLeads, Lead, Stage, Temp, TipoProjeto } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import MetricsBar from '@/components/MetricsBar';
import KanbanColumn from '@/components/KanbanColumn';
import LeadDetailPanel from '@/components/LeadDetailPanel';
import Login from '@/components/Login';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  Settings2,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragEndEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { toast } from "sonner";
import OriginBreakdown from '@/components/OriginBreakdown';
import LeadCard from '@/components/LeadCard';

const STAGES: Stage[] = [
  'Novo Lead', 
  'Reunião Agendada', 
  'Proposta Enviada', 
  'Negociação', 
  'Fechado', 
  'Perdido'
];

const Index = () => {
  const [user, setUser] = useState<string | null>(() => sessionStorage.getItem('nl_user'));
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TipoProjeto | 'Todos'>('Todos');
  const [filterTemp, setFilterTemp] = useState<Temp[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;

  const handleLogin = (username: string) => {
    sessionStorage.setItem('nl_user', username);
    setUser(username);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const toggleTempFilter = (temp: Temp) => {
    setFilterTemp(prev => 
      prev.includes(temp) ? prev.filter(t => t !== temp) : [...prev, temp]
    );
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId as Stage;
    handleUpdateStage(draggableId, newStage);
  };

  const handleUpdateStage = (leadId: string, newStage: Stage) => {
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, stage: newStage, etapa_desde: new Date().toISOString() } : l
    ));
    toast.success(`Lead movido para ${newStage}`);
  };

  const handleDeleteLead = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setSelectedLeadId(null);
    toast.success("Lead excluído com sucesso");
  };

  const handleAddLog = (leadId: string, log: any) => {
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, logs: [log, ...l.logs] } : l
    ));
    toast.success("Contato registrado");
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.nome.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'Todos' || l.tipo === filterType;
    const matchesTemp = filterTemp.length === 0 || filterTemp.includes(l.temp);
    return matchesSearch && matchesType && matchesTemp;
  });

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
              <Button className="h-10 bg-[#1A1A1A] hover:bg-bronze transition-all duration-300 rounded-[2px] text-[10px] uppercase tracking-[0.2em] px-8 gap-3 font-bold font-mono">
                + Novo Lead
              </Button>
            </div>
          </div>

          <MetricsBar leads={leads} />

          <div className="px-10 py-4 border-b border-beige flex items-center justify-between bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <div className="p-2 border border-beige rounded-[2px] text-muted"><Settings2 size={14} /></div>
              <div className="flex items-center gap-1 bg-beige/20 p-1 rounded-[2px]">
                {(['Todos', 'Arq+Int', 'Interiores', 'Comercial'] as const).map(type => (
                  <button key={type} onClick={() => setFilterType(type)} className={cn("px-5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 rounded-[1px]", filterType === type ? "bg-white text-graphite shadow-sm" : "text-muted hover:text-graphite")}>{type}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-8">
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
          <DragDropContext onDragEnd={onDragEnd}>
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
          </DragDropContext>
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