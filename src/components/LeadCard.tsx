import React from 'react';
import { cn } from '@/lib/utils';
import { Lead } from '@/lib/types';
import { ArrowRight } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LeadCardProps {
  lead: Lead;
  index: number;
  onClick: () => void;
  onUpdateStatus?: (leadId: string, newStage: string) => void;
  onQuickNote?: (leadId: string, note: string) => void;
  onViewFicha?: (clienteId: string) => void;
  onConvertProject?: (lead: Lead) => void;
}

const LeadCard = ({ lead, onClick }: LeadCardProps) => {
  const dataRef = lead.etapa_desde || (lead as any).updated_at || (lead as any).created_at || (lead as any).criado_em || lead.criado;
  const daysInStage = dataRef 
    ? Math.floor((new Date().getTime() - new Date(dataRef).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const formatCurrency = (val: number) => {
    if (lead.isBriefingVirtual && (lead as any).orcamentoVirtual) {
      return (lead as any).orcamentoVirtual;
    }
    if (!val || val === 0) return null;
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

  // Cores baseadas nos dias na etapa
  const daysColor = daysInStage > 14 
    ? 'text-red-400' 
    : daysInStage >= 7 
    ? 'text-amber-400' 
    : 'text-white/30';
  
  // Buscar próxima ação (último log do tipo 'A' - Ação ou nota que indique agendamento)
  // Como o sistema não tem um campo explícito de 'próxima ação' agendada ainda,
  // vamos simular ou buscar a mais recente que comece com "→" ou algo similar se existir,
  // ou apenas deixar preparado.
  const proximaAcao = lead.logs.find(log => log.nota.startsWith('→'))?.nota;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative bg-white/[0.02] border border-white/5 p-4 cursor-pointer transition-all duration-300 hover:bg-white/[0.04] hover:border-white/10",
        "flex flex-col gap-1 rounded-[2px]",
        isDragging && "shadow-2xl ring-1 ring-bronze/20 scale-[1.02]",
        lead.stage === 'Perdido' && "opacity-40 grayscale-[0.5]"
      )}
    >
      <div className="flex justify-between items-start">
        <h3 className="text-white font-medium text-sm leading-tight truncate pr-2">
          {lead.nome}
        </h3>
        {formatCurrency(lead.orcamento) && (
          <span className="text-white/80 text-[10px] font-medium whitespace-nowrap">
            {formatCurrency(lead.orcamento)}
          </span>
        )}
      </div>

      <div className="text-white/40 text-[10px] uppercase tracking-wider truncate">
        {lead.tipo} · {lead.cidade}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className={cn("flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-widest", daysColor)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", daysInStage > 14 ? "bg-red-400" : daysInStage >= 7 ? "bg-amber-400" : "bg-white/10")} />
          {daysInStage} {daysInStage === 1 ? 'dia' : 'dias'} na etapa
        </div>

        {proximaAcao && (
          <div className="text-bronze text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
            <ArrowRight size={10} /> {proximaAcao.replace('→', '').trim()}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadCard;