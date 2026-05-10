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

    if (!engagement || !proposal) {
      return new Response(
        JSON.stringify({ analysis: "Dados insuficientes para realizar a análise de engajamento no momento. Por favor, aguarde o cliente interagir com a proposta." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `Você é o assistente da NL Arquitetos. Com base nos dados de engajamento desta proposta, analise o nível de interesse do cliente e sugira a melhor ação de follow-up. Seja direto e objetivo. Máximo 3 parágrafos.`

    const userPrompt = `
    Proposta: ${proposal.cliente || 'Cliente não identificado'} (${proposal.tipo || 'Tipo não informado'})
    Status: ${proposal.status || 'Pendente'}
    
    Dados de Engajamento:
    - Tempo Total: ${Math.floor((engagement.tempo_total || 0) / 60)} min ${(engagement.tempo_total || 0) % 60} seg
    - Dispositivo: ${engagement.dispositivo || 'Não identificado'}
    - Tempos por Seção:
      * Capa: ${engagement.secao_capa_tempo || 0}s
      * Manifesto: ${engagement.secao_manifesto_tempo || 0}s
      * Diagnóstico: ${engagement.secao_diagnostico_tempo || 0}s
      * Escopo: ${engagement.secao_escopo_tempo || 0}s
      * Investimento: ${engagement.secao_investimento_tempo || 0}s
      * Fechamento: ${engagement.secao_fechamento_tempo || 0}s
    `

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error) || "AI Gateway Error");
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return new Response(
        JSON.stringify({ analysis: "Não foi possível gerar a análise no momento. Tente novamente em instantes." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ analysis: data.choices[0].message.content }),
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
