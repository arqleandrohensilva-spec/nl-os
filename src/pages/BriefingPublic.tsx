
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, 
  Send, 
  User, 
  Home, 
  Palette, 
  ClipboardList, 
  Users,
  Clock,
  MapPin,
  Camera,
  Heart,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { Progress } from "@/components/ui/progress";

const BriefingPublic = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [briefing, setBriefing] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    // Dados Pessoais
    nome_completo: '',
    data_nascimento: '',
    profissao: '',
    email: '',
    whatsapp: '',
    
    // O Imóvel
    endereco_obra: '',
    tipo_imovel: 'Residencial',
    area_terreno: '',
    area_estimada: '',
    topografia: 'Plano',
    
    // Rotina e Necessidades
    pessoas_casa: '',
    pets: '',
    recebe_visitas: 'Frequentemente',
    estilo_vida: '',
    
    // O Projeto
    estilo_arquitetonico: '',
    ambientes_desejados: '',
    materiais_favoritos: '',
    cores_favoritas: '',
    itens_indispensaveis: '',
    
    // Investimento e Prazo
    investimento_estimado: '',
    prazo_desejado: '',
    observacoes_adicionais: ''
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
        toast.error('Link de briefing inválido ou expirado');
        return;
      }

      if (data.status === 'Preenchido') {
        setSubmitted(true);
      }

      setBriefing(data);
      if (data.leads) {
        setFormData(prev => ({
          ...prev,
          nome_completo: data.leads.nome || '',
          whatsapp: data.leads.whats || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching briefing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    setStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('briefings')
        .update({
          status: 'Preenchido',
          respostas: formData
        })
        .eq('id', briefing.id);

      if (error) throw error;

      // Update lead status
      if (briefing.lead_id) {
        await supabase
          .from('leads')
          .update({ stage: 'Briefing Preenchido' })
          .eq('id', briefing.lead_id);
      }

      setSubmitted(true);
      toast.success('Briefing enviado com sucesso!');
    } catch (error) {
      console.error('Error submitting briefing:', error);
      toast.error('Erro ao enviar briefing');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-pulse text-bronze uppercase tracking-[0.4em] text-xs font-bold">Carregando...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/[0.03] border border-white/10 p-12 text-center space-y-6">
          <div className="w-16 h-16 bg-bronze/10 border border-bronze/30 rounded-full flex items-center justify-center mx-auto text-bronze mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-xl font-bold tracking-widest uppercase text-white">Obrigado!</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Seu briefing foi recebido com sucesso. Nossa equipe analisará suas respostas e entrará em contato em breve para os próximos passos do seu projeto.
          </p>
          <div className="pt-4">
            <p className="text-[10px] text-bronze uppercase tracking-widest font-bold">NL Arquitetos</p>
          </div>
        </div>
      </div>
    );
  }

  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-12">
          <div className="mb-6 flex justify-center">
             <div className="w-16 h-[1px] bg-bronze/50" />
          </div>
          <h2 className="text-[10px] text-bronze uppercase tracking-[0.5em] font-bold mb-4">Briefing de Projeto</h2>
          <h1 className="text-4xl font-light tracking-[0.2em] mb-2 font-cormorant italic">NL ARQUITETOS</h1>
          <p className="text-white/30 text-[9px] uppercase tracking-[0.4em] font-bold">Atelier de Decisões</p>
          
          <div className="mt-16 space-y-2 max-w-xs mx-auto">
            <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">
              <span>Etapa {step} de 5</span>
              <span>{Math.round(progress)}% completo</span>
            </div>
            <Progress value={progress} className="h-1 bg-white/5 rounded-none" indicatorClassName="bg-bronze transition-all duration-500" />
          </div>
        </header>

        <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/10 p-8 md:p-12 shadow-2xl space-y-12">
          
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-bronze/10 flex items-center justify-center border border-bronze/20 text-bronze">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold">Dados Pessoais</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Quem é você e sua família</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Nome Completo</label>
                  <Input 
                    name="nome_completo"
                    value={formData.nome_completo}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Data de Nascimento</label>
                  <Input 
                    name="data_nascimento"
                    type="date"
                    value={formData.data_nascimento}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Profissão</label>
                  <Input 
                    name="profissao"
                    value={formData.profissao}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">WhatsApp</label>
                  <Input 
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                    className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                    required
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">E-mail</label>
                  <Input 
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-bronze/10 flex items-center justify-center border border-bronze/20 text-bronze">
                  <Home size={20} />
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold">O Imóvel</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Onde a mágica acontece</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Endereço da Obra</label>
                  <Input 
                    name="endereco_obra"
                    value={formData.endereco_obra}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Tipo de Imóvel</label>
                    <select 
                      name="tipo_imovel"
                      value={formData.tipo_imovel}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-none h-12 text-sm focus:outline-none focus:border-bronze px-3"
                    >
                      <option value="Residencial" className="bg-[#0A0A0A]">Residencial</option>
                      <option value="Comercial" className="bg-[#0A0A0A]">Comercial</option>
                      <option value="Interiores" className="bg-[#0A0A0A]">Interiores (Reforma)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Área do Terreno (m²)</label>
                    <Input 
                      name="area_terreno"
                      value={formData.area_terreno}
                      onChange={handleChange}
                      className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Área Estimada da Construção (m²)</label>
                    <Input 
                      name="area_estimada"
                      value={formData.area_estimada}
                      onChange={handleChange}
                      className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Topografia</label>
                    <select 
                      name="topografia"
                      value={formData.topografia}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-none h-12 text-sm focus:outline-none focus:border-bronze px-3"
                    >
                      <option value="Plano" className="bg-[#0A0A0A]">Plano</option>
                      <option value="Aclive" className="bg-[#0A0A0A]">Aclive (Sobe)</option>
                      <option value="Declive" className="bg-[#0A0A0A]">Declive (Desce)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-bronze/10 flex items-center justify-center border border-bronze/20 text-bronze">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold">Rotina e Estilo de Vida</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Como você vive seu espaço</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Quantas pessoas morarão na casa? (Idades e parentesco)</label>
                  <Textarea 
                    name="pessoas_casa"
                    value={formData.pessoas_casa}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 rounded-none min-h-[100px] text-sm focus-visible:ring-bronze"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Possui pets? Quais?</label>
                  <Input 
                    name="pets"
                    value={formData.pets}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Com que frequência recebe visitas?</label>
                  <select 
                    name="recebe_visitas"
                    value={formData.recebe_visitas}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-none h-12 text-sm focus:outline-none focus:border-bronze px-3"
                  >
                    <option value="Raramente" className="bg-[#0A0A0A]">Raramente</option>
                    <option value="Mensalmente" className="bg-[#0A0A0A]">Mensalmente</option>
                    <option value="Semanalmente" className="bg-[#0A0A0A]">Semanalmente</option>
                    <option value="Frequentemente" className="bg-[#0A0A0A]">Frequentemente</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Descreva um pouco da sua rotina diária:</label>
                  <Textarea 
                    name="estilo_vida"
                    value={formData.estilo_vida}
                    onChange={handleChange}
                    placeholder="Ex: Trabalho home-office, gosto de cozinhar, pratico exercícios em casa..."
                    className="bg-white/5 border-white/10 rounded-none min-h-[100px] text-sm focus-visible:ring-bronze"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-bronze/10 flex items-center justify-center border border-bronze/20 text-bronze">
                  <Palette size={20} />
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold">Desejos e Estética</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">A identidade do projeto</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Estilo Arquitetônico Preferido</label>
                  <Input 
                    name="estilo_arquitetonico"
                    value={formData.estilo_arquitetonico}
                    onChange={handleChange}
                    placeholder="Ex: Minimalista, Contemporâneo, Clássico, Industrial..."
                    className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Quais ambientes não podem faltar? (Programa de Necessidades)</label>
                  <Textarea 
                    name="ambientes_desejados"
                    value={formData.ambientes_desejados}
                    onChange={handleChange}
                    placeholder="Ex: 3 suítes, área gourmet integrada, escritório..."
                    className="bg-white/5 border-white/10 rounded-none min-h-[100px] text-sm focus-visible:ring-bronze"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Materiais que você gosta</label>
                    <Input 
                      name="materiais_favoritos"
                      value={formData.materiais_favoritos}
                      onChange={handleChange}
                      placeholder="Ex: Madeira, concreto, pedras naturais..."
                      className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Cores de preferência</label>
                    <Input 
                      name="cores_favoritas"
                      value={formData.cores_favoritas}
                      onChange={handleChange}
                      placeholder="Ex: Tons neutros, preto, cinza..."
                      className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Existe algo indispensável ou proibido?</label>
                  <Textarea 
                    name="itens_indispensaveis"
                    value={formData.itens_indispensaveis}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 rounded-none min-h-[100px] text-sm focus-visible:ring-bronze"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-bronze/10 flex items-center justify-center border border-bronze/20 text-bronze">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold">Investimento e Prazo</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Viabilizando o sonho</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Investimento Estimado para a Obra (R$)</label>
                  <Input 
                    name="investimento_estimado"
                    value={formData.investimento_estimado}
                    onChange={handleChange}
                    placeholder="Sua expectativa de gasto global"
                    className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Qual o seu prazo ideal para início e conclusão?</label>
                  <Input 
                    name="prazo_desejado"
                    value={formData.prazo_desejado}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 rounded-none h-12 text-sm focus-visible:ring-bronze"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Alguma observação adicional que queira compartilhar?</label>
                  <Textarea 
                    name="observacoes_adicionais"
                    value={formData.observacoes_adicionais}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 rounded-none min-h-[150px] text-sm focus-visible:ring-bronze"
                  />
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex flex-col items-center space-y-4">
                <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest font-bold">
                  <Heart size={12} className="text-bronze" />
                  Estamos quase lá
                </div>
                <p className="text-[11px] text-white/40 text-center italic max-w-sm">
                  Ao clicar em enviar, suas informações serão processadas pelo atelier para dar início à concepção do seu projeto.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-12 border-t border-white/5">
            {step > 1 ? (
              <Button 
                type="button" 
                onClick={handleBack}
                variant="outline"
                className="bg-transparent border-white/10 text-white hover:bg-white/5 rounded-none px-8 h-12 text-[10px] uppercase tracking-[0.2em] font-bold"
              >
                <ChevronLeft size={16} className="mr-2" /> Voltar
              </Button>
            ) : (
              <div></div>
            )}

            {step < 5 ? (
              <Button 
                type="button" 
                onClick={handleNext}
                className="bg-bronze hover:bg-bronze/90 text-white rounded-none px-8 h-12 text-[10px] uppercase tracking-[0.2em] font-bold"
              >
                Próximo <ChevronRight size={16} className="ml-2" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-bronze hover:bg-bronze/90 text-white rounded-none px-12 h-12 text-[10px] uppercase tracking-[0.2em] font-bold"
              >
                {submitting ? (
                  <>ENVIANDO...</>
                ) : (
                  <>ENVIAR BRIEFING <Send size={16} className="ml-2" /></>
                )}
              </Button>
            )}
          </div>

        </form>

        <footer className="mt-12 text-center pb-12">
          <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-bold">
            NL Arquitetos · © {new Date().getFullYear()} · Atelier de Decisões
          </p>
        </footer>
      </div>
    </div>
  );
};

export default BriefingPublic;
