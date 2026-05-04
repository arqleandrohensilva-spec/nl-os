import React from 'react';
import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';

interface NavItemProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
}

const NavItem = ({ label, active, disabled }: NavItemProps) => (
  <div className={cn(
    "flex flex-col py-2.5 px-6 transition-all duration-200 group relative border-l-2",
    active ? "border-bronze bg-bronze/10 text-white" : "border-transparent text-white/40",
    disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer hover:bg-white/5"
  )}>
    <div className="flex items-center justify-between gap-2">
      <span className={cn(
        "text-[11px] tracking-[0.05em] font-medium transition-colors",
        active ? "text-white" : "group-hover:text-white/70"
      )}>
        {label}
      </span>
      {disabled && (
        <span className="text-[7px] border border-bronze/30 text-bronze px-1 py-0.5 rounded-[1px] tracking-tighter shrink-0">
          em breve
        </span>
      )}
    </div>
  </div>
);

const SectionHeader = ({ label }: { label: string }) => (
  <p className="px-6 mt-8 mb-3 text-[9px] text-muted uppercase tracking-[0.2em] font-bold opacity-50">
    ─── {label} ───
  </p>
);

const Sidebar = ({ user }: { user: string }) => {
  return (
    <div className="w-[230px] h-screen bg-[#0F0F0F] border-r border-white/5 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-8 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-bronze flex items-center justify-center text-white font-cormorant text-lg">
            NL
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-medium text-white tracking-widest uppercase">OS</span>
            </div>
            <p className="text-[8px] text-muted uppercase tracking-[0.2em] leading-none font-mono">Sistema Operacional</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <SectionHeader label="LEADS" />
        <NavItem label="01 · Pipeline" active />

        <SectionHeader label="FINANCEIRO" />
        <NavItem label="02 · Base Financeira" disabled />
        <NavItem label="07 · Fin. de Projetos" disabled />
        <NavItem label="12 · Dashboard" disabled />

        <SectionHeader label="PROJETOS" />
        <NavItem label="03 · Controle de Horas" disabled />
        <NavItem label="06 · Gestão" disabled />
        <NavItem label="10 · Modo Cliente" disabled />

        <SectionHeader label="PROPOSTAS" />
        <NavItem label="04 · Tracking" disabled />
        <NavItem label="05 · Biblioteca" disabled />
        <NavItem label="08 · Documentos" disabled />

        <SectionHeader label="MARKETING" />
        <NavItem label="09 · Satisfação" disabled />
        <NavItem label="11 · CMO Virtual" disabled />
      </div>

      <div className="p-6 border-t border-white/5 bg-white/[0.02] mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-bronze/20 flex items-center justify-center text-bronze text-[10px] font-bold border border-bronze/20 uppercase">
            {user.substring(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white font-medium truncate capitalize">{user}</p>
            <p className="text-[9px] text-muted uppercase tracking-tighter">Sócio</p>
          </div>
          <button 
            onClick={() => {
              sessionStorage.removeItem('nl_user');
              window.location.reload();
            }}
            className="text-muted hover:text-white transition-colors"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
