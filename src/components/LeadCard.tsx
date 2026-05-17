import React from 'react';
import { cn } from '@/lib/utils';
import { Lead, calculateLeadScore } from '@/lib/types';
import { Star, Clock } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LeadCardProps {
  lead: Lead;
  index: number;
  onClick: () => void;
  onUpdateStatus?: (leadId: string, newStage: string) => void;
  onQuickNote?: (leadId: string, note: string) => void;
}

const LeadCard = ({ lead, onClick }: LeadCardProps) => {
  const daysInStage = differenceInDays(new Date(), parseISO(lead.etapa_desde));
  const { score } = calculateLeadScore(lead);
  
  // Ghosting detection
  const lastLogDate = lead.logs.length > 0 ? parseISO(lead.logs[0].data) : parseISO(lead.criado);
  const daysSinceLastContact = differenceInDays(new Date(), lastLogDate);
  const isGhosting = daysSinceLastContact > 3 && lead.stage !== 'Fechado' && lead.stage !== 'Perdido';
  
  const tempConfig = {
    'Quente': { border: 'border-red-500', badge: 'bg-red-500/10 text-red-500', pulse: true },
    'Morno': { border: 'border-amber-500', badge: 'bg-amber-500/10 text-amber-500', pulse: false },
    'Frio': { border: 'border-white/20', badge: 'bg-white/5 text-white/40', pulse: false }
  };

  const currentTemp = tempConfig[lead.temp] || tempConfig['Frio'];
  const isPremium = score >= 8;

  const formatCurrency = (val: number) => {
    if (val === 0) return "—";
    return `R$ ${(val / 1000).toFixed(0)}k`;
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id, data: { type: 'Lead', lead } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative bg-white/[0.03] border border-white/10 p-4 cursor-pointer transition-all duration-300 hover:bg-white/[0.05] hover:border-white/20",
        "min-h-[100px] flex flex-col justify-between overflow-hidden",
        "border-l-4",
        currentTemp.border,
        isGhosting && "ring-1 ring-amber-500/50 animate-pulse-subtle shadow-[0_0_15px_rgba(245,158,11,0.1)]",
        isDragging && "shadow-2xl ring-2 ring-bronze/30 scale-[1.05] rotate-2",
        lead.stage === 'Perdido' && "opacity-45 grayscale-[0.5]"
      )}
    >
      {/* Stagnation Alert - Small clock icon with tooltip */}
      {isGhosting && (
        <div 
          className="absolute top-3 right-3 text-red-500 z-10" 
          title={`Sem contato há ${daysSinceLastContact} dias`}
        >
          <Clock size={12} className="animate-pulse" />
        </div>
      )}
      {/* Pulse effect for Hot Lead - Left border only */}
      {currentTemp.pulse && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />
      )}

      <div>
        <div className="flex justify-between items-start mb-2">
          {/* Temperature Badge */}
          <div className={cn(
            "px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider flex items-center gap-1",
            currentTemp.badge
          )}>
            <span className={cn(
              "w-1 h-1 rounded-full",
              lead.temp === 'Quente' ? "bg-red-500 animate-pulse" : 
              lead.temp === 'Morno' ? "bg-amber-500" : "bg-white/40"
            )} />
            {lead.temp}
          </div>

          {/* Score */}
          <div className="flex items-center gap-1 text-bronze">
            <span className="text-[9px] font-bold uppercase">Sc.</span>
            <span className="text-sm font-bold">{score}</span>
          </div>
        </div>
        
        <div className="flex flex-col">
          {/* Premium Badge */}
          {isPremium && (
            <span className="text-[9px] font-bold text-bronze uppercase tracking-[0.2em] flex items-center gap-1.5 mb-1">
              <Star size={10} fill="currentColor" />
              PREMIUM
            </span>
          )}

          {/* Lead Name */}
          <h3 className="text-white font-medium text-base leading-tight truncate">
            {lead.nome}
          </h3>

          {/* Project Type · Value */}
          <p className="text-white/50 text-xs mt-1 truncate">
            {lead.tipo} · {formatCurrency(lead.orcamento)}
          </p>
        </div>
      </div>

      {/* Footer - Time in Stage */}
      <div className="mt-3">
        <span className="text-white/30 text-xs">
          há {daysInStage} {daysInStage === 1 ? 'dia' : 'dias'}
        </span>
      </div>
    </div>
  );
};

export default LeadCard;
