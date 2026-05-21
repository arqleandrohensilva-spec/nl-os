import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

const BriefingPublic = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [briefing, setBriefing] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  
  const [projetoType, setProjetoType] = useState<'arq' | 'int' | 'com' | null>(null);

  const [formData, setFormData] = useState<any>({
    nome_completo: '',
    whatsapp: '',
    email: '',
    cidade: '',
    origem: '',
    
    // Etapa 3/4 campos (dinâmicos)
    imovel_definido: '',
    endereco: '',
    area_terreno: '',
    area_construcao: '',
    moradores: '',
    pets: '',
    ambientes_indispensaveis: [],
    estilo_referencia: '',
    fator_decisao: [],
    orcamento: '',
    prazo: '',
    obs: '',
    
    // Específicos Interiores
    tipo_imovel: '',
    ambientes_reforma: [],
    mobiliario_aproveitado: '',
    
    // Específicos Comercial
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
      setFormData((prev: any) => ({
        ...prev,
        [name]: checked 
          ? [...(prev[name] || []), value]
          : (prev[name] || []).filter((i: any) => i !== value)
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from('briefings').update({
        status: 'preenchido',
        respostas: formData,
        tipo_projeto: projetoType,
        preenchido_em: new Date().toISOString()
      }).eq('id', briefing.id);

      if (error) throw error;
      
      if (briefing.cliente_id) {
        await supabase.from('clientes').update({
          tipo_projeto: projetoType,
          area_m2: formData.area_construcao || formData.area_total,
          orcamento: formData.orcamento,
          briefing_preenchido: true
        }).eq('id', briefing.cliente_id);
      }
      
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0F0E0C] text-[#8B7355] flex items-center justify-center italic">Carregando...</div>;
  if (submitted) return (
    <div className="min-h-screen bg-[#0F0E0C] text-[#E8E4DF] flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <CheckCircle2 size={48} className="text-[#8B7355] mx-auto" />
        <h1 className="text-2xl font-cormorant italic">PRÉ-BRIEFING RECEBIDO</h1>
        <p className="text-sm font-['Courier_New'] opacity-60 uppercase">NL ARQUITETOS · A ARQUITETURA COMO DECISÃO</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F0E0C] text-[#E8E4DF] p-6 font-['Courier_New']">
      <header className="max-w-2xl mx-auto mb-12 text-center">
        <h1 className="font-['Courier_New'] text-sm tracking-[0.2em] uppercase text-[#8B7355] mb-4">NL ARQUITETOS</h1>
        <h2 className="font-cormorant italic text-4xl mb-4">Conte-nos sobre o seu projeto</h2>
        <p className="text-xs opacity-70 mb-8">Para que possamos preparar uma proposta precisa, precisamos entender sua necessidade antes da nossa primeira conversa.</p>
        <Progress value={(step / 4) * 100} className="h-1 bg-[#8B7355]/20" indicatorClassName="bg-[#8B7355]" />
      </header>

      <main className="max-w-2xl mx-auto bg-[#0F0E0C] border border-white/[0.05] p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-[#8B7355] uppercase text-xs tracking-widest mb-6">Etapa 1: Dados Pessoais</h3>
              <Input name="nome_completo" placeholder="Nome completo" value={formData.nome_completo} onChange={handleChange} className="bg-transparent border-[#8B7355]/30 rounded-none focus:border-[#8B7355]" />
              <Input name="whatsapp" placeholder="WhatsApp" value={formData.whatsapp} onChange={handleChange} className="bg-transparent border-[#8B7355]/30 rounded-none focus:border-[#8B7355]" />
              <Input name="email" placeholder="E-mail" value={formData.email} onChange={handleChange} className="bg-transparent border-[#8B7355]/30 rounded-none focus:border-[#8B7355]" />
              <Input name="cidade" placeholder="Cidade" value={formData.cidade} onChange={handleChange} className="bg-transparent border-[#8B7355]/30 rounded-none focus:border-[#8B7355]" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-[#8B7355] uppercase text-xs tracking-widest mb-6">Etapa 2: Tipo de Projeto</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['arq', 'int', 'com'] as const).map((t) => (
                  <button 
                    key={t}
                    type="button"
                    onClick={() => setProjetoType(t)}
                    className={cn("p-6 border text-left", projetoType === t ? "border-[#8B7355] bg-[#8B7355]/10" : "border-[#8B7355]/30")}
                  >
                    <span className="block text-xs uppercase font-bold">{t === 'arq' ? 'ARQ + INTERIORES' : t === 'int' ? 'INTERIORES' : 'COMERCIAL'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-between pt-8 border-t border-white/[0.05]">
            <Button type="button" variant="ghost" disabled={step === 1} onClick={() => setStep(s => s - 1)} className="rounded-none"><ChevronLeft size={16} /></Button>
            {step < 4 ? (
              <Button type="button" onClick={() => setStep(s => s + 1)} className="rounded-none bg-[#8B7355] hover:bg-[#8B7355]/80 text-[#0F0E0C]">PRÓXIMO</Button>
            ) : (
              <Button type="submit" className="rounded-none bg-[#8B7355] text-[#0F0E0C]">ENVIAR</Button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
};

export default BriefingPublic;
