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

// Flatten todas as perguntas em uma lista linear
const todasPerguntas = BRIEFING_ARQINT.capítulos.flatMap(cap =>
  cap.blocos.flatMap(bloco =>
    bloco.perguntas.map(p => ({
      ...p,
      capTitulo: cap.titulo,
      capId: cap.id,
      blocoTitulo: bloco.titulo,
      blocoId: bloco.id,
    }))
  )
);

const BriefingCompleto = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<any>(null);
  const [started, setStarted] = useState(false);
  const [curIdx, setCurIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [visible, setVisible] = useState(true);
  const [transition, setTransition] = useState<null | { capAnterior: string; capProximo: string }>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [savedIdx, setSavedIdx] = useState(0);

  const total = todasPerguntas.length;

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
            if (parsed.curIdx && parsed.curIdx > 0) {
              setHasSaved(true);
              setSavedIdx(parsed.curIdx);
            }
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

  // Salvar progresso a cada mudança
  useEffect(() => {
    if (token && started) {
      localStorage.setItem(`briefing_progress_${token}`, JSON.stringify({ curIdx, answers }));
    }
  }, [curIdx, answers, token, started]);

  const goToIndex = (nextIdx: number) => {
    if (nextIdx >= total) {
      submitBriefing();
      return;
    }
    const anterior = todasPerguntas[curIdx];
    const proxima = todasPerguntas[nextIdx];
    const mudaCapitulo = nextIdx > curIdx && anterior.capId !== proxima.capId;

    setVisible(false);
    setTimeout(() => {
      setCurIdx(nextIdx);
      if (mudaCapitulo) {
        setTransition({ capAnterior: anterior.capTitulo, capProximo: proxima.capTitulo });
        setTimeout(() => {
          setTransition(null);
          setVisible(true);
        }, 1500);
      } else {
        setVisible(true);
      }
    }, 200);
  };

  const handleNext = () => goToIndex(curIdx + 1);
  const handleBack = () => {
    if (curIdx > 0) goToIndex(curIdx - 1);
  };

  const submitBriefing = async () => {
    setIsSubmitting(true);
    try {
      const respostasOrganizadas = BRIEFING_ARQINT.capítulos.reduce((acc: any, cap) => {
        acc[cap.titulo] = cap.blocos.reduce((bAcc: any, bloco) => {
          bAcc[bloco.titulo] = bloco.perguntas.reduce((pAcc: any, p) => {
            pAcc[p.label] = answers[p.id] ?? null;
            return pAcc;
          }, {});
          return bAcc;
        }, {});
        return acc;
      }, {});

      await supabase.from('briefings_completos').insert({
        projeto_id: projeto?.id || null,
        respostas: respostasOrganizadas
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
  if (!started) return (
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

        {hasSaved ? (
          <div className="space-y-6 pt-8">
            <p className="text-white/40 font-['Georgia'] italic text-base">
              Você tem progresso salvo. Continuar de onde parou?
            </p>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Button
                onClick={() => { setCurIdx(savedIdx); setStarted(true); }}
                className="border border-white/20 text-white/60 hover:text-white hover:border-white/50 bg-transparent px-14 h-16 text-[10px] font-bold tracking-[0.4em] uppercase transition-colors rounded-none"
              >
                Continuar
              </Button>
              <Button
                onClick={() => { setCurIdx(0); setStarted(true); }}
                className="border border-white/10 text-white/30 hover:text-white/60 hover:border-white/30 bg-transparent px-10 h-16 text-[10px] font-bold tracking-[0.4em] uppercase transition-colors rounded-none"
              >
                Começar do início
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-start md:items-center gap-10 pt-8">
            <Button
              onClick={() => { setCurIdx(0); setStarted(true); }}
              className="border border-white/20 text-white/60 hover:text-white hover:border-white/50 bg-transparent px-14 h-16 text-[10px] font-bold tracking-[0.4em] uppercase transition-colors rounded-none"
            >
              Começar Briefing
            </Button>
            <div className="flex items-center gap-4 text-white/20 text-[9px] tracking-[0.3em] uppercase">
              <span className="w-8 h-[1px] bg-white/10" />
              Tempo estimado: 15 minutos
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ---- TELA DE TRANSIÇÃO ENTRE CAPÍTULOS ----
  if (transition) return (
    <div className="min-h-screen bg-[#0e0c09] text-[#E8DFD0] flex items-center justify-center text-center px-16">
      <div>
        <p className="font-['Courier_New'] text-[8px] tracking-[0.4em] text-[#8B7355] uppercase mb-4">
          {transition.capAnterior} · concluído
        </p>
        <p className="font-['Cormorant_Garamond'] text-[28px] font-light italic text-[#E8DFD0] leading-relaxed">
          {transition.capProximo}
        </p>
      </div>
    </div>
  );

  // ---- TELAS DE PERGUNTAS (escuro quente, uma por vez) ----
  const p = todasPerguntas[curIdx];
  const isText = p.tipo === 'text' || p.tipo === 'textarea';
  const blocoNum = String(p.blocoId).replace(/\D/g, '') || String(curIdx + 1);

  return (
    <div className="min-h-screen bg-[#0e0c09] text-[#E8DFD0] flex flex-col">
      {/* Header */}
      <header className="px-8 md:px-16 py-4 flex items-center gap-6 border-b border-white/[0.03]">
        <p className="font-['Courier_New'] text-[10px] tracking-[0.35em] text-[#E8DFD0]/25 uppercase">NL Arquitetos</p>
        <div className="flex-1 h-[1px] bg-white/[0.06]">
          <div
            className="h-[1px] bg-[#8B7355] transition-all duration-500"
            style={{ width: `${((curIdx + 1) / total) * 100}%` }}
          />
        </div>
        <p className="font-['Courier_New'] text-[9px] tracking-[0.2em] text-[#8B7355]/50">
          {String(curIdx + 1).padStart(2, '0')} · {String(total).padStart(2, '0')}
        </p>
      </header>

      {/* Corpo */}
      <main className="flex-1 flex items-center justify-center px-8 md:px-24 py-16">
        <div
          className="w-full max-w-[580px] mx-auto"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease' }}
        >
          <p className="font-['Courier_New'] text-[8px] tracking-[0.4em] text-[#8B7355]/50 uppercase mb-5">
            {p.blocoTitulo} · {blocoNum}
          </p>

          <h1 className="font-['Cormorant_Garamond'] text-[36px] md:text-[42px] font-light italic text-[#E8DFD0] leading-[1.2] mb-3">
            {p.label}
          </h1>

          {(p as any).orientacao && (
            <p className="font-['Arial'] text-[11px] text-[#E8DFD0]/35 leading-relaxed mb-10">
              {(p as any).orientacao}
            </p>
          )}

          {p.tipo === 'text' && (
            <input
              autoFocus
              value={answers[p.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [p.id]: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
              placeholder={p.placeholder || 'Digite aqui...'}
              className="w-full bg-transparent border-0 border-b border-[#E8DFD0]/10 focus:border-[#8B7355] text-[#E8DFD0] font-['Arial'] text-[16px] py-3 placeholder:text-[#E8DFD0]/18 outline-none caret-[#8B7355] transition-colors"
            />
          )}

          {p.tipo === 'textarea' && (
            <textarea
              autoFocus
              rows={3}
              value={answers[p.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [p.id]: e.target.value })}
              placeholder={p.placeholder || 'Sua resposta...'}
              className="w-full bg-transparent border-0 border-b border-[#E8DFD0]/10 focus:border-[#8B7355] text-[#E8DFD0] font-['Arial'] text-[16px] py-3 placeholder:text-[#E8DFD0]/18 outline-none caret-[#8B7355] transition-colors resize-none leading-relaxed"
            />
          )}

          {p.tipo === 'select' && (
            <div className="flex flex-col gap-3">
              {p.opcoes?.map(opt => {
                const selected = answers[p.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setAnswers({ ...answers, [p.id]: opt })}
                    className={cn(
                      "w-full text-left px-5 py-4 border font-['Arial'] text-[12px] transition-all",
                      selected
                        ? "border-[#8B7355] text-[#E8DFD0] bg-[#8B7355]/[0.06]"
                        : "border-[#E8DFD0]/[0.08] text-[#E8DFD0]/40 hover:border-[#8B7355]/30 hover:text-[#E8DFD0]/70"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {p.tipo === 'multiselect' && (
            <div className="flex flex-wrap gap-3">
              {p.opcoes?.map(opt => {
                const selected = (answers[p.id] || []).includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      const current = answers[p.id] || [];
                      const next = selected ? current.filter((i: string) => i !== opt) : [...current, opt];
                      setAnswers({ ...answers, [p.id]: next });
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full border font-['Arial'] text-[11px] transition-all",
                      selected
                        ? "border-[#8B7355] text-[#E8DFD0] bg-[#8B7355]/[0.08]"
                        : "border-[#E8DFD0]/[0.08] text-[#E8DFD0]/35 hover:border-[#8B7355]/30"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {p.tipo === 'rating' && (
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map(n => {
                const selected = answers[p.id] === n;
                return (
                  <button
                    key={n}
                    onClick={() => setAnswers({ ...answers, [p.id]: n })}
                    className={cn(
                      "w-10 h-10 border font-['Courier_New'] text-[12px] transition-all",
                      selected
                        ? "border-[#8B7355] text-[#8B7355] bg-[#8B7355]/[0.06]"
                        : "border-[#E8DFD0]/[0.08] text-[#E8DFD0]/30 hover:border-[#8B7355]/30"
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Navegação inferior */}
      <footer className="px-8 md:px-16 py-5 flex justify-between items-center border-t border-white/[0.03]">
        <button
          onClick={handleBack}
          style={{ visibility: curIdx === 0 ? 'hidden' : 'visible' }}
          className="font-['Courier_New'] text-[9px] tracking-[0.2em] text-[#E8DFD0]/15 uppercase hover:text-[#E8DFD0]/40 transition-colors"
        >
          ← Voltar
        </button>

        <div className="flex items-center gap-8">
          {isText && (
            <span className="font-['Courier_New'] text-[10px] text-[#8B7355]/30 tracking-[0.1em] hidden md:inline">
              pressione Enter ↵
            </span>
          )}
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="px-8 py-3 border border-[#E8DFD0]/15 text-[#E8DFD0] font-['Courier_New'] text-[9px] tracking-[0.25em] uppercase hover:border-[#8B7355] hover:text-[#8B7355] transition-all disabled:opacity-40"
          >
            {curIdx === total - 1
              ? (isSubmitting ? 'enviando...' : 'enviar briefing →')
              : 'continuar →'}
          </button>
        </div>
      </footer>
    </div>
  );
};


export default BriefingCompleto;
