import React from 'react';
import { cn } from '@/lib/utils';
import { Lead, Stage } from '@/lib/types';
import { MapPin, Square, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
}

const LeadCard = ({ lead, onClick }: LeadCardProps) => {
  const initials = lead.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  const tempColors = {
    'Quente': 'bg-red',
    'Morno': 'bg-amber',
    'Frio': 'bg-beige'
  };

  const daysInStage = differenceInDays(new Date(), parseISO(lead.etapa_desde));
  const daysSinceCreated = differenceInDays(new Date(), parseISO(lead.criado));
  
  const hasNoContact = lead.logs.length === 0;
  const isStale = (lead.stage === 'Novo Lead' && daysSinceCreated >= 1 && hasNoContact);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative bg-white border border-beige p-4 cursor-pointer transition-all duration-200 hover:border-bronze hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(139,115,85,0.12)]",
        lead.score >= 8 && "border-t-2 border-t-bronze/50"
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-[2px]", tempColors[lead.temp])} />
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-bronze/10 flex items-center justify-center text-bronze font-bold text-xs">
            {initials}
          </div>
          <h3 className="text-base font-cormorant text-graphite line-clamp-1">{lead.nome}</h3>
        </div>
        <div className={cn(
          "w-6 h-6 flex items-center justify-center rounded-[4px] text-[10px] font-medium",
          lead.score >= 8 ? "bg-bronze text-white" : lead.score >= 5 ? "bg-graphite text-white" : "border border-beige text-muted"
        )}>
          {lead.score}
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-1.5 text-muted">
          <MapPin className="w-3 h-3" />
          <span className="text-[10px] uppercase tracking-wider">{lead.cidade}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted">
          <Square className="w-3 h-3" />
          <span className="text-[10px] uppercase tracking-wider">{lead.area} m²</span>
        </div>
        {lead.orcamento > 0 && (
          <div className="flex items-center gap-1.5 text-muted">
            <DollarSign className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-wider">R$ {(lead.orcamento / 1000).toFixed(0)}k</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2 py-0.5 bg-bronze/10 text-bronze border border-bronze/30 text-[8px] uppercase font-medium tracking-widest">
          {lead.tipo}
        </span>
        <span className="px-2 py-0.5 border border-beige text-muted text-[8px] uppercase font-medium tracking-widest">
          {lead.origem}
        </span>
      </div>

      {isStale && (
        <div className="mb-4 p-2 bg-red/5 border border-red/10 flex items-center gap-2">
          <AlertCircle className="w-3 h-3 text-red" />
          <span className="text-[9px] text-red uppercase tracking-wider font-medium">
            ! Sem contato há {daysSinceCreated} {daysSinceCreated === 1 ? 'dia' : 'dias'}
          </span>
        </div>
      )}

      <div className="pt-3 border-t border-beige flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={cn("w-1.5 h-1.5 rounded-full", tempColors[lead.temp])} />
          <span className="text-[9px] text-muted uppercase tracking-wider">{lead.temp}</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-muted uppercase tracking-wider">
          <Clock className="w-3 h-3" />
          <span>há {daysInStage}d nesta etapa</span>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
