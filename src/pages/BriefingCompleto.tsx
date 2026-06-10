import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Check, AlertCircle, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

// --- DATA STRUCTURE ---
const BRIEFING_ARQINT = {
  capítulos: [
    {
      id: 1,
      titulo: 'Você e o Seu Projeto',
      blocos: [
        {
          id: 'B01',
          titulo: 'Identificação e Contexto',
          perguntas: [
            { id: 'nome', label: 'Nome completo', tipo: 'text', prefill: 'nome_cliente' },
            { id: 'telefone', label: 'Telefone', tipo: 'text', prefill: 'whatsapp' },
            { id: 'email', label: 'E-mail', tipo: 'text' },
            { id: 'cidade', label: 'Cidade', tipo: 'text', prefill: 'cidade' },
            { id: 'endereco', label: 'Endereço do imóvel', tipo: 'text' },
            { id: 'tipo_imovel', label: 'Tipo do imóvel', tipo: 'select', opcoes: ['Terreno vazio', 'Construção a demolir', 'Reforma', 'Ainda não definido'] },
            { id: 'fase', label: 'Fase atual', tipo: 'select', opcoes: ['Acabei de adquirir', 'Tenho há algum tempo', 'Ainda vou adquirir'] },
            { id: 'decisao', label: 'Quem participa das decisões', tipo: 'select', opcoes: ['Só eu', 'Casal', 'Família', 'Tenho sócios'] },
            { id: 'usuarios', label: 'Quem utilizará o imóvel', tipo: 'textarea', placeholder: 'Ex: Casal, dois filhos de 8 e 12 anos...' },
          ]
        },
        {
          id: 'B02',
          titulo: 'Sonho e Objetivos',
          perguntas: [
            { id: 'motivacao', label: 'O que motivou este projeto neste momento?', tipo: 'textarea' },
            { id: 'conquista', label: 'O que espera conquistar com este projeto?', tipo: 'textarea' },
            { id: 'futuro', label: 'Como imagina sua vida nesta casa daqui a 5 anos?', tipo: 'textarea' },
            { id: 'simbolo', label: 'Se esta casa representasse uma conquista da sua vida, qual seria?', tipo: 'textarea' },
          ]
        }
      ]
    },
    {
      id: 2,
      titulo: 'O Terreno e a Família',
      blocos: [
        {
          id: 'B03',
          titulo: 'Terreno e Localização',
          perguntas: [
            { id: 'escolha_terreno', label: 'O que fez você escolher este terreno?', tipo: 'textarea' },
            { id: 'vista', label: 'Existe alguma vista que gostaria de valorizar?', tipo: 'textarea' },
            { id: 'esconder', label: 'Existe algo do entorno que gostaria de esconder?', tipo: 'textarea' },
            { id: 'topografia', label: 'Possui levantamento topográfico?', tipo: 'select', opcoes: ['Sim', 'Não', 'Não sei'] },
            { id: 'sondagem', label: 'Possui sondagem do solo?', tipo: 'select', opcoes: ['Sim', 'Não', 'Não sei'] },
            { id: 'restricoes', label: 'Conhece as restrições do loteamento ou condomínio?', tipo: 'select', opcoes: ['Sim, conheço', 'Parcialmente', 'Não verificamos ainda'] },
          ]
        },
        {
          id: 'B04',
          titulo: 'Perfil da Família',
          perguntas: [
            { id: 'dia_perfeito', label: 'Como seria um dia perfeito na sua casa?', tipo: 'textarea' },
            { id: 'filhos', label: 'Possui filhos?', tipo: 'select', opcoes: ['Sim', 'Não'] },
            { id: 'pets', label: 'Possui pets?', tipo: 'select', opcoes: ['Sim', 'Não'] },
            { id: 'visitas', label: 'Recebem amigos ou familiares com frequência?', tipo: 'select', opcoes: ['Raramente', 'Às vezes', 'Com frequência'] },
            { id: 'qtd_visitas', label: 'Quantas pessoas normalmente recebem?', tipo: 'select', opcoes: ['Até 10', '10 a 20', '20 a 50', 'Mais de 50'] },
          ]
        },
        {
          id: 'B05',
          titulo: 'Rotina e Hábitos',
          perguntas: [
            { id: 'rotina_semana', label: 'Como funciona sua rotina durante a semana?', tipo: 'textarea' },
            { id: 'rotina_fds', label: 'Como funciona sua rotina nos finais de semana?', tipo: 'textarea' },
            { id: 'home_office', label: 'Necessidade de home office?', tipo: 'select', opcoes: ['Sim, uso diariamente', 'Sim, ocasionalmente', 'Não'] },
            { id: 'lazer', label: 'Atividades de lazer em casa', tipo: 'multiselect', opcoes: ['Churrasco', 'Piscina', 'Academia', 'Cinema', 'Videogame', 'Leitura', 'Vinhos / Adega', 'Área gourmet', 'Festas', 'Jardim'] },
          ]
        }
      ]
    },
    {
      id: 3,
      titulo: 'Arquitetura',
      blocos: [
        {
          id: 'B06',
          titulo: 'Estilo Arquitetônico',
          perguntas: [
            { id: 'estilo_gosta', label: 'Estilos que mais lhe agradam', tipo: 'multiselect', opcoes: ['Moderno', 'Contemporâneo', 'Minimalista', 'Industrial', 'Clássico', 'Tropical', 'Rústico'] },
            { id: 'estilo_nao', label: 'Estilos que não combinam com você', tipo: 'multiselect', opcoes: ['Muito colorido', 'Muito vidro', 'Muito concreto aparente', 'Pé-direito duplo', 'Ambientes muito integrados', 'Cores escuras', 'Estilo rústico'] },
            { id: 'sentimento', label: 'Como deseja se sentir ao chegar em sua casa?', tipo: 'textarea' },
            { id: 'referencias_arq', label: 'Referências de projetos arquitetônicos', tipo: 'textarea', placeholder: 'Links do Pinterest, Instagram, endereços de casas que admira...' },
          ]
        },
        {
          id: 'B07',
          titulo: 'Programa de Necessidades',
          perguntas: [
            { id: 'ambientes', label: 'Ambientes indispensáveis', tipo: 'multiselect', opcoes: ['Suíte master', 'Closet', 'Quartos adicionais', 'Escritório / Home office', 'Área gourmet', 'Piscina', 'Academia', 'Adega', 'Brinquedoteca', 'Cinema', 'Lavabo', 'Dependência de serviço', 'Garagem coberta', 'Jardim'] },
            { id: 'ambientes_desejo', label: 'Ambientes desejáveis — se o orçamento permitir', tipo: 'textarea' },
            { id: 'tres_itens', label: 'Quais são os 3 itens que não podem faltar?', tipo: 'textarea' },
            { id: 'eliminar', label: 'Algum ambiente que pode ser eliminado se necessário?', tipo: 'textarea' },
            { id: 'futuro', label: 'Existe alguma necessidade futura que devemos considerar?', tipo: 'textarea', placeholder: 'Ex: quarto para filho, espaço para envelhecer, home office maior...' },
          ]
        },
        {
          id: 'B08',
          titulo: 'Tecnologia e Sustentabilidade',
          perguntas: [
            { id: 'sustentabilidade', label: 'Interesse em sustentabilidade', tipo: 'multiselect', opcoes: ['Energia solar', 'Aquecimento solar', 'Reaproveitamento de água', 'Ventilação cruzada', 'Eficiência energética', 'Materiais sustentáveis'] },
            { id: 'tecnologia_arq', label: 'Interesse em tecnologia na estrutura', tipo: 'multiselect', opcoes: ['Automação residencial', 'Carregador para veículo elétrico', 'Infraestrutura para câmeras', 'Internet cabeada', 'Gerador'] },
          ]
        }
      ]
    },
    {
      id: 4,
      titulo: 'Interiores',
      blocos: [
        {
          id: 'B09',
          titulo: 'Ambientes e Interiores',
          perguntas: [
            { id: 'ambientes_int', label: 'Ambientes a trabalhar nos interiores', tipo: 'multiselect', opcoes: ['Sala de estar', 'Sala de jantar', 'Cozinha', 'Área gourmet', 'Suíte master', 'Quartos adicionais', 'Banheiros', 'Escritório', 'Cinema', 'Academia', 'Lavabo'] },
            { id: 'pe_direito', label: 'Pé-direito desejado', tipo: 'select', opcoes: ['Padrão', 'Diferenciado em alguns ambientes', 'Alto em toda a casa'] },
          ]
        },
        {
          id: 'B10',
          titulo: 'Mobiliário e Marcenaria',
          perguntas: [
            { id: 'moveis_existentes', label: 'Móveis existentes serão mantidos?', tipo: 'select', opcoes: ['Sim, vários ficam', 'Alguns ficam', 'Não — começo do zero'] },
            { id: 'moveis_quais', label: 'Quais móveis ficam?', tipo: 'textarea' },
            { id: 'marcenaria', label: 'Marcenaria existente?', tipo: 'select', opcoes: ['Sim, fica', 'Sim, vai embora', 'Não tenho'] },
            { id: 'nivel_marcenaria', label: 'Nível de marcenaria desejado', tipo: 'select', opcoes: ['Básica', 'Intermediária', 'Premium', 'Sob medida completa'] },
          ]
        },
        {
          id: 'B11',
          titulo: 'Estilo dos Interiores',
          perguntas: [
            { id: 'materiais_gosta', label: 'Materiais preferidos', tipo: 'multiselect', opcoes: ['Madeira', 'Pedra natural', 'Mármore', 'Concreto', 'Metal', 'Vidro', 'Tecidos naturais', 'Cerâmica'] },
            { id: 'materiais_nao', label: 'Materiais que não gostaria de utilizar', tipo: 'textarea' },
            { id: 'referencias_int', label: 'Referências de interiores', tipo: 'textarea', placeholder: 'Links do Pinterest, Instagram, ambientes que admira...' },
            { id: 'nao_quer_int', label: 'O que definitivamente não quer ver nos interiores?', tipo: 'textarea' },
          ]
        },
        {
          id: 'B12',
          titulo: 'Iluminação e Tecnologia',
          perguntas: [
            { id: 'tecnologia_int', label: 'Tecnologia nos interiores', tipo: 'multiselect', opcoes: ['Automação residencial', 'Som ambiente', 'Internet cabeada', 'Sistema de câmeras', 'Fechadura digital', 'Iluminação cênica', 'Home theater'] },
          ]
        }
      ]
    },
    {
      id: 5,
      titulo: 'Investimento e Planejamento',
      blocos: [
        {
          id: 'B13',
          titulo: 'Orçamento',
          perguntas: [
            { id: 'investimento', label: 'Faixa de investimento prevista', tipo: 'select', opcoes: ['Até R$ 300k', 'R$ 300k – R$ 600k', 'R$ 600k – R$ 1,2M', 'R$ 1,2M – R$ 2M', 'Acima de R$ 2M'] },
            { id: 'limite', label: 'Existe um limite máximo?', tipo: 'select', opcoes: ['Sim', 'Não', 'Prefiro discutir na reunião'] },
            { id: 'concentrar', label: 'Onde deseja concentrar os investimentos?', tipo: 'textarea' },
            { id: 'padrao', label: 'Preferência de padrão', tipo: 'select', opcoes: ['Alto padrão em áreas estratégicas', 'Padrão bom uniforme em toda a casa', 'Ainda não sei'] },
          ]
        },
        {
          id: 'B14',
          titulo: 'Prioridades',
          perguntas: [
            { id: 'prioridades', label: 'Ordene do mais para o menos importante', tipo: 'textarea', placeholder: 'Liste os itens por ordem de importância...' },
            { id: 'cortar', label: 'Se fosse necessário reduzir custos, o que revisaria primeiro?', tipo: 'textarea' },
          ]
        },
        {
          id: 'B15',
          titulo: 'Escala de Importância',
          perguntas: [
            { id: 'escala', label: 'Avalie cada item de 1 (menos importante) a 5 (essencial)', tipo: 'textarea', placeholder: 'Ex: Conforto: 5, Estética: 4...' },
          ]
        }
      ]
    },
    {
      id: 6,
      titulo: 'Expectativas Finais',
      blocos: [
        {
          id: 'B16',
          titulo: 'Medos e Expectativas',
          perguntas: [
            { id: 'medos', label: 'Quais são seus 3 maiores medos em relação à obra?', tipo: 'textarea' },
            { id: 'excelente', label: 'O que seria um projeto excelente para você?', tipo: 'textarea' },
            { id: 'sucesso', label: 'O que faria você considerar este projeto um sucesso?', tipo: 'textarea' },
            { id: 'valeu', label: 'Quando sua casa estiver pronta, o que fará você dizer que todo o investimento valeu a pena?', tipo: 'textarea' },
            { id: 'frase', label: 'Em uma única frase, descreva a casa dos seus sonhos.', tipo: 'textarea', placeholder: 'Ex: "Quero uma casa elegante, mas onde meus filhos queiram ficar."' },
            { id: 'mais', label: 'Existe alguma informação importante que ainda não perguntamos?', tipo: 'textarea' },
          ]
        }
      ]
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

const ARCHITECTURAL_QUOTES = [
  "A arquitetura começa onde termina a engenharia.",
  "Menos é mais quando mais é demais.",
  "A luz é o que define o espaço.",
  "O detalhe não é o detalhe. O detalhe é o projeto.",
  "Arquitetura é música congelada.",
  "O espaço é o fôlego da arte."
];

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('button')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
    };
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 w-8 h-8 border border-white/30 rounded-full pointer-events-none z-[9999] mix-blend-difference hidden md:block"
      animate={{
        x: position.x - 16,
        y: position.y - 16,
        scale: isHovering ? 1.5 : 1,
        backgroundColor: isHovering ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0)"
      }}
      transition={{ type: "spring", damping: 20, stiffness: 250, mass: 0.5 }}
    />
  );
};

const BriefingCompleto = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<any>(null);
  const [chapterIndex, setChapterIndex] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  
  const mouseX = useRef(0);
  const mouseY = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.current = (e.clientX / window.innerWidth - 0.5) * 20;
      mouseY.current = (e.clientY / window.innerHeight - 0.5) * 20;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const fetchProjeto = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .rpc('get_project_by_token_or_slug', { p_val: token })
          .maybeSingle();
        if (data) {
          setProjeto(data);
          
          // Prefill logic
          const prefillAnswers: any = {};
          if (data.nome_cliente) prefillAnswers['nome'] = data.nome_cliente;
          if (data.cidade) prefillAnswers['cidade'] = data.cidade;

          const saved = localStorage.getItem(`briefing_progress_${token}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            setAnswers({ ...prefillAnswers, ...(parsed.answers || {}) });
            setChapterIndex(parsed.chapterIndex !== undefined ? parsed.chapterIndex : -1);
          } else {
            setAnswers(prefillAnswers);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProjeto();
  }, [token]);

  useEffect(() => {
    if (token && chapterIndex >= -1) {
      setIsSaving(true);
      localStorage.setItem(`briefing_progress_${token}`, JSON.stringify({
        chapterIndex,
        answers
      }));
      const timer = setTimeout(() => setIsSaving(false), 800);
      return () => clearTimeout(timer);
    }
  }, [chapterIndex, answers, token]);

  const handleNext = () => {
    if (chapterIndex < BRIEFING_ARQINT.capítulos.length - 1) {
      setCurrentQuote(ARCHITECTURAL_QUOTES[chapterIndex % ARCHITECTURAL_QUOTES.length]);
      setShowTransition(true);
      setTimeout(() => {
        setShowTransition(false);
        setChapterIndex(chapterIndex + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 2000);
    } else {
      submitBriefing();
    }
  };

  const handleBack = () => {
    if (chapterIndex > 0) setChapterIndex(chapterIndex - 1);
    else setChapterIndex(-1);
  };

  const submitBriefing = async () => {
    setIsSubmitting(true);
    try {
      await supabase.from('briefings_completos').insert({
        projeto_id: projeto?.id,
        respostas: answers
      });
      localStorage.removeItem(`briefing_progress_${token}`);
      setIsFinished(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  const BackgroundLayer = ({ imageIndex, opacity = 0.1 }: { imageIndex: number, opacity?: number }) => (
    <motion.div 
      className="absolute inset-0 pointer-events-none"
      style={{ opacity }}
    >
      <motion.img 
        src={BACKGROUND_IMAGES[imageIndex % BACKGROUND_IMAGES.length]} 
        alt="Background" 
        className="w-full h-full object-cover grayscale"
        animate={{
          scale: 1.1,
          x: mouseX.current * 0.5,
          y: mouseY.current * 0.5,
        }}
        transition={{ type: "tween", ease: "linear", duration: 0.1 }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
    </motion.div>
  );

  if (isFinished) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 md:p-12 text-center font-['Arial'] relative overflow-hidden cursor-none">
      <CustomCursor />
      <BackgroundLayer imageIndex={4} opacity={0.15} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-2xl space-y-12 bg-black/40 backdrop-blur-xl p-10 md:p-16 border border-white/5 rounded-2xl shadow-2xl"
      >
        <div className="space-y-4">
          <p className="text-[#8B7355] text-[10px] font-bold tracking-[0.5em] uppercase">Briefing concluído</p>
          <div className="w-12 h-[1px] bg-[#8B7355]/30 mx-auto" />
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-['Georgia'] italic text-white leading-tight">Parabéns.</h1>
          <p className="text-white/40 text-xs md:text-sm tracking-[0.2em] leading-relaxed uppercase font-['Arial']">
            Você acaba de concluir a primeira etapa estratégica do desenvolvimento do seu projeto.
          </p>
          <div className="py-8 border-y border-white/5 space-y-6">
            <p className="text-white/60 text-xs md:text-sm leading-relaxed font-['Georgia'] italic">
              "Nossa equipe analisará cuidadosamente cada uma de suas respostas. Esse material será o pilar da nossa próxima reunião."
            </p>
            <p className="text-[#8B7355] text-[10px] font-bold tracking-[0.3em] uppercase">
              Próxima etapa: Reunião de Diagnóstico e Direcionamento.
            </p>
          </div>
        </div>

        <p className="text-white/20 text-[9px] uppercase tracking-[0.6em] pt-4 font-['Arial']">
          A arquitetura como decisão.
        </p>
      </motion.div>
    </div>
  );

  if (chapterIndex === -1) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center px-8 md:px-24 py-12 relative overflow-hidden cursor-none">
      <CustomCursor />
      <BackgroundLayer imageIndex={0} opacity={0.2} />
      
      <div className="relative z-10 space-y-12 max-w-3xl">
        <div className="space-y-4">
          <p className="text-[#8B7355] text-[10px] font-bold tracking-[0.5em] uppercase">NL ARQUITETOS</p>
          <div className="w-12 h-[1px] bg-[#8B7355]/30" />
        </div>
        
        <div className="space-y-8">
          {projeto?.nome_cliente && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-white/40 font-['Georgia'] italic text-xl"
            >
              Seja bem-vindo, {projeto.nome_cliente}.
            </motion.p>
          )}
          <h1 className="text-5xl md:text-7xl font-['Georgia'] italic text-white leading-tight">
            Vamos começar o desenvolvimento do seu projeto.
          </h1>
          <p className="text-white/40 text-xs md:text-sm tracking-[0.2em] leading-relaxed max-w-xl font-['Arial'] uppercase">
            Este briefing é a base estratégica de tudo que construiremos. Cada resposta define um caminho único.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-10 pt-8">
          <Button 
            onClick={() => setChapterIndex(0)} 
            className="border border-white/20 text-white/60 hover:text-white hover:border-white/50 bg-transparent px-14 h-16 text-[10px] font-bold tracking-[0.4em] uppercase transition-all duration-700 rounded-none group"
          >
            <span className="relative z-10">Começar Briefing</span>
            <div className="absolute inset-0 bg-white/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
          </Button>
          <div className="flex items-center gap-4 text-white/20 text-[9px] tracking-[0.3em] uppercase">
            <span className="w-8 h-[1px] bg-white/10" />
            Tempo estimado: 15 minutos
          </div>
        </div>
      </div>
    </div>
  );

  if (showTransition) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-12 text-center relative overflow-hidden cursor-none">
      <CustomCursor />
      <BackgroundLayer imageIndex={chapterIndex + 1} opacity={0.15} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="relative z-10 space-y-12"
      >
        <div className="space-y-4">
          <p className="text-[#8B7355] text-[10px] font-bold tracking-[0.5em] uppercase">Capítulo {chapterIndex + 1} Concluído</p>
          <div className="w-12 h-[1px] bg-white/10 mx-auto" />
        </div>
        
        <h2 className="text-2xl md:text-4xl font-['Georgia'] italic text-white/90 max-w-2xl leading-relaxed">
          "{currentQuote}"
        </h2>
        
        <div className="flex items-center justify-center gap-4">
          <div className="w-1 h-1 rounded-full bg-white/20 animate-pulse" />
          <div className="w-1 h-1 rounded-full bg-white/20 animate-pulse delay-75" />
          <div className="w-1 h-1 rounded-full bg-white/20 animate-pulse delay-150" />
        </div>
      </motion.div>
    </div>
  );

  const chapter = BRIEFING_ARQINT.capítulos[chapterIndex];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col cursor-none relative overflow-hidden">
      <CustomCursor />
      <BackgroundLayer imageIndex={chapterIndex} opacity={0.05} />

      <header className="p-8 flex justify-between items-center relative z-20">
        <p className="text-[#8B7355] text-[10px] font-bold tracking-[0.5em] uppercase">NL ARQUITETOS</p>
        
        <div className="flex gap-8 items-center">
          <AnimatePresence>
            {isSaving && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-[#8B7355] text-[8px] uppercase tracking-widest font-bold"
              >
                <Save size={10} className="animate-pulse" />
                <span>Salvo</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-4 items-center">
             <span className="text-[10px] uppercase tracking-widest text-white/40">{chapterIndex + 1} de {BRIEFING_ARQINT.capítulos.length}</span>
             <div className="w-24 h-[1px] bg-white/10 overflow-hidden">
               <motion.div 
                className="h-full bg-[#8B7355]" 
                initial={{ width: 0 }}
                animate={{ width: `${((chapterIndex + 1) / BRIEFING_ARQINT.capítulos.length) * 100}%` }}
                transition={{ duration: 0.8, ease: "circOut" }}
               />
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-8 md:px-24 py-12 max-w-4xl mx-auto w-full space-y-24 overflow-y-auto relative z-10 scrollbar-hide">
        <motion.div
          key={chapterIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-16 pb-24"
        >
          <div className="space-y-4">
            <span className="text-[#8B7355] font-bold text-[10px] tracking-[0.4em] uppercase">Capítulo {chapterIndex + 1}</span>
            <h1 className="text-4xl md:text-6xl font-['Georgia'] italic leading-tight">{chapter.titulo}</h1>
          </div>

          {chapter.blocos.map(bloco => (
            <div key={bloco.id} className="space-y-12">
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-[0.3em] text-white/30 font-bold">{bloco.titulo}</h3>
                <div className="h-[1px] w-12 bg-[#8B7355]/30" />
              </div>
              
              <div className="grid gap-10">
                {bloco.perguntas.map(p => (
                  <div key={p.id} className="space-y-4 group">
                    <label className={cn(
                      "text-[10px] uppercase tracking-[0.2em] transition-colors duration-300",
                      answers[p.id] ? "text-[#8B7355]" : "text-white/40 group-focus-within:text-white/70"
                    )}>
                      {p.label}
                      {p.id === 'nome' && projeto?.nome_cliente && (
                        <span className="ml-2 lowercase italic text-white/20 font-serif font-normal tracking-normal">(Confirmamos: {projeto.nome_cliente})</span>
                      )}
                    </label>

                    {p.tipo === 'text' && (
                      <Input 
                        value={answers[p.id] || ''} 
                        onChange={(e) => setAnswers({...answers, [p.id]: e.target.value})} 
                        className="bg-transparent border-0 border-b border-white/10 rounded-none px-0 h-10 focus-visible:ring-0 focus-visible:border-[#8B7355] transition-all text-lg font-['Arial']"
                        placeholder="Escreva aqui..."
                      />
                    )}

                    {p.tipo === 'textarea' && (
                      <Textarea 
                        value={answers[p.id] || ''} 
                        onChange={(e) => setAnswers({...answers, [p.id]: e.target.value})} 
                        className="bg-transparent border-0 border-b border-white/10 rounded-none px-0 min-h-[100px] focus-visible:ring-0 focus-visible:border-[#8B7355] transition-all text-lg font-['Arial'] resize-none leading-relaxed"
                        placeholder={p.placeholder || "Desenvolva sua resposta..."}
                      />
                    )}

                    {p.tipo === 'select' && (
                      <div className="flex flex-wrap gap-3">
                        {p.opcoes?.map(opt => (
                          <button 
                            key={opt} 
                            onClick={() => setAnswers({...answers, [p.id]: opt})} 
                            className={cn(
                              "px-6 py-3 border transition-all duration-300 text-[11px] uppercase tracking-widest",
                              answers[p.id] === opt 
                                ? "bg-white text-black border-white" 
                                : "bg-white/[0.02] border-white/10 text-white/50 hover:border-white/30 hover:text-white"
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {p.tipo === 'multiselect' && (
                      <div className="flex flex-wrap gap-2">
                        {p.opcoes?.map(opt => {
                          const isSelected = (answers[p.id] || []).includes(opt);
                          return (
                            <button 
                              key={opt} 
                              onClick={() => {
                                const current = answers[p.id] || [];
                                const next = isSelected ? current.filter((i: string) => i !== opt) : [...current, opt];
                                setAnswers({...answers, [p.id]: next});
                              }} 
                              className={cn(
                                "px-5 py-2 border transition-all duration-300 text-[10px] uppercase tracking-wider rounded-full",
                                isSelected 
                                  ? "bg-[#8B7355] text-white border-[#8B7355]" 
                                  : "bg-transparent border-white/10 text-white/40 hover:border-white/30 hover:text-white"
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-8 pt-12">
            <button 
              onClick={handleBack} 
              className="text-white/20 hover:text-white/60 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] transition-all"
            >
              <ChevronLeft size={14} />
              Voltar
            </button>
            <Button 
              onClick={handleNext} 
              className="bg-white text-black hover:bg-black hover:text-white border border-white rounded-none h-14 px-12 text-[10px] font-bold tracking-[0.4em] uppercase transition-all duration-500 group"
            >
              {chapterIndex === 5 ? (isSubmitting ? 'Enviando...' : 'Finalizar Briefing') : 'Próximo Capítulo'}
              <ChevronRight size={14} className="ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </main>

      <footer className="p-12 text-[8px] uppercase tracking-[0.5em] text-white/10 flex justify-between items-center border-t border-white/[0.03]">
        <p>NL ARQUITETOS · 2026</p>
        <p>A ARQUITETURA COMO DECISÃO.</p>
      </footer>
    </div>
  );
};

export default BriefingCompleto;
