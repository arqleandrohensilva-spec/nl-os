import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PropostaArqint from './PropostaArqint';
import PropostaInt from './PropostaInt';
import PropostaComercial from './PropostaComercial';
import { PropostaProvider } from '@/hooks/use-proposta-context';
import { createClient } from "@supabase/supabase-js";

const nlSupabase = createClient(
  "https://krzuroijejfozljhchok.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyenVyb2lqZWpmb3psamhjaG9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Mjg4MjEsImV4cCI6MjA5MzUwNDgyMX0.mFMFfY8TdviFVzHvfKYUrZENpcT4wdyW-52-CUNqsOo"
);

const PropostaCliente = () => {
  const { tipo, slug } = useParams();
  const [proposta, setProposta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const proposalIdRef = useRef<string | null>(null);

  // Tracking de tempo total
  useEffect(() => {
    const startTime = Date.now();
    
    return () => {
      if (proposalIdRef.current) {
        const tempoSegundos = Math.round((Date.now() - startTime) / 1000);
        
        // Salvar tempo no NL OS
        nlSupabase
          .from("proposal_views")
          .update({ tempo_segundos: tempoSegundos })
          .eq("proposal_id", proposalIdRef.current)
          .order("viewed_at", { ascending: false })
          .limit(1)
          .then(({ error }) => {
            if (error) console.error("Erro ao salvar tempo total:", error);
          });
      }
    };
  }, []);

  // Tracking de seções
  useEffect(() => {
    const secoes: Record<string, number> = {};
    const temposSecao: Record<string, number> = {};
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.id;
        if (entry.isIntersecting) {
          secoes[id] = Date.now();
        } else if (secoes[id]) {
          temposSecao[id] = (temposSecao[id] || 0) + (Date.now() - secoes[id]);
          delete secoes[id];
        }
      });
    }, { threshold: 0.5 });

    // Observar elementos que começam com secao-
    const elements = document.querySelectorAll('[id^="secao-"]');
    elements.forEach(el => observer.observe(el));

    return () => {
      observer.disconnect();
      // Finalizar tempos das seções ativas no momento da saída
      Object.keys(secoes).forEach(id => {
        temposSecao[id] = (temposSecao[id] || 0) + (Date.now() - secoes[id]);
      });

      // Salvar tempos das seções no NL OS
      if (Object.keys(temposSecao).length > 0 && proposalIdRef.current) {
        // Converter de ms para s
        const temposFormatados: Record<string, number> = {};
        Object.keys(temposSecao).forEach(key => {
          temposFormatados[key] = Math.round(temposSecao[key] / 1000);
        });

        nlSupabase
          .from("proposal_views")
          .update({ secoes_tempo: temposFormatados })
          .eq("proposal_id", proposalIdRef.current)
          .order("viewed_at", { ascending: false })
          .limit(1)
          .then(({ error }) => {
            if (error) console.error("Erro ao salvar tempos das seções:", error);
          });
      }
    };
  }, []);

  const registrarView = async (pTipo: string, pSlug: string) => {
    try {
      // Buscar todas as propostas com link para encontrar o match ideal
      const { data: propostas } = await supabase
        .from('proposals')
        .select('id, link_proposta')
        .not('link_proposta', 'is', null);

      const propostaMatch = propostas?.find(p => {
        const link = (p.link_proposta || '').toLowerCase();
        return link.endsWith(`/${pSlug}`) || 
               link.includes(`/${pTipo}/${pSlug}`);
      });

      if (propostaMatch?.id) {
        await supabase.from('proposal_views').insert({
          proposal_id: propostaMatch.id,
          viewed_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Erro ao registrar view:', err);
    }
  };

  useEffect(() => {
    const buscarProposta = async () => {
      const { data, error } = await supabase
        .rpc('get_proposal_by_slug', { p_tipo: tipo, p_slug: slug })
        .maybeSingle();

      if (error || !data) {
        setError(true);
      } else {
        // Incrementar acessos na tabela de clientes externos
        await supabase.rpc('increment_proposal_access', { p_id: data.id });

        // Registrar view no NL OS para tracking interno
        try {
          const { data: propostas } = await nlSupabase
            .from("proposals")
            .select("id, link_proposta")
            .not("link_proposta", "is", null);

          const propostaNl = propostas?.find((p: any) => {
            const link = (p.link_proposta || "").toLowerCase();
            return link.endsWith(`/${slug}`) || link.includes(`/${tipo}/${slug}`);
          });

          if (propostaNl?.id) {
            proposalIdRef.current = propostaNl.id;
            await nlSupabase.from("proposal_views").insert({
              proposal_id: propostaNl.id,
              viewed_at: new Date().toISOString()
            });
          }
        } catch (trackErr) {
          console.error("Erro ao registrar tracking:", trackErr);
        }

        // Registrar visualização de forma robusta localmente
        if (tipo && slug) {
          registrarView(tipo, slug);
        }

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
    area: proposta.area || '---',
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
