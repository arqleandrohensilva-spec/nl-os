
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
    const dropboxToken = Deno.env.get('DROPBOX_ACCESS_TOKEN');
    if (!dropboxToken) {
      throw new Error('DROPBOX_ACCESS_TOKEN not configured');
    }

    const { action, path, folder } = await req.json();

    let endpoint = '';
    let body = null;
    let headers: any = {
      'Authorization': `Bearer ${dropboxToken}`,
      'Content-Type': 'application/json',
    };

    if (action === 'list_folder') {
      endpoint = 'https://api.dropboxapi.com/2/files/list_folder';
      body = JSON.stringify({
        path: path || "",
        recursive: false,
        include_media_info: false,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
        include_non_downloadable_files: true
      });
    } else if (action === 'get_temporary_link') {
      endpoint = 'https://api.dropboxapi.com/2/files/get_temporary_link';
      body = JSON.stringify({ path });
    } else if (action === 'create_folder') {
      endpoint = 'https://api.dropboxapi.com/2/files/create_folder_v2';
      body = JSON.stringify({ path: folder, autorename: false });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
    });

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
