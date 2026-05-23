import React from 'react';
import { cn } from '@/lib/utils';
import { Lead, calculateLeadScore } from '@/lib/types';
import { Star, Clock } from 'lucide-react';
import { parseISO, differenceInDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LeadCardProps {
  lead: Lead;
  index: number;
  onClick: () => void;
  onUpdateStatus?: (leadId: string, newStage: string) => void;
  onQuickNote?: (leadId: string, note: string) => void;
  onViewFicha?: (clienteId: string) => void;
}

const LeadCard = ({ lead, onClick, onViewFicha, onUpdateStatus }: LeadCardProps) => {
  const daysInStage = differenceInDays(new Date(), parseISO(lead.etapa_desde));
  const { score } = calculateLeadScore(lead);
  
  // Ghosting detection
  const lastLogDate = lead.logs.length > 0 ? parseISO(lead.logs[0].data) : parseISO(lead.criado);
  const daysSinceLastContact = differenceInDays(new Date(), lastLogDate);
  const isGhosting = daysSinceLastContact > 3 && lead.stage !== 'Fechado' && lead.stage !== 'Perdido';
  
  const tempConfig = {
    'Quente': { border: 'border-red-500', badge: 'bg-red-500/10 text-red-500', pulse: true },
    'Morno': { border: 'border-amber-500', badge: 'bg-amber-500/10 text-amber-500', pulse: false },
    'Frio': { border: 'border-white/20', badge: 'bg-white/5 text-white/60', pulse: false }
  };

  const currentTemp = tempConfig[lead.temp] || tempConfig['Frio'];
  const isPremium = score >= 8;

  const formatCurrency = (val: number) => {
    if (lead.isBriefingVirtual && (lead as any).orcamentoVirtual) {
      return (lead as any).orcamentoVirtual;
    }
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
        isDragging && "shadow-2xl ring-2 ring-bronze/30 scale-[1.05] rotate-2",
        lead.stage === 'Perdido' && "opacity-45 grayscale-[0.5]"
      )}
    >
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
              lead.temp === 'Morno' ? "bg-amber-500" : "bg-white/60"
            )} />
            {lead.temp}
          </div>

          {/* Score & Stagnation Icon */}
          <div className="flex items-center gap-2 text-bronze">
            {isGhosting && (
              <div 
                className="text-red-400" 
                title={`Sem contato há ${daysSinceLastContact} dias`}
              >
                <Clock size={12} className="animate-pulse" />
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold uppercase">Sc.</span>
              <span className="text-sm font-bold">{score}</span>
            </div>
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

          {/* Project Type · City · Value */}
          <p className="text-white/70 text-[10px] mt-1 truncate uppercase tracking-wider">
            {lead.tipo} · {lead.cidade} · {formatCurrency(lead.orcamento)}
          </p>

          {lead.isBriefingVirtual && (
            <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700 w-fit">
              PRÉ-BRIEFING
            </span>
          )}
        </div>
      </div>

      {/* Footer - Time in Stage & Action */}
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-white/50 text-[9px] uppercase tracking-wider">
          {lead.isBriefingVirtual 
            ? `${format(parseISO(lead.criado), 'dd/MM/yyyy')}`
            : `há ${daysInStage} ${daysInStage === 1 ? 'dia' : 'dias'}`
          }
        </span>
        
        <div className="flex gap-2">
          {lead.isBriefingVirtual ? (
            <>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    // 1. Criar cliente
                    const { data: novoCliente, error: clientError } = await (supabase.from('clientes') as any).insert({
                      nome: lead.nome,
                      whatsapp: lead.whats,
                      email: lead.email,
                      cidade: lead.cidade,
                      origem: lead.origem || 'Instagram',
                      tipo_projeto: lead.briefingData?.tipo_projeto || 'Arq+Int',
                      briefing_preenchido: true
                    }).select().single();

                    if (clientError) throw clientError;

                    // 2. Criar lead vinculado
                    const { error: leadError } = await supabase.from('leads').insert({
                      nome: lead.nome,
                      whats: lead.whats,
                      cidade: lead.cidade,
                      tipo: (lead.briefingData?.tipo_projeto === 'com' ? 'Comercial' : lead.briefingData?.tipo_projeto === 'int' ? 'Interiores' : 'Arq+Int') as any,
                      stage: 'Novo Lead',
                      origem: lead.origem || 'Instagram',
                      temp: 'Frio',
                      score: 2,
                      criado: new Date().toISOString(),
                      etapa_desde: new Date().toISOString(),
                      area: 0,
                      cliente_id: novoCliente.id
                    });

                    if (leadError) throw leadError;

                    // 3. Atualizar briefing
                    await (supabase.from('briefings') as any).update({
                      status: 'aprovado',
                      cliente_id: novoCliente.id
                    }).eq('id', lead.id);

                    toast.success(`${lead.nome} aprovado — ficha criada em Clientes`);
                    if (onUpdateStatus) onUpdateStatus(lead.id, 'Novo Lead');
                  } catch (err) {
                    console.error(err);
                    toast.error("Erro ao aprovar lead");
                  }
                }}
                className="h-7 px-3 bg-[#8B7355] hover:bg-[#7a654a] text-white text-[9px] font-bold uppercase tracking-widest transition-colors rounded-[2px]"
              >
                APROVAR
              </button>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await supabase.from('briefings').update({ status: 'arquivado' }).eq('id', lead.id);
                    toast.success("Lead arquivado");
                    if (onUpdateStatus) onUpdateStatus(lead.id, 'Arquivado');
                  } catch (err) {
                    console.error(err);
                    toast.error("Erro ao arquivar");
                  }
                }}
                className="h-7 px-3 border border-zinc-600 hover:border-zinc-500 text-zinc-400 hover:text-white text-[9px] font-bold uppercase tracking-widest transition-colors rounded-[2px]"
              >
                ARQUIVAR
              </button>
            </>
          ) : lead.cliente_id && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onViewFicha?.(lead.cliente_id!);
              }}
              className="text-[9px] font-bold text-bronze uppercase tracking-widest hover:text-white transition-colors"
            >
              VER FICHA
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadCard;