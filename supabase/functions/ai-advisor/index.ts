import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { prompt, systemPrompt, image, json, model } = body;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not found in environment variables");
      return new Response(
        JSON.stringify({ error: { message: "ANTHROPIC_API_KEY não configurada" } }), 
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messages: any[] = [];
    
    const userContent: any[] = [];
    if (image) {
      const base64Data = image.split(',')[1];
      const mediaType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      userContent.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } });
    }
    userContent.push({ type: "text", text: prompt });
    messages.push({ role: "user", content: userContent });

    // Handle model mapping for Claude 3.7 Sonnet
    let requestedModel = model || "claude-3-7-sonnet-20250219";
    
    // Normalize model name (remove prefixes like 'anthropic/')
    const normalizedModel = requestedModel.split('/').pop() || requestedModel;
    
    if (normalizedModel === "claude-sonnet-4-20250514" || normalizedModel === "claude-3-7-sonnet") {
      requestedModel = "claude-3-7-sonnet-20250219";
    } else {
      requestedModel = normalizedModel;
    }
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: requestedModel,
        max_tokens: 4096,
        system: systemPrompt,
        messages
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Anthropic API Error:", data.error);
      return new Response(
        JSON.stringify({ error: data.error }), 
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = data.content?.[0]?.text || "";
    
    return new Response(JSON.stringify({
      choices: [{ message: { content } }]
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Internal Function Error:", error);
    return new Response(
      JSON.stringify({ error: { message: error.message || "Erro interno na Edge Function" } }), 
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
