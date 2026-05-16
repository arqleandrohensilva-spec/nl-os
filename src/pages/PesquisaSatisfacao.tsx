import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CheckCircle2, Star, Camera, Upload, Square, Play, Trash2, Loader2, Video } from 'lucide-react';
import { format } from 'date-fns';

const PesquisaSatisfacao = () => {
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
  
  // Video related state
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const videoPreviewRef = React.useRef<HTMLVideoElement>(null);
  const timerRef = React.useRef<any>(null);


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

  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      
      const recorder = new MediaRecorder(mediaStream);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        setVideoBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      toast({ variant: "destructive", title: "Erro ao acessar câmera", description: "Certifique-se de dar permissão para usar a câmera e o microfone." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const deleteVideo = () => {
    setVideoBlob(null);
    setVideoUrl('');
    setRecordingTime(0);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 50 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "O limite é de 50MB." });
      return;
    }
    
    setVideoBlob(file);
    setVideoUrl(URL.createObjectURL(file));
  };

  const uploadVideoToDropbox = async () => {
    if (!videoBlob) return { url: null, path: null };

    setIsUploadingVideo(true);
    try {
      const fileName = `video_depoimento_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.mp4`;
      const clientName = survey.cliente_nome || 'Cliente';
      const destinationPath = `/NL Arquitetos/07 - Projetos NL OS/${clientName}/06 - Depoimento/${fileName}`;

      const arrayBuffer = await videoBlob.arrayBuffer();
      const dropboxArg = JSON.stringify({
        path: destinationPath,
        mode: 'add',
        autorename: true,
        mute: false,
        strict_conflict: false
      });

      const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
        body: arrayBuffer,
        headers: {
          'x-action': 'upload',
          'dropbox-api-arg': dropboxArg,
          'content-type': 'application/octet-stream'
        }
      });

      if (error) throw error;

      // Get shared link
      const { data: shareData, error: shareError } = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'create_shared_link', path: destinationPath }
      });

      if (shareError) throw shareError;

      const directUrl = (shareData.url || shareData.link).replace('?dl=0', '?raw=1');
      
      return { url: directUrl, path: destinationPath };
    } catch (error) {
      console.error('Video upload error:', error);
      throw error;
    } finally {
      setIsUploadingVideo(false);
    }
  };

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
      // 0. Upload video if exists
      let uploadedVideoUrl = null;
      let uploadedVideoPath = null;
      if (videoBlob) {
        const result = await uploadVideoToDropbox();
        uploadedVideoUrl = result.url;
        uploadedVideoPath = result.path;
      }

      // 1. Update survey
      const { error: surveyError } = await supabase
        .from('pesquisas_satisfacao')
        .update({
          nota_geral: notaGeral,
          avaliacao_processo: avaliacaoProcesso,
          avaliacao_resultado: avaliacaoResultado,
          comentario,
          video_url: uploadedVideoUrl,
          video_dropbox_path: uploadedVideoPath,
          status: 'RESPONDIDA',
          respondida_em: new Date().toISOString()
        })
        .eq('id', survey.id);

      if (surveyError) throw surveyError;

      // 2. Logic for Promoters (>= 9)
      if (notaGeral >= 9) {
        const textoDepoimento = `"${comentario || 'Experiência excelente com a NL Arquitetos!'}"\n\n— ${survey.cliente_nome}\n(Avaliação Geral: ${notaGeral}/10)`;
        
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
    const isPromoter = (notaGeral ?? 0) >= 9;

    const handleIndication = () => {
      const text = encodeURIComponent(`Olá! Estou finalizando meu projeto com a NL Arquitetos e a experiência foi incrível. Se você estiver pensando em construir ou reformar, recomendo muito o trabalho deles!`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
      <div className="min-h-screen bg-[#1A1816] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#242220] p-8 text-center space-y-8 border border-white/5">
          <div className="w-20 h-20 bg-bronze/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="text-bronze w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white uppercase tracking-[0.2em] font-cormorant">Obrigado!</h1>
            <p className="text-bronze uppercase tracking-[0.1em] text-[10px] font-bold">Avaliação Enviada com Sucesso</p>
          </div>

          <p className="text-white/70 leading-relaxed font-light">
            Sua opinião é fundamental para mantermos o padrão de excelência da NL Arquitetos.
            Ficamos muito felizes com sua participação.
          </p>

          {isPromoter && (
            <div className="pt-8 border-t border-white/5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Você é um Promotor NL</span>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-white/90">
                  Ficamos honrados com sua confiança! Que tal indicar a NL para um amigo que valoriza qualidade e processo técnico?
                </p>
                <Button
                  onClick={handleIndication}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-widest text-[10px] py-6 rounded-none transition-all"
                >
                  Indicar via WhatsApp
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-[#1A1816] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#242220] p-8 text-center space-y-4 border border-white/5">
          <h1 className="text-2xl font-bold text-white uppercase tracking-[0.2em] font-cormorant">Link inválido ou expirado</h1>
          <p className="text-white/40 text-sm uppercase tracking-widest">A pesquisa que você está tentando acessar não existe ou já foi respondida.</p>
        </div>
      </div>
    );
  }

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

export default PesquisaSatisfacao;