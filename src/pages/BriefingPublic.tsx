import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
    tipo_imovel: '',
    ambientes_reforma: [],
    mobiliario_aproveitado: '',
    tipo_negocio: '',
    experiencia_cliente: '',
    marca_definida: '',
    perfil_cliente: '',
    projeto_legal: '',
    prazo_inauguracao: ''
  });

  useEffect(() => {
    if (token) {
      fetchBriefing();
    } else {
      setLoading(false);
    }
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
      if (data.status === 'preenchido' || data.status === 'aprovado') setSubmitted(true);
      
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    try {
      if (token && briefing) {
        // Modo com token - Atualizar existente
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
      } else {
        // Modo público - Criar novo
        const insertData: any = {
          status: 'aguardando_triagem',
          respostas: formData,
          tipo_projeto: projetoType,
          preenchido_em: new Date().toISOString(),
          nome: formData.nome_completo,
          whatsapp: formData.whatsapp,
          email: formData.email,
          cidade: formData.cidade,
          origem: formData.origem
        };

        const { error } = await supabase.from('briefings').insert(insertData);
        if (error) throw error;
      }
      
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar.');
    } finally {
      setSubmitting(false);
    }
  };

  const GrainOverlay = () => (
    <div className="fixed inset-0 pointer-events-none z-[50] opacity-[0.03] mix-blend-overlay select-none" 
         style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
  );

  const BackgroundGlow = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#8B7355]/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#8B7355]/5 blur-[120px]" />
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#8B7355] flex flex-col items-center justify-center font-cormorant italic text-2xl gap-4 selection:bg-[#8B7355]/30">
      <div className="w-8 h-[1px] bg-[#8B7355] animate-pulse" />
      <p className="animate-pulse">Carregando...</p>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-8 text-center font-['Courier_New'] relative overflow-hidden selection:bg-[#8B7355]/30">
      <GrainOverlay />
      <BackgroundGlow />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-16 h-16 border border-[#8B7355]/20 rounded-full flex items-center justify-center mb-10 relative">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className="w-2 h-2 bg-[#8B7355] rounded-full" 
          />
          <div className="absolute inset-[-4px] border border-[#8B7355]/10 rounded-full animate-[ping_3s_linear_infinite]" />
        </div>

        <p className="text-[10px] text-[#8B7355] uppercase tracking-[0.6em] font-bold mb-8 opacity-70">
          Pré-briefing recebido
        </p>

        <h1 className="font-cormorant italic text-4xl md:text-5xl text-[#E8E4DF] mb-6 leading-tight max-w-2xl">
          {formData.nome_completo
            ? `${formData.nome_completo.split(' ')[0]}, recebemos seu pré-briefing.`
            : 'Recebemos seu pré-briefing.'}
        </h1>

        <div className="w-12 h-[1px] bg-[#8B7355]/30 my-8" />

        <div className="space-y-4 max-w-sm mx-auto text-center">
          <p className="text-[#8B7355] text-[10px] uppercase tracking-[0.3em] font-medium">
            {projetoType === 'arq' && 'Arquitetura + Interiores'}
            {projetoType === 'int' && 'Projeto de Interiores'}
            {projetoType === 'com' && 'Projeto Comercial'}
          </p>

          <p className="text-[#E8E4DF]/50 text-[11px] uppercase tracking-widest leading-relaxed">
            Nossa equipe analisará cada detalhe. Em breve entraremos em contato para o próximo passo.
          </p>
        </div>

        <div className="mt-20 pt-10 border-t border-white/5 w-full max-w-xs">
          <p className="text-[#E8E4DF]/20 text-[9px] uppercase tracking-[0.4em]">
            NL Arquitetos · A Arquitetura como Decisão
          </p>
        </div>
      </motion.div>
    </div>
  );

  if (step === 0) return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden selection:bg-[#8B7355]/30">
      <GrainOverlay />
      <BackgroundGlow />

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="relative z-10 flex flex-col items-center"
      >
        <p className="text-[10px] text-[#8B7355] uppercase tracking-[0.8em] font-bold mb-12 opacity-80">
          NL Arquitetos
        </p>
        
        <h1 className="font-cormorant italic text-5xl md:text-7xl text-[#E8E4DF] mb-8 leading-tight max-w-3xl">
          {formData.nome_completo 
            ? `Seja bem-vindo, ${formData.nome_completo.split(' ')[0]}.`
            : 'Sua jornada começa aqui.'}
        </h1>

        <div className="w-[1px] h-16 bg-gradient-to-b from-[#8B7355] to-transparent mb-12 opacity-30" />

        <p className="text-[#E8E4DF]/60 text-[11px] md:text-xs max-w-lg mx-auto leading-relaxed mb-16 uppercase tracking-[0.3em] font-light">
          Este pré-briefing é o primeiro passo para traduzirmos sua visão em arquitetura. 
          Dedique alguns minutos para que possamos chegar preparados à nossa reunião.
        </p>

        <motion.button
          whileHover={{ scale: 1.05, letterSpacing: "0.4em" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setStep(1)}
          className="group relative flex items-center gap-4 bg-[#8B7355] text-[#0F0E0C] px-14 py-5 uppercase tracking-[0.3em] text-[10px] font-bold transition-all duration-500 hover:bg-[#8B7355]/90"
        >
          <span>Começar</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
        </motion.button>

        <div className="mt-24">
          <p className="text-[#E8E4DF]/20 text-[9px] uppercase tracking-[0.5em]">A Arquitetura como Decisão</p>
        </div>
      </motion.div>
    </div>
  );

  const renderStep = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          {(() => {
            switch(step) {
              case 1:
                return (
                  <div className="space-y-10">
                    <div className="space-y-2">
                      <p className="text-[#8B7355] uppercase text-[9px] tracking-[0.5em] font-bold">Etapa 01</p>
                      <h3 className="font-cormorant italic text-3xl text-white/90">Dados de Contato</h3>
                    </div>
                    
                    <div className="grid gap-6">
                      <div className="space-y-4">
                        <Input 
                          name="nome_completo" 
                          placeholder="Nome completo" 
                          value={formData.nome_completo} 
                          onChange={handleChange} 
                          className="bg-white/[0.02] border-white/5 rounded-none h-14 px-6 text-[11px] uppercase tracking-widest focus:border-[#8B7355] focus:bg-white/[0.04] transition-all duration-500" 
                        />
                        <Input 
                          name="whatsapp" 
                          placeholder="WhatsApp" 
                          value={formData.whatsapp} 
                          onChange={handleChange} 
                          className="bg-white/[0.02] border-white/5 rounded-none h-14 px-6 text-[11px] uppercase tracking-widest focus:border-[#8B7355] focus:bg-white/[0.04] transition-all duration-500" 
                        />
                        <Input 
                          name="email" 
                          placeholder="E-mail" 
                          value={formData.email} 
                          onChange={handleChange} 
                          className="bg-white/[0.02] border-white/5 rounded-none h-14 px-6 text-[11px] uppercase tracking-widest focus:border-[#8B7355] focus:bg-white/[0.04] transition-all duration-500" 
                        />
                        <Input 
                          name="cidade" 
                          placeholder="Cidade / Estado" 
                          value={formData.cidade} 
                          onChange={handleChange} 
                          className="bg-white/[0.02] border-white/5 rounded-none h-14 px-6 text-[11px] uppercase tracking-widest focus:border-[#8B7355] focus:bg-white/[0.04] transition-all duration-500" 
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-[9px] text-[#8B7355] uppercase tracking-[0.4em] font-bold ml-1">Como nos conheceu?</label>
                        <select 
                          name="origem" 
                          value={formData.origem} 
                          onChange={handleChange} 
                          className="w-full bg-white/[0.02] border border-white/5 rounded-none h-14 px-6 text-[10px] uppercase tracking-widest focus:outline-none focus:border-[#8B7355] focus:bg-white/[0.04] transition-all duration-500 appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#0A0A0A]">Selecione uma opção...</option>
                          <option value="Instagram" className="bg-[#0A0A0A]">Instagram</option>
                          <option value="Indicação" className="bg-[#0A0A0A]">Indicação</option>
                          <option value="Google" className="bg-[#0A0A0A]">Google</option>
                          <option value="Outro" className="bg-[#0A0A0A]">Outros Canais</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              case 2:
                return (
                  <div className="space-y-10">
                    <div className="space-y-2 text-center">
                      <p className="text-[#8B7355] uppercase text-[9px] tracking-[0.5em] font-bold">Etapa 02</p>
                      <h3 className="font-cormorant italic text-3xl text-white/90">Tipo de Projeto</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {[
                        { id: 'arq', title: 'ARQUITETURA + INTERIORES', desc: 'Projeto arquitetônico completo e design de interiores para construções novas.' },
                        { id: 'int', title: 'INTERIORES', desc: 'Transformação de ambientes existentes, reformas e curadoria de mobiliário.' },
                        { id: 'com', title: 'COMERCIAL', desc: 'Estratégia espacial para negócios, focada em branding e experiência do cliente.' }
                      ].map((item) => (
                        <motion.div
                          key={item.id}
                          whileHover={{ x: 5 }}
                          onClick={() => setProjetoType(item.id as any)}
                          className={cn(
                            "cursor-pointer border p-8 transition-all duration-500 flex flex-col gap-4 relative overflow-hidden group",
                            projetoType === item.id 
                              ? "border-[#8B7355] bg-[#8B7355]/5 shadow-[0_10px_30px_rgba(139,115,85,0.05)]" 
                              : "border-white/5 bg-white/[0.01] hover:border-white/10"
                          )}
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] text-[#8B7355] uppercase tracking-[0.4em] font-bold">
                              {item.title}
                            </p>
                            {projetoType === item.id && (
                              <motion.div 
                                initial={{ scale: 0 }} 
                                animate={{ scale: 1 }} 
                                className="w-1.5 h-1.5 bg-[#8B7355] rounded-full" 
                              />
                            )}
                          </div>
                          <p className="text-[#E8E4DF]/60 text-[11px] leading-relaxed tracking-wider uppercase">
                            {item.desc}
                          </p>
                          <div className={cn(
                            "absolute bottom-0 left-0 h-[2px] transition-all duration-700",
                            projetoType === item.id ? "bg-[#8B7355] w-full" : "bg-[#8B7355]/20 w-0 group-hover:w-12"
                          )} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              case 3:
                const isArq = projetoType === 'arq';
                const isInt = projetoType === 'int';
                return (
                  <div className="space-y-10">
                    <div className="space-y-2">
                      <p className="text-[#8B7355] uppercase text-[9px] tracking-[0.5em] font-bold">Etapa 03</p>
                      <h3 className="font-cormorant italic text-3xl text-white/90">
                        {projetoType === 'com' ? 'O Negócio' : 'O Imóvel'}
                      </h3>
                    </div>
                    
                    <div className="grid gap-8">
                      {isArq && (
                        <>
                          <div className="space-y-4">
                            <label className="text-[9px] text-[#8B7355] uppercase tracking-[0.4em] font-bold">Tem lote definido?</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {['Sim, já tenho', 'Estou buscando', 'Ainda não'].map(opt => (
                                <button 
                                  key={opt} 
                                  type="button" 
                                  onClick={() => setFormData({...formData, imovel_definido: opt})} 
                                  className={cn(
                                    "text-[9px] border px-4 py-4 uppercase tracking-[0.2em] transition-all duration-500", 
                                    formData.imovel_definido === opt 
                                      ? "border-[#8B7355] text-[#8B7355] bg-[#8B7355]/5" 
                                      : "border-white/5 text-white/40 hover:border-white/10 hover:text-white/60"
                                  )}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                          {formData.imovel_definido === 'Sim, já tenho' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                              <Input name="endereco" placeholder="Endereço do imóvel/lote" value={formData.endereco} onChange={handleChange} className="bg-white/[0.02] border-white/5 rounded-none h-14 px-6 text-[10px] uppercase tracking-widest focus:border-[#8B7355]" />
                            </motion.div>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                            <Input name="area_terreno" placeholder="Área Terreno (m²)" value={formData.area_terreno} onChange={handleChange} className="bg-white/[0.02] border-white/5 rounded-none h-14 px-6 text-[10px] uppercase tracking-widest focus:border-[#8B7355]" />
                            <Input name="area_estimada" placeholder="Área Construída (m²)" value={formData.area_estimada} onChange={handleChange} className="bg-white/[0.02] border-white/5 rounded-none h-14 px-6 text-[10px] uppercase tracking-widest focus:border-[#8B7355]" />
                          </div>
                        </>
                      )}

                      {isInt && (
                        <>
                          <Input name="tipo_imovel" placeholder="Ex: Apartamento novo, Casa antiga..." value={formData.tipo_imovel} onChange={handleChange} className="bg-white/[0.02] border-white/5 rounded-none h-14 px-6 text-[10px] uppercase tracking-widest focus:border-[#8B7355]" />
                          <Input name="area_estimada" placeholder="Área a reformar (m²)" value={formData.area_estimada} onChange={handleChange} className="bg-white/[0.02] border-white/5 rounded-none h-14 px-6 text-[10px] uppercase tracking-widest focus:border-[#8B7355]" />
                          <div className="space-y-4">
                            <label className="text-[9px] text-[#8B7355] uppercase tracking-[0.4em] font-bold">Mobiliário Existente?</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {['Tudo novo', 'Parte nova', 'Tudo existente'].map(opt => (
                                <button 
                                  key={opt} 
                                  type="button" 
                                  onClick={() => setFormData({...formData, mobiliario_aproveitado: opt})} 
                                  className={cn(
                                    "text-[9px] border px-4 py-4 uppercase tracking-[0.2em] transition-all", 
                                    formData.mobiliario_aproveitado === opt 
                                      ? "border-[#8B7355] text-[#8B7355] bg-[#8B7355]/5" 
                                      : "border-white/5 text-white/40 hover:border-white/10"
                                  )}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {projetoType === 'com' && (
                        <>
                          <Input name="tipo_negocio" placeholder="Qual o segmento do negócio?" value={formData.tipo_negocio} onChange={handleChange} className="bg-white/[0.02] border-white/5 rounded-none h-14 px-6 text-[10px] uppercase tracking-widest focus:border-[#8B7355]" />
                          <Textarea name="experiencia_cliente" placeholder="Qual sensação o cliente deve ter ao entrar no espaço?" value={formData.experiencia_cliente} onChange={handleChange} className="bg-white/[0.02] border-white/5 rounded-none min-h-[140px] p-6 text-[10px] uppercase tracking-widest leading-loose focus:border-[#8B7355]" />
                          <Input name="perfil_cliente" placeholder="Qual o perfil do seu público-alvo?" value={formData.perfil_cliente} onChange={handleChange} className="bg-white/[0.02] border-white/5 rounded-none h-14 px-6 text-[10px] uppercase tracking-widest focus:border-[#8B7355]" />
                        </>
                      )}
                    </div>
                  </div>
                );
              case 4:
                return (
                  <div className="space-y-10">
                    <div className="space-y-2">
                      <p className="text-[#8B7355] uppercase text-[9px] tracking-[0.5em] font-bold">Etapa 04</p>
                      <h3 className="font-cormorant italic text-3xl text-white/90">Alinhamento Final</h3>
                    </div>
                    
                    <div className="grid gap-8">
                      <div className="space-y-4">
                        <label className="text-[9px] text-[#8B7355] uppercase tracking-[0.4em] font-bold">Estilo de Referência</label>
                        <div className="flex flex-wrap gap-2">
                          {['Minimalista', 'Contemporâneo', 'Industrial', 'Atemporal', 'Eclético'].map(opt => (
                            <button 
                              key={opt} 
                              type="button" 
                              onClick={() => setFormData({...formData, estilo_referencia: opt})} 
                              className={cn(
                                "text-[9px] border px-5 py-3 uppercase tracking-widest transition-all", 
                                formData.estilo_referencia === opt 
                                  ? "border-[#8B7355] text-[#8B7355] bg-[#8B7355]/5" 
                                  : "border-white/5 text-white/40 hover:border-white/10"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] text-[#8B7355] uppercase tracking-[0.4em] font-bold ml-1">Expectativa de Investimento</label>
                        <select 
                          name="orcamento" 
                          value={formData.orcamento} 
                          onChange={handleChange} 
                          className="w-full bg-white/[0.02] border border-white/5 rounded-none h-14 px-6 text-[10px] uppercase tracking-widest focus:outline-none focus:border-[#8B7355] appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#0A0A0A]">Não definido...</option>
                          <option value="Ate 500k" className="bg-[#0A0A0A]">Ate R$ 500.000</option>
                          <option value="500k - 1M" className="bg-[#0A0A0A]">R$ 500.000 a R$ 1.000.000</option>
                          <option value="Acima 1M" className="bg-[#0A0A0A]">Acima de R$ 1.000.000</option>
                        </select>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[9px] text-[#8B7355] uppercase tracking-[0.4em] font-bold">Prazo Desejado</label>
                        <div className="grid grid-cols-2 gap-3">
                          {['Imediato', 'Próximos 6 meses'].map(opt => (
                            <button 
                              key={opt} 
                              type="button" 
                              onClick={() => setFormData({...formData, prazo: opt})} 
                              className={cn(
                                "text-[9px] border px-4 py-4 uppercase tracking-[0.2em] transition-all", 
                                formData.prazo === opt 
                                  ? "border-[#8B7355] text-[#8B7355] bg-[#8B7355]/5" 
                                  : "border-white/5 text-white/40 hover:border-white/10"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Textarea 
                        name="obs" 
                        placeholder="Observações adicionais ou algum detalhe específico que queira compartilhar..." 
                        value={formData.obs} 
                        onChange={handleChange} 
                        className="bg-white/[0.02] border-white/5 rounded-none min-h-[140px] p-6 text-[10px] uppercase tracking-widest leading-loose focus:border-[#8B7355]" 
                      />
                    </div>
                  </div>
                );
              default: return null;
            }
          })()}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E4DF] font-['Courier_New'] selection:bg-[#8B7355]/30 relative overflow-hidden">
      <GrainOverlay />
      <BackgroundGlow />
      
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute left-[10%] top-0 bottom-0 w-[1px] bg-white/[0.02]" />
        <div className="absolute right-[10%] top-0 bottom-0 w-[1px] bg-white/[0.02]" />
        <div className="absolute top-[100px] left-0 right-0 h-[1px] bg-white/[0.02]" />
      </div>

      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 px-8 py-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-[0.6em] text-[#8B7355] ml-[0.6em]">NL ARQUITETOS</span>
            <span className="text-[8px] tracking-[0.4em] text-[#E8E4DF]/20 uppercase mt-1.5 ml-[0.4em]">Digital Briefing Experience</span>
          </div>
          <div className="text-[9px] text-[#8B7355] font-bold tracking-[0.3em] flex items-center gap-3">
            <span className="opacity-40 font-light">PROGRESSO</span>
            <span className="w-12 text-right">{Math.round((step / 4) * 100)}%</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-[#8B7355] shadow-[0_0_15px_rgba(139,115,85,0.3)]"
          />
        </div>
      </header>

      <main className="relative z-10 pt-40 pb-32 px-6">
        <div className="max-w-xl mx-auto">
          {renderStep()}

          <div className="mt-20 pt-10 border-t border-white/5 flex justify-between items-center">
            {step > 1 ? (
              <motion.button
                whileHover={{ x: -4 }}
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-3 text-[10px] text-[#E8E4DF]/40 uppercase tracking-[0.4em] hover:text-[#8B7355] transition-all group"
              >
                <ChevronLeft className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                <span>Anterior</span>
              </motion.button>
            ) : <div />}

            {step < 4 ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(step + 1)}
                disabled={step === 2 && !projetoType}
                className="flex items-center gap-4 bg-[#8B7355] text-[#0F0E0C] px-10 py-4 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-[#8B7355]/90 transition-all disabled:opacity-20 disabled:grayscale group shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
              >
                <span className="ml-1">Próximo</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="bg-[#8B7355] text-[#0F0E0C] px-12 py-4 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-[#8B7355]/90 transition-all disabled:opacity-50 shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
              >
                <span className="ml-1">{submitting ? 'Enviando...' : 'Finalizar →'}</span>
              </motion.button>
            )}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-8 left-0 right-0 pointer-events-none z-40 px-10 hidden md:block">
        <div className="max-w-[1400px] mx-auto flex justify-between items-end">
          <div className="flex flex-col gap-6 opacity-20">
            <div className="w-[1px] h-12 bg-white/40 mx-auto" />
            <div className="text-[8px] uppercase tracking-[0.6em] vertical-text transform -rotate-180" style={{ writingMode: 'vertical-rl' }}>
              NL ARQUITETOS · 2026
            </div>
          </div>
          <div className="flex flex-col gap-6 opacity-20">
            <div className="text-[8px] uppercase tracking-[0.6em] vertical-text" style={{ writingMode: 'vertical-rl' }}>
              A ARQUITETURA COMO DECISÃO
            </div>
            <div className="w-[1px] h-12 bg-white/40 mx-auto" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BriefingPublic;