import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, Copy, Bot, FileText, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [leadAtivo, setLeadAtivo] = useState<Lead | null>(null);
  const [mensagemCliente, setMensagemCliente] = useState('');
  const [mensagemDetector, setMensagemDetector] = useState('');
  const [sugestaoIA, setSugestaoIA] = useState<{ resposta: string; tom: string; proximo_passo: string } | null>(null);
  const [resultadoDetector, setResultadoDetector] = useState<{
    etapa_numero: number;
    etapa_nome: string;
    confianca: string;
    motivo: string;
    script_recomendado: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [openEtapa, setOpenEtapa] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase.from('leads').select('id, nome, tipo, cidade, stage, area, origem');
      if (data) setLeads(data);
    };
    fetchLeads();
  }, []);

  const handleLeadChange = (id: string) => {
    setSelectedLeadId(id);
    setLeadAtivo(leads.find(l => l.id === id) || null);
  };

  const gerarSugestao = async () => {
    if (!leadAtivo || !mensagemCliente) return;
    setIsGenerating(true);
    toast.info("Consultando IA...");
    try {
      const { data, error } = await supabase.functions.invoke('chat-completions', {
        body: {
          prompt: `Você é o assistente de atendimento da NL Arquitetos. Sugira uma resposta para a mensagem do cliente abaixo.
          TOM OBRIGATÓRIO: profissional, condutor, centrado no cliente. Nunca informal, nunca ansioso, nunca com urgência artificial.
          LEAD: ${leadAtivo.nome} · ${leadAtivo.tipo} · ${leadAtivo.cidade}
          ETAPA ATUAL: ${leadAtivo.stage}
          MENSAGEM: ${mensagemCliente}
          Retorne APENAS JSON: {"resposta": "...", "tom": "...", "proximo_passo": "..."}`
        }
      });
      if (error) throw error;
      setSugestaoIA(data);
    } catch (e) {
      toast.error("Erro ao gerar sugestão");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const identificarEtapa = async () => {
    if (!leadAtivo || !mensagemDetector) return;
    setIsDetecting(true);
    toast.info("Identificando momento...");
    try {
      const { data, error } = await supabase.functions.invoke('chat-completions', {
        body: {
          model: 'claude-sonnet-4-20250514',
          prompt: `Você é o assistente comercial da NL Arquitetos. Analise a mensagem do cliente abaixo e identifique em qual etapa da jornada ele está.

AS 11 ETAPAS DA JORNADA NL:
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

LEAD: ${leadAtivo.nome} · ${leadAtivo.tipo} · ${leadAtivo.cidade}

MENSAGEM DO CLIENTE:
${mensagemDetector}

Analise a mensagem e retorne APENAS JSON válido:
{
  "etapa_numero": 1,
  "etapa_nome": "PRIMEIRO CONTATO",
  "confianca": "ALTA | MÉDIA | BAIXA",
  "motivo": "explicação em 1-2 linhas do porquê desta etapa",
  "script_recomendado": "nome exato do script mais adequado para usar agora"
}`
        }
      });
      if (error) throw error;
      setResultadoDetector(data);
    } catch (e) {
      toast.error("Erro ao identificar etapa");
    } finally {
      setIsDetecting(false);
    }
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
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar user="Sócio" />
      <div className="ml-[230px] flex-1 p-8 grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-8">
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

          <div className="bg-[#141414] p-5 border border-white/5 space-y-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-bronze">
                <Bot size={16} />
                <p className="text-[10px] uppercase font-bold tracking-widest">ASSISTENTE DE ATENDIMENTO · IA</p>
              </div>
              <p className="text-[10px] text-white/30 italic">Cole a mensagem do cliente e receba uma sugestão no tom NL</p>
            </div>
            <Textarea 
              className="bg-[#0F0F0F] border-white/5 text-white min-h-[120px] focus-visible:ring-bronze" 
              placeholder="Cole aqui a mensagem ou pergunta do cliente..."
              value={mensagemCliente}
              onChange={(e) => setMensagemCliente(e.target.value)}
            />
            <Button 
              className="w-full bg-bronze text-white hover:bg-bronze/90 h-11 font-bold text-xs tracking-widest" 
              onClick={gerarSugestao}
              disabled={isGenerating || !leadAtivo || !mensagemCliente}
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
        </div>

        {/* COLUNA DIREITA */}
        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-64px)] pr-4 scrollbar-thin scrollbar-thumb-white/10">
          <div className="space-y-1">
            <h1 className="text-3xl font-cormorant text-white">SCRIPTS DE ATENDIMENTO · NL</h1>
            <p className="text-[10px] uppercase text-white/40 tracking-[0.3em] font-medium">Etapas I a XI — Primeiro Contato ao Pós-Projeto</p>
          </div>

          <div className="space-y-3">
            {scriptsContent.map((etapa) => (
              <div key={etapa.id} className={cn(
                "border transition-all duration-300",
                openEtapa === etapa.id ? "border-bronze bg-[#0F0F0F]" : "border-white/5 bg-[#0F0F0F]/50 hover:bg-[#0F0F0F]"
              )}>
                <button 
                  className="w-full px-6 py-5 flex items-center justify-between"
                  onClick={() => setOpenEtapa(openEtapa === etapa.id ? null : etapa.id)}
                >
                  <div className="flex items-center gap-6">
                    <span className="text-bronze font-cormorant text-2xl font-bold opacity-60 leading-none">{etapa.id}</span>
                    <div className="text-left space-y-0.5">
                      <p className="text-sm font-bold tracking-widest text-white uppercase">{etapa.titulo}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">{etapa.objetivo}</p>
                    </div>
                  </div>
                  <ChevronDown className={cn("text-white/20 transition-transform duration-300", openEtapa === etapa.id && "rotate-180")} size={18} />
                </button>

                {openEtapa === etapa.id && (
                  <div className="px-6 pb-6 pt-2 space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 gap-4">
                      {etapa.scripts.map((script, idx) => (
                        <div key={idx} className={cn(
                          "bg-[#141414] p-5 relative group border-l-[3px]",
                          script.especial ? "border-[#4A4846]" : "border-bronze"
                        )}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={cn(
                              "text-[8px] px-2 py-0.5 font-bold uppercase tracking-widest font-mono",
                              script.especial ? "bg-white/5 text-white/40" : "bg-bronze/10 text-bronze"
                            )}>
                              {script.situacao}
                            </span>
                          </div>
                          <p className="text-[14px] text-[#CCCCCC] leading-[1.6] mb-8 font-sans">
                            {replaceVariables(script.texto)}
                          </p>
                          <Button 
                            variant="ghost" 
                            className="absolute bottom-4 right-4 text-[9px] font-bold text-bronze uppercase tracking-widest hover:text-white hover:bg-bronze/20 h-7"
                            onClick={() => copyToClipboard(replaceVariables(script.texto))}
                          >
                            <Copy size={12} className="mr-2" />
                            COPIAR
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptsAtendimento;