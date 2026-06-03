import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, isAfter, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FinanceiroGeral = () => {
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [baseFinanceira, setBaseFinanceira] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, projRes, baseRes] = await Promise.all([
      supabase.from('financeiro_parcelas').select('*, projetos(nome, tipo)').order('data_vencimento', { ascending: true }),
      supabase.from('projetos').select('*').eq('status_geral', 'ativo').order('criado_em', { ascending: false }),
      supabase.from('base_financeira').select('*')
    ]);

    setParcelas(pRes.data || []);
    setProjetos(projRes.data || []);
    setBaseFinanceira(baseRes.data || []);
    setLoading(false);
  };

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const custoFixoMensal = (baseFinanceira || [])
    .filter(item => item.categoria !== 'pro_labore')
    .reduce((sum, item) => sum + (Number(item.valor_mensal) || 0), 0);

  const recebidoMes = parcelas?.filter(p => 
    p.status === 'PAGO' && p.data_recebimento &&
    new Date(p.data_recebimento) >= inicioMes
  ).reduce((s, p) => s + Number(p.valor_recebido || p.valor), 0) || 0;

  const previstoMes = parcelas?.filter(p =>
    p.status !== 'PAGO' && p.status !== 'PAGO PARCIAL' &&
    new Date(p.data_vencimento) >= inicioMes &&
    new Date(p.data_vencimento) <= fimMes
  ).reduce((s, p) => s + Number(p.valor), 0) || 0;

  const totalAtrasado = parcelas?.filter(p =>
    p.status === 'ATRASADO'
  ).reduce((s, p) => s + Number(p.valor), 0) || 0;

  const margemMes = recebidoMes - custoFixoMensal;

  return (
    <div className="flex min-h-screen bg-[#0d0d0d] text-[#e8e8e8]">
      <Sidebar user="Sócio" />
      <div className="flex-1 ml-[230px] p-8">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#e8e8e8', fontWeight: 400 }}>Financeiro</h1>
          <p style={{ fontFamily: 'Courier New', fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '4px' }}>
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4">
                <div className="text-[10px] text-[#555] uppercase font-mono mb-1">Recebido no Mês</div>
                <div className="text-xl text-[#4ade80]">R$ {recebidoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4">
                <div className="text-[10px] text-[#555] uppercase font-mono mb-1">Previsto no Mês</div>
                <div className="text-xl text-[#e8e8e8]">R$ {previstoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4">
                <div className="text-[10px] text-[#555] uppercase font-mono mb-1">Em Atraso</div>
                <div className="text-xl text-[#f87171]">R$ {totalAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4">
                <div className="text-[10px] text-[#555] uppercase font-mono mb-1">Margem</div>
                <div className="text-xl" style={{ color: margemMes >= 0 ? '#4ade80' : '#f87171' }}>
                    R$ {margemMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
            </div>
        </div>

        <Tabs defaultValue="visao-geral" className="w-full">
          <TabsList className="bg-[#141414] border border-[rgba(255,255,255,0.06)] mb-6">
            <TabsTrigger value="visao-geral">VISÃO GERAL</TabsTrigger>
            <TabsTrigger value="projetos">PROJETOS</TabsTrigger>
            <TabsTrigger value="lucratividade">LUCRATIVIDADE</TabsTrigger>
          </TabsList>
          
          <TabsContent value="visao-geral">
              <div className="grid grid-cols-2 gap-8">
                  <div className="bg-[#141414] p-6 border border-[rgba(255,255,255,0.06)]">
                      <h3 className="font-serif mb-4">Saúde do Mês</h3>
                      <div className="text-xs mb-2">Receita vs Custo Fixo</div>
                      <div className="h-4 bg-[#222] mb-6">
                        <div className="h-full bg-[#4ade80]" style={{ width: `${Math.min(recebidoMes / (recebidoMes + previstoMes || 1) * 100, 100)}%` }}></div>
                      </div>
                  </div>
              </div>
          </TabsContent>
          
          <TabsContent value="projetos">
              <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                  {projetos?.map((p: any) => (
                    <div key={p.id} className="grid grid-cols-6 p-4 border-b border-[rgba(255,255,255,0.04)] text-sm">
                        <div className="col-span-1">{p.nome_cliente}</div>
                        <div className="col-span-5 text-[#555]">...</div>
                    </div>
                  ))}
              </div>
          </TabsContent>
          
          <TabsContent value="lucratividade">
            <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                {projetos?.map(projeto => {
                  const parcelasProjeto = parcelas?.filter(p => p.projeto_id === projeto.id) || [];
                  const receitaTotal = parcelasProjeto.reduce((s, p) => s + Number(p.valor), 0);
                  const recebido = parcelasProjeto.filter(p => p.status === 'PAGO' || p.status === 'PAGO PARCIAL').reduce((s, p) => s + Number(p.valor_recebido || p.valor), 0);
                  const emAberto = receitaTotal - recebido;
                  const pctRecebido = receitaTotal > 0 ? (recebido / receitaTotal * 100) : 0;

                  return (
                    <div key={projeto.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr', gap: 0, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#e8e8e8' }}>{projeto.nome_cliente}</div>
                        <div style={{ fontFamily: 'Arial', fontSize: '10px', color: '#555', marginTop: '2px' }}>{projeto.tipo}</div>
                      </div>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#ccc' }}>R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#4ade80' }}>R$ {recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: emAberto > 0 ? '#fbbf24' : '#555' }}>R$ {emAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div>
                        <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: pctRecebido >= 100 ? '#4ade80' : '#8B7355', marginBottom: '3px' }}>{pctRecebido.toFixed(0)}%</div>
                        <div style={{ height: '3px', background: '#222', borderRadius: '2px' }}>
                          <div style={{ height: '3px', background: pctRecebido >= 100 ? '#4ade80' : '#8B7355', borderRadius: '2px', width: `${Math.min(pctRecebido, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinanceiroGeral;