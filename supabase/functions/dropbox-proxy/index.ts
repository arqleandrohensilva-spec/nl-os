
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, dropbox-api-arg',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const dropboxToken = Deno.env.get('DROPBOX_ACCESS_TOKEN');
    if (!dropboxToken) {
      throw new Error('DROPBOX_ACCESS_TOKEN not configured');
    }

    const url = new URL(req.url);
    const action = req.headers.get('x-action');

    // For backward compatibility or simpler calls
    let bodyJson: any = {};
    if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
      bodyJson = await req.json();
    }

    const currentAction = action || bodyJson.action;
    const path = bodyJson.path || "";
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
    } else if (currentAction === 'get_metadata') {
      endpoint = 'https://api.dropboxapi.com/2/files/get_metadata';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ path });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
    });

    // If it's a 409 (path not found or already exists), Dropbox returns JSON error
    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
