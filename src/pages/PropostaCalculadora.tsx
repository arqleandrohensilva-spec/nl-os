import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from '@/lib/utils';
import GenerateLinkModal from '@/components/GenerateLinkModal';

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
  tipo: string;
  cidade: string;
  area: number;
  objetivo: string;
  valor_executivo?: number;
  valor_completo?: number;
}

const PropostaCalculadora = () => {
  const { proposalId } = useParams();
  const navigate = useNavigate();
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
  
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [proposalId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Proposal
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();
        
      if (proposalError) throw proposalError;
      setProposal(proposalData);

      // 2. Fetch Config
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

      // 3. Initialize Phases based on type
      const type = proposalData.tipo;
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
      
      // 4. Try to fetch existing calculation
      const { data: calcData } = await supabase
        .from('calculos_proposta')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (calcData) {
        const savedPhases = calcData.fases as unknown as Phase[];
        // Merge saved phases with initial phases to ensure all current structure (like planType) is present
        const mergedPhases = initialPhases.map(ip => {
          const saved = savedPhases.find(s => s.id === ip.id);
          if (saved) {
            return { ...ip, hours: saved.hours, included: saved.included };
          }
          return ip;
        });
        setPhases(mergedPhases);
        setComplexity(calcData.complexidade as any);
        setObservacoes(calcData.observacoes || '');
      } else {
        setPhases(initialPhases);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados da calculadora');
    } finally {
      setLoading(false);
    }
  };

  const handlePhaseToggle = (id: string) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, included: !p.included } : p));
  };

  const handleHoursChange = (id: string, hours: string) => {
    const val = parseFloat(hours) || 0;
    setPhases(prev => prev.map(p => p.id === id ? { ...p, hours: val } : p));
  };

  const totals = useMemo(() => {
    const includedPhases = phases.filter(p => p.included);
    
    // Executive Plan Total: sum only marked phases that are of type 'executivo'
    const execPhases = includedPhases.filter(p => p.planType === 'executivo');
    const execHours = execPhases.reduce((acc, curr) => acc + curr.hours, 0);
    const valorExecutivo = execHours * config.preco_hora * complexity;

    // Complete Plan Total: sum all marked phases
    const totalHours = includedPhases.reduce((acc, curr) => acc + curr.hours, 0);
    const valorCompleto = totalHours * config.preco_hora * complexity;

    const subtotal = totalHours * config.preco_hora;
    const impactComplexity = subtotal * (complexity - 1);
    const totalCusto = totalHours * config.custo_hora;
    const lucro = valorCompleto - totalCusto; // Profit relative to the complete total (all marked phases)
    
    return {
      totalHours,
      subtotal,
      impactComplexity,
      valorExecutivo,
      valorCompleto,
      lucro,
      includedPhases
    };
  }, [phases, complexity, config]);

  const handleSaveAndGenerate = async () => {
    try {
      setSaving(true);
      
      // 1. Save Calculation
      const { error: calcError } = await supabase
        .from('calculos_proposta')
        .upsert({
          proposal_id: proposalId,
          fases: phases as any,
          horas_total: totals.totalHours,
          complexidade: complexity,
          valor_executivo: totals.valorExecutivo,
          valor_completo: totals.valorCompleto,
          custo_hora_momento: config.custo_hora,
          observacoes: observacoes
        }, { onConflict: 'proposal_id' });
        
      if (calcError) throw calcError;
      
      // 2. Update Proposal
      const { error: propError } = await supabase
        .from('proposals')
        .update({
          valor_executivo: totals.valorExecutivo,
          valor_completo: totals.valorCompleto
        })
        .eq('id', proposalId);
        
      if (propError) throw propError;
      
      // Update local proposal state
      setProposal(prev => prev ? { 
        ...prev, 
        valor_executivo: totals.valorExecutivo, 
        valor_completo: totals.valorCompleto 
      } : null);
      
      toast.success('Cálculo salvo com sucesso!');
      setIsGenerateModalOpen(true);
      
    } catch (error: any) {
      console.error('Error saving calculation:', error);
      toast.error('Erro ao salvar cálculo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-white">
        <Loader2 className="animate-spin text-bronze mr-2" /> Carregando calculadora...
      </div>
    );
  }

  if (!proposal) return <div>Proposta não encontrada</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-bronze/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white/40 hover:text-white hover:bg-white/5 transition-colors gap-2"
              onClick={() => navigate('/propostas/tracking')}
            >
              <ChevronLeft size={16} /> Voltar ao Tracking
            </Button>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <h1 className="text-xl font-cormorant font-bold uppercase tracking-[0.2em] text-bronze">
                CALCULADORA DE PROPOSTA · {proposal.cliente}
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">
                {proposal.tipo} · {proposal.cidade} · {proposal.area}m²
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-12 items-start">
          
          {/* Left Column - 60% */}
          <div className="lg:col-span-6 space-y-10">
            
            {/* Block 1 - Base Info */}
            <section className="bg-white/[0.02] border border-white/5 p-8 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">BASE DE CÁLCULO</h2>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">FASES DO PROJETO</h2>
              <div className="space-y-2">
                {phases.map((phase) => (
                  <div 
                    key={phase.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border",
                      phase.included 
                        ? "bg-white/[0.04] border-white/10" 
                        : "bg-transparent border-transparent opacity-40 grayscale"
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
                        <span className="text-[10px] text-white/30 uppercase">h</span>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">COMPLEXIDADE DO PROJETO</h2>
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
                      "h-16 rounded-xl uppercase tracking-widest text-[10px] transition-all duration-300",
                      complexity === item.val 
                        ? "bg-bronze text-white shadow-lg shadow-bronze/20" 
                        : "border-white/10 hover:border-white/20 hover:bg-white/5 text-white/60"
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

            {/* Block 4 - Notes */}
            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">OBSERVAÇÕES INTERNAS</h2>
              <Textarea 
                placeholder="Notas sobre o cálculo (uso interno)..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="min-h-[120px] bg-white/[0.02] border-white/10 rounded-2xl focus:border-bronze focus:ring-bronze/20"
              />
            </section>

          </div>

          {/* Right Column - 40% (Resume) */}
          <div className="lg:col-span-4 sticky top-32">
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-bronze/10 blur-[60px] rounded-full -mr-16 -mt-16" />
              
              <h2 className="text-lg font-cormorant font-bold uppercase tracking-widest text-bronze mb-8">RESUMO DA PROPOSTA</h2>
              
              <div className="space-y-1 mb-8">
                <p className="text-lg font-medium">{proposal.cliente}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/40">
                  {proposal.tipo} · {proposal.cidade}
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">FASES SELECIONADAS</p>
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

              <Button 
                onClick={handleSaveAndGenerate}
                disabled={saving || totals.totalHours === 0}
                className="w-full h-16 bg-bronze hover:bg-bronze/80 text-white font-bold uppercase tracking-[0.2em] rounded-xl mt-10 shadow-xl shadow-bronze/20 transition-all duration-300 active:scale-[0.98]"
              >
                {saving ? <Loader2 className="animate-spin" /> : "GERAR LINK DA PROPOSTA"}
              </Button>
            </div>
          </div>

        </div>
      </main>

      {/* Generate Link Modal */}
      {proposal && (
        <GenerateLinkModal 
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          proposal={{
            ...proposal,
            valor_executivo: totals.valorExecutivo,
            valor_completo: totals.valorCompleto
          }}
        />
      )}
    </div>
  );
};

export default PropostaCalculadora;
