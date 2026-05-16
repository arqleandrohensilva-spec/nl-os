import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Send, MessageSquare, Trophy, TrendingUp, TrendingDown, Users, Copy, Check, Clock, ExternalLink, FileVideo, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const SatisfacaoDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const [selectedSurveyForFollowUp, setSelectedSurveyForFollowUp] = useState<any>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  
  const [stats, setStats] = useState({
    avg: 0,
    total: 0,
    promoters: 0,
    detractors: 0,
    bestProject: '',
    categoryAverages: [] as { label: string, val: number }[]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: surveysData } = await supabase
        .from('pesquisas_satisfacao')
        .select('*, projeto:projetos(nome, tipo, cidade)')
        .order('criado_em', { ascending: false });
      
      const { data: testimonialsData } = await supabase
        .from('depoimentos')
        .select('*, pesquisa:pesquisas_satisfacao(*)')
        .order('criado_em', { ascending: false });

      const { data: projectsData } = await supabase
        .from('projetos')
        .select('id, nome, nome_cliente, tipo')
        .order('nome', { ascending: true });

      setSurveys(surveysData || []);
      setTestimonials(testimonialsData || []);
      setProjects(projectsData || []);

      const responded = (surveysData || []).filter(s => s.status === 'RESPONDIDA');
      const totalResponded = responded.length;
      const sum = responded.reduce((acc, curr) => acc + (curr.nota_geral || 0), 0);
      const avg = totalResponded > 0 ? sum / totalResponded : 0;
      const promoters = responded.filter(s => (s.nota_geral || 0) >= 9).length;
      const detractors = responded.filter(s => (s.nota_geral || 0) <= 6).length;

      const projectAvgs = responded.reduce((acc: any, curr) => {
        const name = curr.projeto?.nome || 'Sem nome';
        if (!acc[name]) acc[name] = { sum: 0, count: 0 };
        acc[name].sum += (curr.nota_geral || 0);
        acc[name].count += 1;
        return acc;
      }, {});

      let bestProject = '';
      let bestAvg = -1;
      Object.keys(projectAvgs).forEach(name => {
        const projectAvg = projectAvgs[name].sum / projectAvgs[name].count;
        if (projectAvg > bestAvg) {
          bestAvg = projectAvg;
          bestProject = name;
        }
      });

      const categories = ['Arq+Int', 'Interiores', 'Comercial'];
      const categoryAverages = categories.map(cat => {
        const catResponded = responded.filter(s => s.projeto?.tipo === cat);
        const catSum = catResponded.reduce((acc, curr) => acc + (curr.nota_geral || 0), 0);
        const catAvg = catResponded.length > 0 ? catSum / catResponded.length : 0;
        return { label: cat, val: catAvg };
      });

      setStats({
        avg,
        total: totalResponded,
        promoters,
        detractors,
        bestProject,
        categoryAverages
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatarDepoimento = (pesquisa: any) => {
    if (!pesquisa.comentario) return '';
    const comentario = pesquisa.comentario.trim();
    const comentarioFormatado = comentario.charAt(0).toUpperCase() + 
      comentario.slice(1) + 
      (comentario.endsWith('.') ? '' : '.');
    
    const cidade = pesquisa.projeto?.cidade || 'Localidade não informada';
    const tipo = pesquisa.projeto?.tipo || 'Projeto';
    
    return `${pesquisa.cliente_nome} — ${tipo}, ${cidade}:\n"${comentarioFormatado}"`;
  };

  const handleFormatClick = async (dep: any) => {
    const survey = dep.pesquisa;
    const wordCount = survey.comentario?.split(/\s+/).length || 0;

    if (wordCount < 20) {
      setSelectedSurveyForFollowUp(survey);
      setGeneratingFollowUp(true);
      setIsFollowUpModalOpen(true);
      
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'dangerously-allow-browser': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 100,
            messages: [{
              role: 'user',
              content: `O cliente ${survey.cliente_nome} avaliou com nota ${survey.nota_geral} e deixou este comentário curto: '${survey.comentario}'. Gere UMA pergunta curta e natural para pedir que ele detalhe mais a experiência, no tom da NL Arquitetos: técnico, direto, sem bajulação. Máximo 2 linhas.`
            }]
          })
        });

        const data = await response.json();
        setFollowUpQuestion(data.content[0].text.replace(/"/g, ''));
      } catch (error) {
        console.error('Error generating follow-up:', error);
        toast({ variant: "destructive", title: "Erro ao gerar pergunta" });
      } finally {
        setGeneratingFollowUp(false);
      }
    } else {
      const formatado = formatarDepoimento(survey);
      await supabase
        .from('depoimentos')
        .update({ texto_formatado: formatado })
        .eq('id', dep.id);
      
      fetchData();
      toast({ title: "Depoimento formatado com sucesso!" });
    }
  };

  const handleSendFollowUpWhatsApp = () => {
    if (!selectedSurveyForFollowUp) return;
    const text = encodeURIComponent(followUpQuestion);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const updateTestimonialStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('depoimentos')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      fetchData();
      toast({ title: "Status atualizado" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar" });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#1A1816] text-white font-inter">
      <Sidebar user="Equipe NL" />
      <main className="flex-1 ml-[230px] p-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold uppercase tracking-[0.2em] font-cormorant">09 · Pesquisa de Satisfação</h1>
          <p className="text-bronze uppercase tracking-widest text-[10px] font-bold mt-1">PÓS-ENTREGA · DEPOIMENTOS · PAINEL NPS</p>
        </div>

        <Tabs defaultValue="depoimentos" className="space-y-6">
          <TabsList className="bg-[#242220] border-white/5 rounded-none p-0 h-auto">
            <TabsTrigger value="pesquisas" className="rounded-none py-4 px-8 data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest font-bold">Pesquisas</TabsTrigger>
            <TabsTrigger value="depoimentos" className="rounded-none py-4 px-8 data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest font-bold">Depoimentos</TabsTrigger>
            <TabsTrigger value="nps" className="rounded-none py-4 px-8 data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest font-bold">Painel NPS</TabsTrigger>
          </TabsList>
          <TabsContent value="depoimentos">
          <div className="grid gap-6">
            {testimonials.map((dep) => (
              <div key={dep.id} className="bg-[#242220] p-8 border border-white/5 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold font-cormorant uppercase tracking-wider">{dep.pesquisa?.cliente_nome}</h3>
                      {dep.pesquisa?.video_url && (
                        <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 bg-bronze/20 text-bronze font-bold uppercase tracking-widest border border-bronze/30">
                          <FileVideo className="w-3 h-3" /> COM VÍDEO
                        </span>
                      )}
                    </div>
                    <p className="text-bronze text-[10px] uppercase tracking-widest font-bold">Nota {dep.pesquisa?.nota_geral} · {(dep.pesquisa?.nota_geral || 0) >= 9 ? 'Promotor' : 'Neutro/Detrator'}</p>
                  </div>
                  <span className={cn(
                    "text-[9px] px-3 py-1 font-bold uppercase tracking-widest",
                    dep.status === 'PUBLICADO' ? "bg-green-500/20 text-green-400" : 
                    dep.status === 'APROVADO' ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"
                  )}>
                    {dep.status}
                  </span>
                </div>
                <p className="text-white/70 italic text-lg font-cormorant leading-relaxed">
                  {dep.texto_formatado}
                </p>
                <div className="flex gap-3 pt-4 border-t border-white/5">
                  {dep.status === 'PENDENTE' && (
                    <Button onClick={() => updateTestimonialStatus(dep.id, 'APROVADO')} className="bg-bronze hover:bg-bronze/90 rounded-none uppercase tracking-widest text-[9px] font-bold">Aprovar</Button>
                  )}
                  {dep.status === 'APROVADO' && (
                    <Button onClick={() => updateTestimonialStatus(dep.id, 'PUBLICADO')} className="bg-green-600 hover:bg-green-700 rounded-none uppercase tracking-widest text-[9px] font-bold">Marcar como Publicado</Button>
                  )}
                  <Button variant="outline" onClick={() => handleFormatClick(dep)} className="border-white/10 bg-transparent text-white/60 hover:text-white rounded-none uppercase tracking-widest text-[9px] font-bold">
                    <MessageSquare className="w-3 h-3 mr-2" /> Formatar Depoimento
                  </Button>
                  {dep.pesquisa?.video_url && (
                    <>
                      <Button variant="outline" onClick={() => { setCurrentVideoUrl(dep.pesquisa.video_url); setIsVideoModalOpen(true); }} className="border-bronze/30 bg-bronze/5 text-bronze hover:bg-bronze/10 rounded-none uppercase tracking-widest text-[9px] font-bold">
                        <FileVideo className="w-3 h-3 mr-2" /> Ver Vídeo
                      </Button>
                      <Button variant="ghost" onClick={() => window.open(dep.pesquisa.video_url, '_blank')} className="text-white/40 hover:text-white rounded-none uppercase tracking-widest text-[9px] font-bold">
                        <Download className="w-3 h-3 mr-2" /> Baixar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          </TabsContent>
        </Tabs>
      </main>
      <Dialog open={isFollowUpModalOpen} onOpenChange={setIsFollowUpModalOpen}>
        <DialogContent className="bg-[#242220] border-white/10 text-white rounded-none">
          <DialogHeader><DialogTitle className="uppercase tracking-widest font-cormorant text-2xl">Follow-up Personalizado</DialogTitle></DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Comentário curto detectado. Sugestão de aprofundamento:</p>
            <div className="bg-white/5 p-4 border border-white/5 italic text-sm">{generatingFollowUp ? "Gerando pergunta com IA..." : followUpQuestion || "Nenhuma pergunta gerada."}</div>
          </div>
          <DialogFooter>
            <Button onClick={handleSendFollowUpWhatsApp} disabled={generatingFollowUp || !followUpQuestion} className="w-full bg-green-600 hover:bg-green-700 rounded-none uppercase tracking-widest text-[10px] font-bold py-6">
              <Send className="w-4 h-4 mr-2" /> ENVIAR NO WHATSAPP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="bg-black border-white/10 text-white rounded-none max-w-3xl p-0 overflow-hidden">
          <video src={currentVideoUrl} controls autoPlay className="w-full h-auto aspect-video" />
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default SatisfacaoDashboard;
