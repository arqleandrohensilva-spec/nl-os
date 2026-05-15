import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, dropbox-api-arg, x-action',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

async function refreshDropboxToken() {
  const refreshToken = Deno.env.get('DROPBOX_REFRESH_TOKEN');
  const clientId = Deno.env.get('DROPBOX_CLIENT_ID');
  const clientSecret = Deno.env.get('DROPBOX_CLIENT_SECRET');

  if (!refreshToken || !clientId || !clientSecret) {
    return null;
  }

  try {
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
      return data.access_token;
    }
  } catch (error) {
    console.error('Error refreshing Dropbox token:', error);
  }
  return null;
}

serve(async (req) => {
  const { method, url } = req;
  console.log(`[${new Date().toISOString()}] Recebendo requisição: ${method} ${url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let dropboxToken = Deno.env.get('DROPBOX_ACCESS_TOKEN');
    
    // Attempt refresh if token is likely expired or not present
    if (!dropboxToken) {
      dropboxToken = await refreshDropboxToken();
    }

    if (!dropboxToken) {
      console.error('DROPBOX_ACCESS_TOKEN not configured and could not refresh');
      return new Response(JSON.stringify({ 
        error: 'Dropbox access token expired or not configured', 
        details: 'O token do Dropbox expirou. Por favor, configure DROPBOX_REFRESH_TOKEN, DROPBOX_CLIENT_ID e DROPBOX_CLIENT_SECRET para renovação automática.' 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      });
    }

    let bodyJson: any = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (req.method === 'POST') {
      if (contentType.includes('application/json')) {
        try {
          bodyJson = await req.json();
        } catch (e) {
          console.error('Erro ao ler JSON do body:', e.message);
        }
      }
    }

    const action = req.headers.get('x-action');
    const currentAction = action || bodyJson.action;

    if (!currentAction) {
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

    if (currentAction === 'list_folder') {
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
    } else if (currentAction === 'get_temporary_link') {
      endpoint = 'https://api.dropboxapi.com/2/files/get_temporary_link';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ path });
    } else if (currentAction === 'create_folder') {
      endpoint = 'https://api.dropboxapi.com/2/files/create_folder_v2';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ path: folder || path, autorename: false });
    } else if (currentAction === 'create_shared_link') {
      endpoint = 'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ path, settings: { requested_visibility: 'public' } });
    } else if (currentAction === 'upload') {
      endpoint = 'https://content.dropboxapi.com/2/files/upload';
      const dropboxArg = req.headers.get('dropbox-api-arg');
      if (!dropboxArg) throw new Error('Missing dropbox-api-arg header for upload');
      
      headers['Dropbox-API-Arg'] = dropboxArg;
      headers['Content-Type'] = 'application/octet-stream';
      body = req.body; 
    } else if (currentAction === 'delete') {
      endpoint = 'https://api.dropboxapi.com/2/files/delete_v2';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ path });
    } else if (currentAction === 'get_metadata') {
      endpoint = 'https://api.dropboxapi.com/2/files/get_metadata';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ path });
    } else if (currentAction === 'download') {
      endpoint = 'https://content.dropboxapi.com/2/files/download';
      headers['Dropbox-API-Arg'] = JSON.stringify({ path });
      body = null;
    }

    if (!endpoint) {
      return new Response(JSON.stringify({ error: `Invalid action: ${currentAction}` }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      });
    }

    let response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
    });

    // If 401, try to refresh once if we have credentials
    if (response.status === 401) {
      console.log('Token expired, attempting refresh...');
      const newToken = await refreshDropboxToken();
      if (newToken) {
        console.log('Token refreshed successfully. Retrying request...');
        headers['Authorization'] = `Bearer ${newToken}`;
        // Note: For 'upload' with body as stream, retrying might be tricky because the stream might be consumed.
        // For other actions it's fine.
        if (currentAction !== 'upload') {
          response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body
          });
        }
      }
    }

    if (currentAction === 'download') {
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
    
    if (!response.ok) {
        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
        );
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error(`Internal error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
