import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, Copy, Bot, FileText, Check, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Lead {
  id: string;
  nome: string;
  tipo: string;
  cidade: string;
  stage: string;
  area?: number | null;
  origem?: string | null;
}

const ScriptsAtendimento = () => {
  const location = useLocation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [leadAtivo, setLeadAtivo] = useState<Lead | null>(null);
  const [mensagemCliente, setMensagemCliente] = useState('');
  const [mensagemDetector, setMensagemDetector] = useState('');
  const [descricaoObjecao, setDescricaoObjecao] = useState('');
  const [etapaAtualObjecao, setEtapaAtualObjecao] = useState('');
  const [sugestaoIA, setSugestaoIA] = useState<{ resposta: string; tom: string; proximo_passo: string } | null>(null);
  const [resultadoDetector, setResultadoDetector] = useState<{
    etapa_numero: number;
    etapa_nome: string;
    confianca: string;
    motivo: string;
    script_recomendado: string;
  } | null>(null);
  const [resultadoObjecao, setResultadoObjecao] = useState<{
    script: string;
    estrategia: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isGeneratingObjecao, setIsGeneratingObjecao] = useState(false);
  const [selectedEtapaId, setSelectedEtapaId] = useState<string | null>(null);
  const [modalAdaptarAberto, setModalAdaptarAberto] = useState(false);
  const [scriptParaAdaptar, setScriptParaAdaptar] = useState<{ situacao: string; texto: string } | null>(null);
  const [perfilCliente, setPerfilCliente] = useState<string>('');
  const [obsCliente, setObsCliente] = useState('');
  const [isAdaptando, setIsAdaptando] = useState(false);
  const [resultadoAdaptacao, setResultadoAdaptacao] = useState<{ script_adaptado: string; o_que_mudou: string } | null>(null);

  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase.from('leads').select('id, nome, tipo, city, stage, area, origem');
      if (data) {
        const mappedLeads = data.map((l: any) => ({
          ...l,
          cidade: l.city // Mapeia city para cidade se necessário
        }));
        setLeads(mappedLeads);
      }
    };
    fetchLeads();
  }, []);

  const handleLeadChange = (id: string) => {
    setSelectedLeadId(id);
    setLeadAtivo(leads.find(l => l.id === id) || null);
  };

  useEffect(() => {
    if (location.state?.leadId && leads.length > 0) {
      handleLeadChange(location.state.leadId);
    }
  }, [location.state, leads]);

  const cleanJSON = (text: string) => {
    return text
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();
  };

  const parseAIResponse = (data: any) => {
    if (data.choices?.[0]?.message?.content) {
      return JSON.parse(cleanJSON(data.choices[0].message.content));
    } else if (typeof data === 'string') {
      return JSON.parse(cleanJSON(data));
    }
    return data;
  };

  const gerarSugestao = async () => {
    if (mensagemCliente.trim().length === 0) return;
    setIsGenerating(true);
    toast.info("Consultando IA...");
    
    const systemPrompt = "Você é o assistente de atendimento da NL Arquitetos. Sugira uma resposta para a mensagem do cliente abaixo. TOM OBRIGATÓRIO: profissional, condutor, centrado no cliente. Nunca informal, nunca ansioso, nunca com urgência artificial.";
    const prompt = `${leadAtivo ? `CONTEXTO DO LEAD:
    - Nome: ${leadAtivo.nome}
    - Tipo de Projeto: ${leadAtivo.tipo}
    - Cidade: ${leadAtivo.cidade}
    - Etapa Atual: ${leadAtivo.stage}` : 'CONTEXTO: Gerar uma resposta genérica no tom NL, pois não há um lead específico selecionado.'}
    
    MENSAGEM DO CLIENTE: ${mensagemCliente}
    
    Retorne APENAS JSON: {"resposta": "...", "tom": "...", "proximo_passo": "..."}`;

    console.log("Assistente - System Prompt:", systemPrompt);
    console.log("Assistente - Prompt:", prompt);

    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          systemPrompt,
          prompt,
          model: 'claude-sonnet-4-20250514'
        }
      });
      
      if (error) {
        console.error("Erro invoke ai-advisor (Assistente):", error);
        throw new Error(error.message || JSON.stringify(error));
      }
      
      console.log("Resposta bruta da Edge Function (Assistente):", data);
      const result = parseAIResponse(data);
      setSugestaoIA(result);
    } catch (e: any) {
      console.error("Erro completo (Assistente):", e);
      toast.error(`Erro ao gerar sugestão: ${e.message || "Verifique o console"}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const identificarEtapa = async () => {
    if (mensagemDetector.trim().length === 0) return;
    setIsDetecting(true);
    toast.info("Identificando momento...");
    
    const systemPrompt = "Você é o assistente comercial da NL Arquitetos. Analise a mensagem do cliente abaixo e identifique em qual etapa da jornada ele está.";
    const prompt = `AS 11 ETAPAS DA JORNADA NL:
01 - PRIMEIRO CONTATO: lead acabou de entrar em contato, ainda não foi qualificado
02 - PRÉ-BRIEFING RECEBIDO: cliente preencheu o formulário, aguarda agendamento
03 - REUNIÃO AGENDADA: reunião marcada, aguarda confirmação ou lembrete
04 - APÓS A REUNIÃO: reunião aconteceu, proposta ainda não enviada
05 - PROPOSTA ENVIADA: proposta enviada, aguarda resposta
06 - NEGOCIAÇÃO: cliente está negociando escopo, valor ou condições
07 - FECHAMENTO: cliente confirmou que quer fechar
08 - INÍCIO DO PROJETO: contrato assinado, projeto iniciando
09 - DESENVOLVIMENTO: projeto em andamento, apresentação de fases
10 - ENTREGA FINAL: projeto concluído, entrega do material
11 - PÓS-PROJETO: projeto entregue, fase de depoimento e indicação

LEAD: ${leadAtivo ? `${leadAtivo.nome} · ${leadAtivo.tipo} · ${leadAtivo.cidade}` : 'Contexto genérico (sem lead selecionado)'}

MENSAGEM DO CLIENTE:
${mensagemDetector}

Analise a mensagem e retorne APENAS JSON válido:
{
  "etapa_numero": 1,
  "etapa_nome": "PRIMEIRO CONTATO",
  "confianca": "ALTA | MÉDIA | BAIXA",
  "motivo": "explicação em 1-2 lines do porquê desta etapa",
  "script_recomendado": "nome exato do script mais adequado para usar agora"
}`;

    console.log("Detector - System Prompt:", systemPrompt);
    console.log("Detector - Prompt:", prompt);

    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          systemPrompt,
          prompt,
          model: 'claude-sonnet-4-20250514'
        }
      });

      if (error) {
        console.error("Erro invoke ai-advisor (Detector):", error);
        throw new Error(error.message || JSON.stringify(error));
      }

      console.log("Resposta bruta da Edge Function (Detector):", data);
      const result = parseAIResponse(data);
      setResultadoDetector(result);
    } catch (e: any) {
      console.error("Erro completo (Detector):", e);
      toast.error(`Erro ao identificar etapa: ${e.message || "Verifique o console"}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const gerarScriptObjecao = async () => {
    if (descricaoObjecao.trim().length === 0) return;
    setIsGeneratingObjecao(true);
    toast.info("Gerando script...");

    const systemPrompt = "Você é o assistente comercial da NL Arquitetos. Gere um script de resposta para a objeção ou situação abaixo. Tom: profissional, condutor, sem pressão de venda. Nunca confrontar o cliente — redirecionar com método.";
    const prompt = `CONTEXTO DA NL:
- Tom: profissional, condutor, sem pressão de venda
- Nunca confrontar o cliente — redirecionar com método
- Sempre centrado no problema do cliente, não na defesa da NL
- Sem "casa dos sonhos", "lindo", "incrível", urgência artificial
- Resposta curta quando possível, completa quando necessário
- Sempre com próximo passo claro

PALAVRAS PROIBIDAS: "casa dos sonhos", "projeto dos sonhos", "obra sem dor de cabeça garantida", "luxo acessível", "rapidinho", "baratinho", "pode confiar a gente resolve", "obra sempre tem imprevisto faz parte"

LEAD: ${leadAtivo ? `${leadAtivo.nome} · ${leadAtivo.tipo} · ${leadAtivo.cidade}` : 'Contexto genérico (sem lead selecionado)'}
ETAPA ATUAL: ${etapaAtualObjecao || 'Não especificada'}

OBJEÇÃO / SITUAÇÃO:
${descricaoObjecao}

Gere uma resposta no tom NL para essa situação específica. ${!leadAtivo ? 'Como não há lead selecionado, gere um script genérico que possa ser adaptado.' : `Personalize a resposta para o lead ${leadAtivo.nome} e o tipo de projeto ${leadAtivo.tipo}.`}

Retorne APENAS JSON válido:
{
  "script": "texto completo da resposta pronta para enviar",
  "estrategia": "explicação em 1 linha do que foi feito — ex: Reconheceu o ponto e redirecionou para o valor do projeto executivo"
}`;

    console.log("Objeção - System Prompt:", systemPrompt);
    console.log("Objeção - Prompt:", prompt);

    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          systemPrompt,
          prompt,
          model: 'claude-sonnet-4-20250514'
        }
      });

      if (error) {
        console.error("Erro invoke ai-advisor (Objeção):", error);
        throw new Error(error.message || JSON.stringify(error));
      }

      console.log("Resposta bruta da Edge Function (Objeção):", data);
      const result = parseAIResponse(data);
      setResultadoObjecao(result);
    } catch (e: any) {
      console.error("Erro completo (Objeção):", e);
      toast.error(`Erro ao gerar script: ${e.message || "Verifique o console"}`);
    } finally {
      setIsGeneratingObjecao(false);
    }
  };

  const adaptarTom = async () => {
    if (!scriptParaAdaptar || !perfilCliente) return;
    setIsAdaptando(true);
    setResultadoAdaptacao(null);
    toast.info("Adaptando tom...");

    const systemPrompt = "Você é o assistente comercial da NL Arquitetos. Adapte o script abaixo para o perfil específico deste cliente, mantendo o tom NL — técnico, condutor, sem pressão — mas ajustando a ênfase para o perfil.";
    const prompt = `PERFIL DO CLIENTE: ${perfilCliente}

Instruções por perfil:
- TÉCNICO: ser mais direto, usar dados e lógica, menos contexto emocional
- EMOCIONAL: adicionar uma frase de conexão no início, mostrar que entende a situação antes de conduzir
- DESCONFIADO: reforçar transparência e método, mostrar o processo passo a passo, evitar qualquer promessa vaga
- INDECISO: simplificar o próximo passo, deixar a ação muito clara, reduzir opções

OBSERVAÇÃO SOBRE O CLIENTE: ${obsCliente || 'Nenhuma observação adicional.'}

LEAD: ${leadAtivo ? `${leadAtivo.nome} · ${leadAtivo.tipo}` : 'Contexto genérico (sem lead selecionado)'}

SCRIPT ORIGINAL:
${scriptParaAdaptar.texto}

Adapte o script mantendo o tom NL. Não mude o conteúdo — mude a ênfase e a abordagem.

Retorne APENAS JSON válido:
{
  "script_adaptado": "texto completo do script adaptado",
  "o_que_mudou": "explicação em 1 linha do que foi ajustado"
}`;

    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          systemPrompt,
          prompt,
          model: 'claude-sonnet-4-20250514'
        }
      });

      if (error) throw error;
      const result = parseAIResponse(data);
      setResultadoAdaptacao(result);
    } catch (e: any) {
      console.error("Erro adaptar tom:", e);
      toast.error(`Erro ao adaptar tom: ${e.message || "Verifique o console"}`);
    } finally {
      setIsAdaptando(false);
    }
  };

  const abrirModalAdaptar = (situacao: string, texto: string) => {
    setScriptParaAdaptar({ situacao, texto: replaceVariables(texto) });
    setPerfilCliente('');
    setObsCliente('');
    setResultadoAdaptacao(null);
    setModalAdaptarAberto(true);
  };

  const replaceVariables = (text: string) => {
    if (!leadAtivo) return text;
    return text
      .replace(/\[Nome\]/g, leadAtivo.nome || '[Nome]')
      .replace(/\[Cidade\]/g, leadAtivo.cidade || '[Cidade]')
      .replace(/\[Tipo\]/g, leadAtivo.tipo || '[Tipo]')
      .replace(/\[Área\]/g, leadAtivo.area ? String(leadAtivo.area) : '[Área]');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const scriptsContent = [
    {
      id: "01",
      titulo: "PRIMEIRO CONTATO",
      objetivo: "Qualificar o lead em 2 perguntas e mover para o pré-briefing.",
      scripts: [
        { situacao: "RESPOSTA PADRÃO", texto: "Olá, [Nome]. Tudo bem? Sou [Leandro / Neandro], arquiteto da NL Arquitetos. Obrigado pelo contato. Para entender se podemos ajudar e como, preciso de duas informações rápidas: — Qual tipo de projeto você está pensando? (residencial, interiores ou comercial) — Em qual cidade o imóvel ou terreno está localizado?" },
        { situacao: "ABERTURA PARA INDICADO", texto: "Olá, [Nome]. Tudo bem? Sou [Leandro / Neandro], arquiteto da NL Arquitetos. [Nome de quem indicou] me comentou sobre você — fico feliz com a indicação. Para entender seu projeto e ver como podemos ajudar, me conta rapidamente: — Qual tipo de projeto você está pensando? — Em qual cidade fica o imóvel ou terreno?" },
        { situacao: "ENVIO DO PRÉ-BRIEFING", texto: "Perfeito, obrigado pelas informações. O primeiro passo aqui na NL Arquitetos é um pré-briefing — um formulário rápido que leva cerca de 8 minutos. Ele nos permite entender melhor o seu projeto antes da reunião, para que nossa conversa seja direta e focada no que realmente importa para você. Segue o link: [LINK DO PRÉ-BRIEFING] Assim que receber suas respostas, analiso pessoalmente e entro em contato para agendarmos a próxima etapa. Leandro Henrique · Arquiteto · Co-fundador · NL Arquitetos" },
        { situacao: "ESPECIAL — CLIENTE QUER PREÇO", texto: "Olá, [Nome]. Entendo a pergunta — e vou ser direto com você. O investimento em projeto depende do escopo: área, tipo de intervenção, nível de detalhamento e fases contratadas. Sem essas informações, qualquer número que eu desse seria impreciso. O caminho mais rápido para chegar a um valor real é o nosso pré-briefing — 8 minutos, e com as respostas já consigo montar uma proposta precisa para o seu caso. Faz sentido para você?", especial: true },
        { situacao: "ESPECIAL — NÃO QUER PREENCHER", texto: "Sem problema. O formulário é um atalho — ele existe para que nossa reunião seja objetiva e eu chegue preparado para o seu projeto específico. Se preferir, podemos fazer um diagnóstico rápido por aqui mesmo. Me conta: — Qual tipo de projeto? — Está em qual etapa hoje? — Qual a área estimada? — Já viveu uma obra antes? — Faixa de investimento prevista para a obra", especial: true },
        { situacao: "ESPECIAL — SUMIU 24H", texto: "Olá, [Nome]. Tudo bem? Passando para verificar se conseguiu acessar o pré-briefing que enviei. É rápido — 8 minutos — e garante que nossa conversa seja direcionada ao que importa para o seu projeto. [LINK DO PRÉ-BRIEFING] Qualquer dificuldade com o link, me avisa.", especial: true },
        { situacao: "ESPECIAL — SUMIU 72H", texto: "Olá, [Nome]. Tudo bem? Como não tivemos retorno, imagino que talvez não seja o momento ideal para avançar. Sem problema — quando fizer sentido, estamos aqui. [LINK DO PRÉ-BRIEFING] fica disponível quando quiser retomar.", especial: true }
      ]
    },
    {
      id: "02",
      titulo: "PRÉ-BRIEFING RECEBIDO",
      objetivo: "Confirmar que leu as respostas e agendar a reunião.",
      scripts: [
        { situacao: "LINHA A — RESIDENCIAL", texto: "Olá, [Nome]. Tudo bem? Recebi e analisei seu pré-briefing. Entendi o contexto do projeto — [TIPO DE INTERVENÇÃO] em [Cidade], com área estimada de [Área] m². O próximo passo é a Reunião de Apresentação — onde explico como conduzimos o projeto, o que você pode esperar em cada fase e como estruturamos a proposta. A reunião dura cerca de 40 minutos. Pode ser online ou presencial. Qual período funciona melhor para você nos próximos dias? Leandro Henrique · Arquiteto · Co-fundador · NL Arquitetos" },
        { situacao: "LINHA B — INTERIORES", texto: "Olá, [Nome]. Tudo bem? Recebi e analisei seu pré-briefing. Entendi o que você está buscando para [AMBIENTES] em [Cidade]. O próximo passo é a Reunião de Apresentação — onde mostro como desenvolvemos cada fase do projeto de interiores, como apresentamos os materiais para aprovação e o que você pode esperar em cada entrega. A reunião dura cerca de 30 a 40 minutos. Pode ser online ou presencial. Qual período funciona melhor para você nos próximos dias?" },
        { situacao: "LINHA A+B — ARQ+INT", texto: "Olá, [Nome]. Tudo bem? Recebi e analisei seu pré-briefing. Você optou pelo projeto completo — arquitetura e interiores integrados — em [Cidade], com área estimada de [Área] m². É a escolha mais eficiente: decisões de arquitetura e interiores tomadas juntas eliminam incompatibilidades que normalmente só aparecem na obra. O próximo passo é a Reunião de Apresentação, onde explico o método completo e como estruturamos propostas para projetos integrados. A reunião dura cerca de 40 a 50 minutos." },
        { situacao: "LINHA C — COMERCIAL", texto: "Olá, [Nome]. Tudo bem? Recebi e analisei seu pré-briefing. Entendi o contexto — [TIPO DE NEGÓCIO] em [Cidade], com área estimada de [Área] m². O próximo passo é a Reunião de Apresentação — onde explico como desenvolvemos projetos comerciais, o que está incluído no escopo e como garantimos que a execução seja fiel ao projeto aprovado. A reunião dura cerca de 40 minutos." },
        { situacao: "CONFIRMAÇÃO DE FORMATO", texto: "Perfeito. Você prefere que a reunião aconteça online ou presencialmente?" },
        { situacao: "ESPECIAL — SEM RESPOSTA 48H", texto: "Olá, [Nome]. Tudo bem? Retomando nossa conversa sobre o projeto. Estou organizando a agenda para a próxima semana. Tenho disponibilidade: — [Dia] às [Horário] — [Dia] às [Horário] Se nenhum desses funcionar, me diz um período que seja melhor para você.", especial: true }
      ]
    },
    {
      id: "03",
      titulo: "REUNIÃO AGENDADA",
      objetivo: "Confirmar a reunião e gerar segurança no cliente.",
      scripts: [
        { situacao: "CONFIRMAÇÃO IMEDIATA", texto: "Perfeito, [Nome]. Reunião confirmada: — Data: [DATA] — Horário: [HORÁRIO] — Formato: [Online / Presencial] Nessa conversa apresento como conduzimos o projeto, o que você pode esperar em cada fase e como estruturo a proposta para o seu caso. Se tiver alguma referência, foto do imóvel ou informação adicional que queira compartilhar antes, fique à vontade para enviar por aqui. Leandro Henrique · Arquiteto · Co-fundador · NL Arquitetos" },
        { situacao: "LEMBRETE 24H", texto: "Olá, [Nome]. Tudo bem? Confirmando nossa reunião de amanhã. — Data: [DATA] — Horário: [HORÁRIO] — Formato: [Online / Presencial] Leandro Henrique · Arquiteto · Co-fundador · NL Arquitetos" },
        { situacao: "LEMBRETE 2H", texto: "Olá, [Nome]. Nossa reunião está confirmada para daqui a pouco. — Horário: [HORÁRIO] → Se online: [LINK DA VIDEOCHAMADA] Nos falamos em breve." }
      ]
    },
    {
      id: "04",
      titulo: "APÓS A REUNIÃO",
      objetivo: "Formalizar o que foi discutido e alinhar prazos.",
      scripts: [
        { situacao: "FOLLOW-UP PÓS-REUNIÃO", texto: "Olá, [Nome]. Registrei o que conversamos. O projeto envolve: — [Tipo de projeto] — Área aproximada de [Área] m² — Imóvel em [Cidade] — [Ponto específico da reunião] Vou estruturar a proposta com base nesses pontos e envio até [DATA]. Se quiser acrescentar alguma informação antes disso, me manda até [DATA - 1 dia]. Leandro Henrique · Arquiteto · Co-fundador · NL Arquitetos" }
      ]
    },
    {
      id: "05",
      titulo: "PROPOSTA ENVIADA",
      objetivo: "Envio da proposta e acompanhamento inicial.",
      scripts: [
        { situacao: "ENVIO FORMAL", texto: "Olá, [Nome]. Tudo bem? Segue a proposta completa para o desenvolvimento do seu projeto, considerando tudo que conversamos na reunião. No documento você encontra: — Escopo do projeto — Etapas de desenvolvimento — Entregáveis por fase — Investimento e condições [LINK DA PROPOSTA] Analise com calma. Se quiser conversar sobre algum ponto antes de decidir, fico à disposição. Leandro Henrique · Arquiteto · Co-fundador · NL Arquitetos" },
        { situacao: "FOLLOW-UP 3 DIAS", texto: "Olá, [Nome]. Tudo bem? Passando para saber se conseguiu analisar a proposta. Qualquer dúvida sobre o escopo, as etapas ou o investimento, estou disponível para conversar." }
      ]
    },
    {
      id: "06",
      titulo: "NEGOCIAÇÃO",
      objetivo: "Tratamento de objeções e ajustes de escopo.",
      scripts: [
        { situacao: "CLIENTE ANALISANDO", texto: "Sem pressa. Analise com calma. Se quiser conversar sobre qualquer ponto da proposta antes de decidir, é só chamar." },
        { situacao: "AJUSTE DE ESCOPO", texto: "Claro, podemos avaliar. A proposta foi estruturada com base no que conversamos na reunião. Se alguma etapa não faz sentido para o seu momento, posso reorganizar o escopo para que o projeto avance de forma adequada. Me diz o que está pensando e vejo a melhor forma de ajustar." },
        { situacao: "ESPECIAL — DESCONTO", texto: "Entendo the ponto. O investimento foi calculado considerando todas as fases necessárias para que o projeto chegue à execução sem improviso. Cortar etapas significa abrir mão de controle — e isso costuma custar mais na obra do que no projeto. Se for necessário ajustar, posso avaliar com você uma forma de reorganizar as fases sem comprometer o que é essencial.", especial: true },
        { situacao: "ESPECIAL — COMPARA COM OUTRO ARQ", texto: "É natural comparar antes de decidir. O mais importante nessa análise não é o valor — é o que está incluído. Verifique: o outro profissional entrega projeto executivo completo? Faz compatibilização entre arquitetura e instalações? Especifica materiais e cotas para a equipe de obra? Essas respostas definem se você está comparando propostas equivalentes ou não.", especial: true },
        { situacao: "ESPECIAL — CÔNJUGE/SÓCIO", texto: "Faz todo sentido alinhar com todos os envolvidos. Se quiser, posso fazer uma conversa rápida com vocês juntos — 20 minutos — para explicar o processo e esclarecer qualquer dúvida antes de avançarem.", especial: true },
        { situacao: "ESPECIAL — SEM RESPOSTA 5 DIAS", texto: "Olá, [Nome]. Tudo bem? Retomando nossa conversa sobre o projeto. Se ainda estiver avaliando ou organizando os próximos passos, sem problema — fico à disposição quando quiser conversar.", especial: true },
        { situacao: "ESPECIAL — SEM RESPOSTA 10 DIAS", texto: "Olá, [Nome]. Tudo bem? Como não tivemos retorno sobre a proposta, imagino que talvez não seja o momento certo para avançar. Sem problema. A porta fica aberta — quando fizer sentido retomar, estamos aqui.", especial: true }
      ]
    },
    {
      id: "07",
      titulo: "FECHAMENTO",
      objetivo: "Formalização do contrato e início dos trabalhos.",
      scripts: [
        { situacao: "CONFIRMAÇÃO", texto: "Ótimo. Vamos começar da forma certa. O próximo passo é o contrato. Vou preparar e enviar para você ainda hoje. Leandro Henrique · Arquiteto · Co-fundador · NL Arquitetos" },
        { situacao: "ENVIO DO CONTRATO", texto: "Olá, [Nome]. Tudo bem? Segue o contrato de prestação de serviços referente ao desenvolvimento do seu projeto. O documento descreve: — Escopo do projeto — Etapas e entregáveis — Investimento e forma de pagamento — Prazos e responsabilidades Leia com calma. Se estiver tudo de acordo, podemos seguir com a assinatura. Qualquer dúvida sobre o documento, estou à disposição." },
        { situacao: "INÍCIO OFICIAL", texto: "Olá, [Nome]. Tudo bem? Contrato formalizado e pagamento confirmado. Iniciamos oficialmente. Nos próximos dias começo a primeira fase — estudo inicial e organização das diretrizes do projeto. Manterei você informado sobre cada avanço e compartilharei as etapas para validação conforme avançarmos." }
      ]
    },
    {
      id: "08",
      titulo: "INÍCIO DO PROJETO",
      objetivo: "Coleta de materiais e apresentação da metodologia.",
      scripts: [
        { situacao: "SOLICITAÇÃO DE MATERIAIS", texto: "Olá, [Nome]. Tudo bem? Para iniciarmos com clareza, preciso de alguns materiais: — Fotos ou plantas do terreno / imóvel (se tiver) — Documentação do imóvel ou lote — Referências de projetos que você gostou — Qualquer material adicional que considere relevante Pode enviar por aqui mesmo. O que não tiver, sem problema — avançamos com o que estiver disponível." },
        { situacao: "APRESENTAÇÃO DO MÉTODO", texto: "Durante o desenvolvimento do projeto seguimos estas fases principais: 1. Diagnóstico e diretrizes 2. Estudo preliminar — conceito e implantação 3. Anteprojeto — solução arquitetônica consolidada 4. Projeto executivo — caderno técnico para obra Em cada fase compartilho o material para validarmos juntos antes de avançar. Nenhuma etapa é executada sem sua aprovação." }
      ]
    },
    {
      id: "09",
      titulo: "DESENVOLVIMENTO",
      objetivo: "Apresentação de fases e coleta de feedbacks.",
      scripts: [
        { situacao: "CONVITE REUNIÃO DE FASE", texto: "Olá, [Nome]. Tudo bem? Finalizei a [NOME DA FASE] do seu projeto e o material está pronto para apresentação. Prefiro apresentar pessoalmente — assim consigo explicar as decisões tomadas e já alinharmos ajustes se necessário. Qual período funciona melhor para você nos próximos dias?" },
        { situacao: "APROVAÇÃO REGISTRADA", texto: "Ótimo, [Nome]. Aprovação registrada. Sigo para a próxima fase. Assim que o material estiver desenvolvido, entro em contato para a próxima apresentação." },
        { situacao: "AJUSTES SOLICITADOS", texto: "Anotado, [Nome]. Vou trabalhar nos ajustes que alinhamos. Assim que o material estiver atualizado, apresento novamente para validarmos antes de avançar." },
        { situacao: "CLIENTE PRECISA DE TEMPO", texto: "[Nome], sem pressa. Analise com calma. Sugiro que nos falemos até [DATA] para alinharmos os próximos passos." }
      ]
    },
    {
      id: "10",
      titulo: "ENTREGA FINAL",
      objetivo: "Apresentação do material final e orientações pós-projeto.",
      scripts: [
        { situacao: "AGENDAMENTO DA ENTREGA", texto: "Olá, [Nome]. Tudo bem? O projeto está concluído. Todo o material final está organizado e pronto para entrega. Prefiro apresentar pessoalmente — para explicar cada prancha, as especificações e orientar sobre os próximos passos para a obra. Qual período funciona melhor para você?" },
        { situacao: "ENTREGA FINALIZADA", texto: "Olá, [Nome]. Foi um prazer conduzir esse projeto. Segue o material completo para você utilizar nas próximas etapas. [LINK / PASTA DOS ARQUIVOS] Uma orientação importante: sempre que o profissional responsável pela execução tiver dúvida sobre algum detalhe do projeto, o caminho correto é consultar o material técnico ou entrar em contato comigo diretamente." }
      ]
    },
    {
      id: "11",
      titulo: "PÓS-PROJETO",
      objetivo: "Suporte, avaliações e indicações.",
      scripts: [
        { situacao: "ACOMPANHAMENTO 3 DIAS", texto: "Olá, [Nome]. Tudo bem? Passando para saber se está tudo certo com o material entregue e se surgiu alguma dúvida ao analisar as pranchas. Se o profissional responsável pela execução tiver qualquer questão sobre o projeto, pode me chamar diretamente." },
        { situacao: "PEDIDO DE AVALIAÇÃO 7 DIAS", texto: "Olá, [Nome]. Tudo bem? Se puder compartilhar sua experiência com o processo — uma avaliação rápida no Google ajuda muito outras pessoas que estão no mesmo momento de planejamento que você estava. [LINK DO GOOGLE] Leva menos de 2 minutos." },
        { situacao: "DEPOIMENTO E INDICAÇÃO 14 DIAS", texto: "Olá, [Nome]. Tudo bem? Se em algum momento alguém próximo a você estiver planejando construir, reformar ou projetar um espaço, fico feliz em ajudar. E se quiser registrar sua experiência com o projeto em formato de depoimento — escrito, áudio ou vídeo — posso te guiar nisso." }
      ]
    }
  ];

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white font-sans">
      <Sidebar user="Sócio" />
      <div className="ml-[230px] flex-1 min-h-screen p-8 grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-8">
        {/* COLUNA ESQUERDA */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40 block">LEAD ATIVO</label>
            <Select onValueChange={handleLeadChange} value={selectedLeadId}>
              <SelectTrigger className="bg-[#141414] border-white/5 text-white h-11">
                <SelectValue placeholder="Selecione um lead..." />
              </SelectTrigger>
              <SelectContent className="bg-[#141414] border-white/10 text-white">
                {leads.map(l => (
                  <SelectItem key={l.id} value={l.id} className="focus:bg-bronze/20 focus:text-white">
                    <span className="font-bold">{l.nome}</span> · <span className="text-white/60">{l.tipo}</span> · <span className="text-white/40 text-[10px] uppercase">{l.stage}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {leadAtivo && (
            <div className="bg-[#141414] p-5 border border-white/5 space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-bronze" />
              <p className="font-bold text-lg">{leadAtivo.nome}</p>
              <p className="text-bronze text-sm font-medium">{leadAtivo.tipo}</p>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[9px] text-white/40 uppercase tracking-widest">{leadAtivo.cidade}</span>
                <span className="text-[9px] text-white/40 uppercase tracking-widest">·</span>
                <span className="text-[9px] text-white/40 uppercase tracking-widest">{leadAtivo.area ? `${leadAtivo.area}m²` : 'Área não inf.'}</span>
                <span className="text-[9px] text-white/40 uppercase tracking-widest">·</span>
                <span className="text-[9px] text-white/40 uppercase tracking-widest">{leadAtivo.origem || 'Origem não inf.'}</span>
              </div>
              <div className="mt-3">
                <span className="text-[9px] bg-bronze/20 text-bronze px-2 py-0.5 font-bold uppercase tracking-wider">{leadAtivo.stage}</span>
              </div>
            </div>
          )}

          {/* BLOCO — DETECTOR DE MOMENTO */}
          <div className={cn(
            "border transition-all duration-300",
            activeAccordion === 'detector' ? "border-bronze bg-[#0F0F0F]" : "border-white/5 bg-[#0F0F0F]"
          )}>
            <button 
              className="w-full px-5 py-4 flex items-center justify-between group cursor-pointer"
              onClick={() => setActiveAccordion(activeAccordion === 'detector' ? null : 'detector')}
            >
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-bronze" />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-bronze">DETECTOR DE MOMENTO · IA</p>
                  <p className="text-[9px] text-white/30 italic">Identifique em qual das 11 etapas o lead está agora</p>
                </div>
              </div>
              <ChevronDown className={cn("text-white/20 transition-transform duration-300 group-hover:text-bronze", activeAccordion === 'detector' && "rotate-180 text-bronze")} size={16} />
            </button>

            {activeAccordion === 'detector' && (
              <div className="px-5 pb-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <Textarea 
                  className="bg-[#0F0F0F] border-white/5 text-white min-h-[100px] focus-visible:ring-bronze text-xs" 
                  placeholder="Cole aqui a última mensagem recebida do cliente..."
                  value={mensagemDetector}
                  onChange={(e) => setMensagemDetector(e.target.value)}
                />
                <Button 
                  className="w-full bg-bronze text-white hover:bg-bronze/90 h-11 font-bold text-xs tracking-widest" 
                  onClick={identificarEtapa}
                  disabled={isDetecting || mensagemDetector.trim().length === 0}
                >
                  {isDetecting ? "IDENTIFICANDO..." : "IDENTIFICAR ETAPA · IA"}
                </Button>

                {resultadoDetector && (
                  <div className="mt-4 p-4 bg-[#0F0F0F] border border-bronze/30 rounded-md space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-bronze text-black">
                      ETAPA {String(resultadoDetector.etapa_numero).padStart(2, '0')} — {resultadoDetector.etapa_nome}
                    </div>
                    
                    <p className="text-xs text-[#CCCCCC] leading-relaxed">
                      {resultadoDetector.motivo}
                    </p>

                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Script Recomendado</p>
                      <p className="text-xs font-semibold text-bronze">{resultadoDetector.script_recomendado}</p>
                    </div>

                    <Button 
                      variant="outline"
                      onClick={() => setSelectedEtapaId(String(resultadoDetector.etapa_numero).padStart(2, '0'))}
                      className="w-full border-bronze/50 text-bronze hover:bg-bronze hover:text-black h-9 text-[10px] font-bold tracking-wider"
                    >
                      IR PARA ESTA ETAPA
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BLOCO — GERADOR DE OBJEÇÃO */}
          <div className={cn(
            "border transition-all duration-300",
            activeAccordion === 'objecao' ? "border-bronze bg-[#0F0F0F]" : "border-white/5 bg-[#0F0F0F]"
          )}>
            <button 
              className="w-full px-5 py-4 flex items-center justify-between group cursor-pointer"
              onClick={() => setActiveAccordion(activeAccordion === 'objecao' ? null : 'objecao')}
            >
              <div className="flex items-center gap-3">
                <Bot size={18} className="text-bronze" />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-bronze">OBJEÇÃO NÃO MAPEADA · IA</p>
                  <p className="text-[9px] text-white/30 italic">A IA gera a resposta certa no tom NL para situações fora do padrão</p>
                </div>
              </div>
              <ChevronDown className={cn("text-white/20 transition-transform duration-300 group-hover:text-bronze", activeAccordion === 'objecao' && "rotate-180 text-bronze")} size={16} />
            </button>

            {activeAccordion === 'objecao' && (
              <div className="px-5 pb-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-widest text-white/40 block">O QUE O CLIENTE DISSE</label>
                    <Textarea 
                      className="bg-[#0F0F0F] border-white/5 text-white min-h-[80px] focus-visible:ring-bronze text-xs" 
                      placeholder="Ex: Cliente disse que vai construir com o cunhado que é engenheiro..."
                      value={descricaoObjecao}
                      onChange={(e) => setDescricaoObjecao(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-widest text-white/40 block">ETAPA ATUAL</label>
                    <Select onValueChange={setEtapaAtualObjecao} value={etapaAtualObjecao}>
                      <SelectTrigger className="bg-[#0F0F0F] border-white/5 text-white h-9 text-xs">
                        <SelectValue placeholder="Selecione a etapa..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-white/10 text-white">
                        {scriptsContent.map((etapa) => (
                          <SelectItem key={etapa.id} value={etapa.titulo} className="focus:bg-bronze/20 focus:text-white text-xs">
                            {etapa.id} - {etapa.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  className="w-full bg-bronze text-white hover:bg-bronze/90 h-11 font-bold text-xs tracking-widest" 
                  onClick={gerarScriptObjecao}
                  disabled={isGeneratingObjecao || descricaoObjecao.trim().length === 0}
                >
                  {isGeneratingObjecao ? "GERANDO..." : "GERAR SCRIPT · IA"}
                </Button>

                {resultadoObjecao && (
                  <div className="mt-4 p-4 bg-[#0F0F0F] border border-bronze/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] px-2 py-0.5 font-bold bg-bronze text-black uppercase tracking-widest font-mono">SCRIPT GERADO · NL</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-white/40 hover:text-white"
                        onClick={() => copyToClipboard(resultadoObjecao.script)}
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                    
                    <p className="text-[13px] text-[#CCCCCC] leading-relaxed whitespace-pre-wrap font-sans">
                      {resultadoObjecao.script}
                    </p>

                    <div className="pt-2 border-t border-white/5 space-y-3">
                      <div>
                        <p className="text-[8px] text-white/40 uppercase tracking-widest mb-0.5">ESTRATÉGIA USADA</p>
                        <p className="text-[10px] text-white/60 italic leading-tight">{resultadoObjecao.estrategia}</p>
                      </div>
                      
                      <Button 
                        onClick={() => copyToClipboard(resultadoObjecao.script)}
                        className="w-full bg-bronze/10 text-bronze hover:bg-bronze hover:text-black border border-bronze/20 h-9 text-[10px] font-bold tracking-wider"
                      >
                        COPIAR SCRIPT
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BLOCO — ASSISTENTE DE ATENDIMENTO */}
          <div className={cn(
            "border transition-all duration-300",
            activeAccordion === 'assistente' ? "border-bronze bg-[#0F0F0F]" : "border-white/5 bg-[#0F0F0F]"
          )}>
            <button 
              className="w-full px-5 py-4 flex items-center justify-between group cursor-pointer"
              onClick={() => setActiveAccordion(activeAccordion === 'assistente' ? null : 'assistente')}
            >
              <div className="flex items-center gap-3">
                <Bot size={18} className="text-bronze" />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-bronze">ASSISTENTE DE ATENDIMENTO · IA</p>
                  <p className="text-[9px] text-white/30 italic">Cole a mensagem do cliente e receba uma sugestão no tom NL</p>
                </div>
              </div>
              <ChevronDown className={cn("text-white/20 transition-transform duration-300 group-hover:text-bronze", activeAccordion === 'assistente' && "rotate-180 text-bronze")} size={16} />
            </button>

            {activeAccordion === 'assistente' && (
              <div className="px-5 pb-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <Textarea 
                  className="bg-[#0F0F0F] border-white/5 text-white min-h-[120px] focus-visible:ring-bronze text-xs" 
                  placeholder="Cole aqui a mensagem ou pergunta do cliente..."
                  value={mensagemCliente}
                  onChange={(e) => setMensagemCliente(e.target.value)}
                />
                <Button 
                  className="w-full bg-bronze text-white hover:bg-bronze/90 h-11 font-bold text-xs tracking-widest" 
                  onClick={gerarSugestao}
                  disabled={isGenerating || mensagemCliente.trim().length === 0}
                >
                  {isGenerating ? "GERANDO..." : "SUGERIR RESPOSTA · IA"}
                </Button>

                {sugestaoIA && (
                  <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="bg-[#0F0F0F] p-4 border border-bronze/30 space-y-3 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] uppercase tracking-widest font-bold text-bronze font-mono">RESPOSTA SUGERIDA</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-white/40 hover:text-white"
                          onClick={() => copyToClipboard(sugestaoIA.resposta)}
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                      <p className="text-[14px] text-[#CCCCCC] leading-[1.6] whitespace-pre-wrap font-sans">{sugestaoIA.resposta}</p>
                      <div className="pt-2 border-t border-white/5 mt-2">
                        <p className="text-[9px] text-white/40 uppercase mb-1">TOM: <span className="text-white/60 italic">{sugestaoIA.tom}</span></p>
                        <p className="text-[9px] text-white/40 uppercase">PRÓXIMO PASSO: <span className="text-white/60 font-bold">{sugestaoIA.proximo_passo}</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* NOVO BLOCO — SCRIPTS DE ATENDIMENTO · NL */}
          <div className={cn(
            "border transition-all duration-300",
            activeAccordion === 'scripts' ? "border-bronze bg-[#0F0F0F]" : "border-white/5 bg-[#0F0F0F]"
          )}>
            <button 
              className="w-full px-5 py-4 flex items-center justify-between group cursor-pointer"
              onClick={() => setActiveAccordion(activeAccordion === 'scripts' ? null : 'scripts')}
            >
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-bronze" />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-bronze">SCRIPTS DE ATENDIMENTO · NL</p>
                  <p className="text-[9px] text-white/30 italic">Selecione uma etapa para ver os scripts</p>
                </div>
              </div>
              <ChevronDown className={cn("text-white/20 transition-transform duration-300 group-hover:text-bronze", activeAccordion === 'scripts' && "rotate-180 text-bronze")} size={16} />
            </button>

            {activeAccordion === 'scripts' && (
              <div className="px-3 pb-5 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                {scriptsContent.map((etapa) => (
                  <button
                    key={etapa.id}
                    onClick={() => setSelectedEtapaId(selectedEtapaId === etapa.id ? null : etapa.id)}
                    className={cn(
                      "w-full p-3 flex items-center gap-4 border transition-all duration-200 text-left",
                      selectedEtapaId === etapa.id 
                        ? "bg-[#141414] border-bronze" 
                        : "bg-[#0F0F0F] border-[#1A1A1A] hover:border-bronze/30"
                    )}
                  >
                    <span className="text-bronze font-bold font-mono text-xs">{etapa.id}</span>
                    <span className={cn(
                      "text-[10px] font-bold tracking-wider",
                      selectedEtapaId === etapa.id ? "text-white" : "text-white/60"
                    )}>{etapa.titulo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="overflow-y-auto max-h-[calc(100vh-64px)] pr-4 scrollbar-thin scrollbar-thumb-white/10">
          {!selectedEtapaId ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-20">
              <FileText size={48} className="text-white/20" />
              <p className="text-lg font-cormorant uppercase tracking-widest">Selecione uma etapa para ver os scripts.</p>
            </div>
          ) : (
            <div key={selectedEtapaId} className="space-y-8 animate-in fade-in duration-300">
              <div className="space-y-1 border-b border-white/5 pb-6">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-bronze font-cormorant text-5xl font-bold opacity-40 leading-none">
                    {selectedEtapaId}
                  </span>
                  <div>
                    <h1 className="text-3xl font-cormorant text-white uppercase tracking-wider">
                      {scriptsContent.find(e => e.id === selectedEtapaId)?.titulo}
                    </h1>
                    <p className="text-[10px] uppercase text-white/40 tracking-[0.3em] font-medium">
                      {scriptsContent.find(e => e.id === selectedEtapaId)?.objetivo}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {scriptsContent.find(e => e.id === selectedEtapaId)?.scripts.map((script, idx) => (
                  <div key={idx} className={cn(
                    "bg-[#0F0F0F] p-6 relative group border-l-[3px] transition-all hover:bg-[#141414]",
                    script.especial ? "border-[#4A4846]" : "border-bronze"
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={cn(
                        "text-[8px] px-2 py-0.5 font-bold uppercase tracking-widest font-mono",
                        script.especial ? "bg-white/10 text-white/60" : "bg-bronze/15 text-bronze"
                      )}>
                        {script.situacao}
                      </span>
                    </div>
                    <p className="text-[15px] text-[#CCCCCC] leading-[1.7] mb-12 font-sans whitespace-pre-wrap">
                      {replaceVariables(script.texto)}
                    </p>
                    <div className="flex gap-3 absolute bottom-6 left-6 right-6">
                      <Button 
                        variant="ghost" 
                        className="flex-1 text-[9px] font-bold text-bronze uppercase tracking-widest hover:text-white hover:bg-bronze/20 h-9 border border-bronze/10"
                        onClick={() => abrirModalAdaptar(script.situacao, script.texto)}
                      >
                        <Sparkles size={12} className="mr-2" />
                        ADAPTAR TOM · IA
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="flex-1 text-[9px] font-bold text-bronze uppercase tracking-widest hover:text-white hover:bg-bronze/20 h-9 border border-bronze/10"
                        onClick={() => copyToClipboard(replaceVariables(script.texto))}
                      >
                        <Copy size={12} className="mr-2" />
                        COPIAR
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL ADAPTADOR DE TOM */}
        <Dialog open={modalAdaptarAberto} onOpenChange={setModalAdaptarAberto}>
          <DialogContent className="bg-[#0F0F0F] border-bronze/20 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-cormorant text-bronze uppercase tracking-widest">
                ADAPTAR TOM · {scriptParaAdaptar?.situacao}
              </DialogTitle>
              <DialogDescription className="text-white/40 text-[10px] uppercase tracking-widest">
                Ajuste a abordagem do script para o perfil do cliente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-white/40 block font-bold">COMO ESSE CLIENTE SE COMUNICA?</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['TÉCNICO', 'EMOCIONAL', 'DESCONFIADO', 'INDECISO'].map((perfil) => (
                    <Button
                      key={perfil}
                      variant="ghost"
                      onClick={() => setPerfilCliente(perfil)}
                      className={cn(
                        "h-10 text-[10px] font-bold tracking-widest uppercase border",
                        perfilCliente === perfil 
                          ? "bg-bronze text-black border-bronze hover:bg-bronze hover:text-black" 
                          : "border-white/5 text-white/60 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {perfil}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 block font-bold">OBSERVAÇÃO SOBRE O CLIENTE (OPCIONAL)</label>
                <Textarea
                  value={obsCliente}
                  onChange={(e) => setObsCliente(e.target.value)}
                  placeholder="Ex: Cliente tem muita pressa / Já teve problema com outro arquiteto..."
                  className="bg-black/50 border-white/5 text-white text-xs min-h-[60px]"
                />
              </div>

              {resultadoAdaptacao && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-5 bg-bronze/5 border border-bronze/20 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-widest font-bold text-bronze font-mono">SCRIPT ADAPTADO · NL IA</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-white/40 hover:text-white"
                        onClick={() => copyToClipboard(resultadoAdaptacao.script_adaptado)}
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                    <p className="text-[14px] text-[#CCCCCC] leading-[1.6] whitespace-pre-wrap font-sans">
                      {resultadoAdaptacao.script_adaptado}
                    </p>
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[9px] text-white/40 uppercase tracking-widest">
                        O que mudou: <span className="text-bronze italic lowercase">{resultadoAdaptacao.o_que_mudou}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setModalAdaptarAberto(false)}
                  className="flex-1 text-[10px] font-bold tracking-widest uppercase text-white/40 hover:text-white"
                >
                  CANCELAR
                </Button>
                {resultadoAdaptacao ? (
                  <Button
                    onClick={() => copyToClipboard(resultadoAdaptacao.script_adaptado)}
                    className="flex-1 bg-bronze text-black hover:bg-bronze/90 h-11 font-bold text-xs tracking-widest"
                  >
                    COPIAR ADAPTAÇÃO
                  </Button>
                ) : (
                  <Button
                    onClick={adaptarTom}
                    disabled={isAdaptando || !perfilCliente}
                    className="flex-1 bg-bronze text-black hover:bg-bronze/90 h-11 font-bold text-xs tracking-widest"
                  >
                    {isAdaptando ? "ADAPTANDO..." : "GERAR ADAPTAÇÃO · IA"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ScriptsAtendimento;