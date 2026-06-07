import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const agora = new Date();
  const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0);

  // Buscar dados do mês anterior
  const [configRes, custosRes, parcelasRes, horasRes, projetosRes] = await Promise.all([
    supabase.from('config_escritorio').select('*').single(),
    supabase.from('custos_escritorio').select('*').eq('ativo', true),
    supabase.from('financeiro_parcelas')
      .select('valor_recebido, status')
      .in('status', ['pago', 'PAGO', 'recebido', 'RECEBIDO'])
      .gte('data_recebimento', mesAnterior.toISOString())
      .lte('data_recebimento', fimMesAnterior.toISOString()),
    supabase.from('sessoes_horas')
      .select('duracao_minutos')
      .gte('inicio', mesAnterior.toISOString())
      .lte('inicio', fimMesAnterior.toISOString()),
    supabase.from('projetos')
      .select('id')
      .in('status_geral', ['em_andamento', 'ativo', 'Em andamento', 'Ativo'])
  ]);

  const config = configRes.data;
  const custos = custosRes.data || [];

  // Calcular custo/hora
  const totalMensal = custos.reduce((acc, c) => {
    if (c.frequencia === 'percentual') return acc;
    return acc + (c.frequencia === 'anual' ? c.valor / 12 : c.valor);
  }, 0);
  const horasDisp = (config?.horas_dia || 8) * (config?.dias_mes || 22) * ((config?.percentual_produtivo || 70) / 100) * (config?.num_arquitetos || 2);
  const custoHora = horasDisp > 0 ? totalMensal / horasDisp : 0;

  const receitaMes = parcelasRes.data?.reduce((acc, p) => acc + (p.valor_recebido || 0), 0) || 0;
  const horasFaturadas = (horasRes.data?.reduce((acc, h) => acc + h.duracao_minutos, 0) || 0) / 60;
  const numProjetos = projetosRes.data?.length || 0;
  const margemReal = receitaMes > 0 ? ((receitaMes - totalMensal) / receitaMes) * 100 : 0;

  // Verificar se já tem snapshot deste mês
  const mesRef = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;
  const { data: existing } = await supabase
    .from('snapshots_financeiros')
    .select('id')
    .eq('mes_referencia', mesRef)
    .maybeSingle();

  if (!existing) {
    await supabase.from('snapshots_financeiros').insert({
      mes_referencia: mesRef,
      custo_hora: custoHora,
      receita_total: receitaMes,
      horas_faturadas: horasFaturadas,
      num_projetos_ativos: numProjetos,
      margem_real: margemReal,
      total_custos: totalMensal
    });
  }

  return new Response(JSON.stringify({ ok: true, mes: mesRef }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
