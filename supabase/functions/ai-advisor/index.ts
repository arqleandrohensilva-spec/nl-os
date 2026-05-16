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
    const { prompt, systemPrompt, image, json } = await req.json();

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not found in environment variables");
      return new Response(
        JSON.stringify({ error: { message: "ANTHROPIC_API_KEY não configurada" } }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Anthropic API Error:", data.error);
      return new Response(
        JSON.stringify({ error: data.error }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = data.content?.[0]?.text || "";
    
    // Return in the format the frontend expects (matching OpenAI structure for compatibility if needed, but primarily choice structure)
    return new Response(JSON.stringify({
      choices: [{ message: { content } }]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Internal Function Error:", error);
    return new Response(
      JSON.stringify({ error: { message: error.message } }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});