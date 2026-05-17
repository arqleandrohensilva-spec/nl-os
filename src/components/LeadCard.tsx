import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Lead, calculateLeadScore } from '@/lib/types';
import { MapPin, Maximize2, DollarSign, ArrowUpRight, MessageSquare, Calendar, Phone, AlertTriangle, Star, FileText, ArrowRight, Zap } from 'lucide-react';
import { parseISO, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface LeadCardProps {
  lead: Lead;
  index: number;
  onClick: () => void;
  onUpdateStatus?: (leadId: string, newStage: string) => void;
  onQuickNote?: (leadId: string, note: string) => void;
}

const LeadCard = ({ lead, index, onClick, onUpdateStatus, onQuickNote }: LeadCardProps) => {
  const navigate = useNavigate();
  const [quickNote, setQuickNote] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const daysInStage = differenceInDays(new Date(), parseISO(lead.etapa_desde));
  const { score } = calculateLeadScore(lead);
  
  const isAtrasado = lead.proxima_acao_data && isBefore(parseISO(lead.proxima_acao_data), startOfDay(new Date()));
  const diasAtraso = lead.proxima_acao_data ? differenceInDays(new Date(), parseISO(lead.proxima_acao_data)) : 0;
  
  const tempConfig = {
    'Quente': { border: 'border-red-500', badge: 'bg-red-500/10 text-red-500', pulse: true },
    'Morno': { border: 'border-amber-500', badge: 'bg-amber-500/10 text-amber-500', pulse: false },
    'Frio': { border: 'border-white/20', badge: 'bg-white/5 text-white/40', pulse: false }
  };

  const currentTemp = tempConfig[lead.temp] || tempConfig['Frio'];
  const isPremium = score >= 8;
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

  const handleQuickNote = () => {
    if (onQuickNote && quickNote.trim()) {
      onQuickNote(lead.id, quickNote);
      setQuickNote('');
      setPopoverOpen(false);
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative bg-white/[0.03] border border-white/10 p-5 cursor-pointer transition-all duration-300 hover:border-bronze hover:shadow-[0_25px_50px_-12px_rgba(139,115,85,0.15)]",
        "min-h-[230px] flex flex-col justify-between overflow-hidden",
        "border-l-4",
        currentTemp.border,
        isPremium && "border-t border-bronze/40",
        isAtrasado && "bg-red-950/20",
        isDragging && "shadow-2xl ring-2 ring-bronze/30 scale-[1.05] rotate-2",
        isLost && "opacity-45 grayscale-[0.5]"
      )}
    >
      {/* Pulse effect for Hot Lead */}
      {currentTemp.pulse && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />
      )}

      {/* Atrasado Alert Icon */}
      {isAtrasado && (
        <div className="absolute top-4 right-4 text-red-500" title={`Ação atrasada há ${diasAtraso} dias`}>
          <AlertTriangle size={16} />
        </div>
      )}
      
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1.5 mb-2">
              {isPremium && (
                <span className="text-[9px] font-bold text-bronze uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <Star size={10} fill="currentColor" />
                  PREMIUM
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider flex items-center gap-1",
                  currentTemp.badge
                )}>
                  <span className={cn(
                    "w-1 h-1 rounded-full",
                    lead.temp === 'Quente' ? "bg-red-500 animate-pulse" : 
                    lead.temp === 'Morno' ? "bg-amber-500" : "bg-white/40"
                  )} />
                  {lead.temp}
                </span>
              </div>
            </div>
            <h3 className="text-[17px] font-cormorant text-white leading-tight group-hover:text-bronze transition-colors truncate">
              {lead.nome}
            </h3>
          </div>
          <div className="ml-3">
            <div className="w-9 h-9 border border-white/10 rounded-[2px] flex flex-col items-center justify-center group-hover:border-bronze/30 transition-colors">
              <span className="text-[7px] text-white/40 font-bold leading-none uppercase mb-0.5">Sc.</span>
              <span className="text-white font-bold">{score}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-4">
          <div className="flex items-center gap-2 text-white/40">
            <MapPin size={12} className="opacity-50" />
            <span className="text-[10px] font-medium tracking-tight truncate">{lead.cidade}</span>
          </div>
          <div className="flex items-center gap-2 text-white/40">
            <Maximize2 size={12} className="opacity-50" />
            <span className="text-[10px] font-medium tracking-tight">{lead.area} m²</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <DollarSign size={14} className="text-bronze/60" />
            <span className={cn(
              "text-[15px] font-bold tracking-tight",
              lead.orcamento > 0 ? "text-bronze" : "text-white/20"
            )}>
              {formatCurrency(lead.orcamento)}
            </span>
          </div>
        </div>

        {lead.proxima_acao_tipo && (
          <div className={cn(
            "mb-4 p-2 border rounded-[2px] flex items-start gap-2 animate-in fade-in duration-500 transition-colors",
            isAtrasado ? "bg-red-500/10 border-red-500/20" : "bg-bronze/5 border-bronze/10"
          )}>
            <Calendar size={12} className={cn(isAtrasado ? "text-red-500" : "text-bronze", "mt-0.5 shrink-0")} />
            <div className="space-y-0.5">
              <p className={cn(
                "text-[8px] font-bold uppercase tracking-widest leading-none",
                isAtrasado ? "text-red-500" : "text-bronze"
              )}>
                {isAtrasado ? 'ATRASADO' : 'Próxima'}: {lead.proxima_acao_tipo} · {lead.proxima_acao_data}
              </p>
              <p className="text-[9px] text-white/70 line-clamp-1 leading-tight italic">
                "{lead.proxima_acao_nota}"
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-white/10 min-h-[40px] relative">
        <div className="flex items-center justify-between transition-opacity duration-150 group-hover:opacity-0">
          <div className={cn(
            "flex items-center gap-2 text-[10px] font-mono",
            daysInStage > 5 ? "text-red font-bold" : "text-white/40"
          )}>
            {daysInStage > 5 && <span className="w-1 h-1 bg-red rounded-full animate-ping" />}
            <span>há {daysInStage} {daysInStage === 1 ? 'dia' : 'dias'}</span>
          </div>
          <ArrowUpRight size={14} className="text-white/40" />
        </div>

        {/* Quick Actions Footer */}
        <div className="absolute inset-x-0 -bottom-5 group-hover:bottom-0 left-0 right-0 flex items-center justify-around opacity-0 group-hover:opacity-100 transition-all duration-300 py-2 px-1 bg-black/80 backdrop-blur-md border-t border-white/10">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate('/marketing/scripts', { state: { leadId: lead.id } });
            }}
            className="flex flex-col items-center gap-1 text-white/60 hover:text-bronze transition-colors"
          >
            <FileText size={14} />
            <span className="text-[9px] font-bold tracking-widest uppercase">Script</span>
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (onUpdateStatus) {
                const stages: Lead['stage'][] = ['Novo Lead', 'Reunião Agendada', 'Briefing Preenchido', 'Proposta Enviada', 'Negociação', 'Fechado'];
                const currentIndex = stages.indexOf(lead.stage);
                if (currentIndex !== -1 && currentIndex < stages.length - 1) {
                  onUpdateStatus(lead.id, stages[currentIndex + 1]);
                }
              }
            }}
            className="flex flex-col items-center gap-1 text-white/60 hover:text-bronze transition-colors"
          >
            <ArrowRight size={14} />
            <span className="text-[9px] font-bold tracking-widest uppercase">Etapa</span>
          </button>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-1 text-white/60 hover:text-bronze transition-colors"
              >
                <Zap size={14} />
                <span className="text-[9px] font-bold tracking-widest uppercase">Ação</span>
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-64 bg-[#0F0F0F] border-white/10 p-4" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-bronze uppercase tracking-widest">Ação Rápida</h4>
                <Textarea 
                  placeholder="Descreva a interação..." 
                  className="bg-white/5 border-white/10 text-xs min-h-[80px] focus:border-bronze"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                />
                <Button 
                  className="w-full bg-bronze hover:bg-bronze/80 text-white text-[10px] font-bold uppercase tracking-widest h-8"
                  onClick={handleQuickNote}
                >
                  Registrar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;