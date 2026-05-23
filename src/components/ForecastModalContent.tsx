import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LeadForecast {
  id: string;
  nome: string;
  tipo?: string;
  orcamento?: number;
  score?: number;
  stage?: string;
  probabilidade: number;
  diffDays: number;
}

interface ForecastData {
  items: LeadForecast[];
  totalInGame: number;
  probableTotal: number;
  weightedAverage: number;
  meta: number;
}

interface ForecastModalContentProps {
  forecast: ForecastData;
  navigate: (path: string) => void;
}

const ForecastModalContent = ({ forecast, navigate }: ForecastModalContentProps) => {
  return (
    <div className="bg-black/90 p-8 overflow-y-auto max-h-[80vh] scrollbar-hide border border-white/5">
      {/* Totalizador */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-10 border-b border-white/5">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-2 block">FORECAST DO MÊS</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">R$ {(forecast.probableTotal / 1000000).toFixed(1)}M</span>
            <span className="text-white/40 text-xs">provável</span>
            <span className="text-white/20 mx-2">/</span>
            <span className="text-white/40 text-xs">R$ {(forecast.totalInGame / 1000000).toFixed(1)}M total em jogo</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/40 mb-1 font-mono">Meta: R$ {(forecast.meta / 1000000).toFixed(1)}M</div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] font-bold text-bronze uppercase tracking-widest">Probabilidade de bater</span>
            <span className="text-xl font-bold text-bronze">{forecast.weightedAverage.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Provável */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
            <span className="text-[9px] font-bold tracking-widest text-white/60 uppercase">PROVÁVEL FECHAR</span>
          </div>
          <div className="space-y-3">
            {forecast.items.filter(l => l.probabilidade >= 60).length === 0 ? (
              <p className="text-white/10 text-[10px] italic">Nenhum lead nesta faixa.</p>
            ) : (
              forecast.items.filter(l => l.probabilidade >= 60).map(lead => (
                <div 
                  key={lead.id} 
                  onClick={() => navigate('/pipeline')}
                  className="p-4 bg-white/[0.02] border border-white/5 border-l-2 border-l-[#2E7D32] hover:bg-white/[0.04] cursor-pointer transition-all"
                >
                  <div className="text-sm font-medium text-white mb-1">{lead.nome} · {lead.tipo}</div>
                  <div className="text-[10px] text-white/40 leading-relaxed">
                    R$ {(Number(lead.orcamento || 0) / 1000000).toFixed(1)}M · Score {lead.score} · {lead.stage}<br/>
                    <span className={cn(
                      "font-bold",
                      lead.probabilidade >= 80 ? "text-[#2E7D32]" : "text-[#2E7D32]/70"
                    )}>
                      {lead.probabilidade}% probabilidade
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Em Risco */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            <span className="text-[9px] font-bold tracking-widest text-white/60 uppercase">EM RISCO</span>
          </div>
          <div className="space-y-3">
            {forecast.items.filter(l => l.probabilidade >= 30 && l.probabilidade < 60).length === 0 ? (
              <p className="text-white/10 text-[10px] italic">Nenhum lead nesta faixa.</p>
            ) : (
              forecast.items.filter(l => l.probabilidade >= 30 && l.probabilidade < 60).map(lead => (
                <div 
                  key={lead.id} 
                  onClick={() => navigate('/pipeline')}
                  className="p-4 bg-white/[0.02] border border-white/5 border-l-2 border-l-[#F59E0B] hover:bg-white/[0.04] cursor-pointer transition-all"
                >
                  <div className="text-sm font-medium text-white mb-1">⚠ {lead.nome} · {lead.tipo}</div>
                  <div className="text-[10px] text-white/40 leading-relaxed">
                    R$ {lead.orcamento ? `${(Number(lead.orcamento) / 1000).toFixed(0)}k` : '—'} · Score {lead.score} · {lead.stage} {lead.diffDays > 10 ? `há ${lead.diffDays} dias` : ''}<br/>
                    <span className="text-[#F59E0B] font-bold">{lead.probabilidade}% probabilidade</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Improvável */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#7A4A3A]" />
            <span className="text-[9px] font-bold tracking-widest text-white/60 uppercase">IMPROVÁVEL</span>
          </div>
          <div className="space-y-3">
            {forecast.items.filter(l => l.probabilidade < 30).length === 0 ? (
              <p className="text-white/10 text-[10px] italic">Nenhum lead nesta faixa.</p>
            ) : (
              forecast.items.filter(l => l.probabilidade < 30).map(lead => (
                <div 
                  key={lead.id} 
                  onClick={() => navigate('/pipeline')}
                  className="p-4 bg-white/[0.02] border border-white/5 border-l-2 border-l-[#7A4A3A] hover:bg-white/[0.04] cursor-pointer transition-all"
                >
                  <div className="text-sm font-medium text-white mb-1">✕ {lead.nome} · {lead.tipo}</div>
                  <div className="text-[10px] text-white/40 leading-relaxed">
                    Score {lead.score} · {lead.stage}<br/>
                    <span className="text-[#7A4A3A] font-bold">{lead.probabilidade}% probabilidade</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastModalContent;
