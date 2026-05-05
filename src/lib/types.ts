export type Stage = 'Novo Lead' | 'Reunião Agendada' | 'Proposta Enviada' | 'Negociação' | 'Fechado' | 'Perdido';
export type Temp = 'Quente' | 'Morno' | 'Frio';
export type Origem = 'Instagram' | 'Indicação' | 'Site' | 'Google' | 'Outro';
export type TipoProjeto = 'Arq+Int' | 'Interiores' | 'Comercial';
export type LogTipo = 'W' | 'R' | 'E' | 'L' | 'N';

export interface LeadLog {
  tipo: LogTipo;
  nota: string;
  data: string;
  autor: string;
}

export interface Lead {
  id: string;
  nome: string;
  whats: string;
  cidade: string;
  tipo: TipoProjeto;
  area: number;
  orcamento: number;
  origem: Origem;
  temp: Temp;
  score: number; // Agora calculado mas mantido por compatibilidade
  stage: Stage;
  obs: string;
  criado: string;
  etapa_desde: string;
  fechado_em?: string;
  logs: LeadLog[];
  proxima_acao_tipo?: string;
  proxima_acao_nota?: string;
  proxima_acao_data?: string;
  criado_por?: string;
}

export const calculateLeadScore = (lead: Lead) => {
  let score = 0;
  const breakdown = [];

  if (lead.orcamento > 0) {
    score += 2;
    breakdown.push({ label: 'Orçamento informado', value: 2, achieved: true });
  } else {
    breakdown.push({ label: 'Orçamento não informado', value: 0, achieved: false });
  }

  if (lead.origem === 'Indicação') {
    score += 2;
    breakdown.push({ label: 'Origem: Indicação', value: 2, achieved: true });
  } else {
    breakdown.push({ label: 'Origem externa', value: 0, achieved: false });
  }

  if (lead.area > 200) {
    score += 2;
    breakdown.push({ label: 'Área > 200m²', value: 2, achieved: true });
  } else {
    breakdown.push({ label: 'Área reduzida', value: 0, achieved: false });
  }

  if (lead.temp === 'Quente') {
    score += 2;
    breakdown.push({ label: 'Temperatura: Quente', value: 2, achieved: true });
  } else {
    breakdown.push({ label: 'Temperatura moderada/fria', value: 0, achieved: false });
  }

  if (lead.logs.some(l => l.tipo !== 'N')) { // 'N' para Notas/Movimentação
    score += 2;
    breakdown.push({ label: 'Interação registrada', value: 2, achieved: true });
  } else {
    breakdown.push({ label: 'Sem interação registrada', value: 0, achieved: false });
  }

  return { score, breakdown };
};

export interface ConfigEscritorio {
  id: string;
  horas_dia: number;
  dias_mes: number;
  percentual_produtivo: number;
  num_arquitetos: number;
  margem_lucro: number;
  custo_hora?: number;
  mercados?: string[];
  atualizado_em: string;
}

export type CategoriaCusto = 'fixo' | 'prolabore' | 'softwares' | 'variavel' | 'impostos' | 'reservas';
export type FrequenciaCusto = 'mensal' | 'anual' | 'percentual';

export interface CustoEscritorio {
  id: string;
  categoria: CategoriaCusto;
  nome: string;
  valor: number;
  frequencia: FrequenciaCusto;
  ativo: boolean;
  criado_em: string;
}


