import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import estiloModerno from '@/assets/estilos/moderno.jpg';
import estiloContemporaneo from '@/assets/estilos/contemporaneo.jpg';
import estiloMinimalista from '@/assets/estilos/minimalista.jpg';
import estiloIndustrial from '@/assets/estilos/industrial.jpg';
import estiloClassico from '@/assets/estilos/classico.jpg';
import estiloTropical from '@/assets/estilos/tropical.jpg';
import estiloRustico from '@/assets/estilos/rustico.jpg';

const ESTILO_IMAGENS: Record<string, string> = {
  'Moderno': estiloModerno,
  'Contemporâneo': estiloContemporaneo,
  'Minimalista': estiloMinimalista,
  'Industrial': estiloIndustrial,
  'Clássico': estiloClassico,
  'Tropical': estiloTropical,
  'Rústico': estiloRustico,
};



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

// --- DESIGN TOKENS + ESTILOS ---
const BRIEFING_STYLES = `
  .brief-root, .brief-root * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
  .brief-root {
    --brief-bg: #F7F4EF;
    --brief-surface: #FFFFFF;
    --brief-border: #E0DAD3;
    --brief-border-sub: #EAE4DB;
    --brief-accent: #BF7A4A;
    --brief-accent-dark: #A8683B;
    --brief-accent-bg: #FBF0E8;
    --brief-text-1: #1A1816;
    --brief-text-2: #5A524A;
    --brief-text-3: #A89F95;
    --brief-text-4: #BFB8B0;
  }

  .brief-header, .brief-progress-track, .brief-dots, .brief-main { position: relative; z-index: 2; }

  .brief-header {
    height: 52px; padding: 0 2rem; background: transparent;
    border-bottom: 1px solid var(--brief-border-sub);
    display: flex; align-items: center; justify-content: space-between;
  }
  .brief-logo { font-size: 12px; font-weight: 500; letter-spacing: 0.12em; color: var(--brief-text-1); }
  .brief-badge { font-size: 11px; color: var(--brief-text-3); letter-spacing: 0.06em; }

  .brief-progress-track { height: 2px; width: 100%; background: var(--brief-border-sub); }
  .brief-progress-fill { height: 2px; background: var(--brief-accent); transition: width 0.3s ease; }

  .brief-dots { display: flex; justify-content: center; gap: 6px; padding: 1.5rem 0 0; }
  .brief-dot { width: 6px; height: 6px; border-radius: 50%; background: #DDD7CE; transition: all 0.2s ease; }
  .brief-dot--active { width: 20px; height: 6px; border-radius: 3px; background: var(--brief-accent); }

  .brief-main {
    max-width: 680px; margin: 0 auto; padding: 2.5rem 2rem 4rem;
    background: rgba(250, 248, 245, 0.82);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border-radius: 0;
  }

  .brief-chapname-row {
    display: flex; justify-content: space-between; align-items: center;
    max-width: 680px; margin: 10px auto 0; padding: 0 2rem;
    position: relative; z-index: 2;
  }
  .brief-chapname { font-size: 11px; font-weight: 400; color: #A89F95; letter-spacing: 0.04em; }
  .brief-chapcount { font-size: 11px; color: #C8C0B8; }

  .brief-footer { padding: 2rem; text-align: center; background: transparent; position: relative; z-index: 2; }
  .brief-footer-main { font-size: 11px; font-weight: 400; color: #A89F95; letter-spacing: 0.08em; }
  .brief-footer-tag { font-size: 9px; font-weight: 500; color: #C8C0B8; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 4px; }

  .brief-h1wrap { position: relative; }
  .brief-ghostnum {
    position: absolute; top: -32px; left: -8px; font-family: 'Inter', sans-serif; font-weight: 200;
    font-size: 112px; line-height: 1; color: #BF7A4A; opacity: 0.06;
    user-select: none; pointer-events: none; z-index: 0; letter-spacing: -0.04em;
  }
  .brief-chapter-fade { transition: opacity 280ms ease, transform 280ms ease; }

  .brief-captag { display: flex; align-items: center; gap: 12px; margin-bottom: 2rem; }
  .brief-captag span { font-size: 10px; font-weight: 500; letter-spacing: 0.14em; color: var(--brief-accent); text-transform: uppercase; }
  .brief-captag .brief-line { flex: 1; height: 1px; background: var(--brief-border-sub); }

  .brief-captitle { font-size: 26px; font-weight: 300; color: var(--brief-text-1); letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 6px; }
  .brief-capsub { font-size: 13px; color: var(--brief-text-3); line-height: 1.6; margin-bottom: 2.5rem; }

  .brief-section { margin-bottom: 2.5rem; }
  .brief-section-label {
    font-size: 10px; font-weight: 500; letter-spacing: 0.12em; color: var(--brief-text-3);
    text-transform: uppercase; padding-bottom: 12px; border-bottom: 1px solid var(--brief-border-sub); margin-bottom: 1.5rem;
  }

  .brief-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem 1rem; }
  .brief-full { grid-column: 1 / -1; }
  @media (max-width: 520px) { .brief-grid { grid-template-columns: 1fr; } }

  .brief-flabel { font-size: 12px; font-weight: 500; color: var(--brief-text-2); display: block; margin-bottom: 6px; }
  .brief-fhint { font-size: 11px; color: var(--brief-text-4); margin-bottom: 8px; line-height: 1.4; }

  .brief-input {
    height: 42px; width: 100%; border: 1px solid var(--brief-border); border-radius: 6px;
    background: var(--brief-surface); padding: 0 14px; font-size: 13px; color: var(--brief-text-1); outline: none;
    transition: border-color 0.18s;
  }
  .brief-textarea {
    height: 88px; width: 100%; border: 1px solid var(--brief-border); border-radius: 6px;
    background: var(--brief-surface); padding: 12px 14px; font-size: 13px; color: var(--brief-text-1);
    outline: none; resize: none; line-height: 1.6; transition: border-color 0.18s;
  }
  .brief-input:focus, .brief-textarea:focus { border-color: var(--brief-accent); }
  .brief-input::placeholder, .brief-textarea::placeholder { color: var(--brief-text-4); }

  .brief-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .brief-chip {
    padding: 8px 16px; border-radius: 20px; border: 1px solid var(--brief-border); background: var(--brief-surface);
    font-size: 12px; color: #6B6259; cursor: pointer; transition: all 0.18s;
  }
  .brief-chip:hover { border-color: var(--brief-accent); color: var(--brief-accent); }
  .brief-chip--active { background: var(--brief-accent-bg); border-color: var(--brief-accent); color: #9D5E2E; font-weight: 500; }

  .brief-stylegrid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; width: 100%;
  }
  .brief-stylecard {
    position: relative; border: 1px solid var(--brief-border); border-radius: 10px; overflow: hidden;
    background: var(--brief-surface); padding: 0; text-align: left;
    transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
  }
  .brief-stylecard:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(26,24,22,0.12); border-color: var(--brief-accent); }
  .brief-stylecard__hit {
    display: block; width: 100%; padding: 0; border: none; background: none; cursor: pointer; text-align: left;
  }
  .brief-stylecard__img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; display: block; transition: filter 0.2s; }
  .brief-stylecard__label {
    display: block; padding: 9px 12px; font-size: 12px; letter-spacing: 0.04em; color: #6B6259;
    font-family: 'Inter', sans-serif;
  }
  .brief-stylecard--active { border-color: var(--brief-accent); box-shadow: 0 0 0 2px var(--brief-accent); }
  .brief-stylecard--active .brief-stylecard__label { color: #9D5E2E; font-weight: 500; }
  .brief-stylecard--amo { box-shadow: 0 0 0 2px #C0392B; border-color: #C0392B; }
  .brief-stylecard__check {
    position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 50%;
    background: var(--brief-accent); color: #fff; display: flex; align-items: center; justify-content: center;
    font-size: 14px; line-height: 1; opacity: 0; transform: scale(0.7); transition: all 0.18s;
  }
  .brief-stylecard--active .brief-stylecard__check { opacity: 1; transform: scale(1); }
  .brief-stylecard--amo .brief-stylecard__check { background: #C0392B; }
  .brief-stylecard__weights {
    display: flex; gap: 6px; padding: 0 10px 10px; font-family: 'Inter', sans-serif;
  }
  .brief-weight {
    flex: 1; padding: 6px 8px; border-radius: 16px; border: 1px solid var(--brief-border);
    background: var(--brief-surface); font-size: 11px; letter-spacing: 0.03em; color: #8A8178;
    cursor: pointer; transition: all 0.16s; font-family: 'Inter', sans-serif;
  }
  .brief-weight:hover { border-color: var(--brief-accent); color: var(--brief-accent); }
  .brief-weight--active { border-color: var(--brief-accent); background: var(--brief-accent-bg); color: #9D5E2E; font-weight: 500; }
  .brief-stylecard__weights .brief-weight:first-child.brief-weight--active {
    border-color: #C0392B; background: rgba(192,57,43,0.10); color: #C0392B;
  }

  .brief-darkcard {
    background: #1A1816; border-radius: 0 8px 8px 0; padding: 1.25rem 1.5rem;
    border-left: 3px solid var(--brief-accent);
  }
  .brief-darkcard .brief-flabel { color: #F7F4EF; font-size: 15px; font-weight: 300; }
  .brief-darkcard .brief-fhint { color: rgba(247,244,239,0.45); }
  .brief-textarea--dark {
    height: 88px; width: 100%; border: 1px solid #3A3530; border-radius: 6px; background: #2A2520;
    padding: 12px 14px; font-size: 13px; color: #F7F4EF; outline: none; resize: none; line-height: 1.6; transition: border-color 0.18s;
  }
  .brief-textarea--dark:focus { border-color: var(--brief-accent); }
  .brief-textarea--dark::placeholder { color: rgba(247,244,239,0.3); }

  .brief-nav {
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 2rem; border-top: 1px solid var(--brief-border-sub); margin-top: 2rem;
  }
  .brief-back {
    padding: 10px 18px; border-radius: 6px; border: 1px solid var(--brief-border); background: transparent;
    font-size: 12px; color: var(--brief-text-3); cursor: pointer; transition: all 0.18s;
  }
  .brief-back:hover { color: var(--brief-text-2); border-color: var(--brief-text-3); }
  .brief-counter { font-size: 11px; color: #C0B8B0; }
  .brief-next {
    padding: 12px 28px; border-radius: 6px; border: none; background: var(--brief-accent); color: #FFFFFF;
    font-size: 13px; font-weight: 500; letter-spacing: 0.02em; cursor: pointer; transition: background 0.18s;
  }
  .brief-next:hover { background: var(--brief-accent-dark); }
  .brief-next:disabled { opacity: 0.5; cursor: default; }
`;

const Fundo = () => (
  <>
    {/* Camada 1 — imagem da capa */}
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundImage:
          "url('https://www.dropbox.com/scl/fi/qvuvyvkomvhugkcz8drty/Capa-Branca.png?rlkey=c2320yi5ryugoiw0hw8t0m6b9&raw=1')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.3,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
    {/* Camada 2 — lavagem creme por cima */}
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#F7F4EF',
        opacity: 0.58,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  </>
);



const BriefingCompleto = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<any>(null);
  const [started, setStarted] = useState(false);
  const [curCap, setCurCap] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [savedCap, setSavedCap] = useState(0);
  const [visible, setVisible] = useState(true);

  const capitulos = BRIEFING_ARQINT.capítulos;
  const totalCaps = capitulos.length;

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
            const savedIdx = parsed.curCap ?? 0;
            if (savedIdx && savedIdx > 0) {
              setHasSaved(true);
              setSavedCap(savedIdx);
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
      localStorage.setItem(`briefing_progress_${token}`, JSON.stringify({ curCap, answers }));
    }
  }, [curCap, answers, token, started]);

  const goToCap = (next: number) => {
    if (next >= totalCaps) {
      submitBriefing();
      return;
    }
    setVisible(false);
    setTimeout(() => {
      setCurCap(next);
      setVisible(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 220);
  };

  const handleNext = () => goToCap(curCap + 1);
  const handleBack = () => {
    if (curCap > 0) goToCap(curCap - 1);
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

  // ---- TELA FINAL ----
  if (isFinished) return (
    <div className="brief-root" style={{ minHeight: '100vh', background: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <style>{BRIEFING_STYLES}</style>
      <Fundo />
      <div style={{ maxWidth: 520, textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div className="brief-captag" style={{ justifyContent: 'center', marginBottom: '2.5rem' }}>
          <span style={{ flex: 'none' }}>Briefing concluído</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 300, color: '#1A1816', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1.25rem' }}>
          Obrigado.
        </h1>
        <p style={{ fontSize: 14, color: '#A89F95', lineHeight: 1.7, marginBottom: '2rem' }}>
          Você concluiu a primeira etapa estratégica do seu projeto. Nossa equipe analisará cuidadosamente cada resposta — esse material será o pilar da nossa próxima reunião.
        </p>
        <p style={{ fontSize: 11, color: '#BFB8B0', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Próxima etapa: Reunião de Diagnóstico e Direcionamento
        </p>
      </div>
    </div>
  );

  // ---- TELA DE ENTRADA ----
  if (!started) return (
    <div className="brief-root" style={{ minHeight: '100vh', background: '#F7F4EF', display: 'flex', alignItems: 'center', padding: '2rem', position: 'relative' }}>
      <style>{BRIEFING_STYLES}</style>
      <Fundo />
      <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <p className="brief-logo" style={{ fontSize: 13, letterSpacing: '0.14em', marginBottom: '2.5rem' }}>NL ARQUITETOS</p>

        {projeto?.nome_cliente && (
          <p style={{ fontSize: 14, color: '#A89F95', marginBottom: '0.75rem' }}>
            Seja bem-vindo, {projeto.nome_cliente}.
          </p>
        )}
        <h1 style={{ fontSize: 28, fontWeight: 300, color: '#1A1816', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: '1rem' }}>
          Vamos começar o desenvolvimento do seu projeto.
        </h1>
        <p style={{ fontSize: 14, color: '#A89F95', maxWidth: 480, lineHeight: 1.7, marginBottom: '2rem' }}>
          Este briefing é a base estratégica de tudo que construiremos. Cada resposta define um caminho único.
        </p>
        <p style={{ fontSize: 11, color: '#BFB8B0', letterSpacing: '0.06em', marginBottom: '2.5rem' }}>
          Tempo estimado: 15 minutos
        </p>

        {hasSaved ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <button className="brief-next" onClick={() => { setCurCap(savedCap); setStarted(true); }}>
              Continuar de onde parou
            </button>
            <button className="brief-back" onClick={() => { setCurCap(0); setStarted(true); }}>
              Começar do início
            </button>
          </div>
        ) : (
          <button className="brief-next" onClick={() => { setCurCap(0); setStarted(true); }}>
            Começar Briefing
          </button>
        )}
      </div>
    </div>
  );

  // ---- TELAS DE CAPÍTULO ----
  const cap = capitulos[curCap];
  const progressPct = ((curCap + 1) / totalCaps) * 100;
  const isLastCap = curCap === totalCaps - 1;

  const renderInput = (p: Pergunta, dark = false) => {
    const val = answers[p.id] || '';
    const setVal = (v: any) => setAnswers({ ...answers, [p.id]: v });

    if (p.tipo === 'textarea') {
      return (
        <textarea
          className={dark ? 'brief-textarea--dark' : 'brief-textarea'}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={p.placeholder || 'Sua resposta...'}
        />
      );
    }
    if (p.tipo === 'select') {
      return (
        <div className="brief-chips">
          {p.opcoes?.map(opt => (
            <button
              key={opt}
              type="button"
              className={`brief-chip${answers[p.id] === opt ? ' brief-chip--active' : ''}`}
              onClick={() => setVal(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }
    if (p.tipo === 'multiselect') {
      const current: string[] = answers[p.id] || [];
      const hasImagens = p.opcoes?.every(opt => ESTILO_IMAGENS[opt]);
      if (hasImagens) {
        // Normaliza o valor em um mapa de pesos { estilo: 'amo' | 'gosto' }.
        const raw = answers[p.id];
        const pesos: Record<string, string> = Array.isArray(raw)
          ? raw.reduce((acc: Record<string, string>, k: string) => { acc[k] = 'gosto'; return acc; }, {})
          : (raw && typeof raw === 'object' ? { ...raw } : {});
        const setPeso = (opt: string, peso: string) => setVal({ ...pesos, [opt]: peso });
        const removeOpt = (opt: string) => {
          const next = { ...pesos };
          delete next[opt];
          setVal(next);
        };
        return (
          <div className="brief-stylegrid">
            {p.opcoes?.map(opt => {
              const peso = pesos[opt];
              const selected = !!peso;
              return (
                <div
                  key={opt}
                  className={`brief-stylecard${selected ? ' brief-stylecard--active' : ''}${peso === 'amo' ? ' brief-stylecard--amo' : ''}`}
                >
                  <button
                    type="button"
                    className="brief-stylecard__hit"
                    onClick={() => selected ? removeOpt(opt) : setPeso(opt, 'gosto')}
                  >
                    <img
                      className="brief-stylecard__img"
                      src={ESTILO_IMAGENS[opt]}
                      alt={`Estilo ${opt}`}
                      loading="lazy"
                      width={768}
                      height={512}
                    />
                    <span className="brief-stylecard__check">{peso === 'amo' ? '♥' : '✓'}</span>
                    <span className="brief-stylecard__label">{opt}</span>
                  </button>
                  {selected && (
                    <div className="brief-stylecard__weights">
                      <button
                        type="button"
                        className={`brief-weight${peso === 'amo' ? ' brief-weight--active' : ''}`}
                        onClick={() => setPeso(opt, 'amo')}
                      >
                        ♥ Amo
                      </button>
                      <button
                        type="button"
                        className={`brief-weight${peso === 'gosto' ? ' brief-weight--active' : ''}`}
                        onClick={() => setPeso(opt, 'gosto')}
                      >
                        Gosto
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      return (
        <div className="brief-chips">
          {p.opcoes?.map(opt => {
            const selected = current.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                className={`brief-chip${selected ? ' brief-chip--active' : ''}`}
                onClick={() => setVal(selected ? current.filter(i => i !== opt) : [...current, opt])}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    // text (default)
    return (
      <input
        className="brief-input"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={p.placeholder || ''}
      />
    );
  };

  const isFull = (p: Pergunta) => p.tipo === 'textarea' || p.tipo === 'multiselect';

  return (
    <div className="brief-root" style={{ minHeight: '100vh', background: '#F7F4EF', color: '#1A1816', position: 'relative' }}>
      <style>{BRIEFING_STYLES}</style>
      <Fundo />

      {/* Header */}
      <header className="brief-header">
        <span className="brief-logo">NL ARQUITETOS</span>
        <span className="brief-badge">Briefing · ARQ+INT</span>
      </header>

      {/* Barra de progresso */}
      <div className="brief-progress-track">
        <div className="brief-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Dots de capítulo */}
      <div className="brief-dots">
        {capitulos.map((_, i) => (
          <div key={i} className={`brief-dot${i === curCap ? ' brief-dot--active' : ''}`} />
        ))}
      </div>

      {/* Nome do capítulo + contador */}
      <div className="brief-chapname-row" style={{ marginBottom: '2rem' }}>
        <span className="brief-chapname">{cap.titulo}</span>
        <span className="brief-chapcount">{curCap + 1} de {totalCaps}</span>
      </div>

      {/* Área principal */}
      <main className="brief-main">
        <div
          className="brief-chapter-fade"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(6px)',
          }}
        >
        <div className="brief-captag">
          <span>Capítulo {String(curCap + 1).padStart(2, '0')} · {String(totalCaps).padStart(2, '0')}</span>
          <div className="brief-line" />
        </div>

        <div className="brief-h1wrap">
          <span className="brief-ghostnum">{String(curCap + 1).padStart(2, '0')}</span>
          <h1 className="brief-captitle" style={{ position: 'relative', zIndex: 1 }}>{cap.titulo}</h1>
        </div>
        <p className="brief-capsub">Responda com calma — não há respostas certas ou erradas.</p>

        {cap.blocos.map(bloco => (
          <div key={bloco.id} className="brief-section">
            <div className="brief-section-label">{bloco.titulo}</div>
            <div className="brief-grid">
              {bloco.perguntas.map(p => {
                const dark = p.id === 'frase';
                if (dark) {
                  return (
                    <div key={p.id} className="brief-field brief-full">
                      <div className="brief-darkcard">
                        <label className="brief-flabel">{p.label}</label>
                        {p.orientacao && <p className="brief-fhint">{p.orientacao}</p>}
                        {renderInput(p, true)}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={p.id} className={`brief-field${isFull(p) ? ' brief-full' : ''}`}>
                    <label className="brief-flabel">{p.label}</label>
                    {p.orientacao && <p className="brief-fhint">{p.orientacao}</p>}
                    {renderInput(p)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Navegação inferior */}
        <div className="brief-nav">
          <button
            className="brief-back"
            onClick={handleBack}
            style={{ visibility: curCap === 0 ? 'hidden' : 'visible' }}
          >
            Voltar
          </button>

          <span className="brief-counter">
            {String(curCap + 1).padStart(2, '0')} / {String(totalCaps).padStart(2, '0')}
          </span>

          <button className="brief-next" onClick={handleNext} disabled={isSubmitting}>
            {isLastCap
              ? (isSubmitting ? 'Enviando...' : 'Finalizar Briefing')
              : 'Próximo Capítulo'}
          </button>
        </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="brief-footer">
        <div className="brief-footer-main">NL ARQUITETOS · 2026</div>
        <div className="brief-footer-tag">A ARQUITETURA COMO DECISÃO.</div>
      </footer>
    </div>
  );
};


export default BriefingCompleto;
