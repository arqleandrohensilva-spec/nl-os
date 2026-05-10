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
  Pie,
  Legend
} from 'recharts';
import { 
  Activity, 
  Clock, 
  Smartphone, 
  Monitor, 
  MessageSquare,
  AlertCircle,
  TrendingUp,
  Target,
  Zap,
  History,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EngagementDashboardProps {
  proposal: Proposal;
  // onAnalyze removed as requested
  onGenerateFollowup: (analysisText?: string) => void;
}

const EngagementDashboard = ({ proposal, onGenerateFollowup }: EngagementDashboardProps) => {
  const engagements = proposal.proposta_engajamento || [];
  
  if (engagements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-dashed border-[#E8E4DF] rounded-[2px] text-center animate-fade-in">
        <div className="w-16 h-16 bg-muted-foreground/5 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={32} className="text-muted-foreground/30" />
        </div>
        <h3 className="text-xl font-bold font-cormorant text-graphite mb-3 uppercase tracking-tight">Aguardando Engajamento</h3>
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] max-w-[320px] leading-relaxed">
          Esta proposta ainda não foi visualizada. Assim que o cliente abrir o link, os dados aparecerão aqui em tempo real.
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
    { name: 'Manifesto', time: engagements.reduce((acc, curr) => acc + (curr.secao_manifesto_tempo || 0), 0), color: '#C5A16F' },
    { name: 'Diagnóstico', time: engagements.reduce((acc, curr) => acc + (curr.secao_diagnostico_tempo || 0), 0), color: '#8B7355' },
    { name: 'Escopo', time: engagements.reduce((acc, curr) => acc + (curr.secao_escopo_tempo || 0), 0), color: '#1A1A1A' },
    { name: 'Investimento', time: engagements.reduce((acc, curr) => acc + (curr.secao_investimento_tempo || 0), 0), color: '#D4AF37' },
    { name: 'Fechamento', time: engagements.reduce((acc, curr) => acc + (curr.secao_fechamento_tempo || 0), 0), color: '#71717A' },
  ].filter(s => s.time > 0);

  const deviceCounts = engagements.reduce((acc: Record<string, number>, curr) => {
    const dev = curr.dispositivo?.toLowerCase().includes('mobile') ? 'Mobile' : 'Desktop';
    acc[dev] = (acc[dev] || 0) + 1;
    return acc;
  }, {});

  const deviceData = Object.entries(deviceCounts).map(([name, value]) => ({ name, value: value as number }));


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const mostViewed = [...sectionData].sort((a, b) => b.time - a.time)[0];
  
  // Calculate insights
  const insights = [];
  if (totalSeconds > 300) insights.push({ type: 'hot', text: 'Engajamento Excepcional' });
  if (engagements.length > 3) insights.push({ type: 'revisit', text: 'Várias Re-visitas' });
  if (sectionData.find(s => s.name === 'Investimento' && s.time > 60)) insights.push({ type: 'price', text: 'Analisando Preço' });

  return (
    <div className="space-y-6 animate-fade-in pb-4">
      {/* Header Insights */}
      <div className="flex flex-wrap gap-2">
        {insights.map((insight, idx) => (
          <div key={idx} className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest animate-pulse-subtle",
            insight.type === 'hot' ? "bg-red-50 text-red-600 border-red-100" :
            insight.type === 'revisit' ? "bg-blue-50 text-blue-600 border-blue-100" :
            "bg-amber-50 text-amber-600 border-amber-100"
          )}>
            <Zap size={10} />
            {insight.text}
          </div>
        ))}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tempo Total', value: formatTime(totalSeconds), icon: Clock, color: 'text-bronze' },
          { label: 'Acessos', value: engagements.length, icon: TrendingUp, color: 'text-bronze' },
          { label: 'Foco Principal', value: mostViewed?.name || '-', icon: Target, color: 'text-bronze' },
          { label: 'Último Dispositivo', value: lastEngagement.dispositivo || 'Desktop', icon: lastEngagement.dispositivo?.toLowerCase().includes('mobile') ? Smartphone : Monitor, color: 'text-bronze' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-4 border border-[#E8E4DF] rounded-[2px] shadow-sm hover:border-bronze/30 transition-all group">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-bold group-hover:text-bronze transition-colors">{card.label}</p>
            <div className="flex items-center gap-2">
              <card.icon size={16} className={card.color} />
              <h3 className="text-lg font-bold text-graphite font-cormorant">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Section Retention Chart */}
        <div className="md:col-span-2 bg-white p-6 border border-[#E8E4DF] rounded-[2px] shadow-sm">
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-graphite mb-8 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity size={14} className="text-bronze" />
              Retenção por Seção (Tempo Acumulado)
            </span>
            <Info size={14} className="text-muted-foreground/30" />
          </h4>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectionData} layout="vertical" margin={{ left: -10, right: 30, top: 0, bottom: 0 }}>
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
                    letterSpacing: '0.05em',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}
                  formatter={(value: number) => [`${value}s`, 'Tempo Total']}
                />
                <Bar dataKey="time" radius={[0, 4, 4, 0]} barSize={24}>
                  {sectionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      fillOpacity={0.9}
                      className="hover:fill-opacity-100 transition-all duration-300"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Distribution Pie Chart */}
        <div className="bg-white p-6 border border-[#E8E4DF] rounded-[2px] shadow-sm flex flex-col">
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-graphite mb-8 flex items-center gap-2">
            <Smartphone size={14} className="text-bronze" />
            Distribuição de Dispositivos
          </h4>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#C5A16F" />
                  <Cell fill="#1A1A1A" />
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '2px', 
                    border: '1px solid #E8E4DF',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {deviceData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 0 ? '#C5A16F' : '#1A1A1A' }} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Actions & AI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-graphite text-white p-6 rounded-[2px] shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap size={120} />
          </div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-bronze mb-4 flex items-center gap-2">
            <Activity size={14} />
            Estratégia Recomendada
          </h4>
          
          <div className="space-y-4 relative z-10">
            <div className="p-4 bg-white/5 border border-white/10 rounded-[2px] backdrop-blur-sm">
              <p className="text-xs leading-relaxed font-medium">
                {totalSeconds > 180 
                  ? "Lead demonstrou altíssimo interesse. Ele passou um tempo considerável revisando a proposta. Recomendamos um follow-up focado no fechamento e em tirar dúvidas técnicas sobre o escopo."
                  : "O engajamento foi inicial. O cliente deu uma olhada geral mas ainda não se aprofundou. Recomendamos enviar uma mensagem perguntando se ele conseguiu visualizar os detalhes do projeto."}
                {mostViewed && mostViewed.time > 60 && ` O foco principal foi na seção "${mostViewed.name}", o que indica uma atenção especial a este ponto.`}
                {deviceCounts['Mobile'] > deviceCounts['Desktop'] && " O cliente está acessando majoritariamente via celular."}
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => onGenerateFollowup()}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 rounded-[2px] h-11 text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-lg"
              >
                <MessageSquare size={16} className="mr-2 text-bronze" />
                Script de Venda
              </Button>
            </div>
          </div>
        </div>

        {/* Session History */}
        <div className="bg-white p-6 border border-[#E8E4DF] rounded-[2px] shadow-sm overflow-hidden">
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-graphite mb-6 flex items-center gap-2">
            <History size={14} className="text-bronze" />
            Histórico de Sessões
          </h4>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {[...engagements].reverse().map((eng, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-[#F0EEEB] rounded-[2px] hover:bg-[#FDFDFD] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-bronze/5 flex items-center justify-center text-bronze">
                    {eng.dispositivo?.toLowerCase().includes('mobile') ? <Smartphone size={14} /> : <Monitor size={14} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-graphite uppercase tracking-wide">
                      Sessão {engagements.length - idx}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                      {eng.dispositivo || 'Desktop'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-bronze">{formatTime(eng.tempo_total || 0)}</p>
                  <p className="text-[8px] text-muted-foreground uppercase">Duração</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngagementDashboard;
