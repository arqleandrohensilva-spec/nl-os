import { usePropostaContext } from './use-proposta-context';
import { PropostaParams } from './use-proposta-params-types';

export function usePropostaParams(): PropostaParams {
  const context = usePropostaContext();

  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const urlParams: PropostaParams = {
    nome: searchParams.get('nome') || '[Nome do Cliente]',
    tipo: searchParams.get('tipo') || '[Residencial · Comercial · Interiores]',
    cidade: searchParams.get('cidade') || '[Cidade]',
    estado: searchParams.get('estado') || '[Estado]',
    area: searchParams.get('area') || '[XXX]',
    objetivo: searchParams.get('objetivo') || '[Descrição breve do objetivo do cliente]',
    data: searchParams.get('data') || '[DD Mês AAAA]',
    plano: searchParams.get('plano') || '',
    valor_executivo: searchParams.get('valor_executivo') || 'Sob consulta',
    valor_completo: searchParams.get('valor_completo') || 'Sob consulta',
    validade: searchParams.get('validade') || '30 dias corridos',
  };

  return context ?? urlParams;
}