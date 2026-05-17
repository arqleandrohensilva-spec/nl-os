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

const STAGES: Stage[] = ['Novo Lead', 'Reunião Agendada', 'Briefing Preenchido', 'Proposta Enviada', 'Negociação', 'Fechado', 'Perdido'];

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

  const formatarDataHora = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + 
             ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + 'h';
    } catch (e) {
      return iso;
    }
  };

  const handleAddLog = () => {
    if (!newLog.nota) return;
    onAddLog(lead.id, {
      ...newLog,
      data: new Date().toISOString(),
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

      // Criar pastas no Dropbox
      const nomeCliente = lead.nome;
      const tipo = lead.tipo || 'Projeto';
      const pastaBase = `/NL Arquitetos/07 - Projetos NL OS/01 - Clientes/${nomeCliente} - ${tipo}`;

      const subpastas = [
        '01 - Briefing',
        '02 - Conceito',
        '03 - Estudo Preliminar', 
        '04 - Projeto Executivo',
        '05 - Detalhamento',
        '06 - Obra',
        '07 - Marketing',
        '08 - Contrato'
      ];

      try {
        // Criar pasta principal
        await supabase.functions.invoke('dropbox-proxy', {
          body: { action: 'create_folder', path: pastaBase }
        });

        // Criar subpastas
        for (const subpasta of subpastas) {
          await supabase.functions.invoke('dropbox-proxy', {
            body: { action: 'create_folder', path: `${pastaBase}/${subpasta}` }
          });
        }

        // Gerar token_cliente e salvar dropbox_folder
        const tokenCliente = crypto.randomUUID();
        await supabase
          .from('projetos')
          .update({ 
            dropbox_folder: `${nomeCliente} - ${tipo}`,
            token_cliente: tokenCliente
          })
          .eq('id', newProject.id);

        toast.success('Projeto criado e pastas no Dropbox configuradas.');
      } catch (dropboxError) {
        console.error('Erro ao criar pastas no Dropbox:', dropboxError);
        toast.warning('Projeto criado. Pastas no Dropbox não foram criadas — sincronize manualmente.');
      }

      navigate(`/projetos/detalhe/${newProject.id}`);
    } catch (error) {
      console.error('Error converting lead to project:', error);
      toast.error("Erro ao converter lead em projeto.");
    } finally {
      setIsConverting(false);
    }
  };

  const getScriptsForStage = (stage: Stage) => {
    const scriptsMap: Record<string, { situacao: string; texto: string }[]> = {
      'Novo Lead': [
        { situacao: "RESPOSTA PADRÃO", texto: `Olá, ${lead.nome}. Tudo bem? Sou arquiteto da NL Arquitetos. Obrigado pelo contato. Para entender se podemos ajudar e como, preciso de duas informações rápidas: — Qual tipo de projeto você está pensando? (residencial, interiores ou comercial) — Em qual cidade o imóvel ou terreno está localizado?` },
        { situacao: "ENVIO DO PRÉ-BRIEFING", texto: `Perfeito, obrigado pelas informações. O primeiro passo aqui na NL Arquitetos é um pré-briefing — um formulário rápido que leva cerca de 8 minutos. Ele nos permite entender melhor o seu projeto antes da reunião. Segue o link: [LINK] Assim que receber suas respostas, analiso pessoalmente.` }
      ],
      'Reunião Agendada': [
        { situacao: "CONFIRMAÇÃO", texto: `Olá, ${lead.nome}. Confirmando nossa reunião de apresentação amanhã às [HORA]. Podemos manter?` },
        { situacao: "PÓS-REUNIÃO", texto: `Olá, ${lead.nome}. Foi um prazer conhecer seu projeto hoje. Já estou trabalhando na estruturação da sua proposta e te envio em breve.` }
      ],
      'Proposta Enviada': [
        { situacao: "FOLLOW-UP 48H", texto: `Olá, ${lead.nome}. Tudo bem? Passando para confirmar se você recebeu a proposta que enviei e se ficou com alguma dúvida sobre o escopo ou as fases do projeto.` },
        { situacao: "REUNIÃO DE DÚVIDAS", texto: `Olá, ${lead.nome}. Geralmente após ler a proposta surgem algumas dúvidas técnicas. Se preferir, podemos fazer uma chamada rápida de 10 minutos para eu te explicar os detalhes do investimento. O que acha?` }
      ],
      'Negociação': [
        { situacao: "FECHAMENTO", texto: `Olá, ${lead.nome}. Estou com o contrato pronto aqui conforme conversamos. Podemos avançar com a assinatura digital hoje?` }
      ]
    };
    return scriptsMap[stage] || [];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Script copiado!");
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-graphite/40 backdrop-blur-[8px]" onClick={onClose} />
      <div className="relative w-[520px] h-full bg-[#111111] shadow-[-30px_0_60px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
        <div className="p-10 border-b border-white/10 relative">
          <button onClick={onClose} className="absolute right-8 top-8 text-white/40 hover:text-white transition-transform hover:scale-110"><X size={20} /></button>
          <div className="flex items-center gap-3 mb-2">
            <span className={cn(
              "px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest border",
              lead.temp === 'Quente' ? "bg-red/5 border-red/20 text-red" : "bg-white/5 border-white/10 text-white/40"
            )}>
              {lead.temp}
            </span>
          </div>
          <h2 className="text-4xl font-cormorant text-white mb-6 leading-none">{lead.nome}</h2>
          <div className="flex flex-wrap gap-2">
            {STAGES.map(s => {
              const isPerdido = s === 'Perdido';
              const isActive = lead.stage === s;
              return (
                <button 
                  key={s} 
                  onClick={() => onUpdateStage(lead.id, s)}
                  className={cn(
                    "px-4 py-2 text-[9px] font-bold uppercase tracking-widest border rounded-none transition-all",
                    isActive 
                      ? "bg-bronze text-white border-bronze" 
                      : isPerdido
                        ? "bg-transparent border-red-500/30 text-red-400/60 hover:border-red-500 hover:text-red-400"
                        : "bg-[#2A2826] border-[#4A4846] text-white/40 hover:border-bronze hover:text-white"
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          <section>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Dados do Lead</h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Score Total:</span>
                <span className="text-sm font-bold text-bronze">{calculateLeadScore(lead).score}/10</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 text-[11px] mb-8">
              <div><p className="text-white/40">WhatsApp</p><a href={`https://wa.me/55${lead.whats.replace(/\D/g, '')}`} className="text-bronze underline">{lead.whats}</a></div>
              <div><p className="text-white/40">Cidade</p><p className="text-white">{lead.cidade}</p></div>
              <div><p className="text-white/40">Tipo</p><p className="text-white">{lead.tipo}</p></div>
              <div><p className="text-white/40">Área</p><p className="text-white">{lead.area} m²</p></div>
              <div><p className="text-white/40">Orçamento</p><p className="text-white">{formatCurrency(lead.orcamento)}</p></div>
              <div><p className="text-white/40">Entrada</p><p className="text-white">{new Date(lead.criado).toLocaleDateString('pt-BR')}</p></div>
              <div><p className="text-white/40">Origem</p><p className="text-white">{lead.origem}</p></div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 p-4 rounded-none space-y-2">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">Breakdown do Score</p>
              {calculateLeadScore(lead).breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    {item.achieved ? <Check size={10} className="text-green-600" /> : <X size={10} className="text-red" />}
                    <span className={cn(item.achieved ? "text-white" : "text-white/40")}>{item.label}</span>
                  </div>
                  <span className={cn("font-mono", item.achieved ? "text-bronze font-bold" : "text-white/40")}>
                    {item.achieved ? `+${item.value}` : '+0'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="p-4 rounded-none border border-amber-500/30 bg-white/[0.03] space-y-4">
            <div className="flex items-start gap-3">
              {viability.status === 'prejuizo' ? <AlertCircle size={18} className="text-red-600 shrink-0" /> :
               viability.status === 'alerta' ? <AlertCircle size={18} className="text-amber-600 shrink-0" /> :
               <CheckCircle2 size={18} className="text-green-600 shrink-0" />}
              
              <div className="space-y-1">
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  viability.status === 'prejuizo' ? "text-red-600" :
                  viability.status === 'alerta' ? "text-amber-600" :
                  "text-green-600"
                )}>
                  {viability.status === 'prejuizo' ? "ATENÇÃO: Este projeto está abaixo do custo interno" :
                   viability.status === 'alerta' ? "Margem baixa recomendada" :
                   "Projeto Viável"}
                </p>
                <p className="text-[11px] leading-relaxed text-white/70">
                  {viability.mensagem}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">Horas Est.</p>
                  <input 
                    type="number" 
                    value={horasEstimadas} 
                    onChange={(e) => setHorasEstimadas(parseInt(e.target.value) || 0)}
                    className="w-16 bg-transparent border-none p-0 text-xs font-bold text-white focus:ring-0"
                  />
                </div>
                <div>
                  <p className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">Custo Real</p>
                  <p className="text-xs font-bold text-white">R$ {((viability as any).custoReal || 0).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">Margem Real</p>
                <p className={cn(
                  "text-sm font-bold",
                  viability.status === 'prejuizo' ? "text-red-600" : "text-white"
                )}>
                  {((viability as any).margemReal || 0).toFixed(0)}%
                </p>
              </div>
            </div>
          </section>


          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-6">Ações Rápidas</h4>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Button className="flex-1 bg-[#2A2826] border border-[#4A4846] text-white hover:border-bronze text-[10px] uppercase font-bold tracking-widest h-10 rounded-none transition-all" onClick={() => window.open(`https://wa.me/55${lead.whats.replace(/\D/g, '')}`)}>Abrir WhatsApp</Button>
                <Button variant="outline" className="flex-1 bg-[#2A2826] border border-[#4A4846] text-white hover:border-bronze text-[10px] uppercase font-bold tracking-widest h-10 rounded-none transition-all">Agendar Próxima Ação</Button>
              </div>
              
              {lead.stage === 'Fechado' && (
                <Button 
                  onClick={handleConvertToProject}
                  disabled={isConverting}
                  className="w-full bg-bronze hover:bg-bronze/90 text-white text-[10px] uppercase font-bold tracking-widest h-12 rounded-none transition-all shadow-lg shadow-bronze/20"
                >
                  <LayoutGrid size={14} className="mr-2" />
                  {isConverting ? "Convertendo..." : "Converter em Projeto"}
                </Button>
              )}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Scripts de Atendimento</h4>
              <span className="text-[8px] px-2 py-0.5 bg-bronze/10 text-bronze border border-bronze/20 font-bold uppercase tracking-widest">{lead.stage}</span>
            </div>
            <div className="space-y-3">
              {getScriptsForStage(lead.stage).length > 0 ? (
                getScriptsForStage(lead.stage).map((script, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 group hover:border-bronze/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{script.situacao}</span>
                      <button 
                        onClick={() => copyToClipboard(script.texto)}
                        className="text-white/20 hover:text-bronze transition-colors"
                      >
                        <MessageSquare size={14} />
                      </button>
                    </div>
                    <p className="text-[11px] text-white/60 leading-relaxed">{script.texto}</p>
                    <button 
                      onClick={() => copyToClipboard(script.texto)}
                      className="mt-3 w-full py-2 bg-white/5 hover:bg-bronze hover:text-white text-[9px] font-bold uppercase tracking-widest text-white/40 transition-all opacity-0 group-hover:opacity-100"
                    >
                      Copiar Script
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 border border-dashed border-white/5 text-center">
                  <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Sem scripts específicos para esta etapa</p>
                  <Button 
                    variant="ghost" 
                    className="mt-4 text-[9px] font-bold uppercase tracking-widest text-bronze"
                    onClick={() => navigate('/scripts')}
                  >
                    Ver Todos os Scripts
                  </Button>
                </div>
              )}
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-6">Histórico de Contatos</h4>
            <div className="space-y-4">
              {lead.logs.map((log, i) => (
                <div key={i} className={cn(
                  "text-[11px] p-3 border rounded-none",
                  log.tipo === 'N' ? "border-bronze/20 bg-bronze/5" : "border-white/10"
                )}>
                  <div className="flex justify-between text-white/40 text-[9px] mb-1">
                    <span>{formatarDataHora(log.data)} · {log.autor}</span>
                    {log.tipo === 'N' && <span className="text-bronze font-bold uppercase tracking-tighter">Movimentação</span>}
                  </div>
                  <p className={cn(
                    "text-white",
                    log.tipo === 'N' && "italic text-white/40 flex items-center gap-2"
                  )}>
                    {log.tipo === 'N' && <span className="text-bronze font-bold">→</span>}
                    {log.nota}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
              <div className="relative">
                <select 
                  className="w-full p-2 bg-[#1A1A1A] border border-white/10 text-white/60 text-[11px] rounded-none focus:outline-none focus:border-bronze transition-colors appearance-none pr-8" 
                  onChange={(e) => setNewLog({...newLog, tipo: e.target.value as LogTipo})}
                >
                  <option value="N">Nota</option><option value="W">WhatsApp</option><option value="L">Ligação</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              </div>
              <Input 
                placeholder="Descrever o contato..." 
                value={newLog.nota} 
                onChange={(e) => setNewLog({...newLog, nota: e.target.value})} 
                className="bg-[#1A1A1A] border-white/10 text-white rounded-none focus:border-bronze transition-colors" 
              />
              <Button className="w-full bg-bronze text-white hover:bg-bronze/80 text-[10px] uppercase font-bold tracking-widest h-10 rounded-none transition-all" onClick={handleAddLog}>Registrar</Button>
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-white/10">
          {isDeleting ? (
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 text-white/40" onClick={() => setIsDeleting(false)}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 text-white" onClick={() => onDelete(lead.id)}>Confirmar Exclusão</Button>
            </div>
          ) : (
            <Button variant="ghost" className="w-full text-white/40 hover:text-red-600 border border-transparent hover:border-red-600 rounded-none" onClick={() => setIsDeleting(true)}>
              <Trash2 size={14} className="mr-2"/> Excluir Lead
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadDetailPanel;