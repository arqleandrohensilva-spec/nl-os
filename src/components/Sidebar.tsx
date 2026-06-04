import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { LogOut, ChevronDown, LayoutGrid, DollarSign, PenTool, FileText, BarChart3, Settings, Bell, Calculator, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import NotificationsPanel from './NotificationsPanel';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '@/contexts/SidebarContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface NavItemProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  isCollapsed?: boolean;
}

const NavItem = ({ label, icon, active, disabled, onClick, isCollapsed }: NavItemProps) => {
  const content = (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={cn(
        'flex flex-col transition-all duration-200 group relative',
        isCollapsed ? (
          icon ? 'py-4 px-0 items-center justify-center border-l-0 w-full mb-1' : 'py-[10px] px-4 items-start justify-start border-l-0 w-full hover:bg-white/10'
        ) : 'py-2.5 px-10 border-l-2',
        !isCollapsed && active ? 'border-bronze bg-bronze/15 text-white' : 'border-transparent text-white/70',
        isCollapsed && icon && active && "text-bronze",
        !icon && active && "text-bronze",
        disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer hover:bg-white/10"
      )}>
      <div className={cn("flex items-center", (isCollapsed && icon) ? "justify-center" : "justify-between w-full gap-3")}>
        <div className={cn("flex items-center", (!isCollapsed || !icon) ? "w-full gap-3" : "")}>
          {icon && <div className={cn("transition-colors flex-shrink-0", active ? "text-bronze" : "text-white/60 group-hover:text-white/80")}>{icon}</div>}
          <span className={cn(
            "text-[12px] transition-colors whitespace-nowrap",
            (isCollapsed && icon) ? "hidden" : "text-[10px] tracking-[0.05em] font-medium uppercase opacity-90",
            active && !isCollapsed ? "text-white" : "group-hover:text-white/70",
            isCollapsed && "px-0"
          )}>
            {label}
          </span>
        </div>
        {!isCollapsed && disabled && (
          <span className="text-[7px] border border-bronze/30 text-bronze px-1 py-0.5 rounded-[1px] tracking-tighter shrink-0">
            em breve
          </span>
        )}
      </div>
    </div>
  );

  if (isCollapsed && !icon) { // This means it's an item inside a popover
    return content;
  }

  if (isCollapsed && icon) { // Items in main sidebar (Clientes, Pipeline)
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[#1A1A1A] border-white/10 text-[10px] uppercase tracking-widest text-white font-bold rounded-none">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

interface SectionAccordionProps {
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: number;
  isCollapsed?: boolean;
  onPopoverClick?: (label: string, top: number) => void;
  isPopoverOpen?: boolean;
}

const SectionAccordion = ({ 
  label, 
  icon, 
  isOpen, 
  onToggle, 
  children, 
  badge, 
  isCollapsed,
  onPopoverClick,
  isPopoverOpen
}: SectionAccordionProps) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (!isCollapsed) {
      onToggle();
    } else {
      e.stopPropagation();
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        onPopoverClick?.(label, rect.top);
      }
    }
  };

  return (
    <div className="mb-1 relative">
      <button 
        ref={buttonRef}
        onClick={handleClick}
        className={cn(
          "w-full flex items-center transition-colors duration-200",
          isCollapsed ? "justify-center py-4 px-0" : "justify-between px-6 py-3",
          isOpen && !isCollapsed ? "bg-white/10 text-white" : "text-white/70 hover:text-white/90 hover:bg-white/[0.05]",
          isPopoverOpen && isCollapsed && "bg-white/10"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("transition-colors", (isOpen && !isCollapsed) || (isPopoverOpen && isCollapsed) ? "text-bronze" : "text-white/60 group-hover:text-white/80")}>
            {icon}
          </div>
          {!isCollapsed && (
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
          )}
        </div>
        {!isCollapsed && (
          <ChevronDown 
            size={10} 
            className={cn("transition-transform duration-300", isOpen && "rotate-180")} 
          />
        )}
      </button>
      {!isCollapsed && (
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="py-1">
            {children}
          </div>
        </div>
      )}
      {isCollapsed && isPopoverOpen && (
        <div 
          className="fixed left-[64px] bg-[#1a1a1a] border border-white/10 p-0 overflow-hidden w-48 rounded-[6px] z-[9999]"
          style={{ top: buttonRef.current?.getBoundingClientRect().top || 100 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col py-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ user: initialUser }: { user: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<number>(0);
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
    setPopoverAberto(null);
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setPopoverAberto(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

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
    if (path === '/financeiro' || path === '/financeiro/base') {
      setOpenSections(prev => ({ ...prev, 'FINANCEIRO': true }));
    } else if (path === '/projetos/gestao' || path === '/projetos/horas' || path.startsWith('/projetos/detalhe/')) {
      setOpenSections(prev => ({ ...prev, 'PROJETOS': true }));
    } else if (path === '/propostas/biblioteca' || path === '/propostas/documentos') {
      setOpenSections(prev => ({ ...prev, 'CONFIGURAÇÕES': true }));
    } else if (path === '/sistema/configuracoes') {
      setOpenSections(prev => ({ ...prev, 'CONFIGURAÇÕES': true }));
    } else if (path === '/marketing/ia' || path === '/marketing/satisfacao' || path === '/scripts-atendimento') {
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
    <div className={cn(
      "h-screen bg-[#0F0F0F] border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 transition-all duration-300",
      isCollapsed ? "w-[64px]" : "w-[230px]"
    )}>
      <div className={cn("transition-all duration-300", isCollapsed ? "p-3 mb-4" : "p-8 mb-6")}>
        <div className={cn("flex items-center relative", isCollapsed ? "justify-center" : "justify-between")}>
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
            <div className="w-10 h-10 bg-bronze flex items-center justify-center text-white font-cormorant text-xl shadow-[0_4px_20px_rgba(139,115,85,0.3)] shrink-0">
              NL
            </div>
            {!isCollapsed && (
              <div className="space-y-0.5 overflow-hidden">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-white tracking-[0.15em] uppercase leading-none">NL OS</span>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={toggleSidebar}
            className={cn(
              "absolute w-6 h-6 bg-bronze text-white flex items-center justify-center border border-white/10 shadow-lg hover:scale-110 transition-all z-[60]",
              isCollapsed ? "left-1/2 -translate-x-1/2 top-14" : "-right-11 top-2"
            )}
            style={{ cursor: 'pointer' }}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          
          {!isCollapsed && (
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "p-2 rounded-full transition-colors relative",
                  showNotifications ? "text-bronze" : "text-white/70 hover:text-bronze"
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
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide">
        <div className="relative">
          <NavItem 
            label="CLIENTES" 
            icon={<Users size={14} />}
            active={location.pathname === '/clientes' || location.pathname.startsWith('/clientes/')} 
            onClick={() => navigate('/clientes')} 
            isCollapsed={isCollapsed}
          />
          {!isCollapsed && pendingBriefingsCount > 0 && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
               <span className="bg-bronze text-[#0F0F0F] text-[8px] font-bold px-1.5 py-0.5 rounded-[1px] min-w-[14px] text-center">
                {pendingBriefingsCount}
              </span>
            </div>
          )}
        </div>

        <NavItem 
          label="PIPELINE" 
          icon={<LayoutGrid size={14} />}
          active={location.pathname === '/pipeline'} 
          onClick={() => navigate('/pipeline')} 
          isCollapsed={isCollapsed}
        />

        <SectionAccordion 
          label="PROJETOS" 
          icon={<PenTool size={14} />}
          isOpen={!!openSections['PROJETOS']}
          onToggle={() => toggleSection('PROJETOS')}
          isCollapsed={isCollapsed}
          onPopoverClick={(label, top) => { setPopoverAberto(label); setPopoverPosition(top); }}
          isPopoverOpen={popoverAberto === 'PROJETOS'}
        >
          <NavItem 
            label="Gestão de Projetos" 
            active={location.pathname === '/projetos/gestao'} 
            onClick={() => navigate('/projetos/gestao')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            label="Controle de Horas" 
            active={location.pathname === '/projetos/horas'} 
            onClick={() => navigate('/projetos/horas')} 
            isCollapsed={isCollapsed}
          />
        </SectionAccordion>

        <SectionAccordion 
          label="FINANCEIRO" 
          icon={<DollarSign size={14} />}
          isOpen={!!openSections['FINANCEIRO']}
          onToggle={() => toggleSection('FINANCEIRO')}
          isCollapsed={isCollapsed}
          onPopoverClick={(label, top) => { setPopoverAberto(label); setPopoverPosition(top); }}
          isPopoverOpen={popoverAberto === 'FINANCEIRO'}
        >
          <NavItem 
            label="Financeiro" 
            active={location.pathname === '/financeiro'} 
            onClick={() => navigate('/financeiro')} 
            isCollapsed={isCollapsed}
          />
        </SectionAccordion>

        <SectionAccordion 
          label="MARKETING" 
          icon={<BarChart3 size={14} />}
          isOpen={!!openSections['MARKETING']}
          onToggle={() => toggleSection('MARKETING')}
          isCollapsed={isCollapsed}
          onPopoverClick={(label, top) => { setPopoverAberto(label); setPopoverPosition(top); }}
          isPopoverOpen={popoverAberto === 'MARKETING'}
        >
          <NavItem 
            label="Marketing com IA" 
            active={location.pathname === '/marketing/ia'} 
            onClick={() => navigate('/marketing/ia')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            label="Pesquisa de Satisfação" 
            active={location.pathname === '/marketing/satisfacao'} 
            onClick={() => navigate('/marketing/satisfacao')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            label="Scripts" 
            active={location.pathname === '/scripts-atendimento'} 
            onClick={() => navigate('/scripts-atendimento')} 
            isCollapsed={isCollapsed}
          />
        </SectionAccordion>

        <SectionAccordion 
          label="CONFIGURAÇÕES" 
          icon={<Settings size={14} />}
          isOpen={!!openSections['CONFIGURAÇÕES']}
          onToggle={() => toggleSection('CONFIGURAÇÕES')}
          isCollapsed={isCollapsed}
          onPopoverClick={(label, top) => { setPopoverAberto(label); setPopoverPosition(top); }}
          isPopoverOpen={popoverAberto === 'CONFIGURAÇÕES'}
        >
          <NavItem 
            label="Configurações" 
            active={location.pathname === '/sistema/configuracoes'} 
            onClick={() => navigate('/sistema/configuracoes')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            label="Base Financeira" 
            active={location.pathname === '/financeiro/base'} 
            onClick={() => navigate('/financeiro/base')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            label="Biblioteca" 
            active={location.pathname === '/propostas/biblioteca'} 
            onClick={() => navigate('/propostas/biblioteca')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            label="Documentos" 
            active={location.pathname === '/propostas/documentos'} 
            onClick={() => navigate('/propostas/documentos')} 
            isCollapsed={isCollapsed}
          />
        </SectionAccordion>
      </div>

      <div className={cn("border-t border-white/5 bg-white/[0.02] mt-auto relative", isCollapsed ? "p-3" : "p-6")}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="w-9 h-9 border border-bronze/40 flex items-center justify-center text-bronze text-[11px] font-bold bg-bronze/5 uppercase shrink-0">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white font-medium truncate capitalize">{displayName}</p>
              <p className="text-[9px] text-bronze/60 uppercase tracking-widest font-bold">Sócio</p>
            </div>
          )}
          {!isCollapsed && (
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
              }}
              className="text-white/20 hover:text-white transition-colors p-1"
            >
              <LogOut size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
