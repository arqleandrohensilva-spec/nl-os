import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CheckCircle2, Star } from 'lucide-react';

const SatisfacaoPublic = () => {
  const { token } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [survey, setSurvey] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  
  const [notaGeral, setNotaGeral] = useState<number | null>(null);
  const [avaliacaoProcesso, setAvaliacaoProcesso] = useState<string>('');
  const [avaliacaoResultado, setAvaliacaoResultado] = useState<string>('');
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!token) return;
      const { data, error } = await supabase
        .from('pesquisas_satisfacao')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !data) {
        toast({
          variant: "destructive",
          title: "Pesquisa não encontrada",
          description: "O link pode estar expirado ou incorreto."
        });
      } else if (data.status === 'RESPONDIDA') {
        setSubmitted(true);
      } else {
        setSurvey(data);
      }
      setLoading(false);
    };

    fetchSurvey();
  }, [token, toast]);

  const handleSubmit = async () => {
    if (notaGeral === null || !avaliacaoProcesso || !avaliacaoResultado) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, responda todas as perguntas obrigatórias."
      });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Update survey
      const { error: surveyError } = await supabase
        .from('pesquisas_satisfacao')
        .update({
          nota_geral: notaGeral,
          avaliacao_processo: avaliacaoProcesso,
          avaliacao_resultado: avaliacaoResultado,
          comentario,
          status: 'RESPONDIDA',
          respondida_em: new Date().toISOString()
        })
        .eq('id', survey.id);

      if (surveyError) throw surveyError;

      // 2. Logic for Promoters (>= 9)
      if (notaGeral >= 9) {
        const textoDepoimento = `"${comentario || 'Sem comentários.'}" — ${survey.cliente_nome}`;
        await supabase.from('depoimentos').insert({
          pesquisa_id: survey.id,
          texto_formatado: textoDepoimento,
          status: 'PENDENTE'
        });
      }

      setSubmitted(true);
      toast({
        title: "Avaliação enviada!",
        description: "Obrigado por compartilhar sua experiência conosco."
      });
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: "Ocorreu um problema ao processar sua resposta."
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1816] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bronze"></div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#1A1816] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#242220] p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-bronze/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="text-bronze w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider font-cormorant">Obrigado!</h1>
          <p className="text-white/70">
            Sua opinião é fundamental para mantermos o padrão de excelência da NL Arquitetos.
            Ficamos muito felizes com sua participação.
          </p>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  return (
    <div className="min-h-screen bg-[#1A1816] text-white font-inter pb-12">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-bronze flex items-center justify-center text-white font-cormorant text-2xl mx-auto shadow-lg mb-6">
            NL
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-[0.2em] font-cormorant">Pesquisa de Satisfação</h1>
          <p className="text-bronze uppercase tracking-widest text-xs font-bold">NL Arquitetos · Pós-Entrega</p>
        </div>

        <div className="bg-[#242220] p-8 space-y-10">
          {/* Q1: NPS */}
          <div className="space-y-6">
            <p className="text-lg font-medium">1. De 0 a 10, como você avalia sua experiência com a NL Arquitetos?</p>
            <div className="flex justify-between gap-1">
              {[...Array(11)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setNotaGeral(i)}
                  className={cn(
                    "w-full h-12 flex items-center justify-center text-sm font-bold transition-all border",
                    notaGeral === i ? "scale-110 z-10 border-white" : "border-transparent",
                    i <= 6 ? "bg-red-500/20 text-red-400 hover:bg-red-500/40" : 
                    i <= 8 ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40" : 
                    "bg-green-500/20 text-green-400 hover:bg-green-500/40"
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40 font-bold">
              <span>Poderia ser melhor</span>
              <span>Excelente</span>
            </div>
          </div>

          {/* Q2: Process & Communication */}
          <div className="space-y-4">
            <p className="text-lg font-medium">2. Como você avalia nosso processo e comunicação durante o projeto?</p>
            <div className="grid grid-cols-2 gap-3">
              {['Excelente', 'Bom', 'Regular', 'Ruim'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAvaliacaoProcesso(opt)}
                  className={cn(
                    "py-4 px-6 text-sm uppercase tracking-widest font-bold border transition-all",
                    avaliacaoProcesso === opt ? "bg-bronze border-bronze text-white" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Q3: Final Result */}
          <div className="space-y-4">
            <p className="text-lg font-medium">3. O resultado final atendeu às suas expectativas?</p>
            <div className="grid grid-cols-2 gap-3">
              {['Superou', 'Atendeu', 'Parcialmente', 'Não atendeu'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAvaliacaoResultado(opt)}
                  className={cn(
                    "py-4 px-6 text-sm uppercase tracking-widest font-bold border transition-all",
                    avaliacaoResultado === opt ? "bg-bronze border-bronze text-white" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Q4: Comment */}
          <div className="space-y-4">
            <p className="text-lg font-medium">4. Deixe um comentário (opcional)</p>
            <Textarea 
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Sua opinião é muito importante para nós..."
              className="bg-white/5 border-white/10 focus:border-bronze text-white min-h-[120px]"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-8 bg-bronze hover:bg-bronze/90 text-white font-bold tracking-[0.2em] uppercase rounded-none transition-all"
          >
            {submitting ? "ENVIANDO..." : "ENVIAR AVALIAÇÃO"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SatisfacaoPublic;