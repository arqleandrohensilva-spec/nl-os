import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Plus, 
  HelpCircle,
  ExternalLink,
  Save,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from '@/lib/utils';

interface Phase {
  id: string;
  label: string;
  hours: number;
  included: boolean;
  optional?: boolean;
  planType?: 'executivo' | 'completo';
}

interface ProposalData {
  id: string;
  cliente: string;
  cliente_id?: string;
  tipo: string;
  cidade: string;
  estado: string;
  area: number;
  objetivo: string;
  valor_executivo?: number;
  valor_completo?: number;
}

const PropostaCalculadora = () => {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const clienteState = location.state;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState<ProposalData | null>(null);

  const [config, setConfig] = useState({
    custo_hora: 0,
    margem_lucro: 0,
    preco_hora: 0
  });
  
  const [phases, setPhases] = useState<Phase[]>([]);
  const [complexity, setComplexity] = useState<1.0 | 1.3 | 1.6>(1.0);
  const [observacoes, setObservacoes] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [proposalId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Handle Standalone case
      const isNew = !proposalId || proposalId === 'nova' || proposalId === 'nova-proposta';
      
      if (isNew) {
        setProposal({
          id: (proposalId || 'nova') as string,
          cliente: clienteState?.clienteNome || '',
          cliente_id: clienteState?.clienteId || '',
          tipo: (clienteState?.clienteTipo === 'arq' ? 'ArqInt' : clienteState?.clienteTipo === 'int' ? 'Interiores' : clienteState?.clienteTipo === 'com' ? 'Comercial' : clienteState?.clienteTipo) || 'ArqInt',
          cidade: clienteState?.clienteCidade || '',
          estado: 'SP',
          area: parseFloat(clienteState?.clienteArea as any) || 0,
          objetivo: ''
        });
        setPhases([]);
        
        // Load default config
        const { data: configData } = await supabase
          .from('config_escritorio')
          .select('custo_hora, margem_lucro')
          .maybeSingle();
        
        const custo = configData?.custo_hora || 67.37;
        const margem = configData?.margem_lucro || 40;
        const preco = custo / (1 - margem / 100);
        
        setConfig({ custo_hora: custo, margem_lucro: margem, preco_hora: preco });
        setLoading(false);
        return;
      }

      // Fetch Proposal
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .maybeSingle();
        
      if (proposalError) throw proposalError;
      if (!proposalData) {
        toast.error("Proposta não encontrada.");
        navigate('/calculadora');
        return;
      }
      setProposal(proposalData);

      // Fetch Config
      const { data: configData, error: configError } = await supabase
        .from('config_escritorio')
        .select('custo_hora, margem_lucro')
        .maybeSingle();
        
      if (configError) throw configError;
      
      const custo = configData?.custo_hora || 67.37;
      const margem = configData?.margem_lucro || 40;
      const preco = custo / (1 - margem / 100);
      
      setConfig({
        custo_hora: custo,
        margem_lucro: margem,
        preco_hora: preco
      });

      // Try to fetch existing calculation
      const { data: calcData } = await supabase
        .from('calculos_proposta')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (calcData) {
        setPhases(calcData.fases as any);
        setComplexity(calcData.complexidade as any);
        setObservacoes(calcData.observacoes || '');
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados da calculadora');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proposal?.tipo) {
      const type = proposal.tipo;
      let initialPhases: Phase[] = [];
      
      if (type === 'ArqInt') {
        initialPhases = [
          { id: 'briefing_viab', label: 'Levantamento & Briefing', hours: 0, included: true, planType: 'executivo' },
          { id: 'conceito_mood', label: 'Criação do Conceito', hours: 0, included: true, planType: 'executivo' },
          { id: 'estudo_3d', label: 'Estudo Preliminar 3D', hours: 0, included: true, planType: 'executivo' },
          { id: 'projeto_legal', label: 'Projeto Legal & Aprovações', hours: 0, included: true, planType: 'executivo' },
          { id: 'projeto_executivo', label: 'Projeto Executivo', hours: 0, included: true, planType: 'executivo' },
          { id: 'compat_tecnica', label: 'Compatibilização Técnica', hours: 0, included: true, planType: 'executivo' },
          { id: 'int_briefing', label: 'Interiores — Briefing', hours: 0, included: false, planType: 'completo' },
          { id: 'int_conceito_3d', label: 'Interiores — Conceito 3D', hours: 0, included: false, planType: 'completo' },
          { id: 'int_executivo', label: 'Interiores — Executivo', hours: 0, included: false, planType: 'completo' },
          { id: 'evf', label: 'EVF — Viabilidade Financeira', hours: 0, included: false, planType: 'completo', optional: true },
          { id: 'acompanhamento', label: 'Acompanhamento de Obra', hours: 0, included: false, planType: 'completo', optional: true },
        ];
      } else if (type === 'Interiores') {
        initialPhases = [
          { id: 'briefing_lev', label: 'Briefing & Levantamentos', hours: 0, included: true, planType: 'executivo' },
          { id: 'conceito_mood', label: 'Criação do Conceito', hours: 0, included: true, planType: 'executivo' },
          { id: 'concepcao_3d', label: 'Concepção 3D', hours: 0, included: true, planType: 'executivo' },
          { id: 'exec_interiores', label: 'Projeto Executivo de Interiores', hours: 0, included: true, planType: 'executivo' },
          { id: 'evf', label: 'EVF — Viabilidade Financeira', hours: 0, included: false, planType: 'completo', optional: true },
          { id: 'visitas_lojas', label: 'Visitas em Lojas', hours: 0, included: false, planType: 'completo', optional: true },
          { id: 'acompanhamento', label: 'Acompanhamento de Obra', hours: 0, included: false, planType: 'completo', optional: true },
        ];
      } else if (type === 'Comercial') {
        initialPhases = [
          { id: 'briefing_diag', label: 'Briefing & Diagnóstico', hours: 0, included: true, planType: 'executivo' },
          { id: 'conceito_id', label: 'Conceito e Identidade', hours: 0, included: true, planType: 'executivo' },
          { id: 'concepcao_3d', label: 'Concepção 3D', hours: 0, included: true, planType: 'executivo' },
          { id: 'exec_comercial', label: 'Projeto Executivo Comercial', hours: 0, included: true, planType: 'executivo' },
          { id: 'evf', label: 'EVF — Viabilidade Financeira', hours: 0, included: false, planType: 'completo', optional: true },
          { id: 'acompanhamento', label: 'Acompanhamento de Obra', hours: 0, included: false, planType: 'completo', optional: true },
        ];
      }
      
      if (phases.length === 0) setPhases(initialPhases);
    }
  }, [proposal?.tipo]);

  const handlePhaseToggle = (id: string) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, included: !p.included } : p));
  };

  const handleHoursChange = (id: string, hours: string) => {
    const val = parseFloat(hours) || 0;
    setPhases(prev => prev.map(p => p.id === id ? { ...p, hours: val } : p));
  };

  const totals = useMemo(() => {
    const includedPhases = phases.filter(p => p.included);
    const execPhases = includedPhases.filter(p => p.planType === 'executivo');
    const execHours = execPhases.reduce((acc, curr) => acc + curr.hours, 0);
    const valorExecutivo = execHours * config.preco_hora * complexity;
    const totalHours = includedPhases.reduce((acc, curr) => acc + curr.hours, 0);
    const valorCompleto = totalHours * config.preco_hora * complexity;
    const subtotal = totalHours * config.preco_hora;
    const impactComplexity = subtotal * (complexity - 1);
    const totalCusto = totalHours * config.custo_hora;
    const lucro = valorCompleto - totalCusto;
    
    return { totalHours, subtotal, impactComplexity, valorExecutivo, valorCompleto, lucro, includedPhases };
  }, [phases, complexity, config]);

  const gerarSlug = (nome: string) => nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim();

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveAndGenerate = async () => {
    try {
      setSaving(true);
      setIsGeneratingLink(true);
      
      let currentProposalId = proposalId;

      // Handle standalone creation
      if (!proposalId || proposalId === 'nova' || proposalId === 'nova-proposta') {
        if (!proposal?.cliente) {
          toast.error("Por favor, informe o nome do cliente.");
          setIsGeneratingLink(false);
          setSaving(false);
          return;
        }

        console.log("Iniciando criação de proposta para:", proposal.cliente);
        
        const { data: newProp, error: propCreateError } = await supabase
          .from('proposals')
          .insert({
            cliente: proposal.cliente,
            cliente_id: proposal.cliente_id || clienteState?.clienteId || null,
            tipo: proposal.tipo as any,
            cidade: proposal.cidade,
            area: proposal.area,
            status: 'Enviada',
            data: new Date().toISOString().split('T')[0]
          })
          .select()
          .single();
          
        if (propCreateError) throw propCreateError;
        currentProposalId = newProp.id;
        
        // Update URL without reloading to reflect the new proposal ID
        navigate(`/calculadora/${currentProposalId}`, { replace: true, state: clienteState });
      }

      // Save Calculation
      const { error: calcError } = await supabase
        .from('calculos_proposta')
        .upsert({
          proposal_id: currentProposalId,
          fases: phases as any,
          horas_total: totals.totalHours,
          complexidade: complexity,
          valor_executivo: totals.valorExecutivo,
          valor_completo: totals.valorCompleto,
          custo_hora_momento: config.custo_hora,
          observacoes: observacoes
        }, { onConflict: 'proposal_id' });
        
      if (calcError) throw calcError;
      
      // Update Proposal
      await supabase.from('proposals').update({
        valor_executivo: totals.valorExecutivo,
        valor_completo: totals.valorCompleto
      }).eq('id', currentProposalId);

      // Generate Link and Save to External Supabase
      const typeMapping: Record<string, string> = {
        'ArqInt': 'arqint',
        'Interiores': 'int',
        'Comercial': 'comercial'
      };
      
      const typeSlug = typeMapping[proposal?.tipo || ''] || 'arqint';
      let finalTipoNegocio = "";
      if (typeSlug === 'arqint') finalTipoNegocio = "Residencial";
      else if (typeSlug === 'int') finalTipoNegocio = "Interiores";
      else if (typeSlug === 'comercial') finalTipoNegocio = tipoNegocio;

      const baseSlug = gerarSlug(proposal?.cliente || '');
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      
      const slugAttempts = [
        baseSlug,
        `${baseSlug}-${timestamp}`,
        `${baseSlug}-${timestamp}-${Math.floor(Math.random() * 1000)}`
      ];

      let finalLink = "";
      let finalSlug = "";

      for (const attemptSlug of slugAttempts) {
        try {
          const response = await fetch('https://sjqazidnuqdqadbkawph.supabase.co/rest/v1/propostas_clientes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqcWF6aWRudXFkcWFkYmthd3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzI0NjMsImV4cCI6MjA5NDAwODQ2M30.vT_1aEOPjjw_KCKJ0KsAzJG40e07DvFSONICVIBAGHI',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqcWF6aWRudXFkcWFkYmthd3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzI0NjMsImV4cCI6MjA5NDAwODQ2M30.vT_1aEOPjjw_KCKJ0KsAzJG40e07DvFSONICVIBAGHI',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              tipo: typeSlug,
              slug: attemptSlug,
              nome_cliente: proposal?.cliente,
              cidade: proposal?.cidade,
              estado: proposal?.estado,
              area: proposal?.area || null,
              valor_executivo: Math.round(totals.valorExecutivo).toString(),
              valor_completo: Math.round(totals.valorCompleto).toString(),
              objetivo: proposal?.objetivo || "",
              tipo_negocio: finalTipoNegocio,
            })
          });

          if (response.ok) {
            finalSlug = attemptSlug;
            finalLink = `https://proposta.nl.arq.br/p/${typeSlug}/${finalSlug}`;
            break;
          } else if (response.status === 409) {
            continue;
          } else {
            console.error(`Erro no servidor externo: ${response.status}`);
            // If it's the last attempt and it failed, we don't throw yet, 
            // we let the loop finish or handle it after
          }
        } catch (err) {
          console.warn(`Tentativa com slug "${attemptSlug}" falhou:`, err);
        }
      }

      if (!finalLink) {
        // Fallback: use local preview link if external fails
        finalLink = `${window.location.origin}/proposta/executivo?id=${currentProposalId}`;
        toast.warning("Link externo não gerado. Usando link interno temporário.");
      }

      // 4. Update local proposal with the link
      const { error: linkError } = await supabase
        .from('proposals')
        .update({ link_proposta: finalLink })
        .eq('id', currentProposalId);

      if (linkError) throw linkError;
      
      setGeneratedLink(finalLink);
      toast.success('Proposta gerada com sucesso!');

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
      setIsGeneratingLink(false);
    }
  };

  if (loading || !proposal) return <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-white"><Loader2 className="animate-spin text-bronze mr-2" /></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Button variant="ghost" className="text-white/40 gap-2" onClick={() => navigate('/calculadora')}>
            <ChevronLeft size={16} /> Voltar
          </Button>
          <div className="flex-1 px-8">
            {(!proposalId || proposalId === 'nova' || proposalId === 'nova-proposta') ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <Input 
                    placeholder="NOME DO CLIENTE"
                    value={proposal.cliente}
                    onChange={(e) => setProposal({...proposal, cliente: e.target.value})}
                    className="bg-white/5 border-white/10 h-8 text-xl font-cormorant font-bold uppercase tracking-[0.2em] text-bronze placeholder:text-bronze/30 w-96 rounded-none"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Select value={proposal.tipo} onValueChange={(val) => setProposal({...proposal, tipo: val})}>
                    <SelectTrigger className="w-32 h-6 text-[10px] uppercase tracking-widest bg-white/5 border-white/10 rounded-none text-white/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ArqInt">ArqInt</SelectItem>
                      <SelectItem value="Interiores">Interiores</SelectItem>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-white/20">·</span>
                  <Input 
                    placeholder="CIDADE"
                    value={proposal.cidade}
                    onChange={(e) => setProposal({...proposal, cidade: e.target.value})}
                    className="bg-white/5 border-white/10 h-6 w-32 text-[10px] uppercase tracking-widest text-white/40 placeholder:text-white/20 rounded-none"
                  />
                  <span className="text-white/20">·</span>
                  <div className="flex items-center gap-1">
                    <Input 
                      type="number"
                      placeholder="ÁREA"
                      value={proposal.area || ''}
                      onChange={(e) => setProposal({...proposal, area: parseFloat(e.target.value) || 0})}
                      className="bg-white/5 border-white/10 h-6 w-20 text-[10px] uppercase tracking-widest text-white/40 placeholder:text-white/20 rounded-none"
                    />
                    <span className="text-[10px] uppercase tracking-widest text-white/40">m²</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-cormorant font-bold uppercase tracking-[0.2em] text-bronze leading-tight">
                  CALCULADORA DE PROPOSTA · {proposal.cliente}
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">
                  {proposal.tipo} · {proposal.cidade} · {proposal.area}m²
                </p>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-12">
          <div className="lg:col-span-6 space-y-10">
            
            {/* Block 1 - Base Info */}
            <section className="bg-white/[0.02] border border-white/5 p-8 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#8B7355]">BASE DE CÁLCULO</h2>
                <Link to="/financeiro/base" className="text-[10px] uppercase tracking-widest text-bronze hover:underline flex items-center gap-1">
                  Alterar na Base Financeira <ExternalLink size={10} />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Custo/hora</p>
                  <p className="text-2xl font-light">R$ {config.custo_hora.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Margem</p>
                  <p className="text-2xl font-light text-green-400">{config.margem_lucro}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Preço/hora</p>
                  <p className="text-2xl font-medium text-bronze">R$ {config.preco_hora.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </section>

            {/* Block 2 - Phases */}
            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#8B7355]">FASES DO PROJETO</h2>
              <div className="space-y-2">
                {phases.map((phase) => (
                  <div 
                    key={phase.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border",
                      phase.included 
                        ? "bg-white/[0.04] border-white/10" 
                        : "bg-transparent border-transparent opacity-60 grayscale"
                    )}
                  >
                    <Checkbox 
                      id={phase.id} 
                      checked={phase.included}
                      onCheckedChange={() => handlePhaseToggle(phase.id)}
                      className="border-white/20 data-[state=checked]:bg-bronze data-[state=checked]:border-bronze"
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor={phase.id}
                        className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                      >
                        {phase.label}
                        {phase.planType === 'completo' && (
                          <Badge className="bg-bronze/20 text-bronze border-bronze/20 text-[8px] uppercase tracking-widest py-0 h-4">COMPLETO</Badge>
                        )}
                        {phase.optional && (
                          <Badge variant="outline" className="text-[8px] uppercase tracking-widest border-white/10 text-white/40 py-0 h-4">OPCIONAL</Badge>
                        )}
                      </label>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number"
                          value={phase.hours || ''}
                          onChange={(e) => handleHoursChange(phase.id, e.target.value)}
                          className="w-16 h-8 bg-black/50 border-white/10 rounded-lg text-center text-xs focus:border-bronze"
                          placeholder="0"
                        />
                        <span className="text-[10px] text-white/50 uppercase">h</span>
                      </div>
                      <div className="w-24 text-right">
                        <p className="text-xs font-medium">R$ {(phase.hours * config.preco_hora).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Block 3 - Complexity */}
            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#8B7355]">COMPLEXIDADE DO PROJETO</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { val: 1.0, label: 'Simples' },
                  { val: 1.3, label: 'Médio' },
                  { val: 1.6, label: 'Complexo' }
                ].map((item) => (
                  <Button
                    key={item.label}
                    variant={complexity === item.val ? 'default' : 'outline'}
                    onClick={() => setComplexity(item.val as any)}
                    className={cn(
                      "h-20 rounded-xl uppercase tracking-widest text-xs font-bold transition-all duration-300",
                      complexity === item.val 
                        ? "bg-bronze text-white shadow-lg shadow-bronze/20" 
                        : "border-white/10 hover:border-bronze/50 hover:bg-white/5 text-white/80"
                    )}
                  >
                    {item.label} (×{item.val.toFixed(1)})
                  </Button>
                ))}
              </div>
              <div className="p-4 bg-bronze/5 border border-bronze/10 rounded-xl">
                <p className="text-xs text-bronze/80 flex items-center gap-2">
                  <TrendingUp size={14} /> 
                  Ajuste de complexidade: {((complexity - 1) * 100).toFixed(0)}% = +R$ {totals.impactComplexity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </section>

            {/* Block 4 - Notes & Extra Data */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#8B7355]">OBSERVAÇÕES E DADOS</h2>
              </div>
              
              {proposal.tipo === 'Comercial' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="tipoNegocio" className="text-[10px] uppercase tracking-widest text-white/60">TIPO DE NEGÓCIO</Label>
                  <Input
                    id="tipoNegocio"
                    value={tipoNegocio}
                    onChange={(e) => setTipoNegocio(e.target.value)}
                    placeholder="Ex: Barbearia, Clínica, Restaurante..."
                    className="bg-white/[0.02] border-white/10 rounded-xl focus:border-bronze focus:ring-bronze/20"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-white/60">OBSERVAÇÕES INTERNAS</Label>
                <Textarea 
                  placeholder="Notas sobre o cálculo (uso interno)..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="min-h-[120px] bg-white/[0.02] border-white/10 rounded-2xl focus:border-bronze focus:ring-bronze/20"
                />
              </div>
            </section>

          </div>

          {/* Right Column - 40% (Resume) */}
          <div className="lg:col-span-4 sticky top-32">
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-bronze/10 blur-[60px] rounded-full -mr-16 -mt-16" />
              
              <h2 className="text-lg font-cormorant font-bold uppercase tracking-widest text-bronze mb-8">RESUMO DA PROPOSTA</h2>
              
              <div className="space-y-1 mb-8">
                <p className="text-lg font-medium">{proposal.cliente}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/60">
                  {proposal.tipo} · {proposal.cidade}
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">FASES SELECIONADAS</p>
                <div className="space-y-3">
                  {totals.includedPhases.map(phase => (
                    <div key={phase.id} className="flex justify-between items-center text-xs">
                      <span className="text-white/60 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-bronze" />
                        {phase.label}
                      </span>
                      <div className="flex gap-4">
                        <span className="text-white/40">{phase.hours}h</span>
                        <span className="font-medium text-white/80">R$ {(phase.hours * config.preco_hora).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/40 uppercase tracking-widest text-[10px]">Subtotal</span>
                  <div className="flex gap-4">
                    <span className="text-white/40">{totals.totalHours}h</span>
                    <span className="font-medium">R$ {totals.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/40 uppercase tracking-widest text-[10px]">Complexidade (×{complexity.toFixed(1)})</span>
                  <span className="font-medium text-bronze">+ R$ {totals.impactComplexity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="p-6 bg-white/[0.04] rounded-2xl border border-white/5 space-y-1">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold flex items-center gap-2">
                    PLANO EXECUTIVO 
                    <Badge variant="outline" className="text-[7px] border-white/10 text-white/40 py-0 h-3">BASE</Badge>
                  </p>
                  <p className="text-3xl font-light text-bronze">R$ {totals.valorExecutivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                
                <div className="p-6 bg-bronze/[0.03] rounded-2xl border border-bronze/10 space-y-1">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-bronze font-bold flex items-center gap-2">
                    PLANO COMPLETO
                    <Badge className="bg-bronze text-white text-[7px] py-0 h-3 border-none">PREMIUM</Badge>
                  </p>
                  <p className="text-2xl font-light text-white/90">R$ {totals.valorCompleto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center px-2">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-white/30">Margem Real</span>
                  <span className="text-sm font-medium text-green-400">{config.margem_lucro}%</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-widest text-white/30">Lucro Previsto</span>
                  <span className="text-sm font-medium text-green-400">R$ {totals.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {!generatedLink ? (
                <Button 
                  onClick={handleSaveAndGenerate}
                  disabled={saving || totals.totalHours === 0 || (proposal.tipo === 'Comercial' && !tipoNegocio && !!proposalId)}
                  className="w-full h-16 bg-bronze hover:bg-bronze/80 text-white font-bold uppercase tracking-[0.2em] rounded-xl mt-10 shadow-xl shadow-bronze/20 transition-all duration-300 active:scale-[0.98]"
                >
                  {isGeneratingLink ? <Loader2 className="animate-spin" /> : "GERAR LINK DA PROPOSTA"}
                </Button>
              ) : (
                <div className="mt-10 p-6 bg-bronze/10 border border-bronze/20 rounded-2xl space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="text-center space-y-2">
                    <p className="text-xs font-bold text-bronze uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                      <Check size={16} /> PROPOSTA GERADA
                    </p>
                    <p className="text-[10px] text-white/60 font-mono break-all px-4 py-2 bg-black/20 rounded-lg">
                      {generatedLink}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handleCopyLink}
                      className="h-12 border-white/10 text-[10px] uppercase tracking-widest gap-2 hover:bg-white/5"
                    >
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      {copied ? "COPIADO" : "COPIAR LINK"}
                    </Button>
                    <Button 
                      onClick={() => window.open(generatedLink, '_blank')}
                      className="h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[10px] uppercase tracking-widest gap-2"
                    >
                      <ExternalLink size={14} />
                      ABRIR
                    </Button>
                  </div>

                  <Button 
                    variant="ghost"
                    onClick={() => navigate('/propostas/tracking')}
                    className="w-full h-12 text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
                  >
                    IR PARA TRACKING
                  </Button>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default PropostaCalculadora;
