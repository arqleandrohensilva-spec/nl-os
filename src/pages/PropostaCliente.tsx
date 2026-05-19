import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PropostaArqint from './PropostaArqint';
import PropostaInt from './PropostaInt';
import PropostaComercial from './PropostaComercial';
import { PropostaProvider } from '@/hooks/use-proposta-context';

const PropostaCliente = () => {
  const { tipo, slug } = useParams();
  const [proposta, setProposta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const buscarProposta = async () => {
      const { data, error } = await supabase
        .from('propostas_clientes')
        .select('*')
        .eq('tipo', tipo)
        .eq('slug', slug)
        .maybeSingle();

      if (error || !data) {
        setError(true);
      } else {
        // Incrementar acessos
        await supabase
          .from('propostas_clientes')
          .update({ 
            acessos: (data.acessos || 0) + 1,
            ultimo_acesso: new Date().toISOString()
          })
          .eq('id', data.id);

        setProposta(data);
      }
      setLoading(false);
    };

    if (tipo && slug) {
      buscarProposta();
    }
  }, [tipo, slug]);

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-white/40 text-xs uppercase tracking-widest animate-pulse">Carregando proposta...</div>
    </div>
  );

  if (error || !proposta) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center space-y-4 p-6">
        <p className="font-display italic text-2xl text-white">NL Arquitetos</p>
        <div className="h-px w-8 bg-bronze/30 mx-auto" />
        <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold">Proposta não encontrada</p>
        <p className="text-white/20 text-[10px] uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
          Este link pode ter expirado ou é inválido.
        </p>
      </div>
    </div>
  );

  // Montar os params no formato que os templates esperam
  const params = {
    nome: proposta.nome_cliente || '[Nome do Cliente]',
    tipo: proposta.tipo || '',
    cidade: proposta.cidade || '[Cidade]',
    estado: proposta.estado || 'SP',
    area: proposta.area || '[XXX]',
    objetivo: proposta.objetivo || '',
    data: proposta.criado_em ? new Date(proposta.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    plano: '',
    valor_executivo: proposta.valor_executivo || 'Sob consulta',
    valor_completo: proposta.valor_completo || 'Sob consulta',
    validade: proposta.validade || '30 dias corridos',
  };

  // Renderizar o template correto com os dados do cliente
  return (
    <PropostaProvider value={params}>
      {tipo === 'arqint' && <PropostaArqint />}
      {tipo === 'int' && <PropostaInt />}
      {tipo === 'comercial' && <PropostaComercial />}
    </PropostaProvider>
  );
};

export default PropostaCliente;
