import React from 'react';
import { cn } from '@/lib/utils';
import { Lead, Stage } from '@/lib/types';
import LeadCard from './LeadCard';

interface KanbanColumnProps {
  stage: Stage;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

const STAGE_CONFIG: Record<Stage, { color: string, indicator: string }> = {
  'Novo Lead': { color: 'bronze', indicator: '#8B7355' },
  'Reunião Agendada': { color: 'blue-500', indicator: '#3A7BD5' },
  'Proposta Enviada': { color: 'purple-500', indicator: '#7B55D5' },
  'Negociação': { color: 'amber', indicator: '#C49A2A' },
  'Fechado': { color: 'green-600', indicator: '#2E7D52' },
  'Perdido': { color: 'muted', indicator: '#999999' }
};

const KanbanColumn = ({ stage, leads, onLeadClick }: KanbanColumnProps) => {
  const isLost = stage === 'Perdido';
  const totalValue = leads.reduce((acc, l) => acc + (l.orcamento || 0), 0);
  
  const hasNoContactLeads = stage === 'Novo Lead' && leads.filter(l => l.logs.length === 0).length > 0;
  const hasFollowUpPending = stage === 'Proposta Enviada' && leads.length > 0; // Simple logic for now

  return (
    <div className={cn(
      "w-[260px] flex-shrink-0 flex flex-col h-full",
      isLost && "opacity-45"
    )}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: STAGE_CONFIG[stage].indicator }} 
            />
            <h2 className="text-[9px] font-medium uppercase tracking-[0.18em] text-graphite">
              {stage}
            </h2>
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-beige/50 text-[9px] text-graphite">
              {leads.length}
            </span>
          </div>
        </div>
        <div className="text-[9px] font-bold text-bronze uppercase">
          R$ {(totalValue / 1000).toLocaleString('pt-BR')}k em negociação
        </div>
      </div>

      {/* Column Alerts */}
      <div className="space-y-2 mb-3">
        {hasNoContactLeads && (
          <div className="py-1.5 px-3 bg-red/5 border border-red/10 text-[9px] text-red uppercase tracking-wider font-medium">
            ! {leads.filter(l => l.logs.length === 0).length} lead(s) sem contato
          </div>
        )}
        {hasFollowUpPending && (
          <div className="py-1.5 px-3 bg-amber/5 border border-amber/10 text-[9px] text-amber uppercase tracking-wider font-medium">
            ! Follow-up pendente
          </div>
        )}
      </div>

      {/* Cards List */}
      <div className={cn(
        "flex-1 overflow-y-auto space-y-3 min-h-[150px] transition-colors",
        isLost && "bg-black/[0.02]"
      )}>
        {leads.length > 0 ? (
          leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
          ))
        ) : (
          <div className="h-20 flex flex-col items-center justify-center gap-2 opacity-30">
            <div className="w-7 h-[1px] bg-bronze" />
            <span className="text-[9px] uppercase tracking-widest">Nenhum lead</span>
            <div className="w-7 h-[1px] bg-bronze" />
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
