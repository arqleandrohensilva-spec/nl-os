import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { LogOut, ChevronDown, LayoutGrid, DollarSign, PenTool, FileText, BarChart3, Settings, Bell, Calculator, Users } from 'lucide-react';
import NotificationsPanel from './NotificationsPanel';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '@/integrations/supabase/client';

interface NavItemProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const NavItem = ({ label, icon, active, disabled, onClick }: NavItemProps) => (
  <div 
    onClick={!disabled ? onClick : undefined}
    className={cn(
      "flex flex-col py-2.5 px-10 transition-all duration-200 group relative border-l-2",
      active ? "border-bronze bg-bronze/10 text-white" : "border-transparent text-white/[0.4]",
      disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer hover:bg-white/[0.06]"
    )}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {icon && <div className={cn("transition-colors", active ? "text-bronze" : "text-white/[0.18] group-hover:text-white/[0.4]")}>{icon}</div>}
        <span className={cn(
          "text-[10px] tracking-[0.05em] font-medium transition-colors uppercase",
          active ? "text-white" : "group-hover:text-white/70"
        )}>
          {label}
        </span>
      </div>
      {disabled && (
        <span className="text-[7px] border border-bronze/30 text-bronze px-1 py-0.5 rounded-[1px] tracking-tighter shrink-0">
          em breve
        </span>
      )}
    </div>
  </div>
);

interface SectionAccordionProps {
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: number;
}

const SectionAccordion = ({ label, icon, isOpen, onToggle, children, badge }: SectionAccordionProps) => (
  <div className="mb-1">
    <button 
      onClick={onToggle}
      className={cn(
        "w-full flex items-center justify-between px-6 py-3 transition-colors duration-200",
        isOpen ? "bg-white/[0.06] text-white" : "text-white/[0.4] hover:text-white/60 hover:bg-white/[0.02]"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("transition-colors", isOpen ? "text-bronze" : "text-white/[0.18]")}>
          {icon}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold">
            {label}
          </span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-bronze text-[#0F0F0F] text-[8px] font-bold px-1.5 py-0.5 rounded-[1px] min-w-[14px] text-center">
              {badge}
            </span>
          )}
        </div>
      </div>
      <ChevronDown 
        size={10} 
        className={cn("transition-transform duration-300", isOpen && "rotate-180")} 
      />
    </button>
    <div className={cn(
      "overflow-hidden transition-all duration-300 ease-in-out",
      isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
    )}>
      <div className="py-1">
        {children}
      </div>
    </div>
  </div>
);

const Sidebar = ({ user: initialUser }: { user: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const saved = sessionStorage.getItem('sidebar_sections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { 'LEADS': true };
      }
    }
    return { 'LEADS': true };
  });

  useEffect(() => {
    const getAuthUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getAuthUser();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/financeiro/base' || path === '/projetos/horas' || path === '/financeiro/projetos') {
      setOpenSections(prev => ({ ...prev, 'FINANCEIRO': true }));
    } else if (path === '/projetos/gestao' || path.startsWith('/projetos/detalhe/')) {
      setOpenSections(prev => ({ ...prev, 'PROJETOS': true }));
    } else if (path.startsWith('/propostas/') || path.startsWith('/calculadora')) {
      setOpenSections(prev => ({ ...prev, 'PROPOSTAS': true }));
    } else if (path.startsWith('/clientes')) {
      setOpenSections(prev => ({ ...prev, 'CLIENTES': true }));
    } else if (path === '/sistema/configuracoes') {
      setOpenSections(prev => ({ ...prev, 'SISTEMA': true }));
    } else if (path === '/marketing/ia' || path === '/marketing/satisfacao') {
      setOpenSections(prev => ({ ...prev, 'MARKETING': true }));
    }
  }, [location.pathname]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = { ...prev, [section]: !prev[section] };
      sessionStorage.setItem('sidebar_sections', JSON.stringify(next));
      return next;
    });
  };

  const getDisplayName = () => {
    if (!userEmail) return initialUser || 'Sócio';
    if (userEmail.toLowerCase() === 'leandro@nlarquitetos.com.br') return 'Leandro';
    if (userEmail.toLowerCase() === 'neandro@nlarquitetos.com.br') return 'Neandro';
    return initialUser || userEmail.split('@')[0];
  };

  const displayName = getDisplayName();
  const initials = displayName.toLowerCase() === 'leandro' ? 'LE' : 
                   displayName.toLowerCase() === 'neandro' ? 'NE' : 
                   displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const unreadCount = notifications.filter(n => !n.lida).length;

  const { data: pendingBriefings = [] } = useQuery({
    queryKey: ['pending-briefings-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('briefings')
        .select('id')
        .eq('status', 'aguardando_triagem');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000 // Refetch every 30s
  });

  const pendingBriefingsCount = pendingBriefings.length;

  const checkAndCreateNotifications = async () => {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const fiveDaysAgo = new Date(today.getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();
    const threeDaysAgo = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString();
    const twoDaysFromNow = new Date(today.getTime() + (2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    const { data: existingToday } = await supabase
      .from('notificacoes')
      .select('tipo, modulo, created_at')
      .eq('user_id', user.id)
      .gt('created_at', new Date(today.getTime() - (24 * 60 * 60 * 1000)).toISOString());

    const hasRecent = (tipo: string, modulo: string) => 
      existingToday?.some(n => n.tipo === tipo && n.modulo === modulo);

    // 1. Leads Proposta Enviada > 5 dias
    const { data: leadsProposta } = await supabase
      .from('leads')
      .select('id, nome, updated_at')
      .or('stage.eq.PROPOSTA ENVIADA,stage.eq.Proposta Enviada')
      .lt('updated_at', fiveDaysAgo);

    for (const lead of (leadsProposta || [])) {
      if (!hasRecent('urgente', `/`)) {
        const diff = Math.floor((today.getTime() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        await supabase.from('notificacoes').insert({
          user_id: user.id,
          tipo: 'urgente',
          titulo: `${lead.nome} · Proposta sem retorno há ${diff} dias`,
          modulo: '/'
        });
      }
    }

    // 2. Parcela vencendo em 2 dias
    const { data: parcelasVencendo } = await supabase
      .from('financeiro_parcelas')
      .select('id, cliente_nome, valor, data_vencimento')
      .eq('status', 'pendente')
      .eq('data_vencimento', twoDaysFromNow);

    for (const p of (parcelasVencendo || [])) {
      if (!hasRecent('financeiro', '/financeiro/projetos')) {
        await supabase.from('notificacoes').insert({
          user_id: user.id,
          tipo: 'financeiro',
          titulo: `Parcela de R$ ${Number(p.valor).toLocaleString('pt-BR')} vence em 2 dias · ${p.cliente_nome}`,
          modulo: '/financeiro/projetos'
        });
      }
    }

    // 3. Lead sem contato > 7 dias
    const { data: leadsSemContato } = await supabase
      .from('leads')
      .select('id, nome, proxima_acao_data')
      .neq('stage', 'FECHADO')
      .neq('stage', 'Fechado')
      .lt('proxima_acao_data', sevenDaysAgo);

    for (const lead of (leadsSemContato || [])) {
      if (!hasRecent('lead', '/')) {
        const actionDate = lead.proxima_acao_data ? new Date(lead.proxima_acao_data) : new Date();
        const diff = Math.floor((today.getTime() - actionDate.getTime()) / (1000 * 60 * 60 * 24));
        await supabase.from('notificacoes').insert({
          user_id: user.id,
          tipo: 'lead',
          titulo: `${lead.nome} · Sem contato há ${diff} dias`,
          modulo: '/'
        });
      }
    }

    // 4. Checklist pendente > 3 dias
    const { data: checklistPendente } = await supabase
      .from('documentos_checklist')
      .select('id, item, updated_at, projetos(nome)')
      .eq('status', 'pendente')
      .lt('updated_at', threeDaysAgo);

    for (const item of (checklistPendente || [])) {
      const projName = (item as any).projetos?.nome || 'Projeto';
      if (!hasRecent('projeto', '/projetos/gestao')) {
        await supabase.from('notificacoes').insert({
          user_id: user.id,
          tipo: 'projeto',
          titulo: `${projName} · Itens pendentes no checklist`,
          modulo: '/projetos/gestao'
        });
      }
    }

    // 5. Nota baixa <= 6
    const { data: satisfacaoBaixa } = await supabase
      .from('pesquisas_satisfacao')
      .select('id, nota_geral, respondida_em')
      .lte('nota_geral', 6)
      .gt('respondida_em', sevenDaysAgo);

    for (const sat of (satisfacaoBaixa || [])) {
      if (!hasRecent('satisfacao', '/marketing/satisfacao')) {
        await supabase.from('notificacoes').insert({
          user_id: user.id,
          tipo: 'satisfacao',
          titulo: `Avaliação baixa recebida · nota ${sat.nota_geral}/10`,
          modulo: '/marketing/satisfacao'
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
  };

  useEffect(() => {
    checkAndCreateNotifications();
  }, [location.pathname]);

  return (
    <div className="w-[230px] h-screen bg-[#0D0D0D] border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-50">
      <div className="p-8 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-bronze flex items-center justify-center text-white font-cormorant text-xl shadow-[0_4px_20px_rgba(139,115,85,0.3)]">
              NL
            </div>
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-white tracking-[0.15em] uppercase leading-none">NL OS</span>
              </div>
              <p className="text-[8px] text-bronze uppercase tracking-[0.3em] leading-none font-bold">
                {location.pathname === '/financeiro/base' ? 'Módulo Financeiro' : 'Módulo Pipeline'}
              </p>
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "p-2 rounded-full transition-colors relative",
                showNotifications ? "text-bronze" : "text-white/[0.4] hover:text-bronze"
              )}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <div className="w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full absolute -top-0.5 -right-0.5 flex items-center justify-center">
                  {unreadCount}
                </div>
              )}
            </button>

            <NotificationsPanel 
              isOpen={showNotifications} 
              onClose={() => setShowNotifications(false)} 
              className="left-0"
            />

          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide">
        <SectionAccordion 
          label="CLIENTES" 
          icon={<Users size={14} />}
          isOpen={!!openSections['CLIENTES']}
          onToggle={() => toggleSection('CLIENTES')}
          badge={pendingBriefingsCount}
        >
          <NavItem 
            label="01 · Carteira de Clientes" 
            active={location.pathname === '/clientes'} 
            onClick={() => navigate('/clientes')} 
          />
        </SectionAccordion>

        <SectionAccordion 
          label="LEADS" 
          icon={<LayoutGrid size={14} />}
          isOpen={!!openSections['LEADS']}
          onToggle={() => toggleSection('LEADS')}
        >
          <NavItem 
            label="02 · Pipeline de Leads" 
            active={location.pathname === '/pipeline'} 
            onClick={() => navigate('/pipeline')} 
          />
          <NavItem 
            label="Scripts de Atendimento" 
            active={location.pathname === '/scripts-atendimento'} 
            onClick={() => navigate('/scripts-atendimento')} 
          />
        </SectionAccordion>

        <SectionAccordion 
          label="FINANCEIRO" 
          icon={<DollarSign size={14} />}
          isOpen={!!openSections['FINANCEIRO']}
          onToggle={() => toggleSection('FINANCEIRO')}
        >
          <NavItem 
            label="02 · Base Financeira" 
            active={location.pathname === '/financeiro/base'} 
            onClick={() => navigate('/financeiro/base')} 
          />
          <NavItem 
            label="03 · Controle de Horas" 
            active={location.pathname === '/projetos/horas'} 
            onClick={() => navigate('/projetos/horas')} 
          />
          <NavItem 
            label="07 · Financeiro de Projetos" 
            active={location.pathname === '/financeiro/projetos'} 
            onClick={() => navigate('/financeiro/projetos')} 
          />
        </SectionAccordion>

        <SectionAccordion 
          label="PROJETOS" 
          icon={<PenTool size={14} />}
          isOpen={!!openSections['PROJETOS']}
          onToggle={() => toggleSection('PROJETOS')}
        >
          <NavItem 
            label="06 · Gestão de Projetos" 
            active={location.pathname === '/projetos/gestao' || location.pathname.startsWith('/projetos/detalhe/')} 
            onClick={() => navigate('/projetos/gestao')} 
          />
        </SectionAccordion>

        <NavItem 
          label="04 · CALCULADORA" 
          icon={<Calculator size={12} />}
          active={location.pathname.startsWith('/calculadora')} 
          onClick={() => navigate('/calculadora')} 
        />


        <SectionAccordion 
          label="PROPOSTAS" 
          icon={<FileText size={14} />}
          isOpen={!!openSections['PROPOSTAS']}
          onToggle={() => toggleSection('PROPOSTAS')}
        >
          <NavItem 
            label="04 · Tracking" 
            active={location.pathname === '/propostas/tracking'} 
            onClick={() => navigate('/propostas/tracking')} 
          />
          <NavItem 
            label="05 · Biblioteca" 
            active={location.pathname === '/propostas/biblioteca'} 
            onClick={() => navigate('/propostas/biblioteca')} 
          />
          <NavItem 
            label="08 · Documentos" 
            active={location.pathname === '/propostas/documentos'} 
            onClick={() => navigate('/propostas/documentos')} 
          />
        </SectionAccordion>

        <SectionAccordion 
          label="MARKETING" 
          icon={<BarChart3 size={14} />}
          isOpen={!!openSections['MARKETING']}
          onToggle={() => toggleSection('MARKETING')}
        >
          <NavItem 
            label="09 · Pesquisa de Satisfação" 
            active={location.pathname === '/marketing/satisfacao'} 
            onClick={() => navigate('/marketing/satisfacao')} 
          />
          <NavItem 
            label="11 · Marketing com IA" 
            active={location.pathname === '/marketing/ia'} 
            onClick={() => navigate('/marketing/ia')} 
          />
        </SectionAccordion>

        <SectionAccordion 
          label="SISTEMA" 
          icon={<Settings size={14} />}
          isOpen={!!openSections['SISTEMA']}
          onToggle={() => toggleSection('SISTEMA')}
        >
          <NavItem 
            label="09 · Configurações" 
            active={location.pathname === '/sistema/configuracoes'} 
            onClick={() => navigate('/sistema/configuracoes')} 
          />
        </SectionAccordion>
      </div>

      <div className="p-6 border-t border-white/[0.06] bg-white/[0.02] mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-bronze/40 flex items-center justify-center text-bronze text-[11px] font-bold bg-bronze/5 uppercase">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white font-medium truncate capitalize">{displayName}</p>
            <p className="text-[9px] text-bronze/60 uppercase tracking-widest font-bold">Sócio</p>
          </div>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="text-white/[0.18] hover:text-white transition-colors p-1"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
