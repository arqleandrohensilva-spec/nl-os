import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, History, User, Phone, Pencil, Save, Clock, Copy, ExternalLink, Check, Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';

const ORIGENS = ['Instagram', 'Indicação', 'Site', 'Outro'];

const ETAPAS = [
  { id: 'ficha', label: 'FICHA' },
  { id: 'pre_briefing', label: 'PRÉ-BRIEFING' },
  { id: 'reuniao', label: 'REUNIÃO' },
  { id: 'proposta', label: 'PROPOSTA' },
  { id: 'contrato', label: 'CONTRATO' }
];

const ClienteFicha = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['ficha']);
  
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    cpf_cnpj: '',
    cidade: '',
    endereco_imovel: '',
    origem: 'Instagram',
    observacoes: '',
    imovel_definido: '',
    tipo_projeto: '',
    area_m2: '',
    orcamento: '',
    prazo: '',
    quem_decide: '',
    anotacoes_reuniao: '',
    data_reuniao: '',
    checklist_reuniao: [] as string[]
  });

  const { data: cliente, isLoading: isClienteLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: historico } = useQuery({
    queryKey: ['historico_cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_clientes')
        .select('*')
        .eq('cliente_id', id)
        .order('data_hora', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: briefing } = useQuery({
    queryKey: ['briefing_cliente', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('briefings')
        .select('*')
        .eq('cliente_id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id
  });

  const { data: proposta } = useQuery({
    queryKey: ['proposta_cliente', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('proposals')
        .select('*')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id
  });

  const { data: contrato } = useQuery({
    queryKey: ['contrato_cliente', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contratos')
        .select('*')
        .eq('cliente_id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id
  });

  useEffect(() => {
    if (cliente) {
      setFormData(prev => ({
        ...prev,
        nome: cliente.nome || '',
        whatsapp: cliente.whatsapp || '',
        email: cliente.email || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        cidade: cliente.cidade || '',
        endereco_imovel: cliente.endereco_imovel || '',
        origem: cliente.origem || 'Instagram',
        observacoes: cliente.observacoes || '',
        imovel_definido: cliente.imovel_definido || '',
        tipo_projeto: cliente.tipo_projeto || '',
        area_m2: cliente.area_m2?.toString() || '',
        orcamento: cliente.orcamento || '',
        prazo: cliente.prazo || '',
        quem_decide: cliente.quem_decide || '',
        etapa_fluxo: cliente.etapa_fluxo || 'ficha'
      }));
      if (cliente.etapa_fluxo) {
        setOpenSections([cliente.etapa_fluxo]);
      }
    }
  }, [cliente]);

  const updateEtapa = async (novaEtapa: string) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ etapa_fluxo: novaEtapa } as any)
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(`Avançado para etapa: ${novaEtapa.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ['cliente', id] });
      setOpenSections([novaEtapa]);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar etapa");
    }
  };

  const handleCreateProject = async () => {
    if (!cliente || !id) return;
    try {
      // 1. Marcar como assinado
      const { error: updateError } = await supabase
        .from('clientes')
        .update({ 
          contrato_assinado: true, 
          contrato_assinado_em: new Date().toISOString(),
          etapa_fluxo: 'projeto'
        } as any)
        .eq('id', id);
      
      if (updateError) throw updateError;

      // 2. Criar projeto
      const { data: novoProjeto, error: projectError } = await supabase.from('projetos').insert({
        nome: `Projeto ${cliente.nome}`,
        nome_cliente: cliente.nome,
        tipo: cliente.tipo_projeto || 'Arq+Int',
        cidade: cliente.cidade,
        area_m2: parseFloat(cliente.area_m2 as any) || 0,
        etapa_atual: 'Briefing',
        status_geral: 'ativo',
        data_inicio: new Date().toISOString().split('T')[0],
        cliente_id: id
      }).select().single();

      if (projectError) throw projectError;

      // 3. Criar etapas padrão
      const etapasPadrao = [
        { nome: 'Briefing', status: 'concluido' },
        { nome: 'Estudo Preliminar', status: 'em_andamento' },
        { nome: 'Anteprojeto', status: 'pendente' },
        { nome: 'Executivo', status: 'pendente' }
      ];

      for (const ep of etapasPadrao) {
        await supabase.from('projeto_etapas').insert({
          projeto_id: novoProjeto.id,
          nome: ep.nome,
          status: ep.status,
          ordem: etapasPadrao.indexOf(ep)
        });
      }

      toast.success(`Projeto criado — ${cliente.nome}`);
      queryClient.invalidateQueries({ queryKey: ['cliente', id] });
      
      // Mostrar botão ver projeto no final da etapa 5
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar projeto");
    }
  };

  const currentStepIndex = ETAPAS.findIndex(e => e.id === (cliente?.etapa_fluxo || 'ficha'));

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) ? prev.filter(s => s !== sectionId) : [...prev, sectionId]
    );
  };

  const calcularScore = (dados: any) => {
    let score = 0;
    if (dados.imovel_definido === 'Sim, definido') score += 2;
    else if (dados.imovel_definido === 'Em busca') score += 1;
    if (dados.tipo_projeto === 'ARQ+INT') score += 2;
    else if (['Interiores', 'Comercial'].includes(dados.tipo_projeto)) score += 1;
    if (Number(dados.area_m2) >= 200) score += 1;
    if (dados.orcamento === 'Acima R$700k') score += 3;
    else if (dados.orcamento === 'R$300-700k') score += 1;
    if (dados.prazo === 'Imediato') score += 2;
    else if (dados.prazo === '6 meses') score += 1;
    if (dados.quem_decide === 'Sozinho') score += 2;
    else if (dados.quem_decide === 'Com cônjuge') score += 1;
    if (dados.origem === 'Indicação') score += 3;
    else if (dados.origem === 'Google') score += 2;
    else if (dados.origem === 'Instagram') score += 1;
    return score;
  };

  const score = calcularScore(formData);
  const temp = score >= 9 ? 'Quente' : score >= 5 ? 'Morno' : 'Frio';

  const updateQualificacao = useCallback(async (key: string, value: any) => {
    if (!id) return;
    const newFormData = { ...formData, [key]: value };
    setFormData(newFormData);
    const newScore = calcularScore(newFormData);
    const newTemp = newScore >= 9 ? 'Quente' : newScore >= 5 ? 'Morno' : 'Frio';

    const updateValue = key === 'area_m2' ? Number(value) : value;
    await supabase.from('clientes').update({ [key]: updateValue } as any).eq('id', id);
    await supabase.from('leads').update({ score: newScore, temp: newTemp }).eq('cliente_id', id);
    queryClient.invalidateQueries({ queryKey: ['cliente', id] });
  }, [formData, id, queryClient]);

  if (isClienteLoading) return <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7355]"></div></div>;

  return (
    <div className="flex min-h-screen bg-[#0D0D0D] text-[#E8E4DF]">
      <Sidebar user="User" />
      
      <main className="flex-1 ml-[230px] p-12 max-w-6xl mx-auto space-y-12">
        {/* BARRA DE PROGRESSO */}
        <div className="bg-[#161616] p-8 border border-white/5 relative">
          <div className="flex justify-between items-center relative z-10">
            {ETAPAS.map((etapa, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={etapa.id} className="flex flex-col items-center gap-2 flex-1">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-500",
                    isCompleted ? "bg-[#8B7355] border-[#8B7355]" : 
                    isCurrent ? "bg-[#8B7355] border-[#8B7355] animate-pulse" : 
                    "bg-transparent border-[#2A2A2A]"
                  )} />
                  <span className={cn(
                    "text-[8px] font-['Courier_New'] font-bold tracking-[0.2em]",
                    isCompleted || isCurrent ? "text-[#8B7355]" : "text-white/20"
                  )}>
                    {etapa.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="absolute top-[40px] left-[10%] right-[10%] h-px bg-[#2A2A2A]" />
          <div 
            className="absolute top-[40px] left-[10%] h-px bg-[#8B7355] transition-all duration-700" 
            style={{ width: `${(currentStepIndex / (ETAPAS.length - 1)) * 80}%` }}
          />
        </div>

        {/* ETAPA 1 - FICHA */}
        <section className="bg-[#161616] border border-white/5 overflow-hidden">
          <div 
            onClick={() => toggleSection('ficha')}
            className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
          >
            <h2 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ETAPA 1 — FICHA DO CLIENTE</h2>
            <span className="text-[10px] text-white/20 uppercase font-bold">{openSections.includes('ficha') ? 'Fechar' : 'Abrir'}</span>
          </div>
          
          {openSections.includes('ficha') && (
            <div className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  { label: 'Nome', key: 'nome' },
                  { label: 'WhatsApp', key: 'whatsapp' },
                  { label: 'E-mail', key: 'email' },
                  { label: 'CPF/CNPJ', key: 'cpf_cnpj' },
                  { label: 'Cidade', key: 'cidade' },
                  { label: 'Endereço', key: 'endereco_imovel', fullWidth: true },
                  { label: 'Origem', key: 'origem' },
                ].map((field) => (
                  <div key={field.key} className={cn("space-y-1", field.fullWidth && "md:col-span-2 lg:col-span-3")}>
                    <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">{field.label}</Label>
                    <p className="text-[#E8E4DF] text-sm uppercase font-medium">{formData[field.key as keyof typeof formData] || '—'}</p>
                  </div>
                ))}
              </div>

              {/* QUALIFICAÇÃO BLOCO */}
              <div className="bg-[#0D0D0D] border border-white/5 p-6 space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-[#8B7355] font-bold tracking-widest uppercase font-['Courier_New']">Score de Qualificação</span>
                  <span className="text-lg font-medium text-[#8B7355]">{score}/15 — {temp}</span>
                </div>
                <Progress value={(score / 15) * 100} indicatorClassName={cn(
                  "transition-all duration-500",
                  temp === 'Frio' ? 'bg-[#333]' : temp === 'Morno' ? 'bg-[#8B7355]' : 'bg-[#8B7355]'
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'Tem imóvel/lote definido?', key: 'imovel_definido', options: ['Sim, definido', 'Em busca', 'Não'] },
                    { label: 'Tipo de projeto', key: 'tipo_projeto', options: ['ARQ+INT', 'Interiores', 'Comercial'] },
                    { label: 'Área estimada (m²)', key: 'area_m2', isNumeric: true },
                    { label: 'Orçamento estimado', key: 'orcamento', options: ['Acima R$700k', 'R$300-700k', 'Abaixo', 'Não sei'] },
                  ].map((field) => (
                    <div key={field.key} className="space-y-3">
                      <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">{field.label}</Label>
                      {field.isNumeric ? (
                        <Input 
                          type="number"
                          value={formData[field.key as keyof typeof formData]} 
                          onChange={(e) => updateQualificacao(field.key, e.target.value)}
                          className="bg-white/5 border-white/10 rounded-none h-9 text-xs"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {field.options?.map(opt => (
                            <button
                              key={opt}
                              onClick={() => updateQualificacao(field.key, opt)}
                              className={cn(
                                "px-3 py-1.5 text-[9px] uppercase border transition-all",
                                formData[field.key as keyof typeof formData] === opt
                                  ? "bg-[#8B7355] border-[#8B7355] text-white"
                                  : "bg-transparent border-[#2A2A2A] text-white/40 hover:border-[#8B7355]"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {currentStepIndex === 0 && (
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => updateEtapa('pre_briefing')}
                    className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-10 font-['Courier_New'] text-[10px] font-bold tracking-widest uppercase"
                  >
                    ENVIAR PRÉ-BRIEFING →
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ETAPA 2 - PRÉ-BRIEFING */}
        <section className={cn("bg-[#161616] border border-white/5 overflow-hidden", currentStepIndex < 1 && "opacity-40")}>
          <div 
            onClick={() => currentStepIndex >= 1 && toggleSection('pre_briefing')}
            className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer"
          >
            <h2 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ETAPA 2 — PRÉ-BRIEFING</h2>
            <span className="text-[10px] text-white/20 uppercase font-bold">{openSections.includes('pre_briefing') ? 'Fechar' : 'Abrir'}</span>
          </div>

          {openSections.includes('pre_briefing') && (
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">Link para envio</Label>
                <div className="flex gap-2">
                  <Input readOnly value="app.nl.arq.br/pre-briefing" className="bg-[#0D0D0D] border-white/5 text-white/60 text-xs rounded-none" />
                  <Button variant="outline" className="border-[#2A2A2A] text-white/60 rounded-none text-[10px] uppercase" onClick={() => {
                    navigator.clipboard.writeText("https://app.nl.arq.br/pre-briefing");
                    toast.success("Link copiado!");
                  }}><Copy size={14} className="mr-2" /> COPIAR</Button>
                  <Button 
                    className="bg-green-600/10 text-green-500 border border-green-600/20 hover:bg-green-600/20 rounded-none text-[10px] uppercase"
                    onClick={() => {
                      const msg = `Olá ${cliente?.nome}, aqui é da NL Arquitetos. Para iniciarmos seu projeto, precisamos que preencha nosso pré-briefing: https://app.nl.arq.br/pre-briefing`;
                      window.open(`https://wa.me/55${cliente?.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                  >
                    WHATSAPP
                  </Button>
                </div>
              </div>

              <div className="p-6 bg-[#0D0D0D] border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-2 h-2 rounded-full", briefing ? "bg-green-500" : "bg-yellow-500")} />
                  <span className="text-[10px] uppercase font-bold tracking-widest font-['Courier_New'] text-white/60">
                    {briefing ? 'BRIEFING PREENCHIDO ✓' : 'AGUARDANDO PREENCHIMENTO'}
                  </span>
                </div>
                
                {briefing && (
                  <div className="grid grid-cols-2 gap-8 mt-6 border-t border-white/5 pt-6">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Tipo de Projeto</span>
                      <p className="text-xs font-medium uppercase">{briefing.tipo_projeto || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Área estimada</span>
                      <p className="text-xs font-medium uppercase">{(briefing.respostas as any)?.area_estimada || '—'} m²</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Orçamento</span>
                      <p className="text-xs font-medium uppercase">{(briefing.respostas as any)?.orcamento || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Prazo</span>
                      <p className="text-xs font-medium uppercase">{(briefing.respostas as any)?.prazo || '—'}</p>
                    </div>
                  </div>
                )}
              </div>

              {currentStepIndex === 1 && (
                <div className="flex justify-end">
                  <Button 
                    onClick={() => updateEtapa('reuniao')}
                    className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-10 font-['Courier_New'] text-[10px] font-bold tracking-widest uppercase"
                  >
                    AGENDAR REUNIÃO →
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ETAPA 3 - REUNIÃO */}
        <section className={cn("bg-[#161616] border border-white/5 overflow-hidden", currentStepIndex < 2 && "opacity-40")}>
          <div 
            onClick={() => currentStepIndex >= 2 && toggleSection('reuniao')}
            className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer"
          >
            <h2 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ETAPA 3 — REUNIÃO</h2>
            <span className="text-[10px] text-white/20 uppercase font-bold">{openSections.includes('reuniao') ? 'Fechar' : 'Abrir'}</span>
          </div>

          {openSections.includes('reuniao') && (
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">Data e Hora</Label>
                  <div className="flex gap-2">
                    <Input type="datetime-local" className="bg-[#0D0D0D] border-white/5 rounded-none" />
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">Checklist de Reunião</Label>
                  <div className="space-y-3">
                    {[
                      'Apresentou o método R.E.S.O.L.V.E',
                      'Entendeu o problema do cliente',
                      'Definiu escopo preliminar',
                      'Cliente confirmou interesse em proposta'
                    ].map(item => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-4 h-4 border border-[#8B7355] flex items-center justify-center cursor-pointer">
                          <Check size={10} className="text-[#8B7355]" />
                        </div>
                        <span className="text-[10px] uppercase text-white/60">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[9px] uppercase tracking-widest text-white/30 font-['Courier_New']">Anotações Livres</Label>
                <textarea className="w-full h-32 bg-[#0D0D0D] border border-white/5 p-4 text-xs uppercase text-white/60 outline-none focus:border-[#8B7355]" placeholder="PONTOS IMPORTANTES DA REUNIÃO..." />
              </div>

              {currentStepIndex === 2 && (
                <div className="flex justify-end">
                  <Button 
                    onClick={() => updateEtapa('proposta')}
                    className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-10 font-['Courier_New'] text-[10px] font-bold tracking-widest uppercase"
                  >
                    GERAR PROPOSTA →
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ETAPA 4 - PROPOSTA */}
        <section className={cn("bg-[#161616] border border-white/5 overflow-hidden", currentStepIndex < 3 && "opacity-40")}>
          <div 
            onClick={() => currentStepIndex >= 3 && toggleSection('proposta')}
            className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer"
          >
            <h2 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ETAPA 4 — PROPOSTA</h2>
            <span className="text-[10px] text-white/20 uppercase font-bold">{openSections.includes('proposta') ? 'Fechar' : 'Abrir'}</span>
          </div>

          {openSections.includes('proposta') && (
            <div className="p-8 space-y-8">
              {!proposta ? (
                <div className="text-center py-10 border border-dashed border-white/5 bg-[#0D0D0D]">
                  <p className="text-[10px] uppercase text-white/20 font-['Courier_New'] mb-6">Nenhuma proposta vinculada a este cliente</p>
                  <Button 
                    onClick={() => navigate('/calculadora')}
                    className="bg-[#8B7355] text-white rounded-none px-8 text-[10px] font-bold uppercase"
                  >
                    CALCULAR PROPOSTA
                  </Button>
                </div>
              ) : (
                <div className="p-6 bg-[#0D0D0D] border border-white/5 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] uppercase text-[#8B7355] font-bold tracking-widest font-['Courier_New']">RESUMO DA PROPOSTA</span>
                      <h3 className="text-xl font-bold mt-1">NL.P{proposta.id.toString().slice(-4).toUpperCase()}</h3>
                    </div>
                    <div className="bg-[#8B7355]/10 px-3 py-1 text-[9px] font-bold text-[#8B7355] uppercase tracking-widest">
                      {proposta.status || 'ENVIADA'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Data de Envio</span>
                      <p className="text-xs uppercase">{proposta.created_at ? format(new Date(proposta.created_at), 'dd/MM/yyyy') : '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Plano Executivo</span>
                      <p className="text-xs uppercase">R$ {proposta.valor_executivo?.toLocaleString() || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-white/20 font-['Courier_New']">Plano Completo</span>
                      <p className="text-xs uppercase">R$ {proposta.valor_completo?.toLocaleString() || '—'}</p>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <Button 
                      variant="outline" 
                      className="border-[#2A2A2A] text-white/60 rounded-none text-[10px] uppercase"
                      onClick={() => navigate(`/proposta/executivo?id=${proposta.id}`)}
                    >
                      VER CARTA PROPOSTA
                    </Button>
                  </div>
                </div>
              )}

              {currentStepIndex === 3 && (
                <div className="flex justify-end">
                  <Button 
                    onClick={() => updateEtapa('contrato')}
                    className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-10 font-['Courier_New'] text-[10px] font-bold tracking-widest uppercase"
                  >
                    GERAR CONTRATO →
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ETAPA 5 - CONTRATO */}
        <section className={cn("bg-[#161616] border border-white/5 overflow-hidden", currentStepIndex < 4 && "opacity-40")}>
          <div 
            onClick={() => currentStepIndex >= 4 && toggleSection('contrato')}
            className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer"
          >
            <h2 className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ETAPA 5 — CONTRATO</h2>
            <span className="text-[10px] text-white/20 uppercase font-bold">{openSections.includes('contrato') ? 'Fechar' : 'Abrir'}</span>
          </div>

          {openSections.includes('contrato') && (
            <div className="p-8 space-y-8">
              {!contrato ? (
                <div className="text-center py-10 border border-dashed border-white/5 bg-[#0D0D0D]">
                  <p className="text-[10px] uppercase text-white/20 font-['Courier_New'] mb-6">Contrato ainda não gerado para este cliente</p>
                  <Button 
                    onClick={() => navigate('/propostas/documentos')}
                    className="bg-[#8B7355] text-white rounded-none px-8 text-[10px] font-bold uppercase"
                  >
                    GERAR CONTRATO
                  </Button>
                </div>
              ) : (
                <div className="p-6 bg-[#0D0D0D] border border-white/5 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[9px] uppercase text-[#8B7355] font-bold tracking-widest font-['Courier_New']">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</span>
                      <p className="text-xs uppercase mt-1">NL.C{contrato.id.toString().slice(-4).toUpperCase()}</p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 text-[9px] font-bold uppercase tracking-widest",
                      cliente?.contrato_assinado ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                    )}>
                      {cliente?.contrato_assinado ? 'ASSINADO ✓' : 'AGUARDANDO ASSINATURA'}
                    </div>
                  </div>
                  
                  {!cliente?.contrato_assinado ? (
                    <Button 
                      onClick={handleCreateProject}
                      className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-8 text-[10px] font-bold uppercase"
                    >
                      MARCAR COMO ASSINADO
                    </Button>
                  ) : (
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">ASSINADO EM {format(new Date(cliente.contrato_assinado_em), 'dd/MM/yyyy')}</p>
                      <Button 
                        onClick={() => navigate('/projetos/gestao')}
                        className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white rounded-none px-8 text-[10px] font-bold uppercase"
                      >
                        VER PROJETO →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ANOTAÇÕES INTERNAS E HISTÓRICO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          <section className="space-y-4">
            <Label className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.3em] font-bold">ANOTAÇÕES INTERNAS</Label>
            <textarea 
              value={formData.observacoes} 
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              onBlur={() => supabase.from('clientes').update({ observacoes: formData.observacoes }).eq('id', id)}
              placeholder="DIGITE AQUI..."
              className="w-full h-40 bg-[#161616] border border-white/5 p-6 text-[#E8E4DF] text-xs outline-none focus:border-[#8B7355] transition-colors resize-none uppercase"
            />
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <History size={16} className="text-[#8B7355]" />
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B7355] font-['Courier_New']">HISTÓRICO</h2>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {!historico || historico.length === 0 ? (
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-['Courier_New']">Nenhuma alteração registrada</p>
              ) : (
                historico.map((h) => (
                  <div key={h.id} className="flex gap-4 items-start relative pb-4 border-b border-white/5 last:border-0">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#8B7355] shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/60 font-['Courier_New'] uppercase tracking-widest leading-relaxed">
                        Alterado de <span className="text-white/40">{h.status_anterior || 'INICIAL'}</span> para <span className="text-white font-bold">{h.status_novo}</span>
                      </p>
                      <div className="flex items-center gap-2 text-[8px] text-white/20 uppercase tracking-widest font-bold">
                        <Clock size={10} />
                        {format(new Date(h.data_hora), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ClienteFicha;