import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const BriefingPublic = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [briefing, setBriefing] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  
  const [projetoType, setProjetoType] = useState<'arq' | 'int' | 'com' | null>(null);

  const [formData, setFormData] = useState<any>({
    nome_completo: '',
    whatsapp: '',
    email: '',
    cidade: '',
    origem: '',
    
    // Flow-specific fields
    imovel_definido: '',
    endereco: '',
    area_terreno: '',
    area_estimada: '',
    moradores: '',
    pets: '',
    ambientes_indispensaveis: [],
    estilo_referencia: '',
    fator_decisao: [],
    orcamento: '',
    prazo: '',
    obs: '',
    
    // Interiores
    tipo_imovel: '',
    ambientes_reforma: [],
    mobiliario_aproveitado: '',
    
    // Comercial
    tipo_negocio: '',
    experiencia_cliente: '',
    marca_definida: '',
    perfil_cliente: '',
    projeto_legal: '',
    prazo_inauguracao: ''
  });

  useEffect(() => {
    fetchBriefing();
  }, [token]);

  const fetchBriefing = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('briefings')
        .select('*, leads(*)')
        .eq('token', token)
        .single();

      if (error || !data) {
        toast.error('Briefing não encontrado.');
        return;
      }
      setBriefing(data);
      if (data.status === 'preenchido') setSubmitted(true);
      
      if (data.leads) {
        setFormData((prev: any) => ({
          ...prev,
          nome_completo: data.leads.nome || '',
          whatsapp: data.leads.whats || '',
          cidade: data.leads.cidade || ''
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      const currentValues = formData[name] || [];
      setFormData((prev: any) => ({
        ...prev,
        [name]: checked 
          ? [...currentValues, value]
          : currentValues.filter((i: any) => i !== value)
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updateData: any = {
        status: 'preenchido',
        respostas: formData,
        tipo_projeto: projetoType,
        preenchido_em: new Date().toISOString()
      };

      const { error } = await supabase.from('briefings').update(updateData).eq('id', briefing.id);

      if (error) throw error;
      
      if (briefing.cliente_id) {
        const clienteUpdate: any = {
          tipo_projeto: projetoType,
          area_m2: formData.area_estimada || formData.area_terreno,
          orcamento: formData.orcamento,
          briefing_preenchido: true
        };
        await (supabase.from('clientes') as any).update(clienteUpdate).eq('id', briefing.cliente_id);
      }
      
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0F0E0C] text-[#8B7355] flex items-center justify-center italic font-cormorant text-2xl">
      Carregando...
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-[#0F0E0C] flex flex-col items-center justify-center p-8 text-center font-['Courier_New']">
      
      <div className="w-12 h-12 border border-[#8B7355]/40 rounded-full flex items-center justify-center mb-8">
        <div className="w-2 h-2 bg-[#8B7355] rounded-full" />
      </div>

      <p className="text-[10px] text-[#8B7355] uppercase tracking-[0.5em] font-bold mb-6">
        Pré-briefing recebido
      </p>

      <h1 className="font-cormorant italic text-3xl md:text-4xl text-[#E8E4DF] mb-4 leading-tight">
        {formData.nome_completo
          ? `${formData.nome_completo.split(' ')[0]}, recebemos seu pré-briefing.`
          : 'Recebemos seu pré-briefing.'}
      </h1>

      <div className="w-16 h-[1px] bg-[#8B7355]/30 my-6" />

      <p className="text-[#E8E4DF]/40 text-[10px] uppercase tracking-widest max-w-xs leading-relaxed mb-4">
        {projetoType === 'arq' && 'Arquitetura + Interiores'}
        {projetoType === 'int' && 'Projeto de Interiores'}
        {projetoType === 'com' && 'Projeto Comercial'}
      </p>

      <p className="text-[#E8E4DF]/40 text-[10px] uppercase tracking-widest max-w-xs leading-relaxed">
        Nossa equipe analisará suas respostas antes da reunião. Em breve entraremos em contato para confirmar o próximo passo.
      </p>

      <p className="text-[#E8E4DF]/15 text-[9px] uppercase tracking-widest mt-16">
        NL Arquitetos · A Arquitetura como Decisão
      </p>
    </div>
  );

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <h3 className="text-[#8B7355] uppercase text-[10px] tracking-[0.3em] font-bold mb-8">ETAPA 1 — DADOS PESSOAIS</h3>
            <div className="grid gap-4">
...
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <h3 className="text-[#8B7355] uppercase text-[10px] tracking-[0.3em] font-bold mb-8">ETAPA 2 — TIPO DE PROJETO</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setProjetoType('arq')}
                className={`
                  cursor-pointer border p-8 transition-all duration-300 group
                  ${projetoType === 'arq' 
                    ? 'border-[#8B7355] bg-[#8B7355]/5' 
                    : 'border-white/10 hover:border-[#8B7355]/50 hover:bg-white/[0.02]'}
                `}
              >
                <p className="text-[10px] text-[#8B7355] uppercase tracking-[0.4em] font-bold mb-3">
                  ARQ + INTERIORES
                </p>
                <p className="text-[#E8E4DF] text-sm leading-relaxed">
                  Construção nova com projeto arquitetônico e interiores completos
                </p>
                <div className={`mt-4 w-6 h-[1px] transition-all duration-300 ${projetoType === 'arq' ? 'bg-[#8B7355] w-12' : 'bg-white/20'}`} />
              </div>

              <div
                onClick={() => setProjetoType('int')}
                className={`
                  cursor-pointer border p-8 transition-all duration-300 group
                  ${projetoType === 'int' 
                    ? 'border-[#8B7355] bg-[#8B7355]/5' 
                    : 'border-white/10 hover:border-[#8B7355]/50 hover:bg-white/[0.02]'}
                `}
              >
                <p className="text-[10px] text-[#8B7355] uppercase tracking-[0.4em] font-bold mb-3">
                  INTERIORES
                </p>
                <p className="text-[#E8E4DF] text-sm leading-relaxed">
                  Reforma e decoração de ambientes existentes
                </p>
                <div className={`mt-4 w-6 h-[1px] transition-all duration-300 ${projetoType === 'int' ? 'bg-[#8B7355] w-12' : 'bg-white/20'}`} />
              </div>

              <div
                onClick={() => setProjetoType('com')}
                className={`
                  cursor-pointer border p-8 transition-all duration-300 group
                  ${projetoType === 'com' 
                    ? 'border-[#8B7355] bg-[#8B7355]/5' 
                    : 'border-white/10 hover:border-[#8B7355]/50 hover:bg-white/[0.02]'}
                `}
              >
                <p className="text-[10px] text-[#8B7355] uppercase tracking-[0.4em] font-bold mb-3">
                  COMERCIAL
                </p>
                <p className="text-[#E8E4DF] text-sm leading-relaxed">
                  Espaço projetado para gerar resultado no seu negócio
                </p>
                <div className={`mt-4 w-6 h-[1px] transition-all duration-300 ${projetoType === 'com' ? 'bg-[#8B7355] w-12' : 'bg-white/20'}`} />
              </div>
            </div>
          </div>
        );
      case 3:
        if (projetoType === 'arq') {
          return (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h3 className="text-[#8B7355] uppercase text-[10px] tracking-[0.3em] font-bold mb-8">ETAPA 3 — O IMÓVEL</h3>
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-[#8B7355] uppercase tracking-widest">Tem lote/imóvel definido?</label>
                  <div className="flex gap-4">
                    {['Sim, já tenho', 'Estou buscando', 'Ainda não'].map(opt => (
                      <button key={opt} type="button" onClick={() => setFormData({...formData, imovel_definido: opt})} className={cn("text-[10px] border px-4 py-2 uppercase tracking-widest", formData.imovel_definido === opt ? "border-[#8B7355] text-[#8B7355]" : "border-white/10 text-white/40")}>{opt}</button>
                    ))}
                  </div>
                </div>
                {formData.imovel_definido === 'Sim, já tenho' && <Input name="endereco" placeholder="Endereço do imóvel/lote" value={formData.endereco} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none h-12" />}
                <div className="grid grid-cols-2 gap-4">
                  <Input name="area_terreno" placeholder="Área do terreno (m²)" value={formData.area_terreno} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none h-12" />
                  <Input name="area_estimada" placeholder="Área estimada (m²)" value={formData.area_estimada} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none h-12" />
                </div>
                <Input name="moradores" placeholder="Quantas pessoas vão morar?" value={formData.moradores} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none h-12" />
                <Input name="pets" placeholder="Tem pets?" value={formData.pets} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none h-12" />
              </div>
            </div>
          );
        } else if (projetoType === 'int') {
          return (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h3 className="text-[#8B7355] uppercase text-[10px] tracking-[0.3em] font-bold mb-8">ETAPA 3 — O IMÓVEL</h3>
              <div className="grid gap-6">
                <Input name="tipo_imovel" placeholder="Tipo de imóvel (Casa / Apartamento / Outro)" value={formData.tipo_imovel} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none h-12" />
                <Input name="endereco" placeholder="Endereço" value={formData.endereco} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none h-12" />
                <Input name="area_estimada" placeholder="Área total a reformar (m²)" value={formData.area_estimada} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none h-12" />
                <div className="space-y-3">
                  <label className="text-[10px] text-[#8B7355] uppercase tracking-widest">O mobiliário existente será aproveitado?</label>
                  <div className="flex flex-wrap gap-4">
                    {['Tudo novo', 'Aproveitarei parte', 'Aproveitarei tudo'].map(opt => (
                      <button key={opt} type="button" onClick={() => setFormData({...formData, mobiliario_aproveitado: opt})} className={cn("text-[10px] border px-4 py-2 uppercase tracking-widest", formData.mobiliario_aproveitado === opt ? "border-[#8B7355] text-[#8B7355]" : "border-white/10 text-white/40")}>{opt}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h3 className="text-[#8B7355] uppercase text-[10px] tracking-[0.3em] font-bold mb-8">ETAPA 3 — O NEGÓCIO</h3>
              <div className="grid gap-6">
                <Input name="tipo_negocio" placeholder="Qual o tipo de negócio?" value={formData.tipo_negocio} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none h-12" />
                <Textarea name="experiencia_cliente" placeholder="Qual a experiência que você quer que o cliente sinta?" value={formData.experiencia_cliente} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none min-h-[100px]" />
                <div className="space-y-3">
                  <label className="text-[10px] text-[#8B7355] uppercase tracking-widest">Tem marca definida?</label>
                  <div className="flex flex-wrap gap-4">
                    {['Sim, completa', 'Em desenvolvimento', 'Ainda não'].map(opt => (
                      <button key={opt} type="button" onClick={() => setFormData({...formData, marca_definida: opt})} className={cn("text-[10px] border px-4 py-2 uppercase tracking-widest", formData.marca_definida === opt ? "border-[#8B7355] text-[#8B7355]" : "border-white/10 text-white/40")}>{opt}</button>
                    ))}
                  </div>
                </div>
                <Input name="perfil_cliente" placeholder="Qual o perfil do seu cliente?" value={formData.perfil_cliente} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none h-12" />
              </div>
            </div>
          );
        }
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-[#8B7355] uppercase text-[10px] tracking-[0.3em] font-bold mb-8">ETAPA 4 — O PROJETO</h3>
            <div className="grid gap-6">
              <div className="space-y-3">
                <label className="text-[10px] text-[#8B7355] uppercase tracking-widest">Referência de estilo</label>
                <div className="flex flex-wrap gap-3">
                  {['Minimalista', 'Contemporâneo', 'Rústico', 'Industrial', 'Outro'].map(opt => (
                    <button key={opt} type="button" onClick={() => setFormData({...formData, estilo_referencia: opt})} className={cn("text-[9px] border px-3 py-1.5 uppercase tracking-widest", formData.estilo_referencia === opt ? "border-[#8B7355] text-[#8B7355]" : "border-white/10 text-white/40")}>{opt}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] text-[#8B7355] uppercase tracking-widest">Orçamento estimado</label>
                <select name="orcamento" value={formData.orcamento} onChange={handleChange} className="w-full bg-white/[0.03] border border-white/10 rounded-none h-12 px-3 text-sm focus:outline-none focus:border-[#8B7355]">
                  <option value="" className="bg-[#0F0E0C]">Selecione...</option>
                  <option value="Alto" className="bg-[#0F0E0C]">Acima da média</option>
                  <option value="Medio" className="bg-[#0F0E0C]">Médio</option>
                  <option value="Baixo" className="bg-[#0F0E0C]">Ajustado</option>
                  <option value="Nao sei" className="bg-[#0F0E0C]">Ainda não sei</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] text-[#8B7355] uppercase tracking-widest">Quando quer começar?</label>
                <div className="flex flex-wrap gap-4">
                  {['Imediato', 'Até 6 meses', 'Sem prazo'].map(opt => (
                    <button key={opt} type="button" onClick={() => setFormData({...formData, prazo: opt})} className={cn("text-[10px] border px-4 py-2 uppercase tracking-widest", formData.prazo === opt ? "border-[#8B7355] text-[#8B7355]" : "border-white/10 text-white/40")}>{opt}</button>
                  ))}
                </div>
              </div>
              <Textarea name="obs" placeholder="Algo importante que devemos saber antes da nossa conversa?" value={formData.obs} onChange={handleChange} className="bg-white/[0.03] border-white/10 rounded-none min-h-[120px]" />
            </div>
          </div>
        );
      default: return null;
    }
  };

  if (step === 0) return (
    <div className="min-h-screen bg-[#0F0E0C] flex flex-col items-center justify-center p-8 text-center">
      <p className="text-[10px] text-[#8B7355] uppercase tracking-[0.5em] font-bold mb-8">NL Arquitetos</p>
      <h1 className="font-cormorant italic text-5xl md:text-6xl text-[#E8E4DF] mb-6 leading-tight">
        Conte-nos sobre<br/>o seu projeto
      </h1>
      <div className="w-16 h-[1px] bg-[#8B7355]/50 mb-8" />
      <p className="text-[#E8E4DF]/40 max-w-sm leading-relaxed mb-12 uppercase tracking-widest text-[10px]">
        Este formulário nos ajuda a entender sua necessidade antes da reunião. Com essas informações, chegamos preparados para uma conversa mais objetiva e precisa.
      </p>
      <button
        onClick={() => setStep(1)}
        className="bg-[#8B7355] text-[#0F0E0C] px-12 py-4 uppercase tracking-[0.3em] text-xs font-bold hover:bg-[#8B7355]/90 transition-colors"
      >
        COMEÇAR →
      </button>
      <p className="text-[#E8E4DF]/20 text-[9px] uppercase tracking-widest mt-16">A Arquitetura como Decisão</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F0E0C] text-[#E8E4DF] p-4 md:p-8 font-['Courier_New'] overflow-x-hidden selection:bg-[#8B7355]/30">
      <header className="max-w-xl mx-auto mb-16 mt-8 text-center space-y-4">
        <h1 className="text-[11px] tracking-[0.5em] uppercase text-[#8B7355] font-bold">NL ARQUITETOS</h1>
        <h2 className="font-cormorant italic text-4xl md:text-5xl text-white/90">Conte-nos sobre o seu projeto</h2>
        <p className="text-[10px] opacity-40 max-w-sm mx-auto uppercase tracking-widest leading-relaxed">Prepare sua proposta entendendo sua necessidade antes da primeira conversa.</p>
        <div className="pt-8">
          <Progress value={(step / 4) * 100} className="h-[2px] bg-white/5" indicatorClassName="bg-[#8B7355] transition-all duration-700" />
        </div>
      </header>

      <main className="max-w-xl mx-auto bg-white/[0.01] border border-white/[0.05] p-6 md:p-12 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
        <form onSubmit={handleSubmit} className="space-y-12">
          {renderStep()}
          
          <div className="flex justify-between items-center pt-8 border-t border-white/5">
            <Button 
              type="button" 
              variant="ghost" 
              disabled={step === 1} 
              onClick={() => setStep(s => s - 1)} 
              className="rounded-none text-[10px] tracking-widest opacity-40 hover:opacity-100 hover:bg-transparent"
            >
              <ChevronLeft size={16} className="mr-2" /> ANTERIOR
            </Button>
            
            {step < 4 ? (
              <Button 
                type="button" 
                disabled={step === 2 && !projetoType}
                onClick={() => setStep(s => s + 1)} 
                className="rounded-none bg-[#8B7355] hover:bg-[#8B7355]/90 text-[#0F0E0C] font-bold px-10 h-12 text-[10px] tracking-widest shadow-[0_5px_15px_rgba(139,115,85,0.2)]"
              >
                PRÓXIMO <ChevronRight size={16} className="ml-2" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={submitting}
                className="rounded-none bg-[#8B7355] hover:bg-[#8B7355]/90 text-[#0F0E0C] font-bold px-12 h-12 text-[10px] tracking-widest shadow-[0_5px_15px_rgba(139,115,85,0.2)]"
              >
                {submitting ? 'ENVIANDO...' : 'SUBMETER'}
              </Button>
            )}
          </div>
        </form>
      </main>
      
      <footer className="max-w-xl mx-auto mt-20 text-center pb-20 opacity-20">
        <p className="text-[9px] tracking-[0.4em] uppercase font-bold">A ARQUITETURA COMO DECISÃO · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default BriefingPublic;
