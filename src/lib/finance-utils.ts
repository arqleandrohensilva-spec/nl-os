/**
 * Utilitários de cálculo financeiro para o sistema NL OS
 */

/**
 * Verifica a viabilidade de um projeto com base no custo/hora do escritório
 */
export function verificarViabilidade(valorProposta: number, horasEstimadas: number, custoHora: number) {
  if (custoHora <= 0) {
    return {
      status: 'alerta' as const,
      mensagem: 'Configure sua Base Financeira para calcular a viabilidade real.'
    };
  }

  const custoReal = horasEstimadas * custoHora;
  const margemReal = ((valorProposta - custoReal) / valorProposta) * 100;
  
  if (margemReal < 0) {
    return {
      status: 'prejuizo' as const,
      mensagem: `Este projeto custa internamente R$ ${custoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} e está sendo vendido por R$ ${valorProposta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Prejuízo de R$ ${(custoReal - valorProposta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      custoReal,
      valorProposta,
      prejuizo: custoReal - valorProposta,
      margemReal
    };
  }
  
  if (margemReal < 20) {
    return {
      status: 'alerta' as const,
      mensagem: `Margem de ${margemReal.toFixed(0)}% está abaixo do mínimo recomendado de 20%.`,
      custoReal,
      valorProposta,
      margemReal
    };
  }
  
  return {
    status: 'saudavel' as const,
    mensagem: `Margem de ${margemReal.toFixed(0)}% — projeto viável.`,
    custoReal,
    valorProposta,
    margemReal
  };
}
