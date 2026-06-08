import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  ShieldCheck, 
  Users, 
  Settings as SettingsIcon, 
  ExternalLink, 
  Eye, 
  Copy,
  Layout,
  FileEdit,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const PainelAdministrativo = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: recentClients } = useQuery({
    queryKey: ['admin-recent-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, etapa_fluxo, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching clients:', error);
        return [];
      }
      return data || [];
    }
  });

  const { data: recentProjects } = useQuery({
    queryKey: ['admin-recent-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome, token_cliente, criado_em')
        .order('criado_em', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }
      return data || [];
    }
  });

  const copyBriefingLink = (token: string) => {
    if (!token) {
      toast.error('Token não disponível para este projeto');
      return;
    }
    const url = `${window.location.origin}/briefing/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link do briefing copiado!');
  };

  return (
    <div className="flex min-h-screen bg-[#0F0F0F]">
      <Sidebar user={sessionStorage.getItem('nl_user') || 'Sócio'} />
      <main className="flex-1 transition-[margin] duration-300 ml-[var(--sidebar-width)] p-12">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-bronze/10 rounded-[1px]">
              <ShieldCheck size={20} className="text-bronze" />
            </div>
            <p className="text-[10px] text-bronze uppercase tracking-[0.4em] font-bold">Módulo Administrativo · NL OS</p>
          </div>
          <h1 className="text-4xl font-cormorant italic text-white">Painel Administrativo</h1>
          <p className="text-white/40 text-xs mt-2 uppercase tracking-widest">Gerenciamento centralizado de acessos e configurações</p>
        </header>

        <Tabs defaultValue="overview" className="space-y-8" onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-none h-auto gap-1">
            <TabsTrigger 
              value="overview" 
              className="rounded-none px-6 py-2.5 text-[10px] uppercase tracking-widest data-[state=active]:bg-bronze data-[state=active]:text-white"
            >
              Visão Geral
            </TabsTrigger>
            <TabsTrigger 
              value="access" 
              className="rounded-none px-6 py-2.5 text-[10px] uppercase tracking-widest data-[state=active]:bg-bronze data-[state=active]:text-white"
            >
              Acessos Rápidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Últimos Clientes */}
              <div className="bg-[#1A1816] border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Users size={80} className="text-white" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-white tracking-[0.1em] uppercase mb-6 flex items-center gap-2">
                    <Users size={16} className="text-bronze" />
                    Últimos Clientes
                  </h3>
                  <div className="space-y-4">
                    {recentClients && recentClients.length > 0 ? recentClients.map((cliente) => (
                      <div key={cliente.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div>
                          <p className="text-[11px] text-white font-medium">{cliente.nome}</p>
                          <p className="text-[9px] text-white/30 uppercase tracking-widest">Etapa: {cliente.etapa_fluxo || 'Não definida'}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[9px] text-bronze hover:text-bronze hover:bg-bronze/10 rounded-none uppercase tracking-widest"
                          onClick={() => navigate(`/clientes/${cliente.id}`)}
                        >
                          Ver Ficha <ArrowRight size={12} className="ml-1" />
                        </Button>
                      </div>
                    )) : (
                      <p className="text-[10px] text-white/20 uppercase tracking-widest">Nenhum cliente recente</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Últimos Projetos / Briefings */}
              <div className="bg-[#1A1816] border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Layout size={80} className="text-white" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-white tracking-[0.1em] uppercase mb-6 flex items-center gap-2">
                    <FileEdit size={16} className="text-bronze" />
                    Briefings Recentes
                  </h3>
                  <div className="space-y-4">
                    {recentProjects && recentProjects.length > 0 ? recentProjects.map((projeto) => (
                      <div key={projeto.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div>
                          <p className="text-[11px] text-white font-medium">{projeto.nome}</p>
                          <p className="text-[9px] text-white/30 uppercase tracking-widest">Iniciado em {projeto.criado_em ? new Date(projeto.criado_em).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-white/40 hover:text-bronze hover:bg-bronze/10 rounded-none"
                            onClick={() => copyBriefingLink(projeto.token_cliente)}
                            title="Copiar Link"
                          >
                            <Copy size={12} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-white/40 hover:text-bronze hover:bg-bronze/10 rounded-none"
                            onClick={() => navigate(`/briefing/${projeto.token_cliente}`)}
                            title="Abrir Briefing"
                          >
                            <Eye size={12} />
                          </Button>
                        </div>
                      </div>
                    )) : (
                      <p className="text-[10px] text-white/20 uppercase tracking-widest">Nenhum briefing recente</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="access" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AdminCard 
                title="Configurações do Sistema" 
                desc="Gerencie Dropbox, templates e metas mensais."
                icon={<SettingsIcon size={20} />}
                onClick={() => navigate('/sistema/configuracoes')}
              />
              <AdminCard 
                title="Gestão de Projetos" 
                desc="Acompanhe o andamento de todas as obras e projetos."
                icon={<Layout size={20} />}
                onClick={() => navigate('/projetos/gestao')}
              />
              <AdminCard 
                title="Base Financeira" 
                desc="Configure contas, categorias e dados base."
                icon={<SettingsIcon size={20} />}
                onClick={() => navigate('/financeiro/base')}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const AdminCard = ({ title, desc, icon, onClick }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="bg-[#1A1816] border border-white/5 p-8 text-left hover:border-bronze transition-all group relative overflow-hidden"
  >
    <div className="mb-6 p-3 bg-bronze/10 text-bronze inline-block rounded-none group-hover:bg-bronze group-hover:text-black transition-all">
      {icon}
    </div>
    <h4 className="text-xs font-bold text-white tracking-[0.1em] uppercase mb-2">{title}</h4>
    <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-widest">{desc}</p>
    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
      <ArrowRight size={14} className="text-bronze" />
    </div>
  </button>
);

export default PainelAdministrativo;