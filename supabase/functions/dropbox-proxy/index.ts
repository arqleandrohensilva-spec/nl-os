import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, dropbox-api-arg, x-action',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch tokens from database
    const { data: settings } = await supabase
      .from('dropbox_settings')
      .select('access_token, refresh_token, expires_at')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()
    
    // Priority: Database -> Environment Secret
    let accessToken = settings?.access_token || Deno.env.get('DROPBOX_ACCESS_TOKEN');
    const refreshToken = settings?.refresh_token;

    if (!accessToken) {
      console.error('Dropbox settings not found and no environment variable access_token');
      return new Response(JSON.stringify({ 
        error: 'Dropbox connection not configured', 
        details: 'Por favor, conecte o Dropbox nas configurações do sistema.' 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      });
    }

    // Check if token is expired (buffer of 5 minutes)
    const isExpired = settings?.expires_at && new Date(settings.expires_at).getTime() < (Date.now() + 5 * 60 * 1000);
    
    if (isExpired && refreshToken) {
      console.log('Token is expired or near expiry, refreshing...');
      const refreshedToken = await refreshDropboxToken(supabase, refreshToken);
      if (refreshedToken) {
        accessToken = refreshedToken;
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
    let path = bodyJson.path || '/NL Arquitetos/07 - Projetos NL OS/01 - Clientes';
    const folder = bodyJson.folder || "";
    
    console.log(`Dropbox Proxy Request - Action: ${action}, Path: ${path}`);

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action parameter' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      });
    }

    let endpoint = '';
    let body: any = null;
    let headers: any = {
      'Authorization': `Bearer ${accessToken}`,
    };

    if (action === 'list_folder' || action === 'list') {
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
    } else if (action === 'create_folder_batch') {
      endpoint = 'https://api.dropboxapi.com/2/files/create_folder_batch';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ paths: bodyJson.paths, autorename: false, force_async: false });
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

    // Handle non-OK responses
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const text = await response.text();
        errorData = { error: text };
      }

      const errorSummary = errorData?.error_summary || '';
      const isPathNotFound = errorSummary.includes('path/not_found');
      const isPathConflict = errorSummary.includes('path/conflict');
      
      if (isPathConflict && (action === 'create_folder' || action === 'create_folder_v2')) {
        console.log(`Path conflict for create_folder action, treating as success: ${path}`);
        return new Response(JSON.stringify({ success: true, message: 'Folder already exists' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        });
      }

      if (isPathNotFound) {
        if (action === 'delete') {
          console.log(`Path not found for delete action, treating as success: ${path}`);
          return new Response(JSON.stringify({ success: true, message: 'Path already gone or never existed' }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          });
        }
        if (action === 'list_folder' || action === 'list') {
          console.log(`Path not found for list action, returning empty entries: ${path}`);
          return new Response(JSON.stringify({ entries: [], has_more: false }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          });
        }
        if (action === 'get_metadata') {
          console.log(`Path not found for get_metadata action, returning 404: ${path}`);
          return new Response(JSON.stringify({ error: 'not_found', path }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          });
        }
      }

      // If 401, try to refresh once
      if (response.status === 401 && refreshToken) {
        console.log('Token expired (401), attempting refresh...');
        const newToken = await refreshDropboxToken(supabase, refreshToken);
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          // For uploads, we can't easily retry because body is a stream
          if (action !== 'upload') {
            const retryResponse = await fetch(endpoint, {
              method: 'POST',
              headers,
              body
            });
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              return new Response(JSON.stringify(retryData), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              });
            }
          }
        }
      }

      return new Response(
        JSON.stringify(errorData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    if (action === 'download') {
      const blob = await response.blob();
      const responseContentType = response.headers.get('Content-Type') || 'application/octet-stream';
      
      return new Response(
        blob,
        { headers: { ...corsHeaders, 'Content-Type': responseContentType }, status: 200 }
      )
    }

    const data = await response.json();
    
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