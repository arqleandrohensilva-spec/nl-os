import React from 'react';
import { cn } from '@/lib/utils';
import { Lead, calculateLeadScore } from '@/lib/types';
import { MapPin, Maximize2, DollarSign, ArrowUpRight, MessageSquare, Calendar, Phone } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LeadCardProps {
  lead: Lead;
  index: number;
  onClick: () => void;
}

const LeadCard = ({ lead, index, onClick }: LeadCardProps) => {
  const daysInStage = differenceInDays(new Date(), parseISO(lead.etapa_desde));
  const { score } = calculateLeadScore(lead);
  
  const tempMap = {
    'Quente': { color: '#B83232', pulse: true },
    'Morno': { color: '#C49A2A', pulse: false },
    'Frio': { color: '#E8E4DF', pulse: false }
  };

  const currentTemp = tempMap[lead.temp];
  const isLost = lead.stage === 'Perdido';

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

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = lead.whats?.replace(/\D/g, '') || '55';
    window.open(`https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}`, '_blank');
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative bg-white border border-beige p-5 cursor-pointer transition-all duration-500 hover:border-bronze hover:shadow-[0_25px_50px_-12px_rgba(139,115,85,0.15)]",
        "min-h-[230px] flex flex-col justify-between",
        lead.score >= 8 && "border-t-[4px] border-t-bronze",
        isDragging && "shadow-2xl ring-2 ring-bronze/30 scale-[1.05] rotate-2",
        isLost && "opacity-45 grayscale-[0.5]"
      )}
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-[3px] flex flex-col justify-center items-center" 
        style={{ backgroundColor: currentTemp.color }} 
      >
        {currentTemp.pulse && (
          <div className="absolute left-0 w-[3px] h-full bg-red animate-pulse opacity-50" />
        )}
      </div>
      
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

      <div className="pt-4 border-t border-beige min-h-[40px] relative">
        <div className="flex items-center justify-between transition-opacity duration-150 group-hover:opacity-0">
          <div className={cn(
            "flex items-center gap-2 text-[10px] font-mono",
            daysInStage > 5 ? "text-red font-bold" : "text-muted"
          )}>
            {daysInStage > 5 && <span className="w-1 h-1 bg-red rounded-full animate-ping" />}
            <span>há {daysInStage} {daysInStage === 1 ? 'dia' : 'dias'}</span>
          </div>
          <ArrowUpRight size={14} className="text-muted" />
        </div>

        <div className="absolute inset-x-0 bottom-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 py-1 bg-white">
          <button 
            onClick={handleWhatsApp}
            className="flex-1 h-8 bg-[#1A1A1A] hover:bg-bronze text-white text-[10px] font-bold uppercase tracking-widest rounded-[2px] transition-all flex items-center justify-center gap-2"
          >
            <Phone size={12} />
            WhatsApp
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="w-10 h-8 bg-[#1A1A1A] hover:bg-bronze text-white rounded-[2px] transition-all flex items-center justify-center"
          >
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;