import React from 'react';
import { Proposal, Engagement } from '@/pages/PropostasTracking';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Activity, 
  Clock, 
  Smartphone, 
  Monitor, 
  MessageSquare,
  AlertCircle,
  TrendingUp,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";

interface EngagementDashboardProps {
  proposal: Proposal;
  onAnalyze: () => void;
  onGenerateFollowup: (analysisText?: string) => void;
}

const EngagementDashboard = ({ proposal, onAnalyze, onGenerateFollowup }: EngagementDashboardProps) => {
  const engagements = proposal.proposta_engajamento || [];
  
  if (engagements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-dashed border-[#E8E4DF] rounded-[2px] text-center">
        <AlertCircle size={40} className="text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-bold font-cormorant text-graphite mb-2">Sem Dados de Engajamento</h3>
        <p className="text-xs text-muted-foreground uppercase tracking-widest max-w-[300px]">
          Esta proposta ainda não foi visualizada pelo cliente ou os dados não foram registrados.
        </p>
      </div>
    );
  }

  // Aggregate stats
  const totalSeconds = engagements.reduce((acc, curr) => acc + (curr.tempo_total || 0), 0);
  const avgSeconds = totalSeconds / engagements.length;
  const lastEngagement = engagements[engagements.length - 1];
  
  const sectionData = [
    { name: 'Capa', time: engagements.reduce((acc, curr) => acc + (curr.secao_capa_tempo || 0), 0), color: '#8E9196' },
    { name: 'Manifesto', time: engagements.reduce((acc, curr) => acc + (curr.secao_manifesto_tempo || 0), 0), color: '#9b87f5' },
    { name: 'Diagnóstico', time: engagements.reduce((acc, curr) => acc + (curr.secao_diagnostico_tempo || 0), 0), color: '#7E69AB' },
    { name: 'Escopo', time: engagements.reduce((acc, curr) => acc + (curr.secao_escopo_tempo || 0), 0), color: '#D6BCFA' },
    { name: 'Investimento', time: engagements.reduce((acc, curr) => acc + (curr.secao_investimento_tempo || 0), 0), color: '#C5A16F' },
    { name: 'Fechamento', time: engagements.reduce((acc, curr) => acc + (curr.secao_fechamento_tempo || 0), 0), color: '#1A1A1A' },
  ].filter(s => s.time > 0);

  const deviceData = [
    { name: 'Mobile', value: engagements.filter(e => e.dispositivo?.toLowerCase().includes('mobile')).length },
    { name: 'Desktop', value: engagements.filter(e => !e.dispositivo?.toLowerCase().includes('mobile')).length },
  ].filter(d => d.value > 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const mostViewed = [...sectionData].sort((a, b) => b.time - a.time)[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#FDFDFD] p-4 border border-[#E8E4DF] rounded-[2px] shadow-sm">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-bold">Tempo Total</p>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-bronze" />
            <h3 className="text-lg font-bold text-graphite">{formatTime(totalSeconds)}</h3>
          </div>
        </div>
        
        <div className="bg-[#FDFDFD] p-4 border border-[#E8E4DF] rounded-[2px] shadow-sm">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-bold">Média por Acesso</p>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-bronze" />
            <h3 className="text-lg font-bold text-graphite">{formatTime(avgSeconds)}</h3>
          </div>
        </div>

        <div className="bg-[#FDFDFD] p-4 border border-[#E8E4DF] rounded-[2px] shadow-sm">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-bold">Mais Relevante</p>
          <div className="flex items-center gap-2">
            <Target size={16} className="text-bronze" />
            <h3 className="text-lg font-bold text-graphite truncate">{mostViewed?.name || '-'}</h3>
          </div>
        </div>

        <div className="bg-[#FDFDFD] p-4 border border-[#E8E4DF] rounded-[2px] shadow-sm">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-bold">Dispositivo</p>
          <div className="flex items-center gap-2">
            {lastEngagement.dispositivo?.toLowerCase().includes('mobile') ? <Smartphone size={16} className="text-bronze" /> : <Monitor size={16} className="text-bronze" />}
            <h3 className="text-lg font-bold text-graphite">{lastEngagement.dispositivo || 'Desktop'}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section Retention Chart */}
        <div className="bg-white p-6 border border-[#E8E4DF] rounded-[2px] shadow-sm">
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-graphite mb-6 flex items-center gap-2">
            <Activity size={14} className="text-bronze" />
            Retenção por Seção (Segundos)
          </h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectionData} layout="vertical" margin={{ left: -20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0EEEB" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#666' }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#F8F9FA' }}
                  contentStyle={{ 
                    borderRadius: '2px', 
                    border: '1px solid #E8E4DF',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                  formatter={(value: number) => [`${value}s`, 'Tempo']}
                />
                <Bar dataKey="time" radius={[0, 2, 2, 0]} barSize={20}>
                  {sectionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Distribution & Actions */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 border border-[#E8E4DF] rounded-[2px] shadow-sm flex-1">
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-graphite mb-6 flex items-center gap-2">
              <Activity size={14} className="text-bronze" />
              Ações Recomendadas
            </h4>
            
            <div className="space-y-4">
              <div className="p-4 bg-bronze/[0.03] border border-bronze/10 rounded-[2px]">
                <p className="text-[11px] leading-relaxed text-graphite font-medium">
                  {totalSeconds > 180 
                    ? "Cliente demonstrou alto engajamento. Recomendado follow-up imediato com foco na seção de Investimento."
                    : "Interesse moderado. Cliente passou pouco tempo nas seções técnicas. Foque em tirar dúvidas sobre o escopo."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <Button 
                  onClick={onAnalyze}
                  className="bg-bronze hover:bg-bronze/90 text-white rounded-[2px] h-12 text-[10px] font-bold uppercase tracking-widest shadow-md transition-all active:scale-95"
                >
                  <Activity size={16} className="mr-2" />
                  Obter Análise Detalhada (IA)
                </Button>
                
                <Button 
                  onClick={() => onGenerateFollowup()}
                  variant="outline"
                  className="border-graphite text-graphite hover:bg-graphite hover:text-white rounded-[2px] h-12 text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  <MessageSquare size={16} className="mr-2" />
                  Gerar Script de Venda
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngagementDashboard;
