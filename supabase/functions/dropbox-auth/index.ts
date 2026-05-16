import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirect_uri } = await req.json()

    console.log("Recebendo código para autenticação Dropbox...");

    if (!code) {
      console.error("Erro: Código não fornecido no corpo da requisição");
      return new Response(JSON.stringify({ error: 'Código não fornecido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const clientId = Deno.env.get('DROPBOX_CLIENT_ID')
    const clientSecret = Deno.env.get('DROPBOX_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      console.error("Erro: DROPBOX_CLIENT_ID ou DROPBOX_CLIENT_SECRET não configurados");
      return new Response(JSON.stringify({ error: 'Credenciais do Dropbox não configuradas no servidor' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Trocar código por tokens
    console.log("Solicitando tokens ao Dropbox API...");
    const tokenResponse = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect_uri || 'https://app.nl.arq.br/dropbox-callback',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error("Erro da API do Dropbox:", tokenData.error, tokenData.error_description);
      return new Response(JSON.stringify({ 
        error: `Dropbox API: ${tokenData.error_description || tokenData.error}` 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log("Tokens recebidos com sucesso. Salvando no banco de dados...");

    // Salvar tokens no Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error("Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados");
      return new Response(JSON.stringify({ error: 'Configuração interna do Supabase incompleta' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error: dbError } = await supabase
      .from('dropbox_settings')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        account_id: tokenData.account_id,
        updated_at: new Date().toISOString(),
      })

    if (dbError) {
      console.error("Erro ao salvar no banco de dados:", dbError.message);
      return new Response(JSON.stringify({ error: 'Erro ao salvar configurações: ' + dbError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log("Configurações do Dropbox salvas com sucesso para account_id:", tokenData.account_id);

    return new Response(JSON.stringify({ 
      success: true, 
      account_id: tokenData.account_id 
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error("Erro inesperado na Edge Function:", err.message);
    return new Response(JSON.stringify({ error: 'Erro interno: ' + err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})