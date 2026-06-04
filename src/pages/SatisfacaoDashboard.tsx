import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Send, MessageSquare, Trophy, TrendingUp, TrendingDown, Users, Copy, Check, Clock, ExternalLink, FileVideo, Download, Search, AlertTriangle, UserPlus, Share2 } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  const [selectedType, setSelectedType] = useState('Pós-Entrega');
  const [generatedToken, setGeneratedToken] = useState('');
  const [surveysFilter, setSurveysFilter] = useState('TODAS');
  const [testimonialsFilter, setTestimonialsFilter] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [selectedSurveyForReferral, setSelectedSurveyForReferral] = useState<any>(null);
  const [isInternalNoteModalOpen, setIsInternalNoteModalOpen] = useState(false);
  const [selectedSurveyForInternalNote, setSelectedSurveyForInternalNote] = useState<any>(null);
  const [internalNote, setInternalNote] = useState('');
  const [generatingTestimonial, setGeneratingTestimonial] = useState(false);
  
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
        .select('*, pesquisa:pesquisas_satisfacao(*, projeto:projetos(nome, tipo, cidade))')
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
        const { data: aiResponse, error } = await supabase.functions.invoke('ai-advisor', {
          body: {
            prompt: `O cliente ${survey.cliente_nome} avaliou com nota ${survey.nota_geral} e deixou este comentário curto: '${survey.comentario}'. Gere UMA pergunta curta e natural para pedir que ele detalhe mais a experiência, no tom da NL Arquitetos: técnico, direto, sem bajulação. Máximo 2 linhas.`,
            systemPrompt: "Você é um assistente da NL Arquitetos especializado em feedback de clientes.",
            model: 'anthropic/claude-3-5-haiku-20241022'
          }
        });

        if (error) throw error;
        
        const text = aiResponse.choices?.[0]?.message?.content || "";
        setFollowUpQuestion(text.replace(/"/g, ''));
      } catch (error: any) {
        console.error('Error generating follow-up:', error);
        toast({ 
          variant: "destructive", 
          title: "Erro ao gerar pergunta",
          description: error.message || "Ocorreu um erro desconhecido"
        });
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

  const handleGenerateLink = async () => {
    if (!selectedProjectId) return;
    setCreating(true);
    const token = crypto.randomUUID();
    const project = projects.find(p => p.id === selectedProjectId);
    
    try {
      const { error } = await supabase
        .from('pesquisas_satisfacao')
        .insert({
          projeto_id: selectedProjectId,
          cliente_nome: project?.nome_cliente || 'Cliente',
          token,
          status: 'PENDENTE',
          tipo: selectedType
        });
        
      if (error) throw error;
      
      setGeneratedToken(token);
      toast({ title: "Pesquisa gerada com sucesso!" });
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro ao gerar pesquisa" });
    } finally {
      setCreating(false);
    }
  };

  const archivarPesquisa = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pesquisas_satisfacao')
        .update({ status: 'ARQUIVADA' })
        .eq('id', id);
      if (error) throw error;
      fetchData();
      toast({ title: "Pesquisa arquivada" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao arquivar" });
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Texto copiado para a área de transferência" });
  };

  const handleGenerateTestimonial = async (survey: any) => {
    setGeneratingTestimonial(true);
    try {
      const { data: aiResponse, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          prompt: `Você é o assistente da NL Arquitetos. Com base nas respostas abaixo de uma pesquisa de satisfação, gere um depoimento formatado para uso em Instagram e Google Meu Negócio. Tom: autêntico, técnico, sem exageros.
          
          Cliente: ${survey.cliente_nome}
          Projeto: ${survey.projeto?.nome} · ${survey.projeto?.tipo}
          Nota geral: ${survey.nota_geral}/10
          Resposta livre: ${survey.comentario || 'Não informado'}
          
          Retorne APENAS JSON:
          {
            "depoimento_instagram": "texto curto, até 3 linhas, sem hashtags",
            "depoimento_google": "texto um pouco mais longo, até 5 linhas, em primeira pessoa",
            "frase_destaque": "frase de impacto de até 12 palavras para usar como quote visual"
          }`,
          systemPrompt: "Você é um assistente da NL Arquitetos especializado em feedback de clientes.",
          model: 'anthropic/claude-3-5-sonnet-20241022'
        }
      });

      if (error) throw error;
      
      const content = aiResponse.choices?.[0]?.message?.content || "";
      const cleanedJson = content.replace(/```json|```/g, '').trim();
      const parsedData = JSON.parse(cleanedJson);

      const { error: insertError } = await supabase
        .from('depoimentos')
        .insert({
          pesquisa_id: survey.id,
          cliente_nome: survey.cliente_nome,
          projeto_id: survey.projeto_id,
          depoimento_instagram: parsedData.depoimento_instagram,
          depoimento_google: parsedData.depoimento_google,
          frase_destaque: parsedData.frase_destaque,
          texto_formatado: parsedData.depoimento_google,
          status: 'PENDENTE'
        });

      if (insertError) throw insertError;

      toast({ title: "Depoimento gerado — aguardando aprovação" });
      fetchData();
    } catch (error: any) {
      console.error('Error generating testimonial:', error);
      toast({ variant: "destructive", title: "Erro ao gerar depoimento", description: error.message });
    } finally {
      setGeneratingTestimonial(false);
    }
  };

  const handleSaveInternalNote = async () => {
    if (!selectedSurveyForInternalNote) return;
    try {
      const { error } = await supabase
        .from('pesquisas_satisfacao')
        .update({ notas_internas: internalNote })
        .eq('id', selectedSurveyForInternalNote.id);

      if (error) throw error;

      toast({ title: "Nota interna salva" });
      setIsInternalNoteModalOpen(false);
      setInternalNote('');
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar nota", description: error.message });
    }
  };

  const openReferralModal = (survey: any) => {
    setSelectedSurveyForReferral(survey);
    setIsReferralModalOpen(true);
  };

  const openInternalNoteModal = (survey: any) => {
    setSelectedSurveyForInternalNote(survey);
    setInternalNote(survey.notas_internas || '');
    setIsInternalNoteModalOpen(true);
  };

  const filteredSurveys = surveys.filter(s => {
    const matchesFilter = 
      surveysFilter === 'TODAS' || 
      (surveysFilter === 'AGUARDANDO' && s.status === 'PENDENTE') ||
      (surveysFilter === 'RESPONDIDAS' && s.status === 'RESPONDIDA') ||
      (surveysFilter === 'ARQUIVADAS' && s.status === 'ARQUIVADA');
    
    if (!matchesFilter) return false;

    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      s.cliente_nome?.toLowerCase().includes(searchLower) ||
      s.projeto?.nome?.toLowerCase().includes(searchLower) ||
      s.projeto?.cidade?.toLowerCase().includes(searchLower)
    );
  });

  const filteredTestimonials = testimonials.filter(t => {
    const matchesFilter = 
      testimonialsFilter === 'TODOS' ? t.status !== 'DESCARTADO' :
      (testimonialsFilter === 'PENDENTE APROVAÇÃO' && t.status === 'PENDENTE') ||
      (testimonialsFilter === 'APROVADOS' && t.status === 'APROVADO') ||
      (testimonialsFilter === 'PUBLICADOS' && t.status === 'PUBLICADO');
      
    if (!matchesFilter) return false;

    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      t.pesquisa?.cliente_nome?.toLowerCase().includes(searchLower) ||
      t.pesquisa?.projeto?.nome?.toLowerCase().includes(searchLower) ||
      t.pesquisa?.projeto?.cidade?.toLowerCase().includes(searchLower)
    );
  });

  const surveysCount = {
    aguardando: surveys.filter(s => s.status === 'PENDENTE').length,
    respondidas: surveys.filter(s => s.status === 'RESPONDIDA').length
  };

  const testimonialsCount = {
    pendentes: testimonials.filter(t => t.status === 'PENDENTE').length,
    aprovados: testimonials.filter(t => t.status === 'APROVADO').length
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white font-inter">
      <Sidebar user="Equipe NL" />
      <main className="flex-1 transition-[margin] duration-300 ml-[var(--sidebar-width)] p-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold uppercase tracking-[0.2em] font-cormorant">Pesquisa de Satisfação</h1>
          <p className="text-bronze uppercase tracking-widest text-[10px] font-bold mt-1">PÓS-ENTREGA · DEPOIMENTOS · PAINEL NPS</p>
        </div>

        <Tabs defaultValue="pesquisas" className="space-y-6">
          <TabsList className="bg-white/[0.03] border-white/5 rounded-none p-0 h-auto">
            <TabsTrigger value="pesquisas" className="rounded-none py-4 px-8 data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest font-bold">Pesquisas</TabsTrigger>
            <TabsTrigger value="depoimentos" className="rounded-none py-4 px-8 data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest font-bold">Depoimentos</TabsTrigger>
            <TabsTrigger value="nps" className="rounded-none py-4 px-8 data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest font-bold">Painel NPS</TabsTrigger>
          </TabsList>

          <TabsContent value="pesquisas">
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-1">
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">Listagem de Pesquisas</h2>
                <div className="flex gap-4">
                  {surveysCount.aguardando > 0 && (
                    <span className="text-[9px] uppercase tracking-widest font-bold text-amber-500">{surveysCount.aguardando} AGUARDANDO RESPOSTA</span>
                  )}
                  {surveysCount.respondidas > 0 && (
                    <span className="text-[9px] uppercase tracking-widest font-bold text-bronze">{surveysCount.respondidas} RESPONDIDAS PENDENTES</span>
                  )}
                </div>
              </div>
              <Button onClick={() => { setGeneratedToken(''); setIsModalOpen(true); }} className="bg-bronze hover:bg-bronze/90 rounded-none uppercase tracking-widest text-[10px] font-bold">
                <Plus className="w-4 h-4 mr-2" /> Nova Pesquisa
              </Button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input 
                placeholder="BUSCAR POR CLIENTE, PROJETO OU CIDADE..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/[0.03] border-white/5 rounded-none pl-10 uppercase tracking-widest text-[10px] font-bold h-12 focus-visible:ring-bronze"
              />
            </div>

            <div className="flex gap-2 mb-8 border-b border-white/5 pb-4 overflow-x-auto">
              {['TODAS', 'AGUARDANDO', 'RESPONDIDAS', 'ARQUIVADAS'].map(f => (
                <button
                  key={f}
                  onClick={() => setSurveysFilter(f)}
                  className={cn(
                    "text-[9px] uppercase tracking-widest font-bold px-4 py-2 border border-white/5 transition-all",
                    surveysFilter === f ? "bg-bronze text-white border-bronze" : "text-white/40 hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              {filteredSurveys.length === 0 ? (
                <div className="bg-white/[0.03] p-12 border border-white/5 text-center">
                  <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold">Nenhuma pesquisa encontrada para este filtro.</p>
                </div>
              ) : (
                filteredSurveys.map((survey) => {
                  const hasTestimonial = testimonials.some(t => t.pesquisa_id === survey.id);
                  return (
                    <div 
                      key={survey.id} 
                      className={cn(
                        "bg-white/[0.03] p-6 border transition-all flex justify-between items-center",
                        survey.status === 'PENDENTE' && "border-amber-500/30 opacity-80",
                        survey.status === 'RESPONDIDA' && "border-bronze shadow-[0_0_15px_rgba(184,134,11,0.1)]",
                        survey.status === 'ARQUIVADA' && "border-white/5 opacity-50",
                        survey.status === 'RESPONDIDA' && (survey.nota_geral || 0) <= 6 && "border-red-500/50"
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold font-cormorant uppercase tracking-wider">{survey.projeto?.nome || 'Sem Projeto'}</h3>
                          {survey.status === 'RESPONDIDA' && (survey.nota_geral || 0) <= 6 && (
                            <span className="bg-red-500/20 text-red-400 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 flex items-center gap-1 border border-red-500/30">
                              <AlertTriangle className="w-3 h-3" /> Atenção
                            </span>
                          )}
                        </div>
                        <p className="text-bronze text-[10px] uppercase tracking-widest font-bold">
                          {survey.cliente_nome} · {survey.tipo || 'Pós-Entrega'}
                        </p>
                        {survey.status === 'RESPONDIDA' && (
                          <p className="text-white/40 text-[10px] mt-1 uppercase font-medium">Nota: {survey.nota_geral}/10</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          "text-[9px] px-3 py-1 font-bold uppercase tracking-widest",
                          survey.status === 'RESPONDIDA' ? "bg-green-500/20 text-green-400" : 
                          survey.status === 'ARQUIVADA' ? "bg-white/10 text-white/40" : "bg-yellow-500/20 text-yellow-400"
                        )}>
                          {survey.status}
                        </span>
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <div className="flex gap-2 justify-end">
                            {survey.status === 'RESPONDIDA' && (survey.nota_geral || 0) >= 9 && (
                              <Button 
                                onClick={() => handleGenerateTestimonial(survey)}
                                disabled={generatingTestimonial}
                                className="h-8 bg-bronze hover:bg-bronze/90 text-[9px] uppercase font-bold tracking-widest rounded-none px-4"
                              >
                                {generatingTestimonial ? "Gerando..." : "Gerar Depoimento"}
                              </Button>
                            )}
                            {survey.status === 'RESPONDIDA' && (survey.nota_geral || 0) <= 6 && (
                              <Button 
                                onClick={() => openInternalNoteModal(survey)}
                                variant="outline"
                                className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10 text-[9px] uppercase font-bold tracking-widest rounded-none px-4"
                              >
                                Registrar Contato
                              </Button>
                            )}
                            {survey.status === 'RESPONDIDA' && (
                              <Button 
                                onClick={() => archivarPesquisa(survey.id)}
                                variant="outline" 
                                className="h-8 border-white/10 bg-transparent text-[9px] uppercase font-bold tracking-widest rounded-none hover:bg-white/5"
                              >
                                Arquivar
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => {
                              const link = `https://app.nl.arq.br/satisfacao/${survey.token}`;
                              navigator.clipboard.writeText(link);
                              toast({ title: "Link copiado!" });
                            }} className="text-white/40 hover:text-white">
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          {survey.status === 'RESPONDIDA' && (survey.nota_geral || 0) >= 9 && !hasTestimonial && (
                            <Button 
                              onClick={() => openReferralModal(survey)}
                              variant="outline"
                              className="h-8 border-bronze/30 text-bronze hover:bg-bronze/5 text-[9px] uppercase font-bold tracking-widest rounded-none w-full"
                            >
                              <UserPlus className="w-3 h-3 mr-2" /> Pedir Indicação
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
          <TabsContent value="depoimentos">
          <div className="space-y-6">
            <div className="flex justify-between items-end mb-4">
              <div className="space-y-1">
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">Depoimentos dos Clientes</h2>
                <div className="flex gap-4">
                  {testimonialsCount.pendentes > 0 && (
                    <span className="text-[9px] uppercase tracking-widest font-bold text-amber-500">{testimonialsCount.pendentes} PENDENTES DE APROVAÇÃO</span>
                  )}
                  {testimonialsCount.aprovados > 0 && (
                    <span className="text-[9px] uppercase tracking-widest font-bold text-bronze">{testimonialsCount.aprovados} PRONTOS PARA PUBLICAR</span>
                  )}
                </div>
              </div>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input 
                placeholder="BUSCAR POR CLIENTE, PROJETO OU CIDADE..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/[0.03] border-white/5 rounded-none pl-10 uppercase tracking-widest text-[10px] font-bold h-12 focus-visible:ring-bronze"
              />
            </div>

            <div className="flex gap-2 mb-8 border-b border-white/5 pb-4 overflow-x-auto">
              {['TODOS', 'PENDENTE APROVAÇÃO', 'APROVADOS', 'PUBLICADOS'].map(f => (
                <button
                  key={f}
                  onClick={() => setTestimonialsFilter(f)}
                  className={cn(
                    "text-[9px] uppercase tracking-widest font-bold px-4 py-2 border border-white/5 transition-all",
                    testimonialsFilter === f ? "bg-bronze text-white border-bronze" : "text-white/40 hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="grid gap-6">
              {filteredTestimonials.length === 0 ? (
                <div className="bg-white/[0.03] p-12 border border-white/5 text-center">
                  <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold">Nenhum depoimento encontrado para este filtro.</p>
                </div>
              ) : (
                filteredTestimonials.map((dep) => (
                  <div key={dep.id} className="bg-white/[0.03] p-8 border border-white/5 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold font-cormorant uppercase tracking-wider">{dep.cliente_nome || dep.pesquisa?.cliente_nome}</h3>
                          {dep.pesquisa?.video_url && (
                            <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 bg-bronze/20 text-bronze font-bold uppercase tracking-widest border border-bronze/30">
                              <FileVideo className="w-3 h-3" /> COM VÍDEO
                            </span>
                          )}
                        </div>
                        <p className="text-bronze text-[10px] uppercase tracking-widest font-bold">
                          {dep.pesquisa?.projeto?.nome} · {dep.pesquisa?.projeto?.tipo}
                        </p>
                      </div>
                      <span className={cn(
                        "text-[9px] px-3 py-1 font-bold uppercase tracking-widest",
                        dep.status === 'PUBLICADO' ? "bg-green-500/20 text-green-400" : 
                        dep.status === 'APROVADO' ? "bg-blue-500/20 text-blue-400" : 
                        dep.status === 'DESCARTADO' ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                      )}>
                        {dep.status === 'PENDENTE' ? 'PENDENTE APROVAÇÃO' : dep.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Instagram</Label>
                          <Button variant="ghost" size="icon" onClick={() => handleCopyText(dep.depoimento_instagram)} className="h-6 w-6 text-white/40 hover:text-white">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-white/70 italic text-sm font-cormorant leading-relaxed bg-white/5 p-4 border border-white/5 min-h-[100px]">
                          {dep.depoimento_instagram || dep.texto_formatado || "Não gerado"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Google</Label>
                          <Button variant="ghost" size="icon" onClick={() => handleCopyText(dep.depoimento_google)} className="h-6 w-6 text-white/40 hover:text-white">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-white/70 italic text-sm font-cormorant leading-relaxed bg-white/5 p-4 border border-white/5 min-h-[100px]">
                          {dep.depoimento_google || "Não gerado"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Frase Destaque</Label>
                          <Button variant="ghost" size="icon" onClick={() => handleCopyText(dep.frase_destaque)} className="h-6 w-6 text-white/40 hover:text-white">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-center bg-white/5 p-4 border border-white/5 min-h-[100px]">
                          <p className="text-white font-bold italic text-base font-cormorant leading-relaxed text-center">
                            {dep.frase_destaque ? `"${dep.frase_destaque}"` : "Não gerada"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                      {dep.status === 'PENDENTE' && (
                        <>
                          <Button onClick={() => updateTestimonialStatus(dep.id, 'APROVADO')} className="bg-bronze hover:bg-bronze/90 rounded-none uppercase tracking-widest text-[9px] font-bold">Aprovar</Button>
                          <Button onClick={() => updateTestimonialStatus(dep.id, 'DESCARTADO')} variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-none uppercase tracking-widest text-[9px] font-bold">Descartar</Button>
                        </>
                      )}
                      
                      {dep.status === 'APROVADO' && (
                        <>
                          <Button onClick={() => updateTestimonialStatus(dep.id, 'PUBLICADO')} className="bg-green-600 hover:bg-green-700 rounded-none uppercase tracking-widest text-[9px] font-bold">Marcar como Publicado</Button>
                          <Button onClick={() => window.open('https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID', '_blank')} variant="ghost" className="text-bronze hover:bg-bronze/5 rounded-none uppercase tracking-widest text-[9px] font-bold">Solicitar Avaliação Google</Button>
                        </>
                      )}

                      {dep.status === 'PUBLICADO' && (
                        <div className="flex items-center gap-2 text-green-400 text-[9px] uppercase font-bold tracking-widest bg-green-400/10 px-3 py-1">
                          <Check className="w-3 h-3" /> Publicado
                        </div>
                      )}
                      
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
                ))
              )}
            </div>
          </div>
          </TabsContent>

          <TabsContent value="nps">
            {stats.total === 0 ? (
              <div className="bg-white/[0.03] p-24 border border-white/5 text-center">
                <p className="text-white/40 uppercase tracking-widest text-[12px] font-bold">Nenhuma pesquisa respondida ainda.</p>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="grid grid-cols-4 gap-6">
                  <div className="bg-white/[0.03] p-8 border border-white/5 text-center">
                    <p className="text-bronze text-[10px] uppercase tracking-widest font-bold mb-2">Nota Média Geral</p>
                    <h4 className="text-6xl font-bold font-cormorant text-bronze">{stats.avg.toFixed(1)}</h4>
                  </div>
                  <div className="bg-white/[0.03] p-8 border border-white/5 text-center">
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2">Total Respondidas</p>
                    <h4 className="text-6xl font-bold font-cormorant">{stats.total}</h4>
                  </div>
                  <div className="bg-white/[0.03] p-8 border border-white/5 text-center">
                    <p className="text-green-500/60 text-[10px] uppercase tracking-widest font-bold mb-2">Promotores (≥ 9)</p>
                    <h4 className="text-6xl font-bold font-cormorant text-green-500">{stats.promoters}</h4>
                  </div>
                  <div className="bg-white/[0.03] p-8 border border-white/5 text-center">
                    <p className="text-red-500/60 text-[10px] uppercase tracking-widest font-bold mb-2">Detratores (≤ 6)</p>
                    <h4 className="text-6xl font-bold font-cormorant text-red-500">{stats.detractors}</h4>
                  </div>
                </div>

                <div className="bg-white/[0.03] p-10 border border-white/5">
                  <h3 className="text-xl font-bold font-cormorant uppercase tracking-[0.2em] mb-8">Benchmark por Categoria</h3>
                  <div className="space-y-6">
                    {stats.categoryAverages.map((cat) => (
                      <div key={cat.label} className="space-y-2">
                        <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                          <span>{cat.label}</span>
                          <span className="text-bronze">{cat.val.toFixed(1)} / 10.0</span>
                        </div>
                        <div className="h-1 bg-white/5 w-full">
                          <div className="h-full bg-bronze" style={{ width: `${cat.val * 10}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Dialog open={isFollowUpModalOpen} onOpenChange={setIsFollowUpModalOpen}>
        <DialogContent className="bg-white/[0.03] border-white/10 text-white rounded-none">
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
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white/[0.03] border-white/10 text-white rounded-none">
          <DialogHeader><DialogTitle className="uppercase tracking-widest font-cormorant text-2xl">Gerar Nova Pesquisa</DialogTitle></DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Projeto</Label>
              <Select onValueChange={setSelectedProjectId} value={selectedProjectId}>
                <SelectTrigger className="bg-transparent border-white/10 rounded-none">
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent className="bg-white/[0.03] border-white/10 text-white">
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome} — {p.nome_cliente}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Tipo de Pesquisa</Label>
              <RadioGroup value={selectedType} onValueChange={setSelectedType} className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Pós-Briefing" id="briefing" />
                  <Label htmlFor="briefing" className="text-sm">Pós-Briefing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Pós-Anteprojeto" id="anteprojeto" />
                  <Label htmlFor="anteprojeto" className="text-sm">Pós-Anteprojeto</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Pós-Entrega" id="entrega" />
                  <Label htmlFor="entrega" className="text-sm">Pós-Entrega</Label>
                </div>
              </RadioGroup>
            </div>
            
            {generatedToken && (
              <div className="p-4 bg-bronze/10 border border-bronze/20 space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-bronze">Link Gerado:</p>
                <div className="flex gap-2">
                  <Input readOnly value={`https://app.nl.arq.br/satisfacao/${generatedToken}`} className="bg-transparent border-white/10 rounded-none text-xs" />
                  <Button size="icon" onClick={() => {
                    navigator.clipboard.writeText(`https://app.nl.arq.br/satisfacao/${generatedToken}`);
                    toast({ title: "Link copiado!" });
                  }} className="bg-bronze hover:bg-bronze/90 rounded-none">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleGenerateLink} disabled={!selectedProjectId || creating} className="w-full bg-bronze hover:bg-bronze/90 rounded-none uppercase tracking-widest text-[10px] font-bold py-6">
              {creating ? "GERANDO..." : "GERAR LINK"}
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
