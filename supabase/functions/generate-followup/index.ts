import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

export const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { proposal, analysisContext } = await req.json()
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const MOCK_AI = Deno.env.get('MOCK_AI') === 'true'

    if (!LOVABLE_API_KEY && !MOCK_AI) {
      // Return 200 with error body so the client can show a friendly message
      // instead of throwing a generic "non-2xx" error.
      return jsonResponse({ error: 'IA indisponível: LOVABLE_API_KEY não configurada.' })
    }

    const {
      cliente,
      tipo,
      status,
      views_count = 0,
      data: sentDate,
      validade = 30,
    } = proposal ?? {}

    const now = new Date()
    const sentAt = new Date(sentDate)
    const daysSinceSent = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24))

    const expiryDate = new Date(sentAt)
    expiryDate.setDate(expiryDate.getDate() + validade)
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const context = `
    Cliente: ${cliente}
    Tipo de proposta: ${tipo}
    Status atual: ${status}
    Vezes aberta: ${views_count}
    Dias desde o envio: ${daysSinceSent}
    Dias para o vencimento: ${daysUntilExpiry}
    `

    let specificInstruction = ""
    if (views_count === 1) {
      specificInstruction = "A proposta foi vista 1 vez. Verifique suavemente se surgiu alguma dúvida."
    } else if (views_count >= 3) {
      specificInstruction = "A proposta foi vista 3 ou mais vezes. Reconheça o interesse e ofereça uma conversa para alinhar detalhes."
    } else if (views_count === 0 && daysSinceSent >= 3) {
      specificInstruction = "A proposta ainda não foi aberta e já se passaram 3 dias. Verifique se o link chegou corretamente."
    } else if (daysUntilExpiry <= 2 && daysUntilExpiry >= 0) {
      specificInstruction = "A proposta vence em 2 dias. Informe sobre a validade de forma suave, sem pressão."
    } else {
      specificInstruction = "Faça um follow-up padrão, mantendo o tom da NL Arquitetos."
    }

    const systemPrompt = `Você é o assistente da NL Arquitetos. Gere uma mensagem curta e profissional para WhatsApp de follow-up de proposta.
    Tom: condutor, técnico, sem pressão, sem urgência artificial.
    Nunca use "oportunidade única", "corre", "promoção". A NL não pressiona — conduz.
    Máximo 3 linhas. Termine com uma pergunta aberta simples.`

    const userPrompt = `Contexto da proposta:
    ${context}

    ${analysisContext ? `Análise de Engajamento Adicional: ${analysisContext}\n` : ''}

    Instrução específica: ${specificInstruction}

    Gere a mensagem de WhatsApp.`

    if (MOCK_AI) {
      console.log("Running in MOCK_AI mode")
      return jsonResponse({
        message: `[MOCK] Baseado no contexto (${cliente}, ${views_count} views), aqui está o follow-up sugerido.`,
      })
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    })

    if (response.status === 429) {
      return jsonResponse({ error: "Limite de requisições da IA atingido. Tente novamente em instantes." })
    }
    if (response.status === 402) {
      return jsonResponse({ error: "Créditos de IA esgotados. Adicione créditos para continuar usando a IA." })
    }

    const data = await response.json()

    if (!response.ok || data?.error) {
      const errorMessage = data?.error?.message || data?.error || `Falha na IA (HTTP ${response.status})`
      console.error("AI gateway error:", JSON.stringify(data))
      return jsonResponse({ error: errorMessage })
    }

    const message = data?.choices?.[0]?.message?.content

    if (!message) {
      return jsonResponse({ error: "Resposta vazia da IA." })
    }

    return jsonResponse({ message })
  } catch (error) {
    console.error("generate-followup error:", error)
    return jsonResponse({ error: (error as Error).message ?? "Erro inesperado ao gerar follow-up." })
  }
}

if (import.meta.main) {
  serve(handler)
}
