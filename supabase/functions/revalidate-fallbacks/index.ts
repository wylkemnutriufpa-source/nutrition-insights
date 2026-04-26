
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids)) {
      return new Response(JSON.stringify({ error: 'IDs array is required' }), { status: 400, headers: corsHeaders });
    }

    const { data: fallbacks, error: fetchError } = await supabase
      .from('recipe_image_fallbacks')
      .select('id, original_url')
      .in('id', ids);

    if (fetchError) throw fetchError;

    const results = [];

    for (const fallback of fallbacks) {
      if (!fallback.original_url) {
        results.push({ id: fallback.id, status: 'failed', statusCode: null, error: 'No original URL' });
        continue;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(fallback.original_url, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        const ok = response.ok;
        const statusCode = response.status;

        await supabase
          .from('recipe_image_fallbacks')
          .update({
            http_status_code: statusCode,
            revalidated_at: new Date().toISOString(),
            revalidated_status: ok ? 'ok' : 'failed'
          })
          .eq('id', fallback.id);

        results.push({ id: fallback.id, status: ok ? 'ok' : 'failed', statusCode });
      } catch (err) {
        await supabase
          .from('recipe_image_fallbacks')
          .update({
            http_status_code: 0,
            revalidated_at: new Date().toISOString(),
            revalidated_status: 'failed',
            error_message: `Revalidation error: ${err.message}`
          })
          .eq('id', fallback.id);

        results.push({ id: fallback.id, status: 'failed', statusCode: 0, error: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
