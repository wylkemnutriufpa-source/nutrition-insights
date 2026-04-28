import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get query params
    const url = new URL(req.url)
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const tenantId = url.searchParams.get('tenant_id')
    const action = url.searchParams.get('action')

    let query = supabaseClient
      .from('audit_logs')
      .select('correlation_id, user_id, tenant_id, action, status, created_at, resource_type, resource_id')

    if (search) {
      query = query.or(`correlation_id.ilike.%${search}%,action.ilike.%${search}%`)
    }
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }
    if (action) {
      query = query.eq('action', action)
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(5000)

    if (error) throw error

    // Generate CSV
    const headers = ['created_at', 'correlation_id', 'user_id', 'tenant_id', 'action', 'status', 'resource_type', 'resource_id']
    const csvContent = [
      headers.join(','),
      ...(data || []).map(row => 
        headers.map(header => {
          const val = row[header as keyof typeof row] || ''
          return `"${String(val).replace(/"/g, '""')}"`
        }).join(',')
      )
    ].join('\n')

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=audit_logs_${new Date().toISOString()}.csv`
      },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
