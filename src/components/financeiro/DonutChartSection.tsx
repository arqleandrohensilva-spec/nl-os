import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { CategoriaCusto } from '@/lib/types';

interface DonutChartSectionProps {
  data: {
    name: string;
    value: number;
    color: string;
    id: CategoriaCusto;
  }[];
  totalMonthly: number;
  onSliceClick: (id: string) => void;
}

const DonutChartSection: React.FC<DonutChartSectionProps> = ({ data, totalMonthly, onSliceClick }) => {
  const formatCurrency = (val: number) => 
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, percent } = payload[0].payload;
      return (
        <div className="bg-graphite text-white p-3 rounded-[4px] border-none shadow-xl text-[10px] font-dm-mono">
          <p className="font-bold mb-1">{name}</p>
          <p>{formatCurrency(value)}</p>
          <p className="text-white/60">{(percent * 100).toFixed(1)}% do total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="sticky top-24 h-fit flex flex-col items-center p-6 bg-white border border-beige rounded-[4px]">
      <div className="relative w-[200px] h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              onClick={(entry) => onSliceClick(entry.id)}
              className="cursor-pointer"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  className="hover:opacity-80 transition-opacity duration-300 outline-none"
                />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-muted uppercase tracking-widest font-dm-mono">Total Mensal</span>
          <span className="text-base font-cormorant font-bold text-graphite">
            {formatCurrency(totalMonthly)}
          </span>
        </div>
      </div>

      <div className="mt-6 w-full space-y-2">
        {data.map((entry, index) => {
          const percent = ((entry.value / totalMonthly) * 100).toFixed(1);
          return (
            <div 
              key={index} 
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => onSliceClick(entry.id)}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[10px] font-dm-mono text-graphite group-hover:text-bronze transition-colors">
                  {entry.name}
                </span>
              </div>
              <span className="text-[10px] font-dm-mono text-muted">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DonutChartSection;
