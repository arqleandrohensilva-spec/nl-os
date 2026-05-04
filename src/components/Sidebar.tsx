import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Users, 
  LayoutGrid, 
  BarChart3, 
  FileText, 
  Target,
  Clock,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}

const NavItem = ({ label, icon, active, disabled }: NavItemProps) => (
  <div className={cn(
    "flex items-center gap-3 py-2.5 px-4 transition-all duration-200 group relative",
    active ? "text-white" : "text-white/40 hover:text-white/70",
    disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
  )}>
    {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-bronze" />}
    <span className={cn("transition-colors", active ? "text-bronze" : "group-hover:text-bronze/70")}>
      {icon}
    </span>
    <span className="text-[11px] tracking-[0.1em] uppercase font-medium">{label}</span>
    {disabled && (
      <span className="ml-auto text-[7px] border border-white/10 px-1 py-0.5 rounded-[1px] tracking-tighter opacity-50">
        SOON
      </span>
    )}
  </div>
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
              <span className="text-sm font-medium text-white tracking-widest">ARCH</span>
              <span className="text-[10px] text-bronze font-mono">OS</span>
            </div>
            <p className="text-[8px] text-muted uppercase tracking-[0.2em] leading-none">Studio System</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-2">
        <div className="mb-8">
          <p className="px-4 mb-4 text-[9px] text-muted uppercase tracking-[0.2em] font-bold opacity-50">Intelligence</p>
          <NavItem label="Pipeline" icon={<Target size={14} />} active />
          <NavItem label="Analytics" icon={<BarChart3 size={14} />} disabled />
        </div>

        <div className="mb-8">
          <p className="px-4 mb-4 text-[9px] text-muted uppercase tracking-[0.2em] font-bold opacity-50">Operations</p>
          <NavItem label="Projetos" icon={<LayoutGrid size={14} />} disabled />
          <NavItem label="Time Log" icon={<Clock size={14} />} disabled />
          <NavItem label="Propostas" icon={<FileText size={14} />} disabled />
        </div>

        <div>
          <p className="px-4 mb-4 text-[9px] text-muted uppercase tracking-[0.2em] font-bold opacity-50">Management</p>
          <NavItem label="Financeiro" icon={<Settings size={14} />} disabled />
          <NavItem label="Settings" icon={<Settings size={14} />} disabled />
        </div>
      </div>

      <div className="p-4 m-4 bg-white/5 border border-white/5 rounded-[2px] mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-bronze/20 flex items-center justify-center text-bronze text-[10px] font-bold border border-bronze/20 uppercase">
            {user.substring(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white font-medium truncate capitalize">{user}</p>
            <p className="text-[9px] text-muted uppercase tracking-tighter">Partner</p>
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
