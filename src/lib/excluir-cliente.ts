import { supabase } from '@/integrations/supabase/client';

const BASE_DROPBOX = '/NL Arquitetos/07 - Projetos NL OS/01 - Clientes';

export interface ResultadoExclusao {
  pastasExcluidas: string[];
  pastasComFalha: string[];
}

/**
 * Exclui um cliente por completo: registros vinculados no NL OS e,
 * opcionalmente, as pastas dos projetos dele no Dropbox.
 */
export async function excluirClienteCompleto(
  clienteId: string,
  opcoes: { excluirDropbox?: boolean } = {}
): Promise<ResultadoExclusao> {
  const { excluirDropbox = true } = opcoes;

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('id, nome, tipo_projeto')
    .eq('id', clienteId)
    .maybeSingle();

  if (clienteError) throw clienteError;
  if (!cliente) throw new Error('Cliente não encontrado.');

  const { data: projetos, error: projetosError } = await supabase
    .from('projetos')
    .select('id, nome, tipo, dropbox_folder')
    .eq('cliente_id', clienteId);

  if (projetosError) throw projetosError;

  const projetoIds = (projetos || []).map((p) => p.id);

  // 1) Pastas no Dropbox
  const pastasExcluidas: string[] = [];
  const pastasComFalha: string[] = [];

  if (excluirDropbox) {
    const caminhos = new Set<string>();
    (projetos || []).forEach((p) => {
      if (p.dropbox_folder) caminhos.add(p.dropbox_folder);
      else if (cliente.nome && p.tipo) caminhos.add(`${BASE_DROPBOX}/${cliente.nome} - ${p.tipo}`);
    });
    if (!caminhos.size && cliente.nome && cliente.tipo_projeto) {
      caminhos.add(`${BASE_DROPBOX}/${cliente.nome} - ${cliente.tipo_projeto}`);
    }

    for (const path of caminhos) {
      try {
        const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
          body: { action: 'delete', path },
        });
        if (error || (data && data.error)) pastasComFalha.push(path);
        else pastasExcluidas.push(path);
      } catch (e) {
        console.error('Falha ao excluir pasta do Dropbox:', path, e);
        pastasComFalha.push(path);
      }
    }
  }

  // 2) Registros que bloqueiam a exclusão dos projetos
  if (projetoIds.length) {
    await supabase.from('briefings_completos').delete().in('projeto_id', projetoIds);
    await supabase.from('depoimentos').delete().in('projeto_id', projetoIds);
    const { error: projetosDelError } = await supabase
      .from('projetos')
      .delete()
      .in('id', projetoIds);
    if (projetosDelError) throw projetosDelError;
  }

  // 3) Registros vinculados diretamente ao cliente
  await supabase.from('financeiro_parcelas').delete().eq('cliente_id', clienteId);
  await supabase.from('contratos').delete().eq('cliente_id', clienteId);
  await supabase.from('proposals').delete().eq('cliente_id', clienteId);
  await supabase.from('briefings').delete().eq('cliente_id', clienteId);

  // 4) Cliente
  const { error: clienteDelError } = await supabase
    .from('clientes')
    .delete()
    .eq('id', clienteId);
  if (clienteDelError) throw clienteDelError;

  return { pastasExcluidas, pastasComFalha };
}
