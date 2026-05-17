import React, { useState, useEffect } from 'react'; import { Monitor } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  LayoutGrid,
  List,
  MoreVertical,
  Share2,
  ExternalLink,
  Trash2,
  Sparkles,
  Star
} from 'lucide-react';
import { format, isSameWeek, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Projeto {
  id: string;
  nome: string;
  nome_cliente: string;
  tipo: string;
  cidade: string;
  area_m2: number;
  etapa_atual: string;
  status_geral: string;
  data_inicio: string;
  prazo_final: string;
}

interface EtapaInfo {
  etapa: string;
  status: string;
  data_entrega: string;
  data_inicio?: string;
}

const GestaoProjetos = () => {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [etapas, setEtapas] = useState<Record<string, EtapaInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [totalHorasMes, setTotalHorasMes] = useState(0);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: pData } = await supabase
        .from('projetos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (pData) {
        setProjetos(pData);
        
        // Fetch stages for these projects
        const { data: eData } = await supabase
          .from('projeto_etapas')
          .select('projeto_id, etapa, status, data_entrega, data_inicio');
        
        if (eData) {
          const grouped = eData.reduce((acc: any, curr) => {
            if (!acc[curr.projeto_id]) acc[curr.projeto_id] = [];
            acc[curr.projeto_id].push(curr);
            return acc;
          }, {});
          setEtapas(grouped);
        }
      }

      // Fetch hours for the month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: hData } = await supabase
        .from('sessoes_horas')
        .select('duracao_minutos')
        .gte('inicio', startOfMonth.toISOString());

      if (hData) {
        const total = hData.reduce((acc, curr) => {
          const val = typeof curr.duracao_minutos === 'string' ? parseFloat(curr.duracao_minutos) : curr.duracao_minutos;
          return acc + (Number.isNaN(val) ? 0 : (val || 0));
        }, 0);
        setTotalHorasMes(Math.round(total / 60) || 0);
      }

    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id: string, nomeCliente: string, tipo: string) => {
    try {
      setIsDeleting(id);
      
      const folderName = `${nomeCliente} - ${tipo}`;
      const projectPath = `/NL Arquitetos/07 - Projetos NL OS/${folderName}`;
      
      console.log("Excluindo pasta do Dropbox:", projectPath);
      
      const { error: dropboxError } = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'delete', path: projectPath }
      });

      if (dropboxError) {
        console.warn("Dropbox folder deletion error (might not exist):", dropboxError);
      }

      const { error: deleteError } = await supabase
        .from('projetos')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success("Projeto excluído com sucesso");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast.error(`Erro ao excluir projeto: ${error.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('projetos')
        .update({ status_geral: newStatus })
        .eq('id', id);

      if (error) throw error;

      if (newStatus === 'Entregue') {
        const projeto = projetos.find(p => p.id === id);
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        const { error: surveyError } = await supabase
          .from('pesquisas_satisfacao')
          .insert({
            projeto_id: id,
            cliente_nome: projeto?.nome_cliente || 'Cliente',
            token: token,
            status: 'PENDENTE'
          });

        if (!surveyError) {
          toast.success("Projeto entregue!", {
            description: "Pesquisa de satisfação gerada. Verifique o Módulo 09 para enviar ao cliente."
          });
        }
      }

      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleGerarConteudo = async (projeto: Projeto, currentEtapaInfo: EtapaInfo | undefined) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const proximaEntregaStr = currentEtapaInfo?.data_entrega 
        ? format(parseISO(currentEtapaInfo.data_entrega), "dd 'DE' MMM", { locale: ptBR }) 
        : 'N/A';

      // Clear previous context first
      await supabase
        .from('contexto_marketing_ativo')
        .delete()
        .eq('user_id', userData.user.id);

      // Insert new context
      const { error } = await supabase
        .from('contexto_marketing_ativo')
        .insert({
          user_id: userData.user.id,
          cliente: projeto.nome_cliente,
          tipo: projeto.tipo,
          etapa_atual: projeto.etapa_atual,
          status: currentEtapaInfo?.status || 'Em andamento',
          proxima_entrega: proximaEntregaStr
        });

      if (error) throw error;

      navigate('/marketing/ia?tab=captions');
      toast.success("Contexto enviado para o Marketing IA!");
    } catch (error: any) {
      console.error("Erro ao gerar conteúdo:", error);
      toast.error("Erro ao preparar contexto de marketing");
    }
  };

  const activeProjectsCount = projetos.filter(p => p.status_geral === 'Em andamento').length;
  
  const deliveriesThisWeek = Object.values(etapas).flat().filter(e => {
    if (!e.data_entrega) return false;
    return isSameWeek(new Date(), parseISO(e.data_entrega), { weekStartsOn: 1 });
  }).length;

  const pendingApprovals = Object.values(etapas).flat().filter(e => e.status === 'Aguardando aprovação').length;

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white font-mono">
      <Sidebar user="Equipe NL" />
      
      <main className="flex-1 ml-[230px] p-12">
        <header className="mb-12">
          <h1 className="text-5xl font-cormorant font-light tracking-tight mb-2 italic">06 · Gestão de Projetos</h1>
          <p className="text-[10px] tracking-[0.5em] text-[#8B7355] font-bold uppercase">PROJETOS ATIVOS · ETAPAS E ENTREGAS</p>
        </header>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <MetricCard 
            label="Projetos Ativos" 
            value={activeProjectsCount} 
            icon={<LayoutGrid size={18} />} 
          />
          <MetricCard 
            label="Entregas esta semana" 
            value={deliveriesThisWeek} 
            icon={<Calendar size={18} />} 
            accent={deliveriesThisWeek > 0}
          />
          <MetricCard 
            label="Aprovações pendentes" 
            value={pendingApprovals} 
            icon={<AlertCircle size={18} />} 
            warning={pendingApprovals > 0}
          />
          <MetricCard 
            label="Horas no mês" 
            value={`${totalHorasMes}h`} 
            icon={<Clock size={18} />} 
          />
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {projetos.map(projeto => {
            const projetoEtapas = etapas[projeto.id] || [];
            const currentEtapaInfo = projetoEtapas.find(e => e.etapa.toUpperCase() === projeto.etapa_atual.toUpperCase());
            const daysRemaining = currentEtapaInfo?.data_entrega 
              ? differenceInDays(parseISO(currentEtapaInfo.data_entrega), new Date()) 
              : null;

            return (
              <div 
                key={projeto.id} 
                className="bg-white/[0.02] border border-white/5 p-10 flex flex-col md:flex-row items-center gap-12 group hover:bg-white/[0.04] hover:border-[#8B7355]/30 transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#8B7355] scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-2xl font-cormorant font-medium truncate group-hover:text-[#8B7355] transition-colors">{projeto.nome_cliente}</h3>
                    <div className="h-px w-8 bg-[#8B7355]/30 group-hover:w-12 transition-all duration-500" />
                    <span className="text-[8px] uppercase tracking-[0.2em] text-[#8B7355] font-bold">
                      {projeto.tipo}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-[10px] text-white/40 uppercase tracking-widest font-bold">
                    <span>{projeto.cidade || 'N/A'}</span>
                    <span>{projeto.area_m2 ? `${projeto.area_m2}m²` : 'N/A'}</span>
                  </div>
                </div>

                <div className="w-full md:w-80">
                  <CompactTimeline projeto={projeto} projetoEtapas={projetoEtapas} />
                </div>

                <div className="w-full md:w-48 text-center md:text-left">
                  <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] mb-1 font-bold">Próxima entrega</p>
                  <p className={cn(
                    "text-xs font-bold",
                    daysRemaining !== null && daysRemaining <= 5 ? "text-rose-500" : "text-white"
                  )}>
                    {currentEtapaInfo?.data_entrega ? format(parseISO(currentEtapaInfo.data_entrega), "dd 'DE' MMM", { locale: ptBR }) : 'N/A'}
                    {daysRemaining !== null && (
                      <span className="ml-2 text-[9px] opacity-60">({daysRemaining} dias)</span>
                    )}
                  </p>
                </div>

                <div className="w-full md:w-32 flex flex-col items-center md:items-start">
                  <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] mb-1 font-bold">Status</p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    currentEtapaInfo?.status === 'Aprovado' ? "text-emerald-500" : 
                    currentEtapaInfo?.status === 'Aguardando aprovação' ? "text-amber-500" : "text-white/60"
                  )}>
                    {currentEtapaInfo?.status || 'Em andamento'}
                  </span>
                </div>

                <div className="w-full md:w-auto flex flex-row items-center justify-end gap-2 ml-auto">
                  <Button 
                    onClick={() => {
                      toast.success("Link da Experiência Concierge copiado!", {
                        description: "O cliente receberá o acesso ao Atelier Visual."
                      });
                    }}
                    className="bg-white/5 hover:bg-white/10 text-[#8B7355] border border-[#8B7355]/20 rounded-none h-9 px-4 text-[9px] uppercase font-bold tracking-widest transition-all duration-300 whitespace-nowrap"
                  >
                    <Share2 size={12} className="mr-2" /> Compartilhar
                  </Button>
                  <Button 
                    onClick={() => navigate(`/apresentacao/${projeto.id}`)}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-none h-9 px-4 text-[9px] uppercase font-bold tracking-widest transition-all duration-300 whitespace-nowrap group/pres"
                  >
                    <Monitor size={12} className="mr-2 group-hover/pres:text-bronze transition-colors" /> Modo Apresentação
                  </Button>
                  <Button 
                    onClick={() => navigate(`/projetos/detalhe/${projeto.id}`)}
                    className="bg-white/5 hover:bg-[#8B7355] text-white border border-white/10 rounded-none h-9 px-6 text-[10px] uppercase font-bold tracking-widest transition-all duration-300 whitespace-nowrap"
                  >
                    Abrir projeto
                  </Button>

                  <Button 
                    onClick={() => handleGerarConteudo(projeto, currentEtapaInfo)}
                    className="bg-[#8B7355] hover:bg-[#8B7355]/80 text-white border border-[#8B7355]/30 rounded-none h-9 px-4 text-[9px] uppercase font-bold tracking-widest transition-all duration-300 flex items-center gap-2 shadow-lg whitespace-nowrap"
                  >
                    <Star size={12} className="fill-current text-white" /> Gerar Conteúdo
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        disabled={isDeleting === projeto.id}
                        className="bg-white/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/10 rounded-none h-9 px-4 text-[9px] uppercase font-bold tracking-widest transition-all duration-300"
                      >
                        <Trash2 size={12} className={cn(isDeleting === projeto.id && "animate-spin")} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#0A0A0A] border border-white/10 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-cormorant italic text-2xl">Excluir Projeto?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60 font-inter text-sm">
                          Tem certeza que deseja excluir o projeto de <span className="text-white font-bold">{projeto.nome_cliente}</span>? 
                          Esta ação removerá o projeto do sistema e a pasta correspondente no Dropbox.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5 rounded-none">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteProject(projeto.id, projeto.nome_cliente, projeto.tipo)}
                          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none"
                        >
                          Confirmar Exclusão
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}

          {projetos.length === 0 && !loading && (
            <div className="text-center py-24 border border-dashed border-white/10">
              <p className="text-white/40 uppercase tracking-widest text-[11px]">Nenhum projeto ativo encontrado.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const MetricCard = ({ label, value, icon, accent, warning }: { label: string, value: string | number, icon: React.ReactNode, accent?: boolean, warning?: boolean }) => (
  <div className="bg-white/[0.02] border border-white/5 p-8 flex flex-col gap-4 relative overflow-hidden group hover:border-[#8B7355]/20 transition-all duration-500">
    <div className="absolute -right-4 -top-4 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
      {React.cloneElement(icon as React.ReactElement, { size: 64 })}
    </div>
    <div className={cn(
      "w-10 h-10 flex items-center justify-center border",
      accent ? "border-[#8B7355]/40 text-[#8B7355] bg-[#8B7355]/5" : 
      warning ? "border-rose-500/40 text-rose-500 bg-rose-500/5" : "border-white/10 text-white/30 bg-white/5"
    )}>
      {icon}
    </div>
    <div>
      <p className="text-[11px] uppercase text-[#777777] mb-2 font-normal font-inter">{label}</p>
      <p className={cn(
        "text-[22px] font-normal font-inter",
        accent ? "text-[#FFFFFF]" : warning ? "text-[#FFFFFF]" : "text-[#FFFFFF]"
      )}>
        {value}
      </p>
    </div>
  </div>
);

const CompactTimeline = ({ projeto, projetoEtapas }: { projeto: Projeto, projetoEtapas: EtapaInfo[] }) => {
  const ETAPAS_ORDER = ['BRIEFING', 'CONCEITO', 'ESTUDO', 'EXECUTIVO', 'DETALHAMENTO', 'ACOMPANHAMENTO'];
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-[9px] text-[#8B7355] font-bold uppercase tracking-widest">
          {projeto.etapa_atual}
        </span>
        <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
          Evolução do Ativo
        </span>
      </div>
      
      <div className="flex gap-1 h-[3px]">
        {ETAPAS_ORDER.map((etapaNome) => {
          const etapaData = projetoEtapas.find(e => e.etapa.toUpperCase() === etapaNome);
          const isCurrent = projeto.etapa_atual.toUpperCase() === etapaNome;
          const isDone = etapaData?.status === 'Aprovado';
          const isFuture = !isCurrent && !isDone;
          const isOverdue = etapaData?.data_entrega && 
                          new Date(etapaData.data_entrega) < new Date() && 
                          !isDone;

          return (
            <div 
              key={etapaNome}
              className={cn(
                "flex-1 transition-all duration-500",
                isDone ? "bg-[#3A3A3A]" : 
                isCurrent ? (isOverdue ? "bg-[#8B2020]" : "bg-[#8B7355]") :
                isFuture ? "bg-white/5" : "bg-white/5"
              )}
            />
          );
        })}
      </div>
      
      <div className="flex justify-between text-[7px] text-white/20 font-bold uppercase tracking-tighter">
        {ETAPAS_ORDER.map(e => (
          <span key={e} className={cn(projeto.etapa_atual.toUpperCase() === e && "text-[#8B7355]")}>
            {e.slice(0, 4)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default GestaoProjetos;