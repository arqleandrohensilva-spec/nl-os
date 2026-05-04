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
  Filter,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.nome.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'Todos' || l.tipo === filterType;
    const matchesTemp = filterTemp.length === 0 || filterTemp.includes(l.temp);
    return matchesSearch && matchesType && matchesTemp;
  });

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar user={user} />
      
      <main className="flex-1 ml-[230px] flex flex-col h-screen overflow-hidden">
        {/* Header Section */}
        <div className="flex-shrink-0">
          <div className="px-8 py-4 border-b border-beige flex items-center justify-between">
            <h1 className="text-xl font-medium uppercase tracking-[0.2em] text-graphite">01 · Pipeline de Leads</h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input 
                  placeholder="BUSCAR CLIENTE..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 h-9 pl-9 border-beige focus:border-bronze rounded-none text-[10px] tracking-wider uppercase"
                />
              </div>
              <Button className="h-9 bg-graphite hover:bg-bronze rounded-none text-[10px] uppercase tracking-widest px-6 gap-2">
                <Plus className="w-4 h-4" /> Novo Lead
              </Button>
            </div>
          </div>

          <MetricsBar leads={leads} />

          {/* Filters Toolbar */}
          <div className="px-8 py-4 border-b border-beige flex items-center justify-between bg-white/50">
            <div className="flex items-center gap-2">
              {(['Todos', 'Arq+Int', 'Interiores', 'Comercial'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-4 py-1.5 text-[9px] uppercase tracking-widest transition-all duration-200",
                    filterType === type 
                      ? "bg-graphite text-white" 
                      : "border border-beige text-muted hover:border-graphite"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 pr-4 border-r border-beige">
                {(['Quente', 'Morno', 'Frio'] as Temp[]).map(temp => (
                  <button
                    key={temp}
                    onClick={() => toggleTempFilter(temp)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-[9px] uppercase tracking-widest transition-all duration-200 border border-beige",
                      filterTemp.includes(temp) ? "border-graphite bg-graphite/5" : "text-muted hover:border-graphite"
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

              <div className="flex items-center gap-2 text-muted hover:text-graphite cursor-pointer">
                <span className="text-[9px] uppercase tracking-widest">Ordenar por: Score ↓</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#fafafa]">
          <div className="flex h-full p-8 gap-6 min-w-max">
            {STAGES.map(stage => (
              <KanbanColumn 
                key={stage}
                stage={stage}
                leads={filteredLeads.filter(l => l.stage === stage)}
                onLeadClick={setSelectedLead}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Detail Panel Placeholder - would be implemented in next step */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
          <div className="relative w-[400px] h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-8">
               <div className="flex justify-between items-start mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-bronze/10 flex items-center justify-center text-bronze font-bold text-lg">
                      {selectedLead.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-cormorant text-graphite leading-tight">{selectedLead.nome}</h2>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[8px] uppercase tracking-widest border border-beige px-1.5 py-0.5 text-muted">{selectedLead.tipo}</span>
                        <span className="text-[8px] uppercase tracking-widest border border-beige px-1.5 py-0.5 text-muted">{selectedLead.origem}</span>
                      </div>
                    </div>
                 </div>
                 <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-beige/50 rounded-full">
                    <X className="w-5 h-5 text-muted" />
                 </button>
               </div>
               
               <p className="text-xs text-muted mb-4 italic italic font-serif">Implementação do painel detalhado segue as especificações...</p>
               <Button 
                onClick={() => setSelectedLead(null)}
                className="w-full bg-graphite rounded-none uppercase text-[10px] tracking-widest"
               >
                 Fechar Detalhes
               </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
