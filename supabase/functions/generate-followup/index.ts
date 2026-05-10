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
    const { proposal, analysisContext } = await req.json()
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    const MOCK_AI = Deno.env.get('MOCK_AI') === 'true'

    if (!ANTHROPIC_API_KEY && !MOCK_AI) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }),
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
    
    ${analysisContext ? `Análise de Engajamento Adicional: ${analysisContext}\n` : ''}
    
    Instrução específica: ${specificInstruction}
    
    Gere a mensagem de WhatsApp.`

    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    let data;
    if (MOCK_AI) {
      console.log("Running in MOCK_AI mode");
      data = {
        content: [
          {
            text: `[MOCK] Baseado no contexto (${cliente}, ${views_count} views), aqui está o follow-up sugerido.`
          }
        ]
      };
    } else {
      const body = {
        model: "claude-3-5-haiku-20241022",
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
      console.log("Anthropic response:", JSON.stringify(data));
    }

    if (data?.error) {
      return new Response(JSON.stringify({ error: `IA Error: ${data.error.message || JSON.stringify(data.error)}` }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const message = data?.content?.[0]?.text;

    if (!message) {
      return new Response(JSON.stringify({ error: "Empty response from AI" }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ message }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

if (import.meta.main) {
  serve(handler);
}