import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { engagement, proposal } = await req.json()

    // Null safety: check if data exists and is valid
    if (!engagement || !proposal || (Array.isArray(engagement) && engagement.length === 0)) {
      return new Response(
        JSON.stringify({ analysis: "Sem dados de engajamento registrados para esta proposta ainda." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Support both single object or array (common when fetching from Supabase)
    const engagementData = Array.isArray(engagement) ? engagement[0] : engagement;

    if (!engagementData) {
      return new Response(
        JSON.stringify({ analysis: "Sem dados de engajamento registrados para esta proposta ainda." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not set');
      return new Response(
        JSON.stringify({ analysis: "Configuração de API pendente. Contate o administrador." }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `Você é o assistente da NL Arquitetos. Com base nos dados de engajamento desta proposta, analise o nível de interesse do cliente e sugira a melhor ação de follow-up. Seja direto e objetivo. Máximo 3 parágrafos.`

    const userPrompt = `
    Proposta: ${proposal.cliente || 'Cliente não identificado'} (${proposal.tipo || 'Tipo não informado'})
    Status: ${proposal.status || 'Pendente'}
    
    Dados de Engajamento:
    - Tempo Total: ${Math.floor((engagementData.tempo_total || 0) / 60)} min ${(engagementData.tempo_total || 0) % 60} seg
    - Dispositivo: ${engagementData.dispositivo || 'Não identificado'}
    - Tempos por Seção:
      * Capa: ${engagementData.secao_capa_tempo || 0}s
      * Manifesto: ${engagementData.secao_manifesto_tempo || 0}s
      * Diagnóstico: ${engagementData.secao_diagnostico_tempo || 0}s
      * Escopo: ${engagementData.secao_escopo_tempo || 0}s
      * Investimento: ${engagementData.secao_investimento_tempo || 0}s
      * Fechamento: ${engagementData.secao_fechamento_tempo || 0}s
    `

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          { role: "user", content: `${systemPrompt}\n\n${userPrompt}` }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Anthropic API Error:", data.error);
      throw new Error(data.error.message || "Anthropic API Error");
    }

    if (!data.content || !data.content[0] || !data.content[0].text) {
      return new Response(
        JSON.stringify({ analysis: "Não foi possível gerar a análise no momento. Tente novamente em instantes." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ analysis: data.content[0].text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error("Error in analyze-engagement:", error);
    return new Response(
      JSON.stringify({ 
        analysis: "Ocorreu um erro ao processar os dados de engajamento. Por favor, tente novamente mais tarde.",
        error: error.message 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
