import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { LogOut, ChevronDown, LayoutGrid, DollarSign, PenTool, FileText, BarChart3 } from 'lucide-react';

interface NavItemProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
}

const NavItem = ({ label, active, disabled }: NavItemProps) => (
  <div className={cn(
    "flex flex-col py-2.5 px-10 transition-all duration-200 group relative border-l-2",
    active ? "border-bronze bg-bronze/10 text-white" : "border-transparent text-white/40",
    disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer hover:bg-white/5"
  )}>
    <div className="flex items-center justify-between gap-2">
      <span className={cn(
        "text-[10px] tracking-[0.05em] font-medium transition-colors uppercase",
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

interface SectionAccordionProps {
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const SectionAccordion = ({ label, icon, isOpen, onToggle, children }: SectionAccordionProps) => (
  <div className="mb-1">
    <button 
      onClick={onToggle}
      className={cn(
        "w-full flex items-center justify-between px-6 py-3 transition-colors duration-200",
        isOpen ? "bg-white/5 text-white" : "text-white/40 hover:text-white/60 hover:bg-white/[0.02]"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("transition-colors", isOpen ? "text-bronze" : "text-white/20")}>
          {icon}
        </div>
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold">
          {label}
        </span>
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

const Sidebar = ({ user }: { user: string }) => {
  const [openSection, setOpenSection] = useState<string | null>('COMERCIAL');

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const initials = user.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="w-[230px] h-screen bg-[#0F0F0F] border-r border-white/5 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-8 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-bronze flex items-center justify-center text-white font-cormorant text-xl shadow-[0_4px_20px_rgba(139,115,85,0.3)]">
            NL
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-white tracking-[0.15em] uppercase leading-none">NL OS</span>
            </div>
            <p className="text-[8px] text-bronze uppercase tracking-[0.3em] leading-none font-bold">Módulo Pipeline</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide">
        <SectionAccordion 
          label="COMERCIAL" 
          icon={<LayoutGrid size={14} />}
          isOpen={openSection === 'COMERCIAL'}
          onToggle={() => toggleSection('COMERCIAL')}
        >
          <NavItem label="01 · Pipeline de Leads" active />
          <NavItem label="Contatos" disabled />
        </SectionAccordion>

        <SectionAccordion 
          label="FINANCEIRO" 
          icon={<DollarSign size={14} />}
          isOpen={openSection === 'FINANCEIRO'}
          onToggle={() => toggleSection('FINANCEIRO')}
        >
          <NavItem label="02 · Base Financeira" disabled />
          <NavItem label="07 · Fin. de Projetos" disabled />
          <NavItem label="12 · Dashboard" disabled />
        </SectionAccordion>

        <SectionAccordion 
          label="PROJETOS" 
          icon={<PenTool size={14} />}
          isOpen={openSection === 'PROJETOS'}
          onToggle={() => toggleSection('PROJETOS')}
        >
          <NavItem label="03 · Controle de Horas" disabled />
          <NavItem label="06 · Gestão" disabled />
          <NavItem label="10 · Modo Cliente" disabled />
        </SectionAccordion>

        <SectionAccordion 
          label="PROPOSTAS" 
          icon={<FileText size={14} />}
          isOpen={openSection === 'PROPOSTAS'}
          onToggle={() => toggleSection('PROPOSTAS')}
        >
          <NavItem label="04 · Tracking" disabled />
          <NavItem label="05 · Biblioteca" disabled />
          <NavItem label="08 · Documentos" disabled />
        </SectionAccordion>

        <SectionAccordion 
          label="MARKETING" 
          icon={<BarChart3 size={14} />}
          isOpen={openSection === 'MARKETING'}
          onToggle={() => toggleSection('MARKETING')}
        >
          <NavItem label="09 · Satisfação" disabled />
          <NavItem label="11 · CMO Virtual" disabled />
        </SectionAccordion>
      </div>

      <div className="p-6 border-t border-white/5 bg-white/[0.02] mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-bronze/40 flex items-center justify-center text-bronze text-[11px] font-bold bg-bronze/5 uppercase">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white font-medium truncate capitalize">{user}</p>
            <p className="text-[9px] text-bronze/60 uppercase tracking-widest font-bold">Sócio</p>
          </div>
          <button 
            onClick={() => {
              sessionStorage.removeItem('nl_user');
              window.location.reload();
            }}
            className="text-white/20 hover:text-white transition-colors p-1"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;