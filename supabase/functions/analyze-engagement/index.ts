import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const handler = async (req: Request) => {
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
    const MOCK_AI = Deno.env.get('MOCK_AI') === 'true'

    if (!ANTHROPIC_API_KEY && !MOCK_AI) {
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

    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    let data;
    if (MOCK_AI) {
      console.log("Running in MOCK_AI mode");
      data = {
        content: [
          {
            text: `[MOCK] O cliente passou ${Math.floor((engagementData.tempo_total || 0) / 60)} min analisando a proposta. O interesse parece alto na seção de Investimento.`
          }
        ]
      };
    } else {
      const body = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      };
      console.log("Sending to Anthropic:", JSON.stringify(body));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(body)
      });
      data = await response.json();
    }

    // Debug: log the full response
    console.log("Anthropic response:", JSON.stringify(data));

    // Check for API error in response
    if (data.error) {
      return new Response(JSON.stringify({ 
        analysis: `Erro na API: ${data.error.message || JSON.stringify(data.error)}` 
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const analysis = data?.content?.[0]?.text;

    if (!analysis) {
      return new Response(JSON.stringify({ 
        analysis: "Sem dados suficientes para análise ou resposta vazia da IA." 
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ analysis }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

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
}

if (import.meta.main) {
  serve(handler);
}