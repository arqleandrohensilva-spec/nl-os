import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Send, MessageSquare, Trophy, TrendingUp, TrendingDown, Users, Copy, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PesquisaSatisfacao = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avg: 0,
    total: 0,
    promoters: 0,
    detractors: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: surveysData } = await supabase
        .from('pesquisas_satisfacao')
        .select('*, projeto:projetos(client_name, type)')
        .order('criado_em', { ascending: false });
      
      const { data: testimonialsData } = await supabase
        .from('depoimentos')
        .select('*, pesquisa:pesquisas_satisfacao(*)')
        .order('criado_em', { ascending: false });

      setSurveys(surveysData || []);
      setTestimonials(testimonialsData || []);

      const responded = (surveysData || []).filter(s => s.status === 'RESPONDIDA');
      const totalResponded = responded.length;
      const sum = responded.reduce((acc, curr) => acc + (curr.nota_geral || 0), 0);
      const avg = totalResponded > 0 ? sum / totalResponded : 0;
      const promoters = responded.filter(s => (s.nota_geral || 0) >= 9).length;
      const detractors = responded.filter(s => (s.nota_geral || 0) <= 6).length;

      setStats({
        avg,
        total: totalResponded,
        promoters,
        detractors
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
            <Button className="bg-bronze hover:bg-bronze/90 rounded-none uppercase tracking-widest text-[10px] font-bold">
              <Plus className="w-4 h-4 mr-2" /> Nova Pesquisa
            </Button>
          </div>

          <div className="grid gap-4">
            {surveys.map((survey) => (
              <div key={survey.id} className="bg-[#242220] p-6 border border-white/5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-bold font-cormorant uppercase tracking-wider">{survey.cliente_nome}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#242220] p-8 border border-white/5 space-y-8">
              <h3 className="text-xl uppercase font-cormorant tracking-widest border-b border-white/5 pb-4">Desempenho Geral</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-white/40 uppercase tracking-widest text-xs">Melhor Avaliado</span>
                  <span className="font-bold text-bronze uppercase">Casa da Montanha</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 uppercase tracking-widest text-xs">Tendência</span>
                  <div className="flex items-center text-green-500 gap-1 font-bold">
                    <TrendingUp className="w-4 h-4" /> 12% superior
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#242220] p-8 border border-white/5">
              <h3 className="text-xl uppercase font-cormorant tracking-widest border-b border-white/5 pb-4 mb-6">Média por Categoria</h3>
              <div className="space-y-6">
                {[
                  { label: 'Arquitetura', val: 9.8 },
                  { label: 'Interiores', val: 9.2 },
                  { label: 'Comercial', val: 8.5 }
                ].map(cat => (
                  <div key={cat.label} className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                      <span>{cat.label}</span>
                      <span>{cat.val}</span>
                    </div>
                    <div className="h-1.5 bg-white/5">
                      <div className="h-full bg-bronze" style={{ width: `${cat.val * 10}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </main>
    </div>
  );
};

export default PesquisaSatisfacao;