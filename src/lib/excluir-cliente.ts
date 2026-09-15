import { supabase } from '@/integrations/supabase/client';

const BASE_DROPBOX = '/NL Arquitetos/07 - Projetos NL OS/01 - Clientes';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizarWhats(w?: string | null): string {
  return (w ?? '').replace(/\D/g, '');
}

export interface ResultadoExclusao {
  pastasExcluidas: string[];
  pastasComFalha: string[];
}

/**
 * SOFT DELETE — "arquiva" o cliente e seus leads (marca excluido=true).
 * Some de todas as telas (Clientes, Pipeline, Dashboard...) mas continua no
 * banco, listável na aba "Excluídos" e restaurável. Também pega leads órfãos
 * (sem cliente_id) casando pelo WhatsApp/nome, que era o que sobrava no Pipeline.
 */
export async function arquivarCliente(clienteId: string): Promise<void> {
  if (!clienteId || !UUID_RE.test(clienteId)) {
    throw new Error('Cliente sem ID válido — nada a excluir (provável lead sem cliente vinculado).');
  }
  const agora = new Date().toISOString();

  const { data: cliente, error: cliErr } = await supabase
    .from('clientes')
    .select('id, nome, whatsapp')
    .eq('id', clienteId)
    .maybeSingle();
  if (cliErr) throw cliErr;
  if (!cliente) throw new Error('Cliente não encontrado.');

  // Leads vinculados
  const { error: leadErr } = await supabase
    .from('leads')
    .update({ excluido: true, excluido_em: agora })
    .eq('cliente_id', clienteId);
  if (leadErr) throw leadErr;

  // Leads órfãos (sem cliente_id) que casam pelo WhatsApp/nome do cliente
  const whats = normalizarWhats(cliente.whatsapp);
  if (whats) {
    const { data: orfaos } = await supabase.from('leads').select('id, whats').is('cliente_id', null);
    const ids = (orfaos || []).filter((l: any) => normalizarWhats(l.whats) === whats).map((l: any) => l.id);
    if (ids.length) {
      await supabase.from('leads').update({ excluido: true, excluido_em: agora }).in('id', ids);
    }
  }

  const { error } = await supabase
    .from('clientes')
    .update({ excluido: true, excluido_em: agora })
    .eq('id', clienteId);
  if (error) throw error;
}

/** Restaura um cliente arquivado (e seus leads) de volta ao sistema. */
export async function restaurarCliente(clienteId: string): Promise<void> {
  if (!clienteId || !UUID_RE.test(clienteId)) throw new Error('Cliente sem ID válido.');
  await supabase.from('leads').update({ excluido: false, excluido_em: null }).eq('cliente_id', clienteId);
  const { error } = await supabase
    .from('clientes')
    .update({ excluido: false, excluido_em: null })
    .eq('id', clienteId);
  if (error) throw error;
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

  // Guarda: id precisa ser um UUID real. Leads sem cliente vinculado abrem a
  // ficha em /clientes/null, e a string "null" passava batido gerando o erro
  // "invalid input syntax for type uuid: null" no banco.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!clienteId || !UUID_RE.test(clienteId)) {
    throw new Error('Cliente sem ID válido — nada a excluir (provável lead sem cliente vinculado).');
  }

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
  await supabase.from('leads').delete().eq('cliente_id', clienteId); // Pipeline
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
