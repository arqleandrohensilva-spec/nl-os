import React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FinancialHealthBarProps {
  costPerHour: number;
  benchmark: number;
  marketName: string;
}

const FinancialHealthBar: React.FC<FinancialHealthBarProps> = ({ 
  costPerHour, 
  benchmark,
  marketName
}) => {
  const percentage = Math.min(Math.round((costPerHour / benchmark) * 100), 100);
  
  let status: 'CRÍTICO' | 'ATENÇÃO' | 'SAUDÁVEL' = 'CRÍTICO';
  let color = '#B83232'; // Vermelho

  if (percentage > 80) {
    status = 'SAUDÁVEL';
    color = '#2E7D52'; // Verde
  } else if (percentage >= 50) {
    status = 'ATENÇÃO';
    color = '#8B7355'; // Bronze
  }

  return (
    <div className="w-full mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-bold text-graphite uppercase tracking-[0.2em] font-dm-mono">Saúde Financeira</h3>
        <span className={cn(
          "px-2 py-0.5 rounded-[2px] text-[8px] font-bold uppercase tracking-widest border",
          status === 'CRÍTICO' ? "bg-red-50 border-red-200 text-red-800" :
          status === 'ATENÇÃO' ? "bg-amber-50 border-amber-200 text-amber-800" :
          "bg-green-50 border-green-200 text-green-800"
        )}>
          {status}
        </span>
      </div>
      
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className="relative w-full h-[6px] bg-[#E8E4DF] rounded-full overflow-hidden cursor-help">
              <div 
                className="h-full transition-all duration-[800ms] ease-out rounded-full"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: color
                }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-graphite text-white text-[10px] font-dm-mono border-none py-2 px-3">
            <p>Seu custo/hora representa {percentage}% do piso de mercado em {marketName} (R$ {benchmark}/hora)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <div className="mt-1">
        <span className="text-[10px] font-dm-mono text-muted">{percentage}% do mercado premium {marketName}</span>
      </div>
    </div>
  );
};

export default FinancialHealthBar;
