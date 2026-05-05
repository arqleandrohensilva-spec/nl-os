import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Projeto {
  id: string;
  nome: string;
  cliente_nome: string;
  tipo: string;
  area_m2: number;
  valor_proposta: number;
  horas_estimadas: number;
  etapa_atual: string;
  status: 'ativo' | 'concluido' | 'pausado';
}

const ControleHoras = () => {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjetos();
  }, []);

  const fetchProjetos = async () => {
    try {
      const { data, error } = await supabase.from('projetos').select('*');
      if (error) throw error;
      setProjetos(data || []);
    } catch (error) {
      console.error('Error fetching projetos:', error);
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <Sidebar user="Sócio" />
      <main className="ml-[230px] p-12">
        <header className="mb-12">
          <h1 className="text-[28px] font-cormorant font-bold text-white mb-1">Controle de Horas</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Módulo 03 · Registro de tempo por projeto</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-bronze">Carregando projetos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projetos.map((projeto) => (
              <div key={projeto.id} className="border border-white/5 bg-[#141414] p-6 rounded-[4px]">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-cormorant text-xl text-white">{projeto.nome}</h3>
                  <div className="text-[10px] bg-bronze/10 text-bronze px-2 py-0.5 rounded uppercase tracking-wider">{projeto.tipo}</div>
                </div>
                <div className="text-[11px] text-white/50 mb-6">{projeto.cliente_nome} · {projeto.area_m2}m²</div>
                
                <div className="mb-6">
                  <div className="flex justify-between text-[10px] mb-1 text-white/60 uppercase tracking-wider font-bold">
                    <span>{projeto.etapa_atual}</span>
                    <span>Progresso</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-bronze w-[50%] rounded-full"></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 border border-white/10 hover:border-bronze py-2 text-[10px] uppercase tracking-widest font-bold transition-all">▶ Iniciar</button>
                  <button className="flex-1 border border-white/10 hover:border-bronze py-2 text-[10px] uppercase tracking-widest font-bold transition-all">Relatório</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ControleHoras;
