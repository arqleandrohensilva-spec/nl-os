import React from 'react';
import { cn } from '@/lib/utils';
import { Lead } from '@/lib/types';
import { MapPin, Maximize2, DollarSign, ArrowUpRight, MessageSquare } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
import { Draggable } from '@hello-pangea/dnd';

interface LeadCardProps {
  lead: Lead;
  index: number;
  onClick: () => void;
}

const LeadCard = ({ lead, index, onClick }: LeadCardProps) => {
  const daysInStage = differenceInDays(new Date(), parseISO(lead.etapa_desde));
  
  const tempMap = {
    'Quente': { color: '#B83232' },
    'Morno': { color: '#C49A2A' },
    'Frio': { color: '#E8E4DF' }
  };

  const currentTemp = tempMap[lead.temp];
  const isLost = lead.stage === 'Perdido';

  const formatCurrency = (val: number) => {
    if (val === 0) return "—";
    return `R$ ${(val / 1000).toFixed(0)}k`;
  };

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div 
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "group relative bg-white border border-beige p-5 cursor-pointer transition-all duration-300 hover:border-bronze hover:shadow-[0_15px_30px_rgba(139,115,85,0.08)]",
            "min-h-[220px] flex flex-col justify-between",
            lead.score >= 8 && "border-t-[3px] border-t-bronze",
            snapshot.isDragging && "shadow-2xl ring-2 ring-bronze/20 z-50 scale-[1.02]",
            isLost && "opacity-45"
          )}
        >
          <div 
            className="absolute left-0 top-0 bottom-0 w-[3px]" 
            style={{ backgroundColor: currentTemp.color }} 
          />
          
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {lead.score >= 8 && (
                    <span className="text-[8px] font-bold text-bronze uppercase tracking-[0.2em] flex items-center gap-1">
                      <span className="w-1 h-1 bg-bronze rounded-full" />
                      Lead Premium
                    </span>
                  )}
                </div>
                <h3 className="text-[17px] font-cormorant text-graphite leading-tight group-hover:text-bronze transition-colors truncate">
                  {lead.nome}
                </h3>
              </div>
              <div className="ml-3">
                <div className="w-9 h-9 border border-beige rounded-[2px] flex flex-col items-center justify-center group-hover:border-bronze/30 transition-colors">
                  <span className="text-[7px] text-muted font-bold leading-none uppercase mb-0.5">Sc.</span>
                  <span className="text-[13px] font-medium text-graphite leading-none">{lead.score}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-4">
              <div className="flex items-center gap-2 text-muted">
                <MapPin size={12} className="opacity-50" />
                <span className="text-[10px] font-medium tracking-tight truncate">{lead.cidade}</span>
              </div>
              <div className="flex items-center gap-2 text-muted">
                <Maximize2 size={12} className="opacity-50" />
                <span className="text-[10px] font-medium tracking-tight">{lead.area} m²</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <DollarSign size={14} className="text-bronze/60" />
                <span className={cn(
                  "text-[15px] font-bold tracking-tight",
                  lead.orcamento > 0 ? "text-bronze" : "text-muted opacity-40"
                )}>
                  {formatCurrency(lead.orcamento)}
                </span>
          </div>

          {lead.proxima_acao_tipo && (
            <div className="mb-4 p-2 bg-bronze/5 border border-bronze/10 rounded-[2px] flex items-start gap-2 animate-in fade-in duration-500">
              <Calendar size={12} className="text-bronze mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[8px] font-bold text-bronze uppercase tracking-widest leading-none">
                  Próxima: {lead.proxima_acao_tipo} · {lead.proxima_acao_data}
                </p>
                <p className="text-[9px] text-graphite/70 line-clamp-1 leading-tight italic">
                  "{lead.proxima_acao_nota}"
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="px-2 py-0.5 bg-bronze/5 text-bronze border border-bronze/10 text-[8px] font-bold uppercase tracking-widest">
                {lead.tipo}
              </span>
              <span className="px-2 py-0.5 border border-beige text-muted text-[8px] font-bold uppercase tracking-widest">
                {lead.origem}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-beige flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-muted font-mono">
              <span>há {daysInStage} {daysInStage === 1 ? 'dia' : 'dias'} nesta etapa</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Ação de registrar contato aqui
                }}
                className="opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-bronze/10 rounded-full text-bronze flex items-center gap-1"
                title="Registrar contato"
              >
                <MessageSquare size={14} />
              </button>
              <ArrowUpRight size={14} className="text-muted group-hover:text-bronze transition-colors" />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default LeadCard;
