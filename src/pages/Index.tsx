import React, { useState } from 'react';
import { initialLeads, Lead, Stage, Temp, TipoProjeto } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import MetricsBar from '@/components/MetricsBar';
import KanbanColumn from '@/components/KanbanColumn';
import Login from '@/components/Login';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  Settings2,
  X,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { toast } from "sonner";

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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStage = destination.droppableId as Stage;
    const leadId = draggableId;

    setLeads(prevLeads => {
      const updatedLeads = prevLeads.map(lead => {
        if (lead.id === leadId) {
          if (lead.stage !== newStage) {
            toast.success(`Lead movido para ${newStage}`);
            return {
              ...lead,
              stage: newStage,
              etapa_desde: new Date().toISOString()
            };
          }
        }
        return lead;
      });
      return updatedLeads;
    });
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
                <Plus size={16} /> + Novo Lead
              </Button>
            </div>
          </div>

          <MetricsBar leads={leads} />

          {/* Filters Toolbar */}
          <div className="px-10 py-4 border-b border-beige flex items-center justify-between bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <div className="p-2 border border-beige rounded-[2px] text-muted">
                <Settings2 size={14} />
              </div>
              <div className="flex items-center gap-1 bg-beige/20 p-1 rounded-[2px]">
                {(['Todos', 'Arq+Int', 'Interiores', 'Comercial'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "px-5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 rounded-[1px]",
                      filterType === type 
                        ? "bg-white text-graphite shadow-sm" 
                        : "text-muted hover:text-graphite"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Prioridade:</span>
                <div className="flex items-center gap-2">
                  {(['Quente', 'Morno', 'Frio'] as Temp[]).map(temp => (
                    <button
                      key={temp}
                      onClick={() => toggleTempFilter(temp)}
                      className={cn(
                        "flex items-center gap-2.5 px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 border rounded-[1px]",
                        filterTemp.includes(temp) 
                          ? "border-bronze text-graphite bg-bronze/5" 
                          : "border-beige text-muted hover:border-muted-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        temp === 'Quente' ? "bg-red" : temp === 'Morno' ? "bg-amber" : "bg-muted"
                      )} />
                      {temp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-muted hover:text-graphite cursor-pointer transition-colors">
                <span className="text-[9px] font-bold uppercase tracking-widest">Ordenar: Score ↓</span>
                <ChevronDown size={14} />
              </div>
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
                  onLeadClick={setSelectedLead}
                />
              ))}
            </div>
          </DragDropContext>
        </div>
      </main>

      {/* Detail Panel Slide-in */}
      {selectedLead && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div 
            className="absolute inset-0 bg-graphite/40 backdrop-blur-[2px] animate-in fade-in duration-300" 
            onClick={() => setSelectedLead(null)} 
          />
          <div className="relative w-[500px] h-full bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-500 ease-out">
            <div className="h-full flex flex-col">
              {/* Panel Header */}
              <div className="p-10 border-b border-beige relative">
                <button 
                  onClick={() => setSelectedLead(null)} 
                  className="absolute right-8 top-8 p-2 hover:bg-beige/30 rounded-full transition-colors group"
                >
                  <X className="w-5 h-5 text-muted group-hover:text-graphite" />
                </button>

                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 border border-beige flex items-center justify-center text-bronze font-cormorant text-2xl group-hover:border-bronze transition-colors">
                    {selectedLead.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-cormorant text-graphite tracking-tight">{selectedLead.nome}</h2>
                      <span className="px-2 py-0.5 bg-bronze/5 text-bronze border border-bronze/20 text-[8px] font-bold uppercase tracking-widest">
                        Score {selectedLead.score}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted">{selectedLead.tipo}</span>
                      <span className="w-1 h-1 bg-beige rounded-full self-center" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted">{selectedLead.cidade}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-10 space-y-12">
                <section>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted mb-6">Progresso Atual</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {STAGES.map((s, idx) => {
                      const isPast = STAGES.indexOf(selectedLead.stage) > idx;
                      const isCurrent = selectedLead.stage === s;
                      return (
                        <div key={s} className="space-y-2">
                          <div className={cn(
                            "h-[2px] w-full transition-all duration-500",
                            isPast || isCurrent ? "bg-bronze" : "bg-beige"
                          )} />
                          <p className={cn(
                            "text-[7px] font-bold uppercase tracking-tighter leading-tight",
                            isCurrent ? "text-bronze" : "text-muted opacity-60"
                          )}>
                            {s}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-10">
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Inteligência do Lead</h4>
                    <div className="space-y-4">
                      <div className="p-4 border border-beige rounded-[2px] bg-[#FAFAFA]">
                        <p className="text-[8px] font-bold text-muted uppercase tracking-widest mb-1">Orçamento Est.</p>
                        <p className="text-lg font-cormorant text-graphite">R$ {(selectedLead.orcamento / 1000).toLocaleString('pt-BR')}k</p>
                      </div>
                      <div className="p-4 border border-beige rounded-[2px]">
                        <p className="text-[8px] font-bold text-muted uppercase tracking-widest mb-1">Área M²</p>
                        <p className="text-lg font-cormorant text-graphite">{selectedLead.area} m²</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Comunicações</h4>
                    <div className="space-y-3">
                      <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] rounded-[2px] text-[9px] uppercase tracking-widest font-bold h-10 gap-2">
                        WhatsApp do Studio
                      </Button>
                      <Button variant="outline" className="w-full border-beige rounded-[2px] text-[9px] uppercase tracking-widest font-bold h-10">
                        Agendar Reunião
                      </Button>
                    </div>
                  </section>
                </div>

                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Histórico de Atividades</h4>
                    <Button variant="link" className="text-[9px] uppercase tracking-widest font-bold text-bronze p-0 h-auto">Add Nota</Button>
                  </div>
                  <div className="space-y-6">
                    {selectedLead.logs.map((log, i) => (
                      <div key={i} className="flex gap-4 relative">
                        {i !== selectedLead.logs.length - 1 && (
                          <div className="absolute left-[13px] top-8 bottom-[-24px] w-[1px] bg-beige" />
                        )}
                        <div className="w-7 h-7 border border-beige rounded-full flex items-center justify-center text-[9px] font-bold text-muted bg-white shrink-0">
                          {log.tipo}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-graphite uppercase tracking-tighter">{log.autor}</span>
                            <span className="text-[9px] text-muted tracking-tighter">{log.data}</span>
                          </div>
                          <p className="text-[11px] text-muted leading-relaxed">{log.nota}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Panel Footer */}
              <div className="p-10 border-t border-beige bg-[#FAFAFA] flex gap-4">
                <Button variant="outline" className="flex-1 border-beige rounded-[2px] text-[10px] uppercase tracking-widest font-bold h-12 hover:bg-red/5 hover:border-red/20 hover:text-red transition-all">
                  Arquivar Lead
                </Button>
                <Button className="flex-[2] bg-graphite hover:bg-bronze rounded-[2px] text-[10px] uppercase tracking-widest font-bold h-12">
                  Atualizar Etapa
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
