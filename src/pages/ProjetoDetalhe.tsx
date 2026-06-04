import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  MoreVertical,
  Trash2,
  Zap
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Projeto {
  id: string;
  nome: string;
  nome_cliente: string;
  cliente_id?: string;
  valor_total?: number;
  tipo: string;
  cidade: string;
  area_m2: number;
  etapa_atual: string;
  status_geral: string;
  data_inicio: string;
  prazo_final: string;
}

interface Etapa {
  id: string;
  etapa: string;
  status: string;
  data_entrega: string;
  data_aprovacao: string;
  aprovado_por: string;
  notas: string;
  horas_estimadas?: number;
  horas_lancadas?: number;
}

interface ChecklistItem {
  id: string;
  etapa: string;
  item: string;
  concluido: boolean;
}

const ETAPAS_CONFIG = [
  { id: 'BRIEFING', label: '01 · BRIEFING & VIABILIDADE', desc: 'Preencha o levantamento inicial para começar.' },
  { id: 'CONCEITO', label: '02 · CONCEITO & MOODBOARD', desc: 'Defina a identidade visual do projeto.' },
  { id: 'ESTUDO', label: '03 · ESTUDO PRELIMINAR (3D)', desc: 'Modele e apresente o estudo volumétrico.' },
  { id: 'EXECUTIVO', label: '04 · PROJETO EXECUTIVO', desc: 'Detalhe as plantas e especificações técnicas.' },
  { id: 'DETALHAMENTO', label: '05 · DETALHAMENTO PREMIUM', desc: 'Detalhamento de mobiliário e acabamentos.' },
  { id: 'ACOMPANHAMENTO', label: '06 · ACOMPANHAMENTO DE OBRA', desc: 'Gerencie a execução no local.' }
];

const ProjetoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contrato, setContrato] = useState<any>(null);
  const [lead, setLead] = useState<any>(null);
  const [horasLog, setHorasLog] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: pData } = await supabase.from('projetos').select('*').eq('id', id).single();
      if (pData) {
        setProjeto(pData);
        if (pData.cliente_id) {
          const { data: cData } = await supabase.from('contratos_clientes').select('*').eq('cliente_id', pData.cliente_id).maybeSingle();
          if (cData) setContrato(cData);
          const { data: lData } = await supabase.from('leads').select('*').eq('id', pData.cliente_id).maybeSingle();
          if (lData) setLead(lData);
        }
      }
      const { data: eData } = await supabase.from('projeto_etapas').select('*').eq('projeto_id', id);
      if (eData) setEtapas(eData);
      const { data: cData } = await supabase.from('projeto_checklist').select('*').eq('projeto_id', id);
      if (cData) setChecklist(cData);
      const { data: hData } = await supabase.from('projeto_horas_log').select('*').eq('projeto_id', id).order('criado_em', { ascending: false });
      if (hData) setHorasLog(hData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  const updateEtapaStatus = async (etapaId: string, status: string) => {
    await supabase.from('projeto_etapas').update({ status }).eq('id', etapaId);
    fetchData();
  };

  const toggleCheck = async (itemId: string, status: boolean) => {
    await supabase.from('projeto_checklist').update({ concluido: !status }).eq('id', itemId);
    fetchData();
  };

  const saveNotas = async (etapaId: string, notas: string) => {
    await supabase.from('projeto_etapas').update({ notas }).eq('id', etapaId);
    toast.success("Notas salvas");
  };

  const saveProjetoNotas = async (notas: string) => {
    // Logic for generic notes if needed
  };

  const handleLancarHoras = async (etapaId: string) => {
    const horas = prompt("Quantas horas deseja lançar?");
    if (horas && !isNaN(Number(horas))) {
      const config = ETAPAS_CONFIG.find(c => c.id === etapaId);
      const { error } = await supabase.from('projeto_horas_log').insert({
        projeto_id: id,
        etapa_nome: config?.label.split('·')[1].trim(),
        horas: Number(horas),
        usuario: 'Equipe NL'
      });
      
      if (!error) {
        toast.success("Horas lançadas com sucesso");
        fetchData();
      }
    }
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    await supabase.from('projetos').delete().eq('id', id);
    navigate('/projetos/gestao');
  };

  if (loading || !projeto) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-white">CARREGANDO...</div>;

  const currentEtapaIdx = ETAPAS_CONFIG.findIndex(e => e.id === projeto.etapa_atual?.toUpperCase());
  const pct = currentEtapaIdx === -1 ? 0 : Math.round(((currentEtapaIdx + 1) / 6) * 100);

  return (
    <div className="flex min-h-screen bg-[#0d0d0d]">
      <Sidebar user="Equipe NL" />
      <main className="flex-1 text-[#e8e8e8] font-sans p-6 md:p-12 overflow-x-hidden min-w-0">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* HEADER */}
          <header className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-[28px] font-['Georgia'] text-white">{projeto.nome_cliente}</h1>
                <p className="text-[#555] text-xs font-['Courier_New'] mt-1 uppercase tracking-widest">
                  {projeto.tipo} · {projeto.cidade} · {projeto.area_m2}m² · desde {projeto.data_inicio ? format(parseISO(projeto.data_inicio), 'dd/MM/yyyy') : '—'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="link" className="text-[#8B7355] text-xs uppercase" onClick={() => navigate(`/clientes/${projeto.cliente_id}`)}>VER FICHA →</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger><MoreVertical className="text-[#555]" /></DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#141414] border-white/10">
                    <DropdownMenuItem onClick={handleDeleteProject} className="text-rose-500">Excluir Projeto</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-[#e8e8e8]">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> ATIVO
            </div>

            <div className="w-full bg-[#141414] h-2 rounded-full overflow-hidden">
              <div className="bg-[#8B7355] h-full transition-all" style={{ width: `${pct}%` }}></div>
            </div>

            <Button className="bg-emerald-600 text-[10px] uppercase tracking-widest font-bold">
              WhatsApp · {currentEtapaIdx !== -1 ? ETAPAS_CONFIG[currentEtapaIdx]?.label.split('·')[1].trim() : 'CONTATO'}
            </Button>
          </header>

          {/* PRÓXIMA AÇÃO */}
          {currentEtapaIdx !== -1 && currentEtapaIdx < 6 && (
            <div className="bg-[#8B7355] h-[48px] px-5 text-white flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <Zap className="text-white w-4 h-4 shrink-0" />
                <p className="text-[13px] leading-none">
                  Aguardando aprovação do {ETAPAS_CONFIG[currentEtapaIdx]?.label.split('·')[1].trim()}
                </p>
              </div>
              <Button 
                variant="ghost"
                className="text-white hover:bg-white/10 p-0 h-auto text-[9px] font-mono tracking-widest uppercase"
                onClick={() => {
                  const label = ETAPAS_CONFIG[currentEtapaIdx]?.label.split('·')[1].trim();
                  const msg = `Olá! Gostaria de falar sobre a etapa de ${label} do projeto ${projeto.nome}.`;
                  window.open(`https://wa.me/${lead?.telefone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(msg)}`, '_blank');
                }}
              >
                WHATSAPP →
              </Button>
            </div>
          )}

          {/* ETAPAS */}
          <section className="space-y-4">
            <Accordion type="single" collapsible className="space-y-4">
              {ETAPAS_CONFIG.map((config) => {
                const e = etapas.find(et => et.etapa === config.id);
                return (
                  <AccordionItem key={config.id} value={config.id} className="bg-[#141414] border border-white/10 px-6">
                    <AccordionTrigger className="text-xs uppercase tracking-widest font-bold hover:no-underline py-6">{config.label}</AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-2 pb-8 border-t border-white/5">
                      {/* Checklist */}
                      <div className="space-y-3 mt-4">
                        <p className="text-[10px] font-bold text-[#8B7355] uppercase tracking-widest mb-4 font-mono">Checklist de Entrega</p>
                        {checklist.filter(c => c.etapa === config.id).length > 0 ? (
                          checklist.filter(c => c.etapa === config.id).map(item => (
                            <div key={item.id} className="flex items-center gap-3 py-1">
                              <Checkbox 
                                id={item.id}
                                checked={item.concluido} 
                                onCheckedChange={() => toggleCheck(item.id, item.concluido)} 
                                className="border-white/20 data-[state=checked]:bg-[#8B7355] data-[state=checked]:border-[#8B7355]"
                              />
                              <label htmlFor={item.id} className={cn("text-xs transition-colors", item.concluido ? "text-[#555] line-through italic" : "text-[#ccc]")}>
                                {item.item}
                              </label>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-[#444] italic">Nenhum item cadastrado para esta etapa.</p>
                        )}
                      </div>

                      {/* Notas */}
                      <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-bold text-[#8B7355] uppercase tracking-widest font-mono">Notas Técnicas</p>
                        <Textarea 
                          placeholder="Observações técnicas ou decisões de projeto..." 
                          defaultValue={e?.notas} 
                          onBlur={(x) => saveNotas(e?.id || '', x.target.value)} 
                          className="bg-white/5 border-white/10 text-xs min-h-[120px] focus:border-[#8B7355]/50 transition-all text-white/80 leading-relaxed font-sans" 
                        />
                      </div>

                      {/* Horas e Ações */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-8">
                          <div className="space-y-1">
                            <p className="text-[10px] text-[#555] uppercase font-mono tracking-tighter">Horas Estimadas</p>
                            <p className="text-xl text-white font-serif italic">{e?.horas_estimadas || 0}h</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-[#555] uppercase font-mono tracking-tighter">Horas Lançadas</p>
                            <p className="text-xl text-white font-serif italic">{e?.horas_lancadas || 0}h</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-[10px] uppercase font-mono border-white/10 hover:bg-white/5 tracking-widest px-6"
                            onClick={() => handleLancarHoras(config.id)}
                          >
                            Lançar Horas
                          </Button>
                          {e?.status !== 'CONCLUIDO' && (
                            <Button 
                              size="sm" 
                              className="text-[10px] uppercase font-mono bg-[#8B7355] hover:bg-[#8B7355]/80 tracking-widest px-6"
                              onClick={() => updateEtapaStatus(e?.id || '', 'CONCLUIDO')}
                            >
                              Aprovar Etapa
                            </Button>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </section>

          {/* FINANCEIRO + DOCS */}
          <div className="grid grid-cols-2 gap-8">
              <div className="bg-[#141414] border border-white/10 p-6">
                  <h3 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase">Financeiro</h3>
                  <div className="text-3xl font-['Georgia'] mt-4">R$ {contrato?.valor_total || projeto.valor_total || '—'}</div>
                  
                  {(contrato?.marco1_valor || contrato?.marco2_valor || contrato?.marco3_valor) && (
                    <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                      {contrato?.marco1_valor && (
                        <div className="flex justify-between text-[10px] font-['Courier_New']">
                          <span className="text-[#555]">MARCO 01</span>
                          <span>R$ {contrato.marco1_valor}</span>
                        </div>
                      )}
                      {contrato?.marco2_valor && (
                        <div className="flex justify-between text-[10px] font-['Courier_New']">
                          <span className="text-[#555]">MARCO 02</span>
                          <span>R$ {contrato.marco2_valor}</span>
                        </div>
                      )}
                      {contrato?.marco3_valor && (
                        <div className="flex justify-between text-[10px] font-['Courier_New']">
                          <span className="text-[#555]">MARCO 03</span>
                          <span>R$ {contrato.marco3_valor}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button className="mt-6 w-full text-[10px]" variant="outline">VER FINANCEIRO COMPLETO →</Button>
              </div>
              <div className="bg-[#141414] border border-white/10 p-6 space-y-4">
                  <h3 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase">Documentos</h3>
                  {['Pasta', 'Contrato', 'Briefing', 'Atas'].map(d => <div key={d} className="text-xs border-b border-white/5 pb-2 cursor-pointer text-[#ccc]">{d}</div>)}
              </div>
          </div>

          {/* NOTAS */}
          <div className="bg-[#141414] border border-white/10 p-8">
              <h3 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase mb-4">Notas Internas</h3>
              <Textarea className="bg-transparent border-white/10 min-h-[150px]" onBlur={(x) => saveProjetoNotas(x.target.value)} />
          </div>

          {/* HISTÓRICO */}
          {horasLog.length > 0 && (
            <div className="bg-[#141414] border border-white/10 p-6">
              <h3 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase mb-4">Histórico de Horas</h3>
              <div className="space-y-2">
                  {horasLog.map(h => <div key={h.id} className="text-xs grid grid-cols-4 border-b border-white/5 pb-2 text-[#555] font-['Courier_New']"><span>{h.etapa_nome}</span><span>{h.horas}h</span><span>{h.usuario}</span><span>{format(parseISO(h.criado_em), 'dd/MM')}</span></div>)}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProjetoDetalhe;
