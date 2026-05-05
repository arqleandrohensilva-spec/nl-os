import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { ConfigEscritorio, CustoEscritorio, CategoriaCusto } from '@/lib/types';
import { 
  Building2, 
  Users, 
  Monitor, 
  TrendingUp, 
  Receipt, 
  Shield, 
  Plus, 
  X, 
  ChevronDown, 
  ChevronRight,
  Info,
  Brain,
  Sparkles,
  RotateCcw,
  Loader2,
  ChevronUp,
  Target,
  Lightbulb,
  FileText,
  History,
  ArrowRight
} from 'lucide-react';

import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import FinancialHealthBar from '@/components/financeiro/FinancialHealthBar';
import CountUp from '@/components/financeiro/CountUp';
import DonutChartSection from '@/components/financeiro/DonutChartSection';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const CATEGORIES: { id: CategoriaCusto; label: string; icon: any; color: string }[] = [
  { id: 'fixo', label: 'Custo Fixo', icon: Building2, color: '#3A3A3A' },
  { id: 'prolabore', label: 'Pró-labore', icon: Users, color: '#8B7355' },
  { id: 'softwares', label: 'Softwares e Assinaturas', icon: Monitor, color: '#5A5A5A' },
  { id: 'variavel', label: 'Custo Variável', icon: TrendingUp, color: '#B5A48A' },
  { id: 'impostos', label: 'Impostos', icon: Receipt, color: '#777777' },
  { id: 'reservas', label: 'Reservas', icon: Shield, color: '#D1D1D1' },
];

const BaseFinanceira = () => {
  const [config, setConfig] = useState<ConfigEscritorio | null>(null);
  const [costs, setCosts] = useState<CustoEscritorio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openAccordion, setOpenAccordion] = useState<string | null>('fixo');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    nome: '',
    valor: '',
    categoria: 'fixo' as CategoriaCusto,
    frequencia: 'mensal' as any
  });

  const [user, setUser] = useState<string | null>(null);
  
  // AI State
  const [aiDiagnostic, setAiDiagnostic] = useState<string>('');
  const [aiStatus, setAiStatus] = useState<'critico' | 'atencao' | 'saudavel'>('atencao');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastAiAnalysis, setLastAiAnalysis] = useState<Date | null>(null);
  const [isAiExpanded, setIsAiExpanded] = useState(false);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const lastCustoHoraRef = useRef<number>(0);

  // Simulator State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simNumProjetos, setSimNumProjetos] = useState(2);
  const [simHorasPorProjeto, setSimHorasPorProjeto] = useState(200);
  const [simAnalysis, setSimAnalysis] = useState<string>('');
  const [isSimLoading, setIsSimLoading] = useState(false);

  // Premium Features State
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isAiSuggestionsLoading, setIsAiSuggestionsLoading] = useState(false);
  const [isComparingCenários, setIsComparingCenários] = useState(false);
  const [cenarioAMargem, setCenarioAMargem] = useState(30);
  const [cenarioBMargem, setCenarioBMargem] = useState(50);
  const [isEvolucaoOpen, setIsEvolucaoOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);


  // Calculations
  const calculations = useMemo(() => {
    if (!config) return { monthlyCosts: 0, faturableHours: 0, costPerHour: 0, suggestedPrice: 0 };

    // 1. Calculate base monthly costs (excluding percentual taxes for now)
    let baseMonthlyCosts = costs.reduce((acc, cost) => {
      if (cost.frequencia === 'percentual') return acc;
      const value = cost.frequencia === 'anual' ? cost.valor / 12 : cost.valor;
      return acc + value;
    }, 0);

    // 2. Faturable hours
    const faturableHours = config.horas_dia * config.dias_mes * (config.percentual_produtivo / 100) * config.num_arquitetos;

    // 3. Handle percentual costs (impostos)
    const totalTaxPercent = costs
      .filter(c => c.frequencia === 'percentual')
      .reduce((acc, c) => acc + (c.valor / 100), 0);
    
    const monthlyRevenueNeeded = totalTaxPercent < 1 
      ? baseMonthlyCosts / (1 - totalTaxPercent) 
      : baseMonthlyCosts;

    const monthlyCosts = monthlyRevenueNeeded;
    const costPerHour = faturableHours > 0 ? monthlyRevenueNeeded / faturableHours : 0;
    const suggestedPrice = costPerHour * (1 + config.margem_lucro / 100);

    return { 
      monthlyCosts, 
      faturableHours, 
      costPerHour, 
      suggestedPrice 
    };
  }, [config, costs]);

  useEffect(() => {

    const savedUser = sessionStorage.getItem('nl_user');
    if (savedUser) setUser(savedUser);
    
    fetchData();

    const configChannel = supabase
      .channel('config-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config_escritorio' }, () => fetchData())
      .subscribe();

    const costsChannel = supabase
      .channel('costs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custos_escritorio' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
      supabase.removeChannel(costsChannel);
    };
  }, []);

  useEffect(() => {
    if (calculations.costPerHour > 0) {
      // Trigger automatic diagnosis on first load or >10% change
      const diff = Math.abs(calculations.costPerHour - lastCustoHoraRef.current);
      const percentChange = lastCustoHoraRef.current > 0 ? (diff / lastCustoHoraRef.current) * 100 : 100;
      
      if (percentChange > 10) {
        getAIDiagnostic();
        lastCustoHoraRef.current = calculations.costPerHour;
        
        // Sync custo_hora to global config in database
        if (config?.id) {
          supabase
            .from('config_escritorio')
            .update({ custo_hora: calculations.costPerHour })
            .eq('id', config.id)
            .then(({ error }) => {
              if (error) console.error('Error syncing custo_hora:', error);
            });
        }
      }
    }
  }, [calculations.costPerHour, config?.id]);


  const getAIDiagnostic = async () => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    
    try {
      // Fetch average ticket from leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('orcamento');
      
      const ticketMedioVal = leadsData && leadsData.length > 0
        ? leadsData.reduce((acc, l) => acc + (Number(l.orcamento) || 0), 0) / leadsData.length
        : 0;
      
      const ticketMedio = ticketMedioVal > 0 
        ? ticketMedioVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) 
        : "85.000 (estimado)"; 

      const totalMensal = calculations.monthlyCosts;
      const totalFixo = costs.filter(c => c.categoria === 'fixo').reduce((acc, c) => acc + (c.frequencia === 'anual' ? c.valor / 12 : c.valor), 0);
      const totalProlabore = costs.filter(c => c.categoria === 'prolabore').reduce((acc, c) => acc + c.valor, 0);
      const totalSoftwares = costs.filter(c => c.categoria === 'softwares').reduce((acc, c) => acc + (c.frequencia === 'anual' ? c.valor / 12 : c.valor), 0);
      const totalVariavel = costs.filter(c => c.categoria === 'variavel').reduce((acc, c) => acc + c.valor, 0);
      const totalReservas = costs.filter(c => c.categoria === 'reservas').reduce((acc, c) => acc + c.valor, 0);
      const impostos = costs.filter(c => c.categoria === 'impostos').reduce((acc, c) => acc + c.valor, 0);
      const mercados = config?.mercados?.length ? config.mercados.join(', ') : 'São José dos Campos';

      const prompt = `
Você é o consultor financeiro interno da NL Arquitetos, escritório de arquitetura premium.

Analise os dados financeiros abaixo e gere um diagnóstico direto, técnico e útil em 3 parágrafos curtos.

DADOS ATUAIS:
- Custo/hora real: R$ ${calculations.costPerHour.toFixed(2)}
- Preço sugerido/hora (com ${config?.margem_lucro}% de margem): R$ ${calculations.suggestedPrice.toFixed(2)}
- Horas faturáveis/mês: ${Math.round(calculations.faturableHours)}h
- Número de arquitetos: ${config?.num_arquitetos}
- Total de custos mensais: R$ ${totalMensal.toFixed(2)}

BREAKDOWN DE CUSTOS:
- Custo Fixo: R$ ${totalFixo.toFixed(2)} (${((totalFixo/totalMensal)*100).toFixed(1)}% do total)
- Pró-labore: R$ ${totalProlabore.toFixed(2)} (${((totalProlabore/totalMensal)*100).toFixed(1)}% do total)
- Softwares: R$ ${totalSoftwares.toFixed(2)} (${((totalSoftwares/totalMensal)*100).toFixed(1)}% do total)
- Custo Variável: R$ ${totalVariavel.toFixed(2)} (${((totalVariavel/totalMensal)*100).toFixed(1)}% do total)
- Impostos: ${impostos}%
- Reservas: R$ ${totalReservas.toFixed(2)}

MERCADOS DE ATUAÇÃO: ${mercados}

CONTEXTO DE BENCHMARK POR MERCADO:
- São José dos Campos: R$ 120–180/hora (premium local)
- São Paulo: R$ 180–350/hora (premium capital)
- Campinas: R$ 130–200/hora
- Rio de Janeiro: R$ 160–280/hora
- Outros: usar São Paulo como referência superior

DADOS DE PIPELINE:
- Ticket médio atual do pipeline: R$ ${ticketMedio}

Lógica de classificação de STATUS:
- Crítico: custo/hora abaixo de 50% do mercado OU margem < 10%
- Atenção: custo/hora entre 50–80% do mercado OU margem entre 10–25%  
- Saudável: custo/hora acima de 80% do mercado E margem > 25%

Gere o diagnóstico com:
1. Uma avaliação direta do custo/hora atual comparado aos mercados de atuação cadastrados.
2. Identifique qual mercado representa a maior oportunidade de reajuste de preço para a NL.
3. Uma recomendação concreta e acionável para esta semana visando aumentar a lucratividade.

IMPORTANTE: No final da resposta, adicione uma linha oculta com o status no formato exato: STATUS: [critico|atencao|saudavel]

Tom: direto, técnico, sem rodeios. Máximo 5 linhas por parágrafo.
Não use markdown, não use bullets, não use títulos. Só texto corrido em 3 parágrafos.
Responda em português.
`;


      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { 
          prompt,
          systemPrompt: "Você é um consultor financeiro sênior especializado em escritórios de arquitetura."
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const content = data.choices[0].message.content;
      const statusMatch = content.match(/STATUS:\s*(critico|atencao|saudavel)/i);
      const status = statusMatch ? statusMatch[1].toLowerCase() : 'atencao';
      const cleanContent = content.replace(/STATUS:\s*(critico|atencao|saudavel)/i, '').trim();

      setAiDiagnostic(cleanContent);
      setAiStatus(status as any);
      setLastAiAnalysis(new Date());

      // Persist to Supabase
      await supabase.from('diagnosticos_ia').insert({
        conteudo: cleanContent,
        status: status,
        custo_hora_momento: calculations.costPerHour,
        criado_por: user || 'Sócio'
      });

      fetchAiHistory();
    } catch (error) {
      console.error('Error getting AI diagnostic:', error);
      setAiDiagnostic('Desculpe, não foi possível gerar o diagnóstico no momento. Verifique sua conexão ou tente novamente mais tarde.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const fetchAiHistory = async () => {
    const { data } = await supabase
      .from('diagnosticos_ia')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(5);
    
    if (data) setAiHistory(data);
  };

  useEffect(() => {
    fetchAiHistory();
  }, []);

  const getSimulatorAnalysis = async () => {
    if (isSimLoading) return;
    setIsSimLoading(true);
    
    try {
      const receita = simNumProjetos * simHorasPorProjeto * calculations.suggestedPrice;
      const lucro = receita - calculations.monthlyCosts;

      const prompt = `
Em uma frase direta: é realista para um escritório de 2 arquitetos em São José dos Campos 
fechar ${simNumProjetos} projetos de ${simHorasPorProjeto} horas em um mês, gerando receita de R$ ${receita.toFixed(2)} e lucro de R$ ${lucro.toFixed(2)}?
Se sim, diga por quê. Se não, sugira um cenário mais realista.
Máximo 3 linhas. Sem markdown. Em português.
`;

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { 
          prompt,
          systemPrompt: "Você é um consultor financeiro sênior especializado em escritórios de arquitetura."
        }
      });

      if (error) throw error;
      setSimAnalysis(data.choices[0].message.content);
    } catch (error) {
      console.error('Error getting simulator analysis:', error);
      toast.error('Erro ao analisar cenário');
    } finally {
      setIsSimLoading(false);
    }
  };


  const getAiSuggestions = async () => {
    if (isAiSuggestionsLoading || !config) return;
    setIsAiSuggestionsLoading(true);
    
    try {
      const lista_de_custos = costs.map(c => `- ${c.nome}: R$ ${c.valor}`).join('\n');
      const prompt = `
        Analise os custos cadastrados deste escritório de arquitetura e identifique até 3 custos 
        que provavelmente existem mas não foram cadastrados.

        CUSTOS CADASTRADOS:
        ${lista_de_custos}

        PERFIL: Escritório de arquitetura com ${config.num_arquitetos} arquitetos em ${config.mercados?.[0] || 'São José dos Campos'}, SP.

        Para cada custo esquecido potencial, retorne:
        - Nome do custo
        - Valor médio estimado para escritórios similares
        - Por que é importante cadastrar

        Responda em JSON no formato:
        [{"nome": "...", "valor_estimado": 000, "motivo": "..."}]

        Máximo 3 sugestões. Apenas custos realmente prováveis para este perfil.
        Responda apenas o JSON, sem markdown, sem explicação adicional.
      `;

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { 
          prompt,
          systemPrompt: "Você é um assistente financeiro que retorna apenas JSON."
        }
      });

      if (error) throw error;
      
      const content = data.choices[0].message.content;
      const suggestions = JSON.parse(content.replace(/```json|```/g, '').trim());
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    } finally {
      setIsAiSuggestionsLoading(false);
    }
  };

  const exportReport = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('base-financeira-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FDFDFD'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_Financeiro_NL_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
      toast.success('Relatório exportado com sucesso');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  const fetchData = async () => {
    try {
      const [configRes, costsRes] = await Promise.all([
        supabase.from('config_escritorio').select('*').single(),
        supabase.from('custos_escritorio').select('*').eq('ativo', true)
      ]);

      if (configRes.error) throw configRes.error;
      if (costsRes.error) throw costsRes.error;

      setConfig(configRes.data as ConfigEscritorio);
      setCosts(costsRes.data as CustoEscritorio[]);
      
      // Auto trigger suggestions if we have data
      if (costsRes.data.length > 0 && aiSuggestions.length === 0) {
        // We'll call this after setting state in useEffect
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (costs.length > 5 && !isAiSuggestionsLoading && aiSuggestions.length === 0) {
      getAiSuggestions();
    }
  }, [costs.length]);

  const updateConfig = async (updates: Partial<ConfigEscritorio>) => {
    if (!config) return;
    const newConfig = { ...config, ...updates };
    setConfig(newConfig); // Optimistic

    try {
      const { error } = await supabase
        .from('config_escritorio')
        .update(updates)
        .eq('id', config.id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Erro ao salvar configuração');
      fetchData(); // Revert
    }
  };

  const handleAddItem = async () => {
    if (!newItem.nome || !newItem.valor) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      const { error } = await supabase
        .from('custos_escritorio')
        .insert({
          nome: newItem.nome,
          valor: parseFloat(newItem.valor),
          categoria: newItem.categoria,
          frequencia: newItem.frequencia,
          ativo: true
        });

      if (error) throw error;
      
      toast.success('Item adicionado');
      setIsAddingItem(false);
      setNewItem({ nome: '', valor: '', categoria: 'fixo', frequencia: 'mensal' });
      fetchData();
    } catch (error) {
      console.error('Error adding cost:', error);
      toast.error('Erro ao adicionar item');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custos_escritorio')
        .update({ ativo: false })
        .eq('id', id);
      if (error) throw error;
      toast.success('Item removido');
      fetchData();
    } catch (error) {
      console.error('Error deleting cost:', error);
      toast.error('Erro ao remover item');
    }
  };


  if (isLoading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

  return (
    <div className="flex min-h-screen bg-[#FDFDFD]">
      <Sidebar user={user || ''} />
      
      <main className="flex-1 ml-[230px] flex flex-col h-screen overflow-hidden" id="base-financeira-content">
        {/* Header Section */}
        <div className="flex-shrink-0 bg-white z-10">
          <div className="px-10 py-6 border-b border-beige">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-cormorant text-graphite font-bold leading-none">Base Financeira</h1>
                <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-medium">Módulo 02 · Fundação da precificação</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportReport}
                disabled={isExporting}
                className="h-8 border-beige text-[9px] uppercase tracking-widest text-graphite hover:bg-beige/10 flex items-center gap-2"
              >
                {isExporting ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                Exportar Relatório
              </Button>
            </div>

            <FinancialHealthBar 
              costPerHour={calculations.costPerHour}
              benchmark={120}
              marketName={config?.mercados?.[0] || 'SJC'}
            />

            {/* AI Diagnostic Card */}
          <div className={cn(
            "p-6 border rounded-[4px] space-y-4 transition-all duration-300 overflow-hidden cursor-pointer",
            aiStatus === 'critico' ? "bg-red-50 border-red-200" :
            aiStatus === 'atencao' ? "bg-amber-50 border-amber-200" :
            "bg-green-50 border-green-200"
          )}
          onClick={() => !isAiExpanded && setIsAiExpanded(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex items-center gap-2",
                  aiStatus === 'critico' ? "text-red-700" :
                  aiStatus === 'atencao' ? "text-amber-700" :
                  "text-green-700"
                )}>
                  <Brain size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest font-dm-mono">DIAGNÓSTICO FINANCEIRO · IA</span>
                </div>
                
                <span className={cn(
                  "px-2 py-0.5 rounded-[2px] text-[8px] font-bold uppercase tracking-widest border",
                  aiStatus === 'critico' ? "bg-red-100 border-red-300 text-red-800" :
                  aiStatus === 'atencao' ? "bg-amber-100 border-amber-300 text-amber-800" :
                  "bg-green-100 border-green-300 text-green-800"
                )}>
                  {aiStatus === 'critico' ? 'Crítico' : aiStatus === 'atencao' ? 'Atenção' : 'Saudável'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {lastAiAnalysis && (
                  <p className="text-[9px] text-muted font-dm-mono italic">
                    Última análise: {lastAiAnalysis.toLocaleTimeString()}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      getAIDiagnostic();
                    }}
                    className="h-8 text-[9px] uppercase tracking-widest text-muted hover:text-bronze flex items-center gap-2"
                  >
                    <RotateCcw size={10} /> Atualizar
                  </Button>
                  {isAiExpanded && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAiExpanded(false);
                      }}
                      className="p-1 text-muted hover:text-graphite transition-colors"
                    >
                      <ChevronUp size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className={cn(
              "transition-all duration-300 ease-in-out",
              isAiExpanded ? "max-h-[2000px] opacity-100 mt-4" : "max-h-0 opacity-0"
            )}>
              {isAiLoading ? (
                <div className="flex items-center gap-2 text-muted text-xs font-dm-mono py-4">
                  <Loader2 size={14} className="animate-spin" /> Analisando dados...
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-xs font-dm-mono text-graphite leading-relaxed whitespace-pre-line border-b border-black/5 pb-6">
                    {aiDiagnostic || "Clique em atualizar para gerar o diagnóstico financeiro baseado nos seus dados."}
                  </p>

                  {/* History Section */}
                  <div className="space-y-4">
                    <h4 className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                      <Target size={12} /> Histórico de Análises
                    </h4>
                    <div className="space-y-2">
                      {aiHistory.map((item) => (
                        <div key={item.id} className="bg-white/50 p-3 border border-black/5 rounded-[2px] space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-dm-mono text-muted">
                                {new Date(item.criado_em).toLocaleDateString('pt-BR')} {new Date(item.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-[1px] text-[7px] font-bold uppercase tracking-widest border",
                                item.status === 'critico' ? "bg-red-50 border-red-200 text-red-700" :
                                item.status === 'atencao' ? "bg-amber-50 border-amber-200 text-amber-700" :
                                "bg-green-50 border-green-200 text-green-700"
                              )}>
                                {item.status}
                              </span>
                            </div>
                            <span className="text-[9px] font-dm-mono text-bronze font-bold">R$ {Number(item.custo_hora_momento).toFixed(2)}/h</span>
                          </div>
                          <p className="text-[10px] font-dm-mono text-graphite/70 line-clamp-2 hover:line-clamp-none transition-all cursor-default">
                            {item.conteudo}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
          {/* Top Result Cards */}
          <div className="grid grid-cols-2 gap-6">
            {/* Card 1: Custo/Hora Real */}
            <div className="bg-white p-8 border border-beige border-b-2 border-b-bronze rounded-[4px] relative overflow-hidden group min-h-[160px] flex flex-col justify-center">
              <div className="space-y-1">
                <p className="text-[9px] font-dm-mono text-bronze uppercase tracking-[0.2em] font-bold">CUSTO/HORA REAL</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[64px] font-cormorant font-bold text-graphite leading-none">
                    R$ <CountUp 
                      value={calculations.costPerHour} 
                      formatter={(val) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                    />
                  </span>
                </div>
                <p className="text-[10px] text-muted">baseado nos seus custos cadastrados</p>
              </div>
              {calculations.costPerHour === 0 && (
                <div className="absolute top-4 right-4 flex items-center gap-2 text-bronze animate-pulse">
                  <Info size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">Cadastre seus custos</span>
                </div>
              )}
            </div>

            {/* Card 2: Preço Sugerido */}
            <div className="bg-white p-8 border border-beige border-b-2 border-b-graphite rounded-[4px] flex flex-col justify-between relative group">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-dm-mono text-graphite uppercase tracking-[0.2em] font-bold">PREÇO SUGERIDO/HORA</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsComparingCenários(true)}
                    className="h-6 text-[8px] uppercase tracking-widest text-bronze hover:bg-bronze/5 px-2"
                  >
                    Comparar Cenários
                  </Button>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[64px] font-cormorant font-bold text-bronze leading-none">
                    R$ <CountUp 
                      value={calculations.suggestedPrice} 
                      formatter={(val) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                    />
                  </span>
                </div>
                <p className="text-[10px] text-muted">custo + {config?.margem_lucro}% de margem</p>
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-dm-mono uppercase tracking-widest text-muted">
                  <span>Margem de Lucro</span>
                  <span className="text-graphite font-bold">{config?.margem_lucro}%</span>
                </div>
                <Slider 
                  value={[config?.margem_lucro || 0]} 
                  max={100} 
                  step={1}
                  onValueChange={([val]) => updateConfig({ margem_lucro: val })}
                  className="[&_[role=slider]]:bg-bronze [&_[role=slider]]:border-bronze"
                />
              </div>
            </div>
          </div>

          {/* Configuração de Horas Produtivas */}
          <div className="bg-white p-8 border border-beige rounded-[4px]">
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-5 gap-8 flex-1">
                  <div className="space-y-3">
                    <label className="text-[9px] font-dm-mono text-muted uppercase tracking-widest">Horas por dia</label>
                    <Input 
                      type="number" 
                      value={config?.horas_dia} 
                      onChange={(e) => updateConfig({ horas_dia: parseFloat(e.target.value) })}
                      className="h-9 border-beige text-xs font-dm-mono focus:border-bronze"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-dm-mono text-muted uppercase tracking-widest">Dias úteis/mês</label>
                    <Input 
                      type="number" 
                      value={config?.dias_mes} 
                      onChange={(e) => updateConfig({ dias_mes: parseFloat(e.target.value) })}
                      className="h-9 border-beige text-xs font-dm-mono focus:border-bronze"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-dm-mono text-muted uppercase tracking-widest">% Produtivo</label>
                    <Input 
                      type="number" 
                      value={config?.percentual_produtivo} 
                      onChange={(e) => updateConfig({ percentual_produtivo: parseFloat(e.target.value) })}
                      className="h-9 border-beige text-xs font-dm-mono focus:border-bronze"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-dm-mono text-muted uppercase tracking-widest">Nº Arquitetos</label>
                    <Input 
                      type="number" 
                      value={config?.num_arquitetos} 
                      onChange={(e) => updateConfig({ num_arquitetos: parseInt(e.target.value) })}
                      className="h-9 border-beige text-xs font-dm-mono focus:border-bronze"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-dm-mono text-bronze uppercase tracking-widest font-bold">Meta Custo/Hora</label>
                    <Input 
                      type="number" 
                      value={config?.meta_custo_hora || ''} 
                      placeholder="Ex: 120"
                      onChange={(e) => updateConfig({ meta_custo_hora: parseFloat(e.target.value) })}
                      className="h-9 border-bronze/50 bg-bronze/5 text-xs font-dm-mono focus:border-bronze"
                    />
                  </div>
                </div>
                
                <div className="ml-8 pl-8 border-l border-beige text-right">
                  <p className="text-3xl font-cormorant font-bold text-bronze">
                    = <CountUp value={calculations.faturableHours} />h
                  </p>
                  <p className="text-[10px] text-muted uppercase tracking-widest">faturáveis/mês</p>
                </div>
              </div>

              {config?.meta_custo_hora && config.meta_custo_hora > 0 && (
                <div className="bg-bronze/5 p-6 rounded-[4px] border border-bronze/20 space-y-4 animate-in fade-in slide-in-from-left-4">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-bronze" />
                    <span className="text-[10px] font-dm-mono font-bold text-graphite uppercase tracking-widest">Plano de Ação para Meta: R$ {config.meta_custo_hora.toFixed(2)}/hora</span>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-graphite uppercase">A) Reduzir Custos</p>
                      <p className="text-[10px] text-muted leading-relaxed">
                        Reduzir R$ {(calculations.monthlyCosts - (config.meta_custo_hora * calculations.faturableHours)).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês 
                        ({Math.round(((calculations.monthlyCosts - (config.meta_custo_hora * calculations.faturableHours)) / calculations.monthlyCosts) * 100)}% dos custos)
                      </p>
                    </div>
                    <div className="space-y-1 border-x border-bronze/10 px-6">
                      <p className="text-[10px] font-bold text-bronze uppercase">B) Aumentar Horas (Recomendado)</p>
                      <p className="text-[10px] text-muted leading-relaxed">
                        Aumentar para {Math.round(calculations.monthlyCosts / config.meta_custo_hora)}h/mês 
                        (+{Math.round(((calculations.monthlyCosts / config.meta_custo_hora) / calculations.faturableHours - 1) * 100)}%)
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-graphite uppercase">C) Combinar Estratégias</p>
                      <p className="text-[10px] text-muted leading-relaxed">
                        Reduzir R$ {(calculations.monthlyCosts * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 0 })} + Aumentar para {Math.round((calculations.monthlyCosts * 0.9) / config.meta_custo_hora)}h
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-beige border-dashed">
              <p className="text-[10px] font-dm-mono text-muted">
                {config?.horas_dia}h × {config?.dias_mes} dias × {config?.percentual_produtivo}% × {config?.num_arquitetos} arquitetos = {Math.round(calculations.faturableHours)}h faturáveis/mês
              </p>
              <p className="text-[10px] font-dm-mono text-muted mt-1">
                Total de custos R$ <CountUp value={calculations.monthlyCosts} formatter={(val) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /> ÷ {Math.round(calculations.faturableHours)}h = R$ <CountUp value={calculations.costPerHour} formatter={(val) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} />/hora
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-4">
              {CATEGORIES.map((cat) => {
                const catCosts = costs.filter(c => c.categoria === cat.id);
                const totalCat = catCosts.reduce((acc, c) => {
                  if (c.frequencia === 'percentual') return acc;
                  return acc + (c.frequencia === 'anual' ? c.valor / 12 : c.valor);
                }, 0);
                const isOpen = openAccordion === cat.id;
                const mostExpensive = [...catCosts].sort((a, b) => b.valor - a.valor)[0];

                return (
                  <div key={cat.id} className="border border-beige rounded-[4px] overflow-hidden bg-white group/cat">
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button 
                            id={`accordion-trigger-${cat.id}`}
                            onClick={() => setOpenAccordion(isOpen ? null : cat.id)}
                            className="w-full flex items-center justify-between p-5 hover:bg-beige/10 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div 
                                className={cn("p-2 rounded-full transition-colors", isOpen ? "bg-bronze/10 text-bronze" : "bg-beige/30 text-muted")}
                                style={isOpen ? {} : { backgroundColor: `${cat.color}15`, color: cat.color }}
                              >
                                <cat.icon size={16} />
                              </div>
                              <span className="text-xs font-dm-mono font-bold text-graphite uppercase tracking-widest">{cat.label}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              <span className="text-xs font-dm-mono text-bronze font-bold">
                                {cat.id === 'impostos' 
                                  ? `${catCosts.reduce((acc, c) => acc + c.valor, 0)}%`
                                  : `R$ ${totalCat.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                }
                              </span>
                              {isOpen ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
                            </div>
                          </button>
                        </TooltipTrigger>
                        {mostExpensive && (
                          <TooltipContent side="top" className="bg-graphite text-white text-[10px] font-dm-mono border-none py-1.5 px-3 rounded-[4px]">
                            Item mais caro: {mostExpensive.nome} · R$ {mostExpensive.valor.toLocaleString('pt-BR')}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>

                  {isOpen && (
                    <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="space-y-1 mt-2">
                        {catCosts.map((item) => (
                          <div key={item.id} className="group flex items-center justify-between py-3 border-b border-beige/50 last:border-0 hover:bg-beige/5 px-2 -mx-2 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-dm-mono text-graphite">{item.nome}</span>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[8px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded-[2px]",
                                  item.frequencia === 'mensal' ? "bg-beige/30 text-muted" : "bg-bronze/10 text-bronze"
                                )}>
                                  {item.frequencia}
                                </span>
                                {item.frequencia === 'anual' && (
                                  <span className="text-[10px] text-muted italic">
                                    (R$ {(item.valor / 12).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <span className="text-xs font-dm-mono text-bronze font-medium">
                                {item.frequencia === 'percentual' ? `${item.valor}%` : `R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              </span>
                              <button 
                                onClick={() => deleteItem(item.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-600"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Dialog open={isAddingItem && newItem.categoria === cat.id} onOpenChange={(open) => {
                        setIsAddingItem(open);
                        if(open) setNewItem(prev => ({ ...prev, categoria: cat.id }));
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="w-full mt-4 h-10 border border-dashed border-beige hover:border-bronze hover:bg-bronze/5 text-[10px] tracking-widest text-muted hover:text-bronze uppercase flex items-center gap-2"
                          >
                            <Plus size={12} />
                            Adicionar item
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] bg-white border-none rounded-[4px]">
                          <DialogHeader>
                            <DialogTitle className="font-cormorant text-xl font-bold text-graphite uppercase tracking-tight">Novo Item — {cat.label}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6 py-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-dm-mono text-muted uppercase tracking-widest">Nome do Custo</label>
                              <Input 
                                value={newItem.nome} 
                                onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
                                placeholder="ex: Aluguel"
                                className="h-10 border-beige text-xs font-dm-mono focus:border-bronze"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-dm-mono text-muted uppercase tracking-widest">Valor R$</label>
                                <Input 
                                  type="number" 
                                  value={newItem.valor} 
                                  onChange={(e) => setNewItem({ ...newItem, valor: e.target.value })}
                                  placeholder="0.00"
                                  className="h-10 border-beige text-xs font-dm-mono focus:border-bronze"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-dm-mono text-muted uppercase tracking-widest">Frequência</label>
                                <Select 
                                  value={newItem.frequencia} 
                                  onValueChange={(val) => setNewItem({ ...newItem, frequencia: val })}
                                >
                                  <SelectTrigger className="h-10 border-beige text-xs font-dm-mono focus:border-bronze">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="mensal">Mensal</SelectItem>
                                    <SelectItem value="anual">Anual</SelectItem>
                                    {cat.id === 'impostos' && <SelectItem value="percentual">Percentual (%)</SelectItem>}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            {newItem.frequencia === 'anual' && newItem.valor && (
                              <p className="text-[11px] text-bronze italic font-dm-mono">
                                = R$ {(parseFloat(newItem.valor) / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês
                              </p>
                            )}
                            <Button 
                              onClick={handleAddItem}
                              className="w-full h-12 bg-graphite hover:bg-bronze text-white text-[11px] tracking-widest uppercase font-bold transition-all duration-300 rounded-[2px]"
                            >
                              Adicionar à base
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Simulator Section */}
          <div className="border-t border-beige pt-8 space-y-6">
            <button 
              onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
              className="flex items-center gap-2 text-[10px] font-dm-mono text-bronze uppercase tracking-[0.2em] font-bold hover:opacity-70 transition-opacity"
            >
              {isSimulatorOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              SIMULADOR DE RECEITA
            </button>

            {isSimulatorOpen && (
              <div className="bg-white p-8 border border-beige rounded-[4px] space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-4 text-xs font-dm-mono text-graphite">
                  <span>Se fechar</span>
                  <Input 
                    type="number" 
                    value={simNumProjetos}
                    onChange={(e) => setSimNumProjetos(parseInt(e.target.value) || 0)}
                    className="w-16 h-8 text-center border-beige focus:border-bronze"
                  />
                  <span>projetos de</span>
                  <Input 
                    type="number" 
                    value={simHorasPorProjeto}
                    onChange={(e) => setSimHorasPorProjeto(parseInt(e.target.value) || 0)}
                    className="w-20 h-8 text-center border-beige focus:border-bronze"
                  />
                  <span>horas este mês:</span>
                </div>

                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-dm-mono">
                      <span className="text-muted">Receita bruta estimada:</span>
                      <span className="font-bold text-graphite">
                        R$ {(simNumProjetos * simHorasPorProjeto * calculations.suggestedPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-dm-mono">
                      <span className="text-muted">(-) Custos totais mensais:</span>
                      <span className="text-red-400">
                        R$ {calculations.monthlyCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-dm-mono">
                      <span className="text-muted">(-) Impostos estimados:</span>
                      <span className="text-red-400">
                        R$ {(simNumProjetos * simHorasPorProjeto * calculations.suggestedPrice * (costs.filter(c => c.categoria === 'impostos').reduce((acc, c) => acc + c.valor, 0) / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-beige flex justify-between items-center">
                      <span className="text-xs font-dm-mono font-bold uppercase tracking-widest">(=) Lucro estimado:</span>
                      <span className={cn(
                        "text-xl font-cormorant font-bold",
                        (simNumProjetos * simHorasPorProjeto * calculations.suggestedPrice - calculations.monthlyCosts) >= 0 ? "text-bronze" : "text-red-500"
                      )}>
                        R$ {(simNumProjetos * simHorasPorProjeto * calculations.suggestedPrice - calculations.monthlyCosts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted font-dm-mono uppercase tracking-tighter">
                      Isso representa {(( (simNumProjetos * simHorasPorProjeto * calculations.suggestedPrice - calculations.monthlyCosts) / (simNumProjetos * simHorasPorProjeto * calculations.suggestedPrice || 1) ) * 100).toFixed(1)}% de margem líquida.
                    </p>
                  </div>

                  <div className="bg-[#E8E4DF]/20 p-6 rounded-[4px] border border-beige/50 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-bronze">
                        <Sparkles size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-widest font-dm-mono">Análise de Viabilidade</span>
                      </div>
                      <p className="text-[11px] font-dm-mono text-graphite leading-relaxed italic">
                        {simAnalysis || "Configure seu cenário e clique em analisar para uma avaliação da IA."}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={getSimulatorAnalysis}
                      disabled={isSimLoading}
                      className="mt-4 border-bronze/30 text-bronze hover:bg-bronze hover:text-white text-[9px] uppercase tracking-widest font-bold h-8"
                    >
                      {isSimLoading ? <Loader2 size={12} className="animate-spin mr-2" /> : <Target size={12} className="mr-2" />}
                      Analisar este cenário com IA
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Footer info */}
        <div className="flex-shrink-0 bg-white border-t border-beige px-10 py-4 flex justify-between items-center">
          <p className="text-[9px] text-muted uppercase tracking-widest">NL Arquitetos · Base Financeira · Módulo 02</p>
          <p className="text-[9px] text-muted uppercase tracking-widest">São José dos Campos SP · 2026</p>
        </div>
      </main>
    </div>
  );
};

export default BaseFinanceira;
