import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, targetTables } = await req.json();

    if (action === "get-current-schema") {
      const { data, error } = await supabase.rpc("get_schema_info", { target_tables: targetTables });
      if (error) throw error;

      const tables: Record<string, string[]> = {};
      data.forEach((row: any) => {
        if (!tables[row.table_name]) tables[row.table_name] = [];
        tables[row.table_name].push(row.column_name);
      });

      return new Response(
        JSON.stringify({ 
          generatedAt: new Date().toISOString(),
          tables 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
