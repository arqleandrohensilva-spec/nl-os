import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Send, MessageSquare, Trophy, TrendingUp, TrendingDown, Users, Copy, Check, Clock, ExternalLink } from 'lucide-react';
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
        .select('*, projeto:projetos(nome, tipo)')
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

      // Best project (highest avg)
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

      // Categories averages
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

  const handleCreateSurvey = async () => {
    if (!selectedProjectId) {
      toast({ variant: "destructive", title: "Selecione um projeto" });
      return;
    }

    setCreating(true);
    try {
      const project = projects.find(p => p.id === selectedProjectId);
      const token = crypto.randomUUID();

      const { data, error } = await supabase
        .from('pesquisas_satisfacao')
        .insert({
          projeto_id: selectedProjectId,
          cliente_nome: project?.nome_cliente || 'Cliente',
          token,
          status: 'PENDENTE'
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Pesquisa gerada!" });
      setIsModalOpen(false);
      fetchData();

      // Show the link
      const link = `${window.location.origin}/satisfacao/${token}`;
      navigator.clipboard.writeText(link);
      toast({ title: "Link copiado para a área de transferência", description: link });
      
    } catch (error) {
      console.error('Error creating survey:', error);
      toast({ variant: "destructive", title: "Erro ao gerar pesquisa" });
    } finally {
      setCreating(false);
    }
  };

  const handleSendWhatsApp = (survey: any) => {
    const link = `${window.location.origin}/satisfacao/${survey.token}`;
    const text = encodeURIComponent(`Olá ${survey.cliente_nome}, tudo bem? Gostaríamos muito de saber sua opinião sobre o projeto finalizado. Poderia responder esta breve pesquisa? ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleIndication = (survey: any) => {
    const text = encodeURIComponent(`${survey.cliente_nome}, que ótimo saber que o projeto superou suas expectativas! Você conhece alguém que também esteja planejando construir ou reformar e que valorize processo técnico? Seria um prazer ajudar.`);
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
        {/* Header */}
        <div className="mb-10">
        <h1 className="text-3xl font-bold uppercase tracking-[0.2em] font-cormorant">09 · Pesquisa de Satisfação</h1>
        <p className="text-bronze uppercase tracking-widest text-[10px] font-bold mt-1">PÓS-ENTREGA · DEPOIMENTOS · PAINEL NPS</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-[#242220] p-6 border border-white/5">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2">Nota Média Geral</p>
          <p className="text-5xl font-bold text-bronze font-cormorant">{stats.avg.toFixed(1)}</p>
        </div>
        <div className="bg-[#242220] p-6 border border-white/5">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2">Total Respondidas</p>
          <p className="text-5xl font-bold text-white font-cormorant">{stats.total}</p>
        </div>
        <div className="bg-[#242220] p-6 border border-white/5">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2">Promotores</p>
          <p className="text-5xl font-bold text-green-500 font-cormorant">{stats.promoters}</p>
        </div>
        <div className="bg-[#242220] p-6 border border-white/5">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2">Detratores</p>
          <p className="text-5xl font-bold text-red-500 font-cormorant">{stats.detractors}</p>
        </div>
      </div>

      <Tabs defaultValue="pesquisas" className="space-y-6">
        <TabsList className="bg-[#242220] border-white/5 rounded-none p-0 h-auto">
          <TabsTrigger value="pesquisas" className="rounded-none py-4 px-8 data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest font-bold">Pesquisas</TabsTrigger>
          <TabsTrigger value="depoimentos" className="rounded-none py-4 px-8 data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest font-bold">Depoimentos</TabsTrigger>
          <TabsTrigger value="nps" className="rounded-none py-4 px-8 data-[state=active]:bg-bronze data-[state=active]:text-white text-[10px] uppercase tracking-widest font-bold">Painel NPS</TabsTrigger>
        </TabsList>

        <TabsContent value="pesquisas">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl uppercase font-cormorant tracking-widest">Lista de Pesquisas</h2>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-bronze hover:bg-bronze/90 rounded-none uppercase tracking-widest text-[10px] font-bold">
                  <Plus className="w-4 h-4 mr-2" /> Nova Pesquisa
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#242220] border-white/10 text-white rounded-none">
                <DialogHeader>
                  <DialogTitle className="uppercase tracking-widest font-cormorant text-2xl">Gerar Nova Pesquisa</DialogTitle>
                </DialogHeader>
                <div className="py-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Selecionar Projeto</Label>
                    <Select onValueChange={setSelectedProjectId} value={selectedProjectId}>
                      <SelectTrigger className="bg-white/5 border-white/10 rounded-none h-12 text-white">
                        <SelectValue placeholder="Escolha um projeto concluído..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#242220] border-white/10 text-white">
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id} className="focus:bg-bronze focus:text-white rounded-none">
                            {project.nome} - {project.nome_cliente}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleCreateSurvey}
                    disabled={creating || !selectedProjectId}
                    className="w-full bg-bronze hover:bg-bronze/90 rounded-none uppercase tracking-widest text-[10px] font-bold py-6"
                  >
                    {creating ? "GERANDO..." : "GERAR LINK E COPIAR"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {surveys.length === 0 && (
              <div className="bg-[#242220] p-12 border border-white/5 text-center text-white/40 uppercase tracking-widest text-xs font-bold">
                Nenhuma pesquisa gerada ainda.
              </div>
            )}
            {surveys.map((survey) => (
              <div key={survey.id} className="bg-[#242220] p-6 border border-white/5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold font-cormorant uppercase tracking-wider">{survey.cliente_nome}</p>
                    <p className="text-[10px] text-bronze uppercase font-bold tracking-widest">· {survey.projeto?.nome}</p>
                  </div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">
                    {format(new Date(survey.criado_em), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Status</p>
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 font-bold uppercase tracking-widest",
                      survey.status === 'RESPONDIDA' ? "bg-green-500/20 text-green-400" : "bg-bronze/20 text-bronze"
                    )}>
                      {survey.status}
                    </span>
                  </div>

                  {survey.status === 'RESPONDIDA' && (
                    <div className="text-center">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Nota</p>
                      <span className={cn(
                        "text-xl font-bold font-cormorant",
                        (survey.nota_geral || 0) >= 9 ? "text-green-500" : (survey.nota_geral || 0) >= 7 ? "text-yellow-500" : "text-red-500"
                      )}>
                        {survey.nota_geral}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleSendWhatsApp(survey)}
                      className="border-white/10 bg-transparent text-white/60 hover:text-white rounded-none uppercase tracking-widest text-[9px] font-bold"
                    >
                      <Send className="w-3 h-3 mr-2" /> WhatsApp
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const link = `${window.location.origin}/satisfacao/${survey.token}`;
                        navigator.clipboard.writeText(link);
                        toast({ title: "Link copiado!" });
                      }}
                      className="border-white/10 bg-transparent text-white/60 hover:text-white rounded-none uppercase tracking-widest text-[9px] font-bold"
                    >
                      <Copy className="w-3 h-3 mr-2" /> Copiar Link
                    </Button>
                    {(survey.nota_geral || 0) >= 9 && survey.status === 'RESPONDIDA' && (
                      <Button 
                        onClick={() => handleIndication(survey)}
                        className="bg-green-600/20 text-green-400 hover:bg-green-600/40 rounded-none border-none uppercase tracking-widest text-[9px] font-bold"
                      >
                        Indicação
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="depoimentos">
          <div className="grid gap-6">
            {testimonials.length === 0 && (
              <div className="bg-[#242220] p-12 border border-white/5 text-center text-white/40 uppercase tracking-widest text-xs font-bold">
                Nenhum depoimento gerado ainda.
              </div>
            )}
            {testimonials.map((dep) => (
              <div key={dep.id} className="bg-[#242220] p-8 border border-white/5 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold font-cormorant uppercase tracking-wider">{dep.pesquisa?.cliente_nome}</h3>
                    <p className="text-bronze text-[10px] uppercase tracking-widest font-bold">Nota {dep.pesquisa?.nota_geral} · Promotor</p>
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
                    <Button 
                      onClick={() => updateTestimonialStatus(dep.id, 'APROVADO')}
                      className="bg-bronze hover:bg-bronze/90 rounded-none uppercase tracking-widest text-[9px] font-bold"
                    >
                      Aprovar
                    </Button>
                  )}
                  {dep.status === 'APROVADO' && (
                    <Button 
                      onClick={() => updateTestimonialStatus(dep.id, 'PUBLICADO')}
                      className="bg-green-600 hover:bg-green-700 rounded-none uppercase tracking-widest text-[9px] font-bold"
                    >
                      Marcar como Publicado
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigator.clipboard.writeText(dep.texto_formatado);
                      toast({ title: "Copiado!" });
                    }}
                    className="border-white/10 bg-transparent text-white/60 hover:text-white rounded-none uppercase tracking-widest text-[9px] font-bold"
                  >
                    <Copy className="w-3 h-3 mr-2" /> Copiar Texto
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="nps">
          {stats.total === 0 ? (
            <div className="bg-[#242220] p-24 border border-white/5 text-center">
              <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 uppercase tracking-widest text-xs font-bold">Nenhuma pesquisa respondida ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#242220] p-8 border border-white/5 space-y-8">
                <h3 className="text-xl uppercase font-cormorant tracking-widest border-b border-white/5 pb-4">Desempenho Geral</h3>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase tracking-widest text-xs">Melhor Avaliado</span>
                    <span className="font-bold text-bronze uppercase">{stats.bestProject}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase tracking-widest text-xs">Total de Respondentes</span>
                    <div className="flex items-center text-white gap-2 font-bold font-cormorant text-xl">
                      {stats.total} <Users className="w-4 h-4 text-white/40" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#242220] p-8 border border-white/5">
                <h3 className="text-xl uppercase font-cormorant tracking-widest border-b border-white/5 pb-4 mb-6">Média por Categoria</h3>
                <div className="space-y-6">
                  {stats.categoryAverages.map(cat => (
                    <div key={cat.label} className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                        <span>{cat.label}</span>
                        <span>{cat.val.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 bg-white/5">
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
    </div>
  );
};

export default SatisfacaoDashboard;