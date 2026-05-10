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
    const { proposal } = await req.json()
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { 
      cliente, 
      tipo, 
      status, 
      views_count = 0, 
      data: sentDate, 
      validade = 30 
    } = proposal

    const now = new Date()
    const sentAt = new Date(sentDate)
    const daysSinceSent = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24))
    
    const expiryDate = new Date(sentAt)
    expiryDate.setDate(expiryDate.getDate() + validade)
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    let context = `
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
    
    Instrução específica: ${specificInstruction}
    
    Gere a mensagem de WhatsApp.`

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", // Using the exact model name requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    console.log('AI Gateway Response:', JSON.stringify(data));
    
    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error) || "AI Gateway Error");
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected response format:', data);
      throw new Error("Invalid response format from AI Gateway");
    }

    return new Response(
      JSON.stringify({ message: data.choices[0].message.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})