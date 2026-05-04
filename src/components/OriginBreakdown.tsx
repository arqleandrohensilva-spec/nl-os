import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Lead } from '@/lib/types';
import { ChevronDown, BarChart3 } from 'lucide-react';

interface OriginBreakdownProps {
  leads: Lead[];
}

const OriginBreakdown = ({ leads }: OriginBreakdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const origins = leads.reduce((acc, lead) => {
    acc[lead.origem] = (acc[lead.origem] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = leads.length;
  const sortedOrigins = Object.entries(origins)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));

  if (total === 0) return null;

  const maxCount = sortedOrigins[0]?.count || 0;

  return (
    <div className="border-b border-beige bg-white">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-10 py-2.5 flex items-center justify-between hover:bg-beige/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={12} className="text-bronze" />
          <span className="text-[9px] font-bold text-bronze uppercase tracking-[0.2em] font-mono">
            Origem dos Leads
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3">
            {sortedOrigins.slice(0, 3).map(origin => (
              <span key={origin.name} className="text-[8px] font-bold text-muted uppercase tracking-tighter">
                {origin.name}: {origin.count}
              </span>
            ))}
          </div>
          <ChevronDown 
            size={12} 
            className={cn("text-muted transition-transform duration-300", isOpen && "rotate-180")} 
          />
        </div>
      </button>

      <div className={cn(
        "overflow-hidden transition-all duration-500 ease-in-out",
        isOpen ? "max-h-[500px] opacity-100 pb-6" : "max-h-0 opacity-0"
      )}>
        <div className="px-10 space-y-3">
          {sortedOrigins.map((origin) => (
            <div key={origin.name} className="space-y-1">
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-bold text-graphite uppercase tracking-widest">
                  {origin.name}
                </span>
                <span className="text-[9px] font-mono text-muted">
                  {origin.count} {origin.count === 1 ? 'lead' : 'leads'} · {origin.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-beige/30 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000 ease-out",
                    origin.count === maxCount ? "bg-bronze" : "bg-graphite"
                  )}
                  style={{ width: `${isOpen ? origin.percentage : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OriginBreakdown;