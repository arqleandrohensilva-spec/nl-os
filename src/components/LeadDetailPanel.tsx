import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, MessageSquare, Calendar, Trash2, ChevronDown, Check, AlertCircle, TrendingDown, CheckCircle2, LayoutGrid } from 'lucide-react';
import { Lead, Stage, LogTipo, calculateLeadScore } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { verificarViabilidade } from '@/lib/finance-utils';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface LeadDetailPanelProps {
  lead: Lead;
  onClose: () => void;
  onUpdateStage: (leadId: string, stage: Stage) => void;
  onDelete: (leadId: string) => void;
  onAddLog: (leadId: string, log: any) => void;
}

const STAGES: Stage[] = ['Novo Lead', 'Reunião Agendada', 'Proposta Enviada', 'Negociação', 'Fechado', 'Perdido'];

const LeadDetailPanel = ({ lead, onClose, onUpdateStage, onDelete, onAddLog }: LeadDetailPanelProps) => {
  const navigate = useNavigate();
  const [isConverting, setIsConverting] = useState(false);
  const [newLog, setNewLog] = useState({ tipo: 'N' as LogTipo, nota: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [custoHora, setCustoHora] = useState<number>(0);
  const [horasEstimadas, setHorasEstimadas] = useState<number>(Math.round(lead.area * 0.8)); // Heurística inicial

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('config_escritorio').select('custo_hora, mercados').single();
      if (data) setCustoHora(data.custo_hora);
    };
    fetchConfig();
  }, []);

  const viability = verificarViabilidade(lead.orcamento, horasEstimadas, custoHora, lead.cidade);


  const formatCurrency = (val: number) => val > 0 ? `R$ ${(val / 1000).toFixed(0)}k` : "—";

  const handleAddLog = () => {
    if (!newLog.nota) return;
    onAddLog(lead.id, {
      ...newLog,
      data: format(new Date(), 'yyyy-MM-dd'),
      autor: sessionStorage.getItem('nl_user') || 'Sócio'
    });
    setNewLog({ tipo: 'N', nota: '' });
  };

  const handleConvertToProject = async () => {
    try {
      setIsConverting(true);
      
      // Check if project already exists
      const { data: existing } = await supabase
        .from('projetos')
        .select('id')
        .eq('cliente_id', lead.id)
        .maybeSingle();

      if (existing) {
        toast.info("Este lead já possui um projeto associado.");
        navigate(`/projetos/detalhe/${existing.id}`);
        return;
      }

      const { data: newProject, error } = await supabase
        .from('projetos')
        .insert({
          nome: `PROJETO - ${lead.nome}`,
          nome_cliente: lead.nome,
          cliente_id: lead.id,
          tipo: lead.tipo,
          cidade: lead.cidade,
          area_m2: lead.area,
          etapa_atual: 'BRIEFING',
          status_geral: 'Em andamento',
          horas_estimadas: horasEstimadas
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Lead convertido em projeto com sucesso!");
      navigate(`/projetos/detalhe/${newProject.id}`);
    } catch (error) {
      console.error('Error converting lead to project:', error);
      toast.error("Erro ao converter lead em projeto.");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-graphite/40 backdrop-blur-[8px]" onClick={onClose} />
      <div className="relative w-[500px] h-full bg-white shadow-[-30px_0_60px_rgba(0,0,0,0.15)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
        <div className="p-10 border-b border-beige relative">
          <button onClick={onClose} className="absolute right-8 top-8 text-muted hover:text-white transition-transform hover:scale-110"><X size={20} /></button>
          <div className="flex items-center gap-3 mb-2">
            <span className={cn(
              "px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest border",
              lead.temp === 'Quente' ? "bg-red/5 border-red/20 text-red" : "bg-beige/20 border-beige text-muted"
            )}>
              {lead.temp}
            </span>
            <span className="text-[10px] text-muted font-mono">#{lead.id}</span>
          </div>
          <h2 className="text-4xl font-cormorant text-graphite mb-6 leading-none">{lead.nome}</h2>
          <div className="flex flex-wrap gap-2">
            {STAGES.map(s => (
              <button 
                key={s} 
                onClick={() => onUpdateStage(lead.id, s)}
                className={cn(
                  "px-3 py-1 text-[9px] font-bold uppercase tracking-widest border rounded-[2px] transition-all",
                  lead.stage === s ? "bg-graphite text-white border-graphite" : "border-beige text-muted hover:border-bronze hover:text-bronze"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          <section>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Dados do Lead</h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-graphite uppercase tracking-widest">Score Total:</span>
                <span className="text-sm font-bold text-bronze">{calculateLeadScore(lead).score}/10</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 text-[11px] mb-8">
              <div><p className="text-muted">WhatsApp</p><a href={`https://wa.me/55${lead.whats.replace(/\D/g, '')}`} className="text-bronze underline">{lead.whats}</a></div>
              <div><p className="text-muted">Cidade</p><p className="text-graphite">{lead.cidade}</p></div>
              <div><p className="text-muted">Tipo</p><p className="text-graphite">{lead.tipo}</p></div>
              <div><p className="text-muted">Área</p><p className="text-graphite">{lead.area} m²</p></div>
              <div><p className="text-muted">Orçamento</p><p className="text-graphite">{formatCurrency(lead.orcamento)}</p></div>
              <div><p className="text-muted">Entrada</p><p className="text-graphite">{lead.criado}</p></div>
              <div><p className="text-muted">Origem</p><p className="text-graphite">{lead.origem}</p></div>
            </div>

            <div className="bg-[#FAFAFA] border border-beige p-4 rounded-[2px] space-y-2">
              <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Breakdown do Score</p>
              {calculateLeadScore(lead).breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    {item.achieved ? <Check size={10} className="text-green-600" /> : <X size={10} className="text-red" />}
                    <span className={cn(item.achieved ? "text-graphite" : "text-muted")}>{item.label}</span>
                  </div>
                  <span className={cn("font-mono", item.achieved ? "text-bronze font-bold" : "text-muted")}>
                    {item.achieved ? `+${item.value}` : '+0'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className={cn(
            "p-6 rounded-[2px] border space-y-4",
            viability.status === 'prejuizo' ? "bg-red-50 border-red-200" :
            viability.status === 'alerta' ? "bg-amber-50 border-amber-200" :
            "bg-green-50 border-green-200"
          )}>
            <div className="flex items-start gap-3">
              {viability.status === 'prejuizo' ? <AlertCircle size={18} className="text-red-600 shrink-0" /> :
               viability.status === 'alerta' ? <AlertCircle size={18} className="text-amber-600 shrink-0" /> :
               <CheckCircle2 size={18} className="text-green-600 shrink-0" />}
              
              <div className="space-y-1">
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  viability.status === 'prejuizo' ? "text-red-800" :
                  viability.status === 'alerta' ? "text-amber-800" :
                  "text-green-800"
                )}>
                  {viability.status === 'prejuizo' ? "ATENÇÃO: Este projeto está abaixo do custo interno" :
                   viability.status === 'alerta' ? "Margem baixa recomendada" :
                   "Projeto Viável"}
                </p>
                <p className={cn(
                  "text-[11px] leading-relaxed",
                  viability.status === 'prejuizo' ? "text-red-700" :
                  viability.status === 'alerta' ? "text-amber-700" :
                  "text-green-700"
                )}>
                  {viability.mensagem}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Horas Est.</p>
                  <input 
                    type="number" 
                    value={horasEstimadas} 
                    onChange={(e) => setHorasEstimadas(parseInt(e.target.value) || 0)}
                    className="w-16 bg-transparent border-none p-0 text-xs font-bold text-graphite focus:ring-0"
                  />
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Custo Real</p>
                  <p className="text-xs font-bold text-graphite">R$ {((viability as any).custoReal || 0).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Margem Real</p>
                <p className={cn(
                  "text-sm font-bold",
                  viability.status === 'prejuizo' ? "text-red-600" : "text-graphite"
                )}>
                  {((viability as any).margemReal || 0).toFixed(0)}%
                </p>
              </div>
            </div>
          </section>


          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted mb-6">Ações Rápidas</h4>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Button className="flex-1 bg-graphite hover:bg-bronze text-[10px] uppercase font-bold tracking-widest h-10 rounded-[2px]" onClick={() => window.open(`https://wa.me/55${lead.whats.replace(/\D/g, '')}`)}>Abrir WhatsApp</Button>
                <Button variant="outline" className="flex-1 border-beige text-[10px] uppercase font-bold tracking-widest h-10 rounded-[2px]">Agendar Próxima Ação</Button>
              </div>
              
              {lead.stage === 'Fechado' && (
                <Button 
                  onClick={handleConvertToProject}
                  disabled={isConverting}
                  className="w-full bg-bronze hover:bg-bronze/90 text-white text-[10px] uppercase font-bold tracking-widest h-12 rounded-[2px] shadow-lg shadow-bronze/20"
                >
                  <LayoutGrid size={14} className="mr-2" />
                  {isConverting ? "Convertendo..." : "Converter em Projeto"}
                </Button>
              )}
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted mb-6">Histórico de Contatos</h4>
            <div className="space-y-4">
              {lead.logs.map((log, i) => (
                <div key={i} className={cn(
                  "text-[11px] p-3 border rounded-[2px]",
                  log.tipo === 'N' ? "border-bronze/20 bg-bronze/5" : "border-beige"
                )}>
                  <div className="flex justify-between text-muted text-[9px] mb-1">
                    <span>{log.data} · {log.autor}</span>
                    {log.tipo === 'N' && <span className="text-bronze font-bold uppercase tracking-tighter">Movimentação</span>}
                  </div>
                  <p className={cn(
                    "text-graphite",
                    log.tipo === 'N' && "italic text-muted/80 flex items-center gap-2"
                  )}>
                    {log.tipo === 'N' && <span className="text-bronze font-bold">→</span>}
                    {log.nota}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-beige space-y-3">
              <select className="w-full p-2 border border-beige text-[11px] rounded-[2px]" onChange={(e) => setNewLog({...newLog, tipo: e.target.value as LogTipo})}>
                <option value="N">Nota</option><option value="W">WhatsApp</option><option value="L">Ligação</option>
              </select>
              <Input placeholder="Descrever o contato..." value={newLog.nota} onChange={(e) => setNewLog({...newLog, nota: e.target.value})} className="rounded-[2px]" />
              <Button className="w-full bg-graphite hover:bg-bronze text-[10px] uppercase font-bold tracking-widest h-10 rounded-[2px]" onClick={handleAddLog}>Registrar</Button>
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-beige">
          {isDeleting ? (
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 text-muted" onClick={() => setIsDeleting(false)}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 text-white" onClick={() => onDelete(lead.id)}>Confirmar Exclusão</Button>
            </div>
          ) : (
            <Button variant="ghost" className="w-full text-muted hover:text-red-600 border border-transparent hover:border-red-600 rounded-[2px]" onClick={() => setIsDeleting(true)}>
              <Trash2 size={14} className="mr-2"/> Excluir Lead
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadDetailPanel;