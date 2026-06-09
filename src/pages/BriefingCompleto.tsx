import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type QuestionType = 'choice' | 'text' | 'multi' | 'investment';

interface Question {
  id: string;
  title: string;
  subtitle?: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
}

const QUESTIONS: Record<string, Question[]> = {
  'Arq+Int': [
    {
      id: 'descrever_espaco',
      title: 'Como você descreveria o espaço que quer criar?',
      subtitle: 'Não precisa ser técnico — fale como sente.',
      type: 'choice',
      options: [
        'Um lugar de chegada que acalma ao entrar',
        'Um espaço que impressiona e convida a ficar',
        'Um ambiente que responde à rotina com eficiência',
        'Uma extensão da natureza, dentro e fora integrados'
      ]
    },
    {
      id: 'quem_vai_viver',
      title: 'Me conta sobre quem vai viver nesse espaço.',
      subtitle: 'Quantas pessoas, idades, rotinas — isso define tudo.',
      type: 'text',
      placeholder: 'Descreva os moradores e suas rotinas...'
    },
    {
      id: 'tipo_imovel_status',
      title: 'É terreno ou imóvel existente?',
      type: 'choice',
      options: [
        'Terreno — construção do zero',
        'Imóvel existente — demolir e reconstruir',
        'Imóvel existente — reformar',
        'Ainda não definido'
      ]
    },
    {
      id: 'ambientes_inegociaveis',
      title: 'Quais ambientes são absolutamente inegociáveis?',
      subtitle: 'Selecione todos que se aplicam.',
      type: 'multi',
      options: [
        'Suíte master com closet',
        'Quartos adicionais',
        'Home office dedicado',
        'Área gourmet',
        'Piscina',
        'Garagem ampla',
        'Jardim ou área verde',
        'Lavabo',
        'Despensa',
        'Área de serviço'
      ]
    },
    {
      id: 'o_que_incomoda',
      title: 'O que mais te incomoda no lugar onde você vive hoje?',
      subtitle: 'As dores do presente são o projeto do futuro.',
      type: 'text',
      placeholder: 'O que não funciona hoje?'
    },
    {
      id: 'espaco_inesquecivel',
      title: 'Tem algum espaço que você visitou e nunca esqueceu?',
      subtitle: 'Hotel, casa de amigo, restaurante — qualquer lugar que ficou na memória.',
      type: 'text'
    },
    {
      id: 'o_que_nao_quer',
      title: 'O que você definitivamente não quer ver no projeto?',
      subtitle: 'Tão importante quanto o que quer — define os limites.',
      type: 'text'
    },
    {
      id: 'investimento',
      title: 'Qual é a faixa de investimento para a execução?',
      type: 'investment',
      options: [
        'Até R$ 300 mil',
        'R$ 300 mil – R$ 600 mil',
        'R$ 600 mil – R$ 1,2 milhão',
        'Acima de R$ 1,2 milhão',
        'Prefiro discutir na reunião'
      ]
    },
    {
      id: 'quem_decide',
      title: 'Quem toma as decisões finais?',
      type: 'choice',
      options: ['Só eu', 'Casal', 'Família', 'Tenho sócios']
    },
    {
      id: 'extra',
      title: 'Tem algo que quer garantir que a NL sabe antes da reunião?',
      subtitle: 'Espaço livre — qualquer detalhe, preocupação ou sonho.',
      type: 'text'
    }
  ],
  'Interiores': [
    {
      id: 'sentir_espaco',
      title: 'Como você quer que esse espaço te faça sentir?',
      subtitle: 'A atmosfera que você quer criar antes de qualquer decisão técnica.',
      type: 'choice',
      options: [
        'Acolhedor e quente',
        'Limpo e minimalista',
        'Sofisticado e elegante',
        'Vivo e cheio de personalidade'
      ]
    },
    {
      id: 'quem_vai_viver',
      title: 'Me conta sobre quem vai usar esse espaço.',
      subtitle: 'Quantas pessoas, idades, rotinas — isso define tudo.',
      type: 'text'
    },
    {
      id: 'tipo_imovel',
      title: 'Qual é o imóvel?',
      type: 'choice',
      options: ['Apartamento', 'Casa', 'Cobertura', 'Outro']
    },
    {
      id: 'ambientes_trabalhados',
      title: 'Quais ambientes serão trabalhados?',
      subtitle: 'Selecione todos que se aplicam.',
      type: 'multi',
      options: [
        'Sala de estar',
        'Sala de jantar',
        'Cozinha',
        'Suíte master',
        'Quartos',
        'Banheiros',
        'Home office',
        'Varanda',
        'Área de serviço',
        'Todos os ambientes'
      ]
    },
    {
      id: 'moveis_permanentes',
      title: 'Tem móveis ou itens que ficam — e que precisam ser respeitados no projeto?',
      subtitle: 'Peças com valor afetivo, investimento anterior, estrutura que não muda.',
      type: 'text'
    },
    {
      id: 'o_que_incomoda',
      title: 'O que mais te incomoda no espaço como está hoje?',
      subtitle: 'O que não funciona, o que falta, o que te irrita.',
      type: 'text'
    },
    {
      id: 'espaco_inesquecivel',
      title: 'Tem algum ambiente que você visitou e nunca esqueceu?',
      subtitle: 'Pode ser de uma revista, viagem, amigo, hotel.',
      type: 'text'
    },
    {
      id: 'o_que_nao_quer',
      title: 'O que você definitivamente não quer ver no projeto?',
      subtitle: 'Estilos, materiais, cores, sensações — o que não representa você.',
      type: 'text'
    },
    {
      id: 'investimento',
      title: 'Qual é a faixa de investimento?',
      type: 'investment',
      options: [
        'Até R$ 50 mil',
        'R$ 50 mil – R$ 100 mil',
        'R$ 100 mil – R$ 200 mil',
        'R$ 200 mil – R$ 350 mil',
        'Acima de R$ 350 mil',
        'Prefiro discutir na reunião'
      ]
    },
    {
      id: 'extra',
      title: 'Tem algo que quer garantir que a NL sabe antes da reunião?',
      type: 'text'
    }
  ],
  'Comercial': [
    {
      id: 'negocio',
      title: 'Me conta sobre o seu negócio.',
      subtitle: 'O que é, como funciona, o que vende ou oferece.',
      type: 'text'
    },
    {
      id: 'status_negocio',
      title: 'É abertura, reforma ou expansão?',
      type: 'choice',
      options: [
        'Abertura — espaço novo',
        'Reforma — espaço existente',
        'Expansão — aumentar o que existe'
      ]
    },
    {
      id: 'cliente_alvo',
      title: 'Quem é o cliente do seu negócio?',
      subtitle: 'Perfil, faixa etária, comportamento — quem você quer atrair.',
      type: 'text'
    },
    {
      id: 'sentir_espaco',
      title: 'Como você quer que as pessoas se sintam ao entrar no seu espaço?',
      subtitle: 'A primeira impressão que você quer causar.',
      type: 'choice',
      options: [
        'Impressionado e curioso',
        'Acolhido e confortável',
        'Confiante e seguro',
        'Estimulado e inspirado'
      ]
    },
    {
      id: 'areas_indispensaveis',
      title: 'Quais áreas são indispensáveis?',
      type: 'multi',
      options: [
        'Área de atendimento ao cliente',
        'Área de espera',
        'Escritório ou sala de reunião',
        'Estoques',
        'Área para funcionários',
        'Banheiro para clientes',
        'Vitrine ou exposição'
      ]
    },
    {
      id: 'identidade_visual',
      title: 'Tem identidade visual definida — logo, cores, fontes?',
      type: 'choice',
      options: [
        'Sim, está tudo definido',
        'Sim, mas pode evoluir',
        'Não tenho ainda',
        'Estou desenvolvendo'
      ]
    },
    {
      id: 'marca_tres_palavras',
      title: 'Em três palavras — como você descreveria a sua marca?',
      type: 'text'
    },
    {
      id: 'o_que_nao_quer',
      title: 'O que você definitivamente não quer ver no espaço?',
      subtitle: 'Estilos, materiais, referências — o que não representa sua marca.',
      type: 'text'
    },
    {
      id: 'investimento',
      title: 'Qual é a faixa de investimento?',
      type: 'investment',
      options: [
        'Até R$ 100 mil',
        'R$ 100 mil – R$ 300 mil',
        'R$ 300 mil – R$ 600 mil',
        'Acima de R$ 600 mil',
        'Prefiro discutir na reunião'
      ]
    },
    {
      id: 'extra',
      title: 'Tem data de inauguração em mente? Tem algo mais que quer garantir que a NL sabe?',
      type: 'text'
    }
  ]
};

const BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80'
];

const BriefingCompleto = () => {
  useEffect(() => {
    // Adicionando fontes premium se não existirem
    if (!document.getElementById('font-georgia-italic')) {
      const style = document.createElement('style');
      style.id = 'font-georgia-italic';
      style.innerHTML = `
        @font-face {
          font-family: 'GeorgiaItalic';
          src: local('Georgia Italic'), local('Georgia-Italic');
          font-style: italic;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);


  const { token } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<any>(null);
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Detectar tipo pela rota fixa
  const tipoByPath: Record<string, string> = {
    '/briefing/arqint': 'ARQ+INT',
    '/briefing/interiores': 'Interiores',
    '/briefing/comercial': 'Comercial',
  };

  const tipoFixo = tipoByPath[location.pathname];

  const fetchProjeto = async () => {
    if (!token) return;
    try {
      const { data, error } = await supabase
        .rpc('get_project_by_token_or_slug', { p_val: token })
        .maybeSingle();
      if (error || !data) {
        toast.error("Link de briefing inválido ou expirado.");
        setLoading(false);
        return;
      }
      setProjeto(data);
      const savedProgress = localStorage.getItem(`briefing_progress_${token}`);
      if (savedProgress) {
        try {
          const parsed = JSON.parse(savedProgress);
          setAnswers(parsed.answers || {});
          setStep(parsed.step !== undefined ? parsed.step : -1);
        } catch (e) {
          console.error('Error parsing progress', e);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tipoFixo) {
      setProjeto({ tipo: tipoFixo, nome_cliente: null, id: null });
      setLoading(false);
      return;
    }
    // Se tem token, buscar projeto normalmente
    if (token) {
      fetchProjeto();
    } else {
      setLoading(false);
    }
  }, [token, tipoFixo]);

  useEffect(() => {
    if (token && step >= 0) {
      localStorage.setItem(`briefing_progress_${token}`, JSON.stringify({
        step,
        answers
      }));
    }
  }, [step, answers, token]);

  const getTipoKey = (tipo: string): string => {
    const t = (tipo || '').toLowerCase().replace(/\s/g, '');
    if ((t.includes('int') && t.includes('arq')) || t === 'arq+int') return 'Arq+Int';
    if (t === 'interiores' || t === 'int') return 'Interiores';
    if (t === 'comercial' || t === 'com') return 'Comercial';
    return 'Arq+Int';
  };

  const questions = projeto ? QUESTIONS[getTipoKey(projeto.tipo)] : [];
  
  const tipoLabel: Record<string, string> = {
    'ARQ+INT': 'BRIEFING EXCLUSIVO · ARQ+INT',
    'Interiores': 'BRIEFING EXCLUSIVO · INTERIORES',
    'Comercial': 'BRIEFING EXCLUSIVO · COMERCIAL',
  };

  const tituloIntro: Record<string, string> = {
    'ARQ+INT': 'Vamos conhecer o seu projeto de arquitetura.',
    'Interiores': 'Vamos conhecer o seu projeto de interiores.',
    'Comercial': 'Vamos conhecer o seu projeto comercial.',
  };

  const currentQuestion = step >= 0 ? questions[step] : null;

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      submitBriefing();
    }
  };

  const handleBack = () => {
    if (step > -1) {
      setStep(step - 1);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const submitBriefing = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('briefings_completos')
        .insert({
          projeto_id: projeto.id || null,
          tipo: projeto.tipo,
          respostas: answers
        });
      if (error) throw error;
      localStorage.removeItem(`briefing_progress_${token}`);
      setIsFinished(true);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao enviar briefing: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white font-['Courier_New']">
      <div className="animate-pulse tracking-widest uppercase text-xs">Carregando projeto...</div>
    </div>
  );

  if (!projeto) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#141414] border border-white/10 p-10 text-center space-y-6">
        <AlertCircle className="mx-auto text-rose-500 w-12 h-12" />
        <h1 className="text-white font-['Georgia'] text-2xl">Projeto não encontrado</h1>
        <p className="text-white/60 text-sm leading-relaxed">O link utilizado parece estar incorreto ou o projeto não está mais disponível.</p>
        <Button variant="outline" className="w-full border-white/10 text-white/60 uppercase tracking-widest text-[10px] h-12" onClick={() => navigate('/')}>Voltar para Início</Button>
      </div>
    </div>
  );

  if (isFinished) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-['Courier_New'] relative overflow-hidden">
      <div className="absolute inset-0 opacity-20"><img src={BACKGROUND_IMAGES[0]} alt="Bg" className="w-full h-full object-cover" /></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/90 to-[#0a0a0a]" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-xl w-full text-center space-y-12">
        <div className="space-y-4">
          <p className="text-[#8B7355] text-[10px] font-bold tracking-[0.5em] uppercase">NL ARQUITETOS</p>
          <div className="w-12 h-[1px] bg-[#8B7355]/30 mx-auto" />
        </div>
        <div className="space-y-6">
          <h1 className="text-white font-['Georgia'] text-4xl md:text-5xl italic">Briefing recebido.</h1>
          <p className="text-white/60 text-xs md:text-sm uppercase tracking-widest leading-loose max-w-md mx-auto">A NL Arquitetos revisará suas respostas antes da reunião.</p>
        </div>
        <div className="pt-12 border-t border-white/10"><p className="text-white/20 text-[9px] uppercase tracking-[0.8em]">A arquitetura como decisão.</p></div>
      </motion.div>
    </div>
  );

  const bgImage = BACKGROUND_IMAGES[Math.max(0, step) % BACKGROUND_IMAGES.length];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-['Courier_New'] relative overflow-hidden">
      <AnimatePresence mode='wait'>
        <motion.div 
          key={bgImage} 
          initial={{ opacity: 0, scale: 1.1 }} 
          animate={{ opacity: 0.15, scale: 1 }} 
          exit={{ opacity: 0, scale: 1.05 }} 
          transition={{ duration: 2, ease: "easeOut" }} 
          className="absolute inset-0 z-0"
        >
          <img src={bgImage} alt="Project context" className="w-full h-full object-cover grayscale" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]/20 z-0" />
      <header className="relative z-10 p-8 flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-[#8B7355] text-[10px] font-bold tracking-[0.5em]">NL ARQUITETOS</p>
          <p className="text-white/40 text-[9px] tracking-widest">
            {tipoLabel[projeto?.tipo] || 'BRIEFING EXCLUSIVO'}
          </p>
        </div>
        {step >= 0 && (
          <div className="flex items-center gap-4">
            <div className="text-[9px] text-white/30 tracking-[0.2em] font-medium">PASSO {step + 1} DE {questions.length}</div>
            <div className="w-16 bg-white/5 h-[1px] rounded-full overflow-hidden">
              <motion.div 
                className="bg-white/40 h-full" 
                initial={{ width: 0 }} 
                animate={{ width: `${((step + 1) / questions.length) * 100}%` }} 
                transition={{ duration: 0.8, ease: "circOut" }}
              />
            </div>
          </div>
        )}
      </header>
      <main className="relative z-10 flex-1 flex items-center px-8 md:px-24 py-12">
        <div className="max-w-3xl w-full">
          <AnimatePresence mode="wait">
            {step === -1 ? (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                <div className="space-y-6">
                  {projeto?.nome_cliente && (
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-white/30 font-['Georgia'] italic text-lg"
                    >
                      Seja bem-vindo, {projeto.nome_cliente}.
                    </motion.p>
                  )}
                  <h1 className="text-5xl md:text-7xl font-['Georgia'] italic leading-tight">
                    {tituloIntro[projeto?.tipo] || 'Vamos conhecer o seu projeto.'}
                  </h1>
                  <p className="text-white/60 text-xs md:text-sm tracking-relaxed max-w-lg font-['Arial'] leading-relaxed">
                    Este briefing é a base de tudo que construiremos juntos. Seja honesto — cada detalhe importa.
                  </p>
                </div>
                <div className="flex flex-col gap-6 pt-8">
                  <div className="flex items-center gap-4">
                    <Button onClick={() => setStep(0)} className="border border-white/20 text-white/60 hover:text-white hover:border-white/50 bg-transparent px-10 h-12 text-[10px] font-bold tracking-[0.4em] uppercase transition-all duration-300">
                      Começar Briefing
                    </Button>
                    <div className="flex items-center gap-2 text-white/30 text-[9px] tracking-widest uppercase font-['Arial']">
                      <span className="w-4 h-[1px] bg-white/10"></span>
                      TEMPO ESTIMADO: 5 MINUTOS
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key={currentQuestion?.id} 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -30 }} 
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-16"
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-[#8B7355] font-bold text-[9px] tracking-[0.4em] uppercase">QUESTÃO {step + 1}</span>
                    <div className="h-[1px] w-8 bg-[#8B7355]/20" />
                  </div>
                  <h2 className="text-4xl md:text-6xl font-['Georgia'] italic leading-[1.15] text-white/90">
                    {currentQuestion?.title}
                  </h2>
                  {currentQuestion?.subtitle && (
                    <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] leading-relaxed max-w-xl">
                      {currentQuestion.subtitle}
                    </p>
                  )}
                </div>

                <div className="py-2">
                  {currentQuestion?.type === 'choice' && (
                    <div className="grid gap-4 max-w-xl">
                      {currentQuestion.options?.map(option => (
                        <button 
                          key={option} 
                          onClick={() => { handleAnswerChange(currentQuestion.id, option); setTimeout(handleNext, 400); }} 
                          className={cn(
                            "w-full text-left p-6 border transition-all duration-500 flex justify-between items-center group relative overflow-hidden", 
                            answers[currentQuestion.id] === option 
                              ? "bg-white text-black border-white" 
                              : "bg-white/[0.02] border-white/10 hover:border-white/30 text-white/70 hover:text-white hover:scale-[1.01]"
                          )}
                        >
                          <span className="text-[13px] font-['Arial'] tracking-wide">{option.toLowerCase()}</span>
                          {answers[currentQuestion.id] === option && <Check size={14} className="relative z-10" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentQuestion?.type === 'investment' && (
                    <div className="grid gap-4 max-w-xl">
                      {currentQuestion.options?.map(option => (
                        <button 
                          key={option} 
                          onClick={() => { handleAnswerChange(currentQuestion.id, option); setTimeout(handleNext, 400); }} 
                          className={cn(
                            "w-full text-left p-6 border transition-all duration-500 flex justify-between items-center group", 
                            answers[currentQuestion.id] === option 
                              ? "bg-[#8B7355] text-white border-[#8B7355]" 
                              : "bg-white/[0.02] border-white/10 hover:border-white/30 text-white/70 hover:text-white hover:scale-[1.01]"
                          )}
                        >
                          <span className="text-[13px] font-['Arial'] tracking-wide">{option.toLowerCase()}</span>
                          {answers[currentQuestion.id] === option && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentQuestion?.type === 'multi' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                      {currentQuestion.options?.map(option => {
                        const current = answers[currentQuestion.id] || [];
                        const isSelected = current.includes(option);
                        return (
                          <div 
                            key={option} 
                            onClick={() => { const next = isSelected ? current.filter((i: string) => i !== option) : [...current, option]; handleAnswerChange(currentQuestion.id, next); }} 
                            className={cn(
                              "cursor-pointer flex items-center gap-4 p-6 border transition-all duration-500 hover:scale-[1.01]", 
                              isSelected ? "bg-white/10 border-white/40 text-white" : "bg-white/[0.02] border-white/5 hover:border-white/20 text-white/60 hover:text-white"
                            )}
                          >
                            <Checkbox checked={isSelected} className="border-white/20 data-[state=checked]:bg-[#8B7355] data-[state=checked]:border-[#8B7355]" />
                            <span className="text-[13px] font-['Arial'] tracking-wide">{option.toLowerCase()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion?.type === 'text' && (
                    <div className="max-w-2xl">
                      <Textarea 
                        autoFocus 
                        placeholder={currentQuestion.placeholder || 'Escreva aqui...'} 
                        value={answers[currentQuestion.id] || ''} 
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} 
                        className="bg-transparent border-0 border-b border-white/10 rounded-none text-2xl p-0 min-h-[120px] focus:ring-0 focus:border-white/40 transition-all placeholder:text-white/5 font-['Georgia'] italic resize-none leading-relaxed" 
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-10 pt-4">
                  {step >= 0 && (
                    <button onClick={handleBack} className="text-white/20 hover:text-white/60 flex items-center gap-3 text-[9px] uppercase tracking-[0.3em] transition-all duration-300">
                      <ChevronLeft size={14} strokeWidth={1.5} /> 
                      Voltar
                    </button>
                  )}
                  {(currentQuestion?.type === 'text' || currentQuestion?.type === 'multi') && (
                    <Button 
                      onClick={handleNext} 
                      disabled={isSubmitting || (currentQuestion?.type === 'text' && !answers[currentQuestion.id]) || (currentQuestion?.type === 'multi' && (!answers[currentQuestion.id] || answers[currentQuestion.id].length === 0))} 
                      className="bg-white text-black hover:bg-black hover:text-white border border-white rounded-none h-12 px-12 text-[9px] font-bold tracking-[0.4em] uppercase group transition-all duration-500"
                    >
                      {step === questions.length - 1 ? (isSubmitting ? 'Enviando...' : 'Finalizar') : 'Próxima'}
                      <ChevronRight size={14} className="ml-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <footer className="relative z-10 p-12 flex justify-between items-center border-t border-white/[0.03]">
        <div className="flex items-center gap-6">
          <p className="text-white/10 text-[8px] uppercase tracking-[0.4em]">
            NL ARQUITETOS · 2026
          </p>
          <div className="w-[1px] h-3 bg-white/5 hidden md:block" />
          <p className="text-white/10 text-[8px] uppercase tracking-[0.4em] hidden md:block">
            SÃO JOSÉ DOS CAMPOS · SP
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/10 text-[8px] uppercase tracking-[0.6em]">
            A ARQUITETURA COMO DECISÃO.
          </p>
        </div>
      </footer>
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[99] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
};

export default BriefingCompleto;
