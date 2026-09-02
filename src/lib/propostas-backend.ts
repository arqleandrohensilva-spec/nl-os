import { supabase } from '@/integrations/supabase/client';

/**
 * Backend do site público de propostas (proposta.nl.arq.br).
 *
 * O site público é uma aplicação separada e lê as propostas deste projeto.
 * Toda gravação passa por aqui — nada de fetch cru espalhado pelas telas —
 * e cada gravação é espelhada no banco do NL OS para que o tracking interno
 * (Propostas · Tracking, Ficha do Cliente) enxergue os mesmos dados.
 */
const PROPOSTAS_URL = 'https://sjqazidnuqdqadbkawph.supabase.co';
const PROPOSTAS_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqcWF6aWRudXFkcWFkYmthd3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzI0NjMsImV4cCI6MjA5NDAwODQ2M30.vT_1aEOPjjw_KCKJ0KsAzJG40e07DvFSONICVIBAGHI';

export const PROPOSTA_PUBLIC_BASE_URL = 'https://proposta.nl.arq.br';

export interface PropostaPublicaPayload {
  tipo: string;
  slug: string;
  nome_cliente?: string | null;
  cidade?: string | null;
  estado?: string | null;
  area?: string | null;
  valor_executivo?: string | null;
  valor_completo?: string | null;
  objetivo?: string | null;
  tipo_negocio?: string | null;
}

const headers = (extra: Record<string, string> = {}) => ({
  'Content-Type': 'application/json',
  apikey: PROPOSTAS_ANON_KEY,
  Authorization: `Bearer ${PROPOSTAS_ANON_KEY}`,
  ...extra,
});

export const linkPublicoProposta = (tipo: string, slug: string) =>
  `${PROPOSTA_PUBLIC_BASE_URL}/p/${tipo}/${slug}`;

/**
 * Espelha a proposta no banco do NL OS para que as telas internas
 * (tracking, ficha do cliente) tenham os mesmos dados do site público.
 */
const espelharNoNlOs = async (payload: PropostaPublicaPayload) => {
  const { error } = await supabase
    .from('propostas_clientes')
    .upsert(payload as never, { onConflict: 'slug' });

  if (error) {
    // O espelho é complementar: nunca deve derrubar a geração do link.
    console.error('Falha ao espelhar proposta no NL OS:', error.message);
  }
};

/** Cria a proposta no site público. Retorna o link ou lança erro. */
export const criarPropostaPublica = async (
  payload: PropostaPublicaPayload
): Promise<{ ok: true; link: string } | { ok: false; conflito: boolean; erro: string }> => {
  try {
    const response = await fetch(`${PROPOSTAS_URL}/rest/v1/propostas_clientes`, {
      method: 'POST',
      headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      await espelharNoNlOs(payload);
      return { ok: true, link: linkPublicoProposta(payload.tipo, payload.slug) };
    }

    if (response.status === 409) {
      return { ok: false, conflito: true, erro: 'Slug já utilizado' };
    }

    const texto = await response.text();
    return { ok: false, conflito: false, erro: `HTTP ${response.status} — ${texto}` };
  } catch (err: any) {
    return {
      ok: false,
      conflito: false,
      erro: err?.message || 'Falha de conexão com o servidor de propostas',
    };
  }
};

/** Atualiza uma proposta já publicada (identificada pelo slug). */
export const atualizarPropostaPublica = async (
  slug: string,
  payload: Omit<PropostaPublicaPayload, 'slug'>
): Promise<{ ok: true; link: string } | { ok: false; erro: string }> => {
  try {
    const response = await fetch(
      `${PROPOSTAS_URL}/rest/v1/propostas_clientes?slug=eq.${encodeURIComponent(slug)}`,
      {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const texto = await response.text();
      return { ok: false, erro: `HTTP ${response.status} — ${texto}` };
    }

    await espelharNoNlOs({ ...payload, slug });
    return { ok: true, link: linkPublicoProposta(payload.tipo, slug) };
  } catch (err: any) {
    return { ok: false, erro: err?.message || 'Falha de conexão com o servidor de propostas' };
  }
};
