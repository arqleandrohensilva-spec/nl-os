/**
 * Utilitários de cálculo financeiro para o sistema NL OS
 */

/**
 * Verifica a viabilidade de um projeto com base no custo/hora do escritório
 */
export function verificarViabilidade(valorProposta: number, horasEstimadas: number, custoHora: number, cidade?: string) {
  if (custoHora <= 0) {
    return {
      status: 'alerta' as const,
      mensagem: 'Configure sua Base Financeira para calcular a viabilidade real.'
    };
  }

  // Benchmarks por mercado
  const benchmarks: Record<string, { min: number, max: number }> = {
    'São José dos Campos': { min: 120, max: 180 },
    'São Paulo': { min: 180, max: 350 },
    'Campinas': { min: 130, max: 200 },
    'Rio de Janeiro': { min: 160, max: 280 }
  };

  const benchmark = cidade ? (benchmarks[cidade] || benchmarks['São Paulo']) : null;
  const precoHoraVenda = valorProposta / (horasEstimadas || 1);
  const custoReal = horasEstimadas * custoHora;
  const margemReal = ((valorProposta - custoReal) / (valorProposta || 1)) * 100;
  
  let mensagemAdicional = '';
  if (benchmark) {
    if (precoHoraVenda < benchmark.min) {
      mensagemAdicional = ` Atenção: Seu preço/hora (R$ ${precoHoraVenda.toFixed(0)}) está abaixo do benchmark de ${cidade} (min R$ ${benchmark.min}).`;
    } else if (precoHoraVenda > benchmark.max) {
      mensagemAdicional = ` Excelente: Seu preço/hora (R$ ${precoHoraVenda.toFixed(0)}) está acima do benchmark premium de ${cidade} (max R$ ${benchmark.max}).`;
    } else {
      mensagemAdicional = ` Seu preço/hora (R$ ${precoHoraVenda.toFixed(0)}) está dentro do benchmark de ${cidade}.`;
    }
  }

  if (margemReal < 0) {
    return {
      status: 'prejuizo' as const,
      mensagem: `Este projeto custa internamente R$ ${custoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Prejuízo de R$ ${(custoReal - valorProposta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.${mensagemAdicional}`,
      custoReal,
      valorProposta,
      prejuizo: custoReal - valorProposta,
      margemReal
    };
  }
  
  if (margemReal < 20) {
    return {
      status: 'alerta' as const,
      mensagem: `Margem de ${margemReal.toFixed(0)}% está abaixo do mínimo recomendado de 20%.${mensagemAdicional}`,
      custoReal,
      valorProposta,
      margemReal
    };
  }
  
  return {
    status: 'saudavel' as const,
    mensagem: `Margem de ${margemReal.toFixed(0)}% — projeto viável.${mensagemAdicional}`,
    custoReal,
    valorProposta,
    margemReal
  };
}
