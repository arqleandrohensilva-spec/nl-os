import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { code, action, redirectUri: passedRedirectUri, redirect_uri: passedRedirectUriSnake } = await req.json()
    const redirectUri = passedRedirectUriSnake || passedRedirectUri || 'https://app.nl.arq.br/dropbox-callback'

    if (action === 'exchange_token' || (code && !action)) {
      const clientId = Deno.env.get('DROPBOX_CLIENT_ID')
      const clientSecret = Deno.env.get('DROPBOX_CLIENT_SECRET')
      const redirectUri = passedRedirectUri || 'https://app.nl.arq.br/dropbox-callback'

      console.log('Exchanging code for token...')
      
      const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
        }),
      })

      const data = await response.json()

      if (data.error) {
        console.error('Dropbox token exchange error:', data)
        return new Response(JSON.stringify(data), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Store tokens in database
      const { error: dbError } = await supabaseClient
        .from('dropbox_settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001', // Use a fixed ID for single instance settings
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (dbError) {
        throw dbError
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
