import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Wallet, 
  Briefcase, 
  FileText, 
  Megaphone,
  ChevronRight
} from 'lucide-react';

interface NavItemProps {
  label: string;
  subLabel: string;
  active?: boolean;
  disabled?: boolean;
}

const NavItem = ({ label, subLabel, active, disabled }: NavItemProps) => (
  <div className={cn(
    "flex flex-col py-3 px-4 border-l-2 transition-all duration-200",
    active ? "border-bronze bg-bronze/10 text-white" : "border-transparent text-white/40",
    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-white/5"
  )}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] tracking-widest uppercase">{subLabel}</span>
      {disabled && <span className="text-[8px] border border-white/20 px-1 rounded-[2px]">em breve</span>}
    </div>
    <span className={cn("text-[13px] font-medium mt-0.5", active ? "text-white" : "text-white/40")}>{label}</span>
  </div>
);

const Sidebar = ({ user }: { user: string }) => {
  return (
    <div className="w-[230px] h-screen bg-graphite flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 pb-8">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-cormorant text-white">NL</span>
          <span className="text-xs text-bronze tracking-[0.3em] font-medium">OS</span>
        </div>
        <p className="text-[9px] text-muted uppercase tracking-widest mt-1">Sistema Operacional</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mb-6">
          <p className="px-6 mb-2 text-[9px] text-muted uppercase tracking-[0.15em]">Leads</p>
          <NavItem label="01 · Pipeline" subLabel="Pipeline" active />
        </div>

        <div className="mb-6">
          <p className="px-6 mb-2 text-[9px] text-muted uppercase tracking-[0.15em]">Financeiro</p>
          <NavItem label="02 · Base Financeira" subLabel="Financeiro" disabled />
          <NavItem label="07 · Fin. Projetos" subLabel="Financeiro" disabled />
          <NavItem label="12 · Dashboard" subLabel="Financeiro" disabled />
        </div>

        <div className="mb-6">
          <p className="px-6 mb-2 text-[9px] text-muted uppercase tracking-[0.15em]">Projetos</p>
          <NavItem label="03 · Horas" subLabel="Projetos" disabled />
          <NavItem label="06 · Gestão" subLabel="Projetos" disabled />
          <NavItem label="10 · Modo Cliente" subLabel="Projetos" disabled />
        </div>

        <div className="mb-6">
          <p className="px-6 mb-2 text-[9px] text-muted uppercase tracking-[0.15em]">Propostas</p>
          <NavItem label="04 · Tracking" subLabel="Propostas" disabled />
          <NavItem label="05 · Biblioteca" subLabel="Propostas" disabled />
          <NavItem label="08 · Documentos" subLabel="Propostas" disabled />
        </div>

        <div className="mb-6">
          <p className="px-6 mb-2 text-[9px] text-muted uppercase tracking-[0.15em]">Marketing</p>
          <NavItem label="09 · Satisfação" subLabel="Marketing" disabled />
          <NavItem label="11 · CMO Virtual" subLabel="Marketing" disabled />
        </div>
      </div>

      <div className="p-6 border-t border-white/5 bg-white/[0.02]">
        <div className="flex flex-col">
          <span className="text-[11px] text-white capitalize">{user}</span>
          <span className="text-[9px] text-muted uppercase tracking-wider">Diretoria</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
