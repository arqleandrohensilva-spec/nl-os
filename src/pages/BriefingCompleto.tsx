import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { cn } from '@/lib/utils';


interface Pergunta {
  id: string;
  label: string;
  tipo: string;
  prefill?: string;
  opcoes?: string[];
  placeholder?: string;
  orientacao?: string;
}

interface Bloco {
  id: string;
  titulo: string;
  perguntas: Pergunta[];
}

interface Capitulo {
  id: number;
  titulo: string;
  blocos: Bloco[];
}

interface BriefingData {
  capítulos: Capitulo[];
}

// --- DATA STRUCTURE ---
const BRIEFING_ARQINT: BriefingData = {
  capítulos: [
    {
      id: 1,
      titulo: 'Você e o Seu Projeto',
      blocos: [
        {
          id: 'B01',
          titulo: 'Identificação e Contexto',
          perguntas: [
            { id: 'nome', label: 'Nome completo', tipo: 'text', prefill: 'nome_cliente', orientacao: 'Informe seu nome completo conforme documento.' },
            { id: 'telefone', label: 'Telefone', tipo: 'text', prefill: 'whatsapp', orientacao: 'Seu melhor número para contato rápido via WhatsApp.' },
            { id: 'email', label: 'E-mail', tipo: 'text', orientacao: 'Utilizaremos este e-mail para enviar o material do projeto.' },
            { id: 'cidade', label: 'Cidade', tipo: 'text', prefill: 'cidade', orientacao: 'Onde o projeto ou obra está localizado.' },
            { id: 'endereco', label: 'Endereço do imóvel', tipo: 'text', orientacao: 'Se não houver endereço, informe o lote e condomínio.' },
            { id: 'tipo_imovel', label: 'Tipo do imóvel', tipo: 'select', opcoes: ['Terreno vazio', 'Construção a demolir', 'Reforma', 'Ainda não definido'], orientacao: 'Ajuda a entender o ponto de partida técnico.' },
            { id: 'fase', label: 'Fase atual', tipo: 'select', opcoes: ['Acabei de adquirir', 'Tenho há algum tempo', 'Ainda vou adquirir'], orientacao: 'O projeto deve considerar o tempo de posse.' },
            { id: 'decisao', label: 'Quem participa das decisões', tipo: 'select', opcoes: ['Só eu', 'Casal', 'Família', 'Tenho sócios'], orientacao: 'Fundamental para alinhar as expectativas de todos.' },
            { id: 'usuarios', label: 'Quem utilizará o imóvel', tipo: 'textarea', placeholder: 'Ex: Casal, dois filhos de 8 e 12 anos...', orientacao: 'Considere moradores permanentes e frequentes.' },
          ]
        },
        {
          id: 'B02',
          titulo: 'Sonho e Objetivos',
          perguntas: [
            { id: 'motivacao', label: 'O que motivou este projeto neste momento?', tipo: 'textarea', orientacao: 'Ex: Mudança de fase de vida, realização pessoal, investimento.' },
            { id: 'conquista', label: 'O que espera conquistar com este projeto?', tipo: 'textarea', orientacao: 'Sua maior expectativa em relação ao resultado final.' },
            { id: 'futuro', label: 'Como imagina sua vida nesta casa daqui a 5 anos?', tipo: 'textarea', orientacao: 'Considere o crescimento da família ou novos hobbies.' },
            { id: 'simbolo', label: 'Se esta casa representasse uma conquista da sua vida, qual seria?', tipo: 'textarea', orientacao: 'O significado emocional deste projeto para você.' },
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
            { id: 'escolha_terreno', label: 'O que fez você escolher este terreno?', tipo: 'textarea', orientacao: 'A localização, o tamanho, a vista ou o preço?' },
            { id: 'vista', label: 'Existe alguma vista que gostaria de valorizar?', tipo: 'textarea', orientacao: 'Ex: Mata, pôr do sol, skyline da cidade.' },
            { id: 'esconder', label: 'Existe algo do entorno que gostaria de esconder?', tipo: 'textarea', orientacao: 'Ex: Vizinho muito próximo, barulho da rua, poste.' },
            { id: 'topografia', label: 'Possui levantamento topográfico?', tipo: 'select', opcoes: ['Sim', 'Não', 'Não sei'], orientacao: 'Documento que detalha os níveis do terreno.' },
            { id: 'sondagem', label: 'Possui sondagem do solo?', tipo: 'select', opcoes: ['Sim', 'Não', 'Não sei'], orientacao: 'Teste que verifica a resistência do solo para fundações.' },
            { id: 'restricoes', label: 'Conhece as restrições do loteamento ou condomínio?', tipo: 'select', opcoes: ['Sim, conheço', 'Parcialmente', 'Não verificamos ainda'], orientacao: 'Regras de recuos, altura máxima e materiais.' },
          ]
        },
        {
          id: 'B04',
          titulo: 'Perfil da Família',
          perguntas: [
            { id: 'dia_perfeito', label: 'Como seria um dia perfeito na sua casa?', tipo: 'textarea', orientacao: 'Descreva sua rotina ideal, do amanhecer ao descanso.' },
            { id: 'filhos', label: 'Possui filhos?', tipo: 'select', opcoes: ['Sim', 'Não'], orientacao: 'Considere também planos futuros para filhos.' },
            { id: 'pets', label: 'Possui pets?', tipo: 'select', opcoes: ['Sim', 'Não'], orientacao: 'Informe se vivem dentro ou fora de casa.' },
            { id: 'visitas', label: 'Recebem amigos ou familiares com frequência?', tipo: 'select', opcoes: ['Raramente', 'Às vezes', 'Com frequência'], orientacao: 'Isso impacta no dimensionamento das áreas sociais.' },
            { id: 'qtd_visitas', label: 'Quantas pessoas normalmente recebem?', tipo: 'select', opcoes: ['Até 10', '10 a 20', '20 a 50', 'Mais de 50'], orientacao: 'Ajuda a prever assentos e fluxo de circulação.' },
          ]
        },
        {
          id: 'B05',
          titulo: 'Rotina e Hábitos',
          perguntas: [
            { id: 'rotina_semana', label: 'Como funciona sua rotina durante a semana?', tipo: 'textarea', orientacao: 'Horários, trabalho, refeições e descanso.' },
            { id: 'rotina_fds', label: 'Como funciona sua rotina nos finais de semana?', tipo: 'textarea', orientacao: 'Lazer, visitas e hobbies em casa.' },
            { id: 'home_office', label: 'Necessidade de home office?', tipo: 'select', opcoes: ['Sim, uso diariamente', 'Sim, ocasionalmente', 'Não'], orientacao: 'Indispensável para o planejamento acústico e de iluminação.' },
            { id: 'lazer', label: 'Atividades de lazer em casa', tipo: 'multiselect', opcoes: ['Churrasco', 'Piscina', 'Academia', 'Cinema', 'Videogame', 'Leitura', 'Vinhos / Adega', 'Área gourmet', 'Festas', 'Jardim'], orientacao: 'Selecione tudo o que faz parte do seu estilo de vida.' },
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
            { id: 'estilo_gosta', label: 'Estilos que mais lhe agradam', tipo: 'multiselect', opcoes: ['Moderno', 'Contemporâneo', 'Minimalista', 'Industrial', 'Clássico', 'Tropical', 'Rústico'], orientacao: 'O "estilo" define a linguagem visual da casa.' },
            { id: 'estilo_nao', label: 'Estilos que não combinam com você', tipo: 'multiselect', opcoes: ['Muito colorido', 'Muito vidro', 'Muito concreto aparente', 'Pé-direito duplo', 'Ambientes muito integrados', 'Cores escuras', 'Estilo rústico'], orientacao: 'Tão importante quanto o que você gosta é o que você quer evitar.' },
            { id: 'sentimento', label: 'Como deseja se sentir ao chegar em sua casa?', tipo: 'textarea', orientacao: 'Pense em sensações como paz, acolhimento, energia ou orgulho.' },
            { id: 'referencias_arq', label: 'Referências de projetos arquitetônicos', tipo: 'textarea', placeholder: 'Links do Pinterest, Instagram, endereços de casas que admira...', orientacao: 'Imagens valem mais que mil palavras no design.' },
          ]
        },
        {
          id: 'B07',
          titulo: 'Programa de Necessidades',
          perguntas: [
            { id: 'ambientes', label: 'Ambientes indispensáveis', tipo: 'multiselect', opcoes: ['Suíte master', 'Closet', 'Quartos adicionais', 'Escritório / Home office', 'Área gourmet', 'Piscina', 'Academia', 'Adega', 'Brinquedoteca', 'Cinema', 'Lavabo', 'Dependência de serviço', 'Garagem coberta', 'Jardim'], orientacao: 'Lista base para o dimensionamento da casa.' },
            { id: 'ambientes_desejo', label: 'Ambientes desejáveis — se o orçamento permitir', tipo: 'textarea', orientacao: 'Aquilo que você gostaria de ter, mas não é prioridade absoluta.' },
            { id: 'tres_itens', label: 'Quais são os 3 itens que não podem faltar?', tipo: 'textarea', orientacao: 'Os elementos "assinatura" do seu projeto.' },
            { id: 'eliminar', label: 'Algum ambiente que pode ser eliminado se necessário?', tipo: 'textarea', orientacao: 'Espaços que podem ser fundidos ou removidos em caso de ajuste de custos.' },
            { id: 'futuro', label: 'Existe alguma necessidade futura que devemos considerar?', tipo: 'textarea', placeholder: 'Ex: quarto para filho, espaço para envelhecer, home office maior...', orientacao: 'Pense na evolução da família nos próximos 10 anos.' },
          ]
        },
        {
          id: 'B08',
          titulo: 'Tecnologia e Sustentabilidade',
          perguntas: [
            { id: 'sustentabilidade', label: 'Interesse em sustentabilidade', tipo: 'multiselect', opcoes: ['Energia solar', 'Aquecimento solar', 'Reaproveitamento de água', 'Ventilação cruzada', 'Eficiência energética', 'Materiais sustentáveis'], orientacao: 'Soluções que reduzem o custo de manutenção e impacto ambiental.' },
            { id: 'tecnologia_arq', label: 'Interesse em tecnologia na estrutura', tipo: 'multiselect', opcoes: ['Automação residencial', 'Carregador para veículo elétrico', 'Infraestrutura para câmeras', 'Internet cabeada', 'Gerador'], orientacao: 'Infraestrutura básica necessária antes de fechar as paredes.' },
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
            { id: 'ambientes_int', label: 'Ambientes a trabalhar nos interiores', tipo: 'multiselect', opcoes: ['Sala de estar', 'Sala de jantar', 'Cozinha', 'Área gourmet', 'Suíte master', 'Quartos adicionais', 'Banheiros', 'Escritório', 'Cinema', 'Academia', 'Lavabo'], orientacao: 'Onde faremos o detalhamento fino de móveis e decoração.' },
            { id: 'pe_direito', label: 'Pé-direito desejado', tipo: 'select', opcoes: ['Padrão', 'Diferenciado em alguns ambientes', 'Alto em toda a casa'], orientacao: 'A altura do teto impacta diretamente na amplitude do espaço.' },
          ]
        },
        {
          id: 'B10',
          titulo: 'Mobiliário e Marcenaria',
          perguntas: [
            { id: 'moveis_existentes', label: 'Móveis existentes serão mantidos?', tipo: 'select', opcoes: ['Sim, vários ficam', 'Alguns ficam', 'Não — começo do zero'], orientacao: 'Fundamental para o dimensionamento dos novos espaços.' },
            { id: 'moveis_quais', label: 'Quais móveis ficam?', tipo: 'textarea', orientacao: 'Liste ou descreva os itens principais (Ex: Mesa de jantar herdada).' },
            { id: 'marcenaria', label: 'Marcenaria existente?', tipo: 'select', opcoes: ['Sim, fica', 'Sim, vai embora', 'Não tenho'], orientacao: 'Armários embutidos que você já possui.' },
            { id: 'nivel_marcenaria', label: 'Nível de marcenaria desejado', tipo: 'select', opcoes: ['Básica', 'Intermediária', 'Premium', 'Sob medida completa'], orientacao: 'Impacta significativamente no orçamento final de interiores.' },
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
            { id: 'tecnologia_int', label: 'Tecnologia nos interiores', tipo: 'multiselect', opcoes: ['Automação residencial', 'Som ambiente', 'Internet cabeada', 'Sistema de câmeras', 'Fechadura digital', 'Iluminação cênica', 'Home theater'], orientacao: 'Itens que trazem conveniência e conforto moderno.' },
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
            { id: 'investimento', label: 'Faixa de investimento prevista', tipo: 'select', opcoes: ['Até R$ 300k', 'R$ 300k – R$ 600k', 'R$ 600k – R$ 1,2M', 'R$ 1,2M – R$ 2M', 'Acima de R$ 2M'], orientacao: 'Estimativa global para obra e acabamentos.' },
            { id: 'limite', label: 'Existe um limite máximo?', tipo: 'select', opcoes: ['Sim', 'Não', 'Prefiro discutir na reunião'], orientacao: 'Fundamental para o controle financeiro do projeto.' },
            { id: 'concentrar', label: 'Onde deseja concentrar os investimentos?', tipo: 'textarea', orientacao: 'Ex: Fachada, área social, automação.' },
            { id: 'padrao', label: 'Preferência de padrão', tipo: 'select', opcoes: ['Alto padrão em áreas estratégicas', 'Padrão bom uniforme em toda a casa', 'Ainda não sei'], orientacao: 'Define a especificação de materiais.' },
          ]
        },
        {
          id: 'B14',
          titulo: 'Prioridades',
          perguntas: [
            { id: 'prioridades', label: 'Ordene do mais para o menos importante', tipo: 'textarea', placeholder: 'Liste os itens por ordem de importância...', orientacao: 'O que não pode ser negociado no projeto.' },
            { id: 'cortar', label: 'Se fosse necessário reduzir custos, o que revisaria primeiro?', tipo: 'textarea', orientacao: 'Itens que poderiam ser simplificados.' },
          ]
        },
        {
          id: 'B15',
          titulo: 'Escala de Importância',
          perguntas: [
            { id: 'escala', label: 'Avalie cada item de 1 (menos importante) a 5 (essencial)', tipo: 'textarea', placeholder: 'Ex: Conforto: 5, Estética: 4...', orientacao: 'Pense em Conforto, Estética, Tecnologia, Custo e Prazo.' },
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
            { id: 'medos', label: 'Quais são seus 3 maiores medos em relação à obra?', tipo: 'textarea', orientacao: 'Ex: Estourar orçamento, atraso, qualidade dos acabamentos.' },
            { id: 'excelente', label: 'O que seria um projeto excelente para você?', tipo: 'textarea', orientacao: 'Aquele que supera suas expectativas.' },
            { id: 'sucesso', label: 'O que faria você considerar este projeto um sucesso?', tipo: 'textarea', orientacao: 'O critério final de satisfação.' },
            { id: 'valeu', label: 'Quando sua casa estiver pronta, o que fará você dizer que todo o investimento valeu a pena?', tipo: 'textarea', orientacao: 'O momento da realização.' },
            { id: 'frase', label: 'Em uma única frase, descreva a casa dos seus sonhos.', tipo: 'textarea', placeholder: 'Ex: "Quero uma casa elegante, mas onde meus filhos queiram ficar."', orientacao: 'O conceito central do seu lar.' },
            { id: 'mais', label: 'Existe alguma informação importante que ainda não perguntamos?', tipo: 'textarea', orientacao: 'Fique à vontade para adicionar qualquer detalhe.' },
          ]
        }
      ]
    }
  ]
};

const BriefingCompleto = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<any>(null);
  const [chapterIndex, setChapterIndex] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProjeto = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .rpc('get_project_by_token_or_slug', { p_val: token })
          .maybeSingle();
        if (data) {
          setProjeto(data);

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
      setChapterIndex(chapterIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      submitBriefing();
    }
  };

  const handleBack = () => {
    if (chapterIndex > 0) setChapterIndex(chapterIndex - 1);
    else setChapterIndex(-1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // ---- TELA FINAL (escura) ----
  if (isFinished) return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-6 md:p-12 text-center font-['Arial']">
      <div className="max-w-2xl space-y-12">
        <div className="space-y-4">
          <p className="text-[#8B7355] text-[10px] font-bold tracking-[0.5em] uppercase">Briefing concluído</p>
          <div className="w-12 h-[1px] bg-[#8B7355]/30 mx-auto" />
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-['Georgia'] italic text-white leading-tight">Parabéns.</h1>
          <p className="text-white/40 text-xs md:text-sm tracking-[0.2em] leading-relaxed uppercase">
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

        <p className="text-white/20 text-[9px] uppercase tracking-[0.6em] pt-4">
          A arquitetura como decisão.
        </p>
      </div>
    </div>
  );

  // ---- TELA DE ENTRADA (escura) ----
  if (chapterIndex === -1) return (
    <div className="min-h-screen bg-[#141414] flex items-center px-8 md:px-24 py-12">
      <div className="space-y-12 max-w-3xl">
        <div className="space-y-4">
          <p className="text-[#8B7355] text-[10px] font-bold tracking-[0.5em] uppercase">NL ARQUITETOS</p>
          <div className="w-12 h-[1px] bg-[#8B7355]/30" />
        </div>

        <div className="space-y-8">
          {projeto?.nome_cliente && (
            <p className="text-white/40 font-['Georgia'] italic text-xl">
              Seja bem-vindo, {projeto.nome_cliente}.
            </p>
          )}
          <h1 className="text-5xl md:text-7xl font-['Georgia'] italic text-white leading-tight">
            Vamos começar o desenvolvimento do seu projeto.
          </h1>
          <p className="text-white/40 text-xs md:text-sm tracking-[0.2em] leading-relaxed max-w-xl uppercase">
            Este briefing é a base estratégica de tudo que construiremos. Cada resposta define um caminho único.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-10 pt-8">
          <Button
            onClick={() => setChapterIndex(0)}
            className="border border-white/20 text-white/60 hover:text-white hover:border-white/50 bg-transparent px-14 h-16 text-[10px] font-bold tracking-[0.4em] uppercase transition-colors rounded-none"
          >
            Começar Briefing
          </Button>
          <div className="flex items-center gap-4 text-white/20 text-[9px] tracking-[0.3em] uppercase">
            <span className="w-8 h-[1px] bg-white/10" />
            Tempo estimado: 15 minutos
          </div>
        </div>
      </div>
    </div>
  );

  // ---- TELAS DE PERGUNTAS (claras) ----
  const chapter = BRIEFING_ARQINT.capítulos[chapterIndex];

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#3A3A3A] flex flex-col">
      <header className="px-8 md:px-16 py-5 bg-white border-b border-[#D1D1D1] flex justify-between items-center">
        <p className="font-['Georgia'] text-[#3A3A3A] text-sm">NL ARQUITETOS</p>
        <div className="flex gap-6 items-center">
          {isSaving && (
            <span className="text-[7px] uppercase tracking-widest text-[#8B7355] flex items-center gap-1">
              <Save size={9} />
              Progresso salvo
            </span>
          )}
          <p className="font-['Courier_New'] text-[8px] tracking-widest text-[#8B7355] uppercase">Briefing · ARQ+INT</p>
        </div>
      </header>

      {/* Barra de progresso */}
      <div className="h-[1px] bg-[#D1D1D1] w-full">
        <div
          className="h-[1px] bg-[#8B7355] transition-all duration-500"
          style={{ width: `${((chapterIndex + 1) / BRIEFING_ARQINT.capítulos.length) * 100}%` }}
        />
      </div>

      <main className="flex-1 px-8 md:px-12 py-12 max-w-[640px] mx-auto w-full">
        <div className="space-y-16 pb-24">
          <div className="space-y-3">
            <span className="font-['Courier_New'] text-[8px] tracking-widest text-[#8B7355] uppercase block">
              {String(chapterIndex + 1).padStart(2, '0')} · {String(BRIEFING_ARQINT.capítulos.length).padStart(2, '0')}
            </span>
            <h1 className="font-['Georgia'] italic text-2xl md:text-3xl leading-tight text-[#3A3A3A]">
              {chapter.titulo}
            </h1>
          </div>

          {chapter.blocos.map((bloco) => (
            <div key={bloco.id} className="space-y-10">
              <div className="space-y-2">
                <h3 className="font-['Georgia'] italic text-[22px] text-[#3A3A3A]">{bloco.titulo}</h3>
                <div className="h-[1px] w-12 bg-[#8B7355]/40" />
              </div>

              <div className="grid gap-10">
                {bloco.perguntas.map((p, idx) => (
                  <div key={p.id} className={cn("space-y-3", idx !== bloco.perguntas.length - 1 && "border-b border-[#D1D1D1] pb-10")}>
                    <div className="space-y-1">
                      <label className="font-['Georgia'] italic text-base text-[#3A3A3A] block">
                        {p.label}
                        {p.id === 'nome' && projeto?.nome_cliente && (
                          <span className="ml-3 lowercase italic text-[#8B7355] font-normal text-xs">(Confirmamos: {projeto.nome_cliente})</span>
                        )}
                      </label>
                      {(p as any).orientacao && (
                        <p className="font-['Arial'] text-[10px] text-[#777777]">{(p as any).orientacao}</p>
                      )}
                    </div>

                    {p.tipo === 'text' && (
                      <Input
                        value={answers[p.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [p.id]: e.target.value })}
                        className="bg-white border border-[#D1D1D1] rounded-none p-3 h-auto focus-visible:ring-0 focus-visible:border-[#8B7355] focus:border-[#8B7355] text-[#3A3A3A] font-['Arial'] text-sm placeholder:text-[#3A3A3A]/30"
                        placeholder="Digite aqui..."
                      />
                    )}

                    {p.tipo === 'textarea' && (
                      <Textarea
                        value={answers[p.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [p.id]: e.target.value })}
                        className="bg-white border border-[#D1D1D1] rounded-none p-3 min-h-[120px] focus-visible:ring-0 focus-visible:border-[#8B7355] focus:border-[#8B7355] text-[#3A3A3A] font-['Arial'] text-sm resize-none leading-relaxed placeholder:text-[#3A3A3A]/30"
                        placeholder={p.placeholder || "Sua resposta..."}
                      />
                    )}

                    {p.tipo === 'select' && (
                      <div className="flex flex-wrap gap-3">
                        {p.opcoes?.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setAnswers({ ...answers, [p.id]: opt })}
                            className={cn(
                              "px-5 py-3 border font-['Arial'] text-[10px] uppercase tracking-widest transition-colors",
                              answers[p.id] === opt
                                ? "border-[#8B7355] text-[#3A3A3A] bg-white"
                                : "border-[#D1D1D1] text-[#3A3A3A]/60 hover:border-[#8B7355]"
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {p.tipo === 'multiselect' && (
                      <div className="flex flex-wrap gap-3">
                        {p.opcoes?.map(opt => {
                          const isSelected = (answers[p.id] || []).includes(opt);
                          return (
                            <button
                              key={opt}
                              onClick={() => {
                                const current = answers[p.id] || [];
                                const next = isSelected ? current.filter((i: string) => i !== opt) : [...current, opt];
                                setAnswers({ ...answers, [p.id]: next });
                              }}
                              className={cn(
                                "px-5 py-2 border rounded-full font-['Arial'] text-[10px] uppercase tracking-widest transition-colors",
                                isSelected
                                  ? "border-[#8B7355] bg-[#8B7355]/5 text-[#3A3A3A]"
                                  : "border-[#D1D1D1] text-[#3A3A3A]/60 hover:border-[#8B7355]"
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

          <div className="flex items-center gap-10 pt-8">
            <button
              onClick={handleBack}
              className="text-[#777777] hover:text-[#3A3A3A] flex items-center gap-2 font-['Arial'] text-[9px] uppercase tracking-widest transition-colors"
            >
              <ChevronLeft size={14} />
              Voltar
            </button>
            <Button
              onClick={handleNext}
              className="border border-[#3A3A3A] bg-transparent text-[#3A3A3A] hover:bg-[#3A3A3A] hover:text-white rounded-none px-8 py-3 h-auto font-['Arial'] text-[9px] uppercase tracking-widest transition-colors"
            >
              {chapterIndex === BRIEFING_ARQINT.capítulos.length - 1
                ? (isSubmitting ? 'Enviando...' : 'Finalizar Briefing')
                : 'Próximo Capítulo'}
              <ChevronRight size={14} className="ml-2" />
            </Button>
          </div>
        </div>
      </main>

      <footer className="px-8 md:px-16 py-5 border-t border-[#D1D1D1] flex justify-between font-['Arial'] text-[8px] text-[#777777]">
        <p>NL ARQUITETOS · 2026</p>
        <p className="hidden md:block">A ARQUITETURA COMO DECISÃO.</p>
      </footer>
    </div>
  );
};

export default BriefingCompleto;
