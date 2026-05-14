
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, dropbox-api-arg, x-action',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const dropboxToken = Deno.env.get('DROPBOX_ACCESS_TOKEN');
    if (!dropboxToken) {
      return new Response(JSON.stringify({ error: 'DROPBOX_ACCESS_TOKEN not configured' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      });
    }

    // For backward compatibility or simpler calls
    let bodyJson: any = {};
    if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
      bodyJson = await req.json();
    }

    const action = req.headers.get('x-action');
    const currentAction = action || bodyJson.action;

    if (!currentAction) {
      return new Response(JSON.stringify({ error: 'Missing action parameter' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      });
    }

    // Default path validation
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
      body = req.body; // Stream the body directly to Dropbox
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
      return new Response(JSON.stringify({ error: `Invalid action or endpoint: ${currentAction}` }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
    });

    if (currentAction === 'download') {
      const blob = await response.blob();
      const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
      
      console.log(`Download finalizado. Content-Type: ${contentType}, Size: ${blob.size}`);
      
      if (!response.ok) {
        const errorText = await blob.text();
        console.error(`Erro no download do Dropbox: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ error: `Dropbox download failed: ${response.status}`, details: errorText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      return new Response(
        blob,
        { headers: { ...corsHeaders, 'Content-Type': contentType }, status: 200 }
      )
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
