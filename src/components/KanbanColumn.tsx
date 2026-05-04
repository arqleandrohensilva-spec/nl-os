import React from 'react';
import { cn } from '@/lib/utils';
import { Lead, Stage } from '@/lib/types';
import LeadCard from './LeadCard';
import { MoreHorizontal } from 'lucide-react';

interface KanbanColumnProps {
  stage: Stage;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

const STAGE_THEME: Record<Stage, { indicator: string, bg: string }> = {
  'Novo Lead': { indicator: '#8B7355', bg: 'bg-bronze/5' },
  'Reunião Agendada': { indicator: '#3A7BD5', bg: 'bg-blue-500/5' },
  'Proposta Enviada': { indicator: '#7B55D5', bg: 'bg-purple-500/5' },
  'Negociação': { indicator: '#C49A2A', bg: 'bg-amber/5' },
  'Fechado': { indicator: '#2E7D52', bg: 'bg-green-600/5' },
  'Perdido': { indicator: '#999999', bg: 'bg-black/5' }
};

const KanbanColumn = ({ stage, leads, onLeadClick }: KanbanColumnProps) => {
  const isLost = stage === 'Perdido';
  const totalValue = leads.reduce((acc, l) => acc + (l.orcamento || 0), 0);
  const theme = STAGE_THEME[stage];

  return (
    <div className={cn(
      "w-[300px] flex-shrink-0 flex flex-col h-full bg-[#F5F5F5]/50 border-r border-beige last:border-r-0",
      isLost && "opacity-60 saturate-[0.2]"
    )}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-1.5 h-1.5 rounded-full ring-4 ring-opacity-20" 
              style={{ 
                backgroundColor: theme.indicator,
                boxShadow: `0 0 0 4px ${theme.indicator}20`
              }} 
            />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite">
              {stage}
            </h2>
          </div>
          <button className="text-muted hover:text-graphite transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>
        
        <div className="flex items-baseline gap-2">
          <span className="text-[18px] font-cormorant text-graphite">{leads.length}</span>
          <span className="text-[8px] font-bold text-muted uppercase tracking-widest">Leads</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-bronze">R$ {(totalValue / 1000).toLocaleString('pt-BR')}k</span>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-4">
        {leads.length > 0 ? (
          leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
          ))
        ) : (
          <div className="h-32 border border-dashed border-beige flex flex-col items-center justify-center opacity-40">
            <div className="w-8 h-[1px] bg-bronze/50 mb-3" />
            <span className="text-[8px] font-bold uppercase tracking-[0.3em]">No entries</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
