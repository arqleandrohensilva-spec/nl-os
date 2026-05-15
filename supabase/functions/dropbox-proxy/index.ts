import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, dropbox-api-arg, x-action',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

async function getDropboxTokens(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from('dropbox_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()
  
  if (error || !data) {
    console.error('Error fetching Dropbox tokens from DB:', error)
    return null
  }
  return data
}

async function refreshDropboxToken(supabaseClient: any, refreshToken: string) {
  const clientId = Deno.env.get('DROPBOX_CLIENT_ID');
  const clientSecret = Deno.env.get('DROPBOX_CLIENT_SECRET');

  if (!refreshToken || !clientId || !clientSecret) {
    console.error('Missing credentials for refresh:', { hasRefreshToken: !!refreshToken, hasClientId: !!clientId, hasClientSecret: !!clientSecret })
    return null;
  }

  try {
    console.log('Refreshing Dropbox token...')
    const response = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const data = await response.json();
    if (data.access_token) {
      console.log('Token refreshed successfully')
      // Update database
      const updateData: any = {
        access_token: data.access_token,
        updated_at: new Date().toISOString(),
      }
      if (data.expires_in) {
        updateData.expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString()
      }

      await supabaseClient
        .from('dropbox_settings')
        .update(updateData)
        .eq('id', '00000000-0000-0000-0000-000000000001')

      return data.access_token;
    } else {
      console.error('Refresh response did not contain access_token:', data)
    }
  } catch (error) {
    console.error('Error refreshing Dropbox token:', error);
  }
  return null;
}

serve(async (req) => {
  const { method, url } = req;
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const settings = await getDropboxTokens(supabaseClient)
    
    if (!settings?.access_token) {
      return new Response(JSON.stringify({ 
        error: 'Dropbox connection not configured', 
        details: 'Por favor, conecte o Dropbox nas configurações do sistema.' 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      });
    }

    let dropboxToken = settings.access_token

    // Check if token is expired (buffer of 5 minutes)
    const isExpired = settings.expires_at && new Date(settings.expires_at).getTime() < (Date.now() + 5 * 60 * 1000)
    
    if (isExpired && settings.refresh_token) {
      const refreshedToken = await refreshDropboxToken(supabaseClient, settings.refresh_token)
      if (refreshedToken) {
        dropboxToken = refreshedToken
      }
    }

    let bodyJson: any = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (req.method === 'POST') {
      if (contentType.includes('application/json')) {
        try {
          bodyJson = await req.json();
        } catch (e) {
          // Body might not be JSON
        }
      }
    }

    const action = req.headers.get('x-action') || bodyJson.action;

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action parameter' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      });
    }

    const path = bodyJson.path || '/NL Arquitetos/07 - Projetos NL OS';
    const folder = bodyJson.folder || "";

    let endpoint = '';
    let body: any = null;
    let headers: any = {
      'Authorization': `Bearer ${dropboxToken}`,
    };

    if (action === 'list_folder') {
      endpoint = 'https://api.dropboxapi.com/2/files/list_folder';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({
        path: path === '/' ? '' : path,
        recursive: bodyJson.recursive || false,
        include_media_info: false,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
        include_non_downloadable_files: true
      });
    } else if (action === 'get_temporary_link') {
      endpoint = 'https://api.dropboxapi.com/2/files/get_temporary_link';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ path });
    } else if (action === 'create_folder') {
      endpoint = 'https://api.dropboxapi.com/2/files/create_folder_v2';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ path: folder || path, autorename: false });
    } else if (action === 'create_shared_link') {
      endpoint = 'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ path, settings: { requested_visibility: 'public' } });
    } else if (action === 'upload') {
      endpoint = 'https://content.dropboxapi.com/2/files/upload';
      const dropboxArg = req.headers.get('dropbox-api-arg');
      if (!dropboxArg) throw new Error('Missing dropbox-api-arg header for upload');
      headers['Dropbox-API-Arg'] = dropboxArg;
      headers['Content-Type'] = 'application/octet-stream';
      // For upload, we might need to handle the stream carefully if we retry
      body = req.body; 
    } else if (action === 'delete') {
      endpoint = 'https://api.dropboxapi.com/2/files/delete_v2';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ path });
    } else if (action === 'get_metadata') {
      endpoint = 'https://api.dropboxapi.com/2/files/get_metadata';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ path });
    } else if (action === 'download') {
      endpoint = 'https://content.dropboxapi.com/2/files/download';
      headers['Dropbox-API-Arg'] = JSON.stringify({ path });
      body = null;
    }

    if (!endpoint) {
      return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      });
    }

    let response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
    });

    // If 401, try to refresh once
    if (response.status === 401 && settings.refresh_token) {
      console.log('Token expired (401), attempting refresh...');
      const newToken = await refreshDropboxToken(supabaseClient, settings.refresh_token);
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        if (action !== 'upload') {
          response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body
          });
        }
      }
    }

    if (action === 'download') {
      const blob = await response.blob();
      const responseContentType = response.headers.get('Content-Type') || 'application/octet-stream';
      
      if (!response.ok) {
        const errorText = await blob.text();
        return new Response(
          JSON.stringify({ error: `Dropbox failed: ${response.status}`, details: errorText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
        );
      }

      return new Response(
        blob,
        { headers: { ...corsHeaders, 'Content-Type': responseContentType }, status: 200 }
      )
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
    )
  } catch (error) {
    console.error(`Internal error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
