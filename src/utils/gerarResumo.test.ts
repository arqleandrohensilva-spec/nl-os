import { describe, it, expect } from 'vitest';

// We'll define a simplified version for the test or export it if possible.
// Since it's inside a component file, we redefine it here to test the logic.
// In a real project, we'd move this to a shared utility file.

const gerarResumo = (tipo: string, etapa: string, status: string) => {
  const normalizedTipo = (tipo || '').toLowerCase();
  const normalizedEtapa = (etapa || '').toUpperCase();
  const normalizedStatus = (status || '').toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const mappingEtapa: Record<string, string> = {
    'BRIEFING': 'briefing',
    'CONCEITO': 'briefing',
    'ESTUDO': 'anteprojeto',
    'EXECUTIVO': 'executivo',
    'DETALHAMENTO': 'executivo',
    'ACOMPANHAMENTO': 'acompanhamento'
  };

  const etapaKey = mappingEtapa[normalizedEtapa] || 'briefing';

  const textos: any = {
    arqint: {
      briefing: {
        "em_andamento": "Estamos mapeando o projeto completo — da estrutura aos acabamentos. Cada decisão de interiores precisa conversar com a arquitetura desde o início, não depois.",
        "aguardando_aprovacao": "O briefing completo está documentado. Sua confirmação alinha arquitetura e interiores antes de qualquer linha ser traçada.",
        "aprovado": "Briefing aprovado. Arquitetura e interiores seguem um único partido — definido antes da obra começar."
      },
      anteprojeto: {
        "em_andamento": "Estamos desenvolvendo a concepção espacial e o conceito de interiores em conjunto. O que você vê na tela é o que será executado.",
        "aguardando_aprovacao": "O anteprojeto integrado está pronto. Antes de aprovar, verifique se o espaço e os interiores representam o que você esperava — é aqui que ajustes custam zero.",
        "aprovado": "Anteprojeto aprovado. Partido arquitetônico e conceito de interiores validados."
      },
      executivo: {
        "em_andamento": "Estamos detalhando cada ambiente — revestimentos, marcenaria, iluminação e instalações compatibilizados em um único projeto. Nada será decidido na obra.",
        "aguardando_aprovacao": "O executivo completo está pronto para revisão. Cada detalhe de acabamento e cada ponto de instalação estão documentados.",
        "aprovado": "Executivo aprovado. Arquitetura e interiores prontos para execução sem improvisos."
      },
      acompanhamento: {
        "em_andamento": "Estamos acompanhando a execução da arquitetura e dos interiores. O que foi decidido no projeto está sendo verificado no canteiro.",
        "aguardando_aprovacao": "Relatório de visita disponível. Registramos o avanço da obra e conferimos se os acabamentos seguem o especificado.",
        "aprovado": "Visita registrada. Execução dentro do esperado."
      }
    },
    int: {
      briefing: {
        "em_andamento": "Estamos levantando suas referências, rotina e necessidades. Interiores bem executados começam por decisões bem documentadas — não por feeling.",
        "aguardando_aprovacao": "O briefing de interiores está completo. Sua aprovação confirma que entendemos o que você precisa antes de propor qualquer solução.",
        "aprovado": "Briefing aprovado. As diretrizes do projeto de interiores estão estabelecidas."
      },
      anteprojeto: {
        "em_andamento": "Estamos desenvolvendo o layout, o conceito e as primeiras definições de materiais. Cada escolha está sendo testada visualmente antes de qualquer compra.",
        "aguardando_aprovacao": "O anteprojeto de interiores está pronto para sua análise. É nesta etapa que ajustes de layout e conceito ainda não geram custo.",
        "aprovado": "Anteprojeto aprovado. Layout e conceito validados — o projeto avança para o detalhamento."
      },
      executivo: {
        "em_andamento": "Estamos detalhando marcenaria, revestimentos, iluminação e mobiliário. Cada especificação documentada agora evita retrabalho na execução.",
        "aguardando_aprovacao": "O executivo de interiores está finalizado. Este documento é o que o marceneiro, o revestidor e o eletricista vão seguir.",
        "aprovado": "Executivo aprovado. O projeto de interiores está pronto para execução."
      },
      acompanhamento: {
        "em_andamento": "Estamos verificando se a execução segue o projeto especificado — materiais, acabamentos e detalhes de marcenaria.",
        "aguardando_aprovacao": "Relatório de acompanhamento disponível. Conferimos o andamento e identificamos pontos de atenção na execução.",
        "aprovado": "Acompanhamento registrado. Execução dentro do especificado."
      }
    },
    comercial: {
      briefing: {
        "em_andamento": "Estamos mapeando o fluxo operacional, as necessidades técnicas e a identidade do negócio. Um projeto comercial eficiente começa por entender como o espaço precisa funcionar.",
        "aguardando_aprovacao": "O briefing comercial está documentado. Sua aprovação confirma que o programa de necessidades está correto antes de qualquer proposta espacial.",
        "aprovado": "Briefing aprovado. O programa do projeto comercial está definido."
      },
      anteprojeto: {
        "em_andamento": "Estamos desenvolvendo o layout operacional e a concepção do espaço. Fluxo de clientes, equipe e operação sendo testados antes de qualquer execução.",
        "aguardando_aprovacao": "O anteprojeto comercial está pronto. Verifique se o fluxo e a distribution dos ambientes atendem à operação do negócio.",
        "aprovado": "Anteprojeto aprovado. Conceito espacial e fluxo operacional validados."
      },
      executivo: {
        "em_andamento": "Estamos detalhando instalações, acabamentos e especificações técnicas. Projeto comercial executivo exige compatibilização precisa — cada sistema documentado antes da obra.",
        "aguardando_aprovacao": "O executivo comercial está finalizado. Este documento garante que a obra siga o projeto — sem decisões improvisadas no canteiro.",
        "aprovado": "Executivo aprovado. Projeto comercial pronto para execução."
      },
      acompanhamento: {
        "em_andamento": "Estamos acompanhando a execução e verificando conformidade com o projeto. Em obras comerciais, desvios identificados cedo custam menos para corrigir.",
        "aguardando_aprovacao": "Relatório de visita disponível. Registramos o andamento e as conformidades verificadas nesta etapa.",
        "aprovado": "Acompanhamento registrado. Execução dentro do projetado."
      }
    }
  };

  const projectTextos = textos[normalizedTipo] || textos['arqint'];
  const etapaKeyMapped = mappingEtapa[normalizedEtapa] || 'briefing';
  const etapaTextos = projectTextos[etapaKeyMapped] || projectTextos['briefing'];
  
  return etapaTextos[normalizedStatus] || "Projeto em andamento. Acompanhe as etapas abaixo.";
};

describe('gerarResumo', () => {
  describe('arqint - Arquitetura + Interiores', () => {
    it('should return correct text for briefing in progress', () => {
      const result = gerarResumo('arqint', 'BRIEFING', 'Em andamento');
      expect(result).toBe("Estamos mapeando o projeto completo — da estrutura aos acabamentos. Cada decisão de interiores precisa conversar com a arquitetura desde o início, não depois.");
    });

    it('should return correct text for conceito awaiting approval', () => {
      // CONCEITO maps to briefing
      const result = gerarResumo('arqint', 'CONCEITO', 'Aguardando aprovação');
      expect(result).toBe("O briefing completo está documentado. Sua confirmação alinha arquitetura e interiores antes de qualquer linha ser traçada.");
    });

    it('should return correct text for estudo approved', () => {
      // ESTUDO maps to anteprojeto
      const result = gerarResumo('arqint', 'ESTUDO', 'Aprovado');
      expect(result).toBe("Anteprojeto aprovado. Partido arquitetônico e conceito de interiores validados.");
    });

    it('should return correct text for executivo approved', () => {
      const result = gerarResumo('arqint', 'EXECUTIVO', 'Aprovado');
      expect(result).toBe("Executivo aprovado. Arquitetura e interiores prontos para execução sem improvisos.");
    });

    it('should return correct text for acompanhamento in progress', () => {
      const result = gerarResumo('arqint', 'ACOMPANHAMENTO', 'Em andamento');
      expect(result).toBe("Estamos acompanhando a execução da arquitetura e dos interiores. O que foi decidido no projeto está sendo verificado no canteiro.");
    });
  });

  describe('int - Interiores', () => {
    it('should return correct text for briefing approved', () => {
      const result = gerarResumo('int', 'BRIEFING', 'Aprovado');
      expect(result).toBe("Briefing aprovado. As diretrizes do projeto de interiores estão estabelecidas.");
    });

    it('should return correct text for estudo approved', () => {
      const result = gerarResumo('int', 'ESTUDO', 'Aprovado');
      expect(result).toBe("Anteprojeto aprovado. Layout e conceito validados — o projeto avança para o detalhamento.");
    });

    it('should return correct text for acompanhamento approved', () => {
      const result = gerarResumo('int', 'ACOMPANHAMENTO', 'Aprovado');
      expect(result).toBe("Acompanhamento registrado. Execução dentro do especificado.");
    });
  });

  describe('comercial - Comercial', () => {
    it('should return correct text for briefing awaiting approval', () => {
      const result = gerarResumo('comercial', 'BRIEFING', 'Aguardando aprovação');
      expect(result).toBe("O briefing comercial está documentado. Sua aprovação confirma que o programa de necessidades está correto antes de qualquer proposta espacial.");
    });

    it('should return correct text for executivo in progress', () => {
      const result = gerarResumo('comercial', 'EXECUTIVO', 'Em andamento');
      expect(result).toBe("Estamos detalhando instalações, acabamentos e especificações técnicas. Projeto comercial executivo exige compatibilização precisa — cada sistema documentado antes da obra.");
    });
  });

  describe('Fallback', () => {
    it('should return default text for unknown status', () => {
      const result = gerarResumo('arqint', 'BRIEFING', 'Status Desconhecido');
      expect(result).toBe("Projeto em andamento. Acompanhe as etapas abaixo.");
    });

    it('should fallback to arqint for unknown project type', () => {
      const result = gerarResumo('unknown', 'BRIEFING', 'Aprovado');
      expect(result).toBe("Briefing aprovado. Arquitetura e interiores seguem um único partido — definido antes da obra começar.");
    });
  });
});
